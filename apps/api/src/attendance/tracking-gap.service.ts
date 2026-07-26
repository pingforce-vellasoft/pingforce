import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ExtendedPrismaClient } from '../prisma/prisma.module';
import { AuditService } from '../audit/audit.service';
import {
  OpenTrackingGapDto,
  ReviewExemptionDto,
  RequestExemptionDto,
} from './dto/tracking-gap.dto';

/**
 * Tracking gaps and per-device exemptions.
 *
 * A gap is opened by the mobile client the first time background capture fails
 * for a reason that is not a transient fix timeout (location services off,
 * permission revoked, OS killed the service) and closed when capture resumes
 * or the session ends. Recording them gives managers and payroll an audit
 * trail instead of an unexplained blank stretch on the live map.
 *
 * Exemptions relieve a specific handset whose battery cannot sustain a shift
 * of periodic GPS fixes. They are raised on the employee's behalf and granted
 * by an admin after verifying the hardware — the employee-facing app does not
 * advertise them, since an easily self-served exemption is an easy way to
 * avoid being tracked at all.
 */
@Injectable()
export class TrackingGapService {
  constructor(
    @Inject('IPrismaService') private readonly prisma: ExtendedPrismaClient,
    private readonly auditService: AuditService,
  ) {}

  private async requireEmployee(user: any) {
    const employee = await this.prisma.employee.findUnique({
      where: { userId: user.userId },
      select: { id: true, tenantId: true },
    });
    if (!employee) throw new UnauthorizedException('User is not an employee');
    return employee;
  }

  /**
   * Opens a gap, or returns the one already open. Idempotent so a client that
   * retries on every failed capture does not create a row per tick.
   */
  async openGap(user: any, dto: OpenTrackingGapDto) {
    const employee = await this.requireEmployee(user);

    const existing = await this.prisma.trackingGap.findFirst({
      where: {
        tenantId: employee.tenantId,
        employeeId: employee.id,
        endedAt: null,
        deletedAt: null,
      },
    });
    if (existing) return existing;

    // A gap on an exempt device is recorded but pre-excused, so the audit
    // trail stays complete while the day does not surface as an exception.
    const isExcused = dto.deviceId
      ? await this.hasActiveExemption(
          employee.tenantId,
          employee.id,
          dto.deviceId,
        )
      : false;

    return this.prisma.trackingGap.create({
      data: {
        tenantId: employee.tenantId,
        employeeId: employee.id,
        attendanceSessionId: dto.attendanceSessionId ?? null,
        reason: dto.reason,
        startedAt: dto.startedAt ? new Date(dto.startedAt) : new Date(),
        batteryLevel: dto.batteryLevel ?? null,
        deviceId: dto.deviceId ?? null,
        isExcused,
      },
    });
  }

  /** Closes the employee's open gap, stamping its duration. */
  async closeGap(user: any) {
    const employee = await this.requireEmployee(user);

    const open = await this.prisma.trackingGap.findFirst({
      where: {
        tenantId: employee.tenantId,
        employeeId: employee.id,
        endedAt: null,
        deletedAt: null,
      },
    });
    if (!open) return null;

    const endedAt = new Date();
    return this.prisma.trackingGap.update({
      where: { id: open.id },
      data: {
        endedAt,
        durationMinutes: Math.max(
          0,
          Math.round((endedAt.getTime() - open.startedAt.getTime()) / 60000),
        ),
      },
    });
  }

  private async hasActiveExemption(
    tenantId: string,
    employeeId: string,
    deviceId: string,
  ): Promise<boolean> {
    const now = new Date();
    const found = await this.prisma.deviceTrackingExemption.findFirst({
      where: {
        tenantId,
        employeeId,
        deviceId,
        status: 'APPROVED',
        deletedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: { id: true },
    });
    return found !== null;
  }

  // ── Exemptions ─────────────────────────────────────────────────────────────

  /**
   * Raises an exemption request for one device. Callable by a manager/admin on
   * the employee's behalf, or by the employee through support — not surfaced
   * as a self-service action in the employee app.
   */
  async requestExemption(user: any, dto: RequestExemptionDto) {
    const employee = await this.prisma.employee.findFirst({
      where: {
        id: dto.employeeId,
        tenantId: user.tenantId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const duplicate = await this.prisma.deviceTrackingExemption.findFirst({
      where: {
        tenantId: user.tenantId,
        employeeId: dto.employeeId,
        deviceId: dto.deviceId,
        status: { in: ['PENDING', 'APPROVED'] },
        deletedAt: null,
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new BadRequestException(
        'An open or active exemption already exists for this device.',
      );
    }

    return this.prisma.deviceTrackingExemption.create({
      data: {
        tenantId: user.tenantId,
        employeeId: dto.employeeId,
        deviceId: dto.deviceId,
        reason: dto.reason,
        notes: dto.notes ?? null,
        status: 'PENDING',
        requestedBy: user.userId,
      },
    });
  }

  async listExemptions(user: any, status?: string) {
    return this.prisma.deviceTrackingExemption.findMany({
      where: {
        tenantId: user.tenantId,
        deletedAt: null,
        ...(status ? { status } : {}),
      },
      orderBy: { requestedAt: 'desc' },
      take: 200,
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /** Approves, rejects or revokes an exemption. Admin-only via RBAC. */
  async reviewExemption(admin: any, id: string, dto: ReviewExemptionDto) {
    const exemption = await this.prisma.deviceTrackingExemption.findFirst({
      where: { id, tenantId: admin.tenantId, deletedAt: null },
    });
    if (!exemption) throw new NotFoundException('Exemption not found');

    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    if (dto.status === 'APPROVED' && expiresAt && expiresAt <= new Date()) {
      throw new BadRequestException('Expiry must be in the future.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.deviceTrackingExemption.update({
        where: { id: exemption.id },
        data: {
          status: dto.status,
          reviewedBy: admin.userId,
          reviewedAt: new Date(),
          reviewNotes: dto.reviewNotes ?? null,
          expiresAt,
        },
      });

      // Approving retroactively excuses gaps already recorded for this device,
      // so a day under review stops flagging once the hardware is accepted.
      if (dto.status === 'APPROVED') {
        await tx.trackingGap.updateMany({
          where: {
            tenantId: admin.tenantId,
            employeeId: exemption.employeeId,
            deviceId: exemption.deviceId,
            deletedAt: null,
          },
          data: { isExcused: true },
        });
      }

      return row;
    });

    void this.auditService.log({
      tenantId: admin.tenantId,
      actorId: admin.userId,
      module: 'ATTENDANCE',
      entityName: 'device_tracking_exemption',
      entityId: exemption.id,
      action: `EXEMPTION_${dto.status}`,
      oldValue: { status: exemption.status },
      newValue: { status: dto.status, expiresAt, notes: dto.reviewNotes },
    });

    return updated;
  }
}
