import {
  Injectable,
  Inject,
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ExtendedPrismaClient } from '../prisma/prisma.module';
import { CreateCorrectionDto } from './dto/create-correction.dto';
import { ApprovalsService } from '../approvals/approvals.service';
import { RbacService } from '../rbac/rbac.service';
import { AuditService } from '../audit/audit.service';

const TIME_CORRECTION_TYPES = new Set([
  'MISSING_CHECK_IN',
  'MISSING_CHECK_OUT',
  'WRONG_CHECK_IN_TIME',
  'WRONG_CHECK_OUT_TIME',
]);

/**
 * Attendance correction workflow (3.1 ATTENDANCE_CORRECTION.md,
 * STATE_MACHINE.md §7): employees request, approvers decide through the
 * shared approval engine, approved time corrections are applied to the
 * attendance session, and everything is audited.
 */
@Injectable()
export class CorrectionsService {
  constructor(
    @Inject('IPrismaService') private readonly prisma: ExtendedPrismaClient,
    private readonly approvalsService: ApprovalsService,
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
      where: { id: dto.attendanceId, tenantId, employeeId: employee.id },
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
        workflowStatus: 'PENDING',
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new ConflictException(
        'A pending correction of this type already exists for this record',
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
    );
    if (scopeFilter === null) return [];

    return this.prisma.attendanceCorrection.findMany({
      where: { tenantId, workflowStatus: 'PENDING', ...scopeFilter },
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
   * Decide a correction (STATE_MACHINE.md §7: REQUESTED → APPROVED →
   * ATTENDANCE_UPDATED, or REQUESTED → REJECTED). Approved time corrections
   * are applied to the underlying session in the same transaction.
   */
  async decide(
    tenantId: string,
    correctionId: string,
    actorUserId: string,
    decision: 'APPROVED' | 'REJECTED',
    notes?: string,
  ) {
    const correction = await this.prisma.attendanceCorrection.findFirst({
      where: { id: correctionId, tenantId },
    });
    if (!correction) {
      throw new NotFoundException('Correction request not found');
    }
    if (correction.workflowStatus !== 'PENDING') {
      throw new ConflictException('Correction has already been decided');
    }

    return this.approvalsService.process(
      {
        tenantId,
        module: 'ATTENDANCE',
        entityName: 'attendance_correction',
        entityId: correctionId,
        ownerEmployeeId: correction.employeeId,
        actorUserId,
        decision,
        notes,
      },
      () =>
        this.prisma.$transaction(async (tx) => {
          const updated = await tx.attendanceCorrection.update({
            where: { id: correctionId },
            data: {
              workflowStatus: decision,
              approvedBy: actorUserId,
              approvedAt: new Date(),
            },
          });

          if (
            decision === 'APPROVED' &&
            TIME_CORRECTION_TYPES.has(correction.correctionType)
          ) {
            await this.applyTimeCorrection(tx, correction);
          }

          return updated;
        }),
    );
  }

  /** ATTENDANCE_UPDATED step: writes the approved time onto the session. */
  private async applyTimeCorrection(
    tx: Parameters<Parameters<ExtendedPrismaClient['$transaction']>[0]>[0],
    correction: {
      attendanceId: string;
      correctionType: string;
      requestedValue: string;
    },
  ): Promise<void> {
    const correctedTime = new Date(correction.requestedValue);

    const session = await tx.attendanceSession.findFirst({
      where: { attendanceId: correction.attendanceId },
      orderBy: { punchIn: 'desc' },
    });
    if (!session) return; // nothing to apply — request recorded for audit anyway

    const isCheckIn =
      correction.correctionType === 'MISSING_CHECK_IN' ||
      correction.correctionType === 'WRONG_CHECK_IN_TIME';

    await tx.attendanceSession.update({
      where: { id: session.id },
      data: isCheckIn
        ? { punchIn: correctedTime }
        : { punchOut: correctedTime, sessionStatus: 'CHECKED_OUT' },
    });
  }
}
