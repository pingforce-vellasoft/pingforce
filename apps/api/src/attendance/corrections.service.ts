import {
  Injectable,
  Inject,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ExtendedPrismaClient } from '../prisma/prisma.module';
import { CreateCorrectionDto } from './dto/create-correction.dto';
import { ApprovalsService } from '../approvals/approvals.service';
import { WorkflowEngineService } from '../approvals/workflow-engine.service';
import { RbacService } from '../rbac/rbac.service';
import { AuditService } from '../audit/audit.service';

const TIME_CORRECTION_TYPES = new Set([
  'MISSING_CHECK_IN',
  'MISSING_CHECK_OUT',
  'WRONG_CHECK_IN_TIME',
  'WRONG_CHECK_OUT_TIME',
]);

/** Statuses that still await a decision (ATTENDANCE_CORRECTION.md §8). */
const OPEN_STATUSES = [
  'PENDING',
  'UNDER_MANAGER_REVIEW',
  'UNDER_HR_REVIEW',
  'UNDER_EMPLOYER_REVIEW',
] as const;

/**
 * Attendance correction workflow (3.1 ATTENDANCE_CORRECTION.md,
 * STATE_MACHINE.md §7): employees request, approvers decide through the
 * shared approval engine, approved time corrections are applied to the
 * attendance session, and everything is audited.
 *
 * Multi-tier review (§7/§8): tenants that configure an active
 * attendance_correction workflow route through its stages — each
 * intermediate approval moves the request to the next review status
 * (UNDER_HR_REVIEW, UNDER_EMPLOYER_REVIEW); tenants without one keep the
 * single-approver flow (PENDING → APPROVED/REJECTED). Approved corrections
 * that change the session are marked APPLIED (spec FSM APPROVED → APPLIED).
 */
@Injectable()
export class CorrectionsService {
  constructor(
    @Inject('IPrismaService') private readonly prisma: ExtendedPrismaClient,
    private readonly approvalsService: ApprovalsService,
    private readonly workflowEngine: WorkflowEngineService,
    private readonly rbacService: RbacService,
    private readonly auditService: AuditService,
  ) {}

  /** Employee files a correction for their own attendance record. */
  async requestCorrection(
    tenantId: string,
    userId: string,
    dto: CreateCorrectionDto,
  ) {
    const employee = await this.prisma.employee.findFirst({
      where: { tenantId, userId, deletedAt: null },
      select: { id: true },
    });
    if (!employee) {
      throw new UnauthorizedException('Not an employee');
    }

    // Corrections are always filed as self — the attendance record must
    // belong to the caller (ATTENDANCE_CORRECTION.md §5)
    const attendance = await this.prisma.attendance.findFirst({
      where: {
        id: dto.attendanceId,
        tenantId,
        employeeId: employee.id,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!attendance) {
      throw new NotFoundException('Attendance record not found');
    }

    // Time corrections must carry a valid timestamp
    if (
      TIME_CORRECTION_TYPES.has(dto.correctionType) &&
      Number.isNaN(Date.parse(dto.requestedValue))
    ) {
      throw new BadRequestException(
        'requestedValue must be an ISO-8601 datetime for time corrections',
      );
    }

    // Duplicate requests not allowed (§9)
    const duplicate = await this.prisma.attendanceCorrection.findFirst({
      where: {
        tenantId,
        attendanceId: dto.attendanceId,
        correctionType: dto.correctionType,
        workflowStatus: { in: [...OPEN_STATUSES] },
        // A deleted correction must not block a fresh request for the same
        // record and type.
        deletedAt: null,
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new ConflictException(
        'An open correction of this type already exists for this record',
      );
    }

    const correction = await this.prisma.attendanceCorrection.create({
      data: {
        tenantId,
        attendanceId: dto.attendanceId,
        employeeId: employee.id,
        correctionType: dto.correctionType,
        currentValue: dto.currentValue,
        requestedValue: dto.requestedValue,
        reason: dto.reason,
        workflowStatus: 'PENDING',
      },
    });

    void this.auditService.log({
      tenantId,
      actorId: userId,
      module: 'ATTENDANCE',
      entityName: 'attendance_correction',
      entityId: correction.id,
      action: 'CORRECTION_REQUESTED',
      newValue: {
        correctionType: dto.correctionType,
        requestedValue: dto.requestedValue,
      },
    });

    return correction;
  }

  /** Approver queue — data-scope filtered like the other approval lists. */
  async listPending(
    tenantId: string,
    requesterUserId: string,
    skip = 0,
    take = 50,
  ) {
    const scope = await this.rbacService.getDataScope(
      requesterUserId,
      'ATTENDANCE',
      'READ',
    );
    const scopeFilter = await this.rbacService.buildEmployeeScopeFilter(
      tenantId,
      requesterUserId,
      scope,
      'ATTENDANCE',
    );
    if (scopeFilter === null) return [];

    return this.prisma.attendanceCorrection.findMany({
      where: {
        tenantId,
        workflowStatus: { in: [...OPEN_STATUSES] },
        deletedAt: null,
        ...scopeFilter,
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
          },
        },
        attendance: { select: { id: true, attendanceDate: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Math.min(take, 200),
    });
  }

  /**
   * Decide a correction (ATTENDANCE_CORRECTION.md §8): with a configured
   * workflow each intermediate approval advances the review tier
   * (UNDER_MANAGER_REVIEW → UNDER_HR_REVIEW → UNDER_EMPLOYER_REVIEW);
   * the final approval sets APPROVED and applies time corrections to the
   * session (→ APPLIED). Rejection at any tier is terminal.
   */
  async decide(
    tenantId: string,
    correctionId: string,
    actorUserId: string,
    decision: 'APPROVED' | 'REJECTED',
    notes?: string,
  ) {
    const correction = await this.prisma.attendanceCorrection.findFirst({
      where: { id: correctionId, tenantId, deletedAt: null },
    });
    if (!correction) {
      throw new NotFoundException('Correction request not found');
    }
    if (
      !(OPEN_STATUSES as readonly string[]).includes(correction.workflowStatus)
    ) {
      throw new ConflictException('Correction has already been decided');
    }

    const outcome = await this.approvalsService.process(
      {
        tenantId,
        module: 'ATTENDANCE',
        entityName: 'attendance_correction',
        entityId: correctionId,
        ownerEmployeeId: correction.employeeId,
        actorUserId,
        decision,
        notes,
        context: { correctionType: correction.correctionType },
      },
      () =>
        this.prisma.$transaction(async (tx) => {
          const applied =
            decision === 'APPROVED' &&
            TIME_CORRECTION_TYPES.has(correction.correctionType)
              ? await this.applyTimeCorrection(tx, tenantId, correction)
              : false;

          return tx.attendanceCorrection.update({
            where: { id: correctionId },
            data: {
              // Spec FSM: APPROVED → APPLIED once the session is updated
              workflowStatus:
                decision === 'APPROVED' && applied ? 'APPLIED' : decision,
              approvedBy: actorUserId,
              approvedAt: new Date(),
            },
          });
        }),
    );

    if (outcome.finalized && outcome.result) {
      return outcome.result;
    }

    // Intermediate stage approval — move the request to the next review
    // tier so queues and the employee see where it stands (§8).
    return this.prisma.attendanceCorrection.update({
      where: { id: correctionId },
      data: {
        workflowStatus: this.reviewStatusForStage(outcome.nextStageNumber),
      },
    });
  }

  /**
   * Employee withdraws their own open request
   * (ATTENDANCE_CORRECTION.md §8: DRAFT/SUBMITTED → CANCELLED).
   */
  async cancel(tenantId: string, correctionId: string, userId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { tenantId, userId, deletedAt: null },
      select: { id: true },
    });
    if (!employee) {
      throw new UnauthorizedException('Not an employee');
    }

    const correction = await this.prisma.attendanceCorrection.findFirst({
      where: { id: correctionId, tenantId, deletedAt: null },
    });
    if (!correction) {
      throw new NotFoundException('Correction request not found');
    }
    if (correction.employeeId !== employee.id) {
      throw new ForbiddenException('You may only cancel your own requests');
    }
    if (
      !(OPEN_STATUSES as readonly string[]).includes(correction.workflowStatus)
    ) {
      throw new ConflictException('Correction has already been decided');
    }

    const cancelled = await this.prisma.attendanceCorrection.update({
      where: { id: correctionId },
      data: { workflowStatus: 'CANCELLED' },
    });

    await this.workflowEngine.cancelInstance(
      tenantId,
      'attendance_correction',
      correctionId,
      userId,
    );

    void this.auditService.log({
      tenantId,
      actorId: userId,
      module: 'ATTENDANCE',
      entityName: 'attendance_correction',
      entityId: correctionId,
      action: 'CORRECTION_CANCELLED',
    });

    return cancelled;
  }

  /** Review-tier status for the stage now awaiting action (spec §8 names). */
  private reviewStatusForStage(stageNumber?: number): string {
    switch (stageNumber) {
      case 2:
        return 'UNDER_HR_REVIEW';
      case 3:
        return 'UNDER_EMPLOYER_REVIEW';
      default:
        return 'UNDER_MANAGER_REVIEW';
    }
  }

  /**
   * ATTENDANCE_UPDATED step: writes the approved time onto the session.
   * Returns true when a session was actually updated.
   */
  private async applyTimeCorrection(
    tx: Parameters<Parameters<ExtendedPrismaClient['$transaction']>[0]>[0],
    tenantId: string,
    correction: {
      attendanceId: string;
      correctionType: string;
      requestedValue: string;
    },
  ): Promise<boolean> {
    const correctedTime = new Date(correction.requestedValue);

    const session = await tx.attendanceSession.findFirst({
      where: {
        tenantId,
        attendanceId: correction.attendanceId,
        deletedAt: null,
      },
      orderBy: { punchIn: 'desc' },
    });
    // Nothing to apply — request stays APPROVED, recorded for audit anyway
    if (!session) return false;

    const isCheckIn =
      correction.correctionType === 'MISSING_CHECK_IN' ||
      correction.correctionType === 'WRONG_CHECK_IN_TIME';

    await tx.attendanceSession.update({
      where: { id: session.id },
      data: isCheckIn
        ? { punchIn: correctedTime }
        : { punchOut: correctedTime, sessionStatus: 'CHECKED_OUT' },
    });
    return true;
  }
}
