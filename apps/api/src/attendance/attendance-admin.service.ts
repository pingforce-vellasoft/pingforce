import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ExtendedPrismaClient } from '../prisma/prisma.module';
import { AuditService } from '../audit/audit.service';
import {
  AdjustSessionTimesDto,
  OverrideDayStatusDto,
} from './dto/admin-adjust.dto';
import { creditWorkedMinutes } from './domain/work-minutes';

/**
 * Admin corrections applied directly from the tenant attendance log, for
 * exceptional cases the employee cannot resolve themselves (forgotten
 * check-out, a punch recorded at the wrong time, a day that should read
 * ON_LEAVE despite a stray punch).
 *
 * Every action writes a pre-approved `AttendanceCorrection` capturing the
 * previous value, the new value, the actor and the reason — so an adjusted day
 * is never indistinguishable from one the employee recorded themselves.
 * Manual check-out for a still-open session stays in AttendanceService.
 */
@Injectable()
export class AttendanceAdminService {
  constructor(
    @Inject('IPrismaService') private readonly prisma: ExtendedPrismaClient,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Rewrites punch-in and/or punch-out on one session, then recomputes the
   * day's credited work minutes so payroll figures follow the correction.
   */
  async adjustSessionTimes(admin: any, dto: AdjustSessionTimesDto) {
    if (!dto.punchIn && !dto.punchOut) {
      throw new BadRequestException(
        'Provide punchIn, punchOut, or both to adjust.',
      );
    }

    const session = await this.prisma.attendanceSession.findFirst({
      where: {
        id: dto.sessionId,
        tenantId: admin.tenantId,
        deletedAt: null,
      },
    });
    if (!session) throw new NotFoundException('Attendance session not found');

    const punchIn = dto.punchIn ? new Date(dto.punchIn) : session.punchIn;
    const punchOut = dto.punchOut ? new Date(dto.punchOut) : session.punchOut;

    if (punchOut && punchOut.getTime() <= punchIn.getTime()) {
      throw new BadRequestException('Check-out must be after check-in.');
    }
    // A future punch would produce negative or runaway worked minutes.
    const now = new Date();
    if (punchIn > now || (punchOut && punchOut > now)) {
      throw new BadRequestException('Punch times cannot be in the future.');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Recredit from zero: creditWorkedMinutes increments, so re-running it
      // over an already-credited day would double-count. Reset the day's total
      // and re-derive it from every session after the edit.
      const updated = await tx.attendanceSession.update({
        where: { id: session.id },
        data: {
          punchIn,
          punchOut,
          updatedBy: admin.userId,
        },
      });

      await tx.attendance.update({
        where: { id: session.attendanceId },
        data: { totalWorkMinutes: 0, updatedBy: admin.userId },
      });

      const siblings = await tx.attendanceSession.findMany({
        where: {
          attendanceId: session.attendanceId,
          deletedAt: null,
          punchOut: { not: null },
        },
      });
      for (const s of siblings) {
        await creditWorkedMinutes(tx, s, s.punchOut!);
      }

      const correction = await tx.attendanceCorrection.create({
        data: {
          tenantId: admin.tenantId,
          attendanceId: session.attendanceId,
          employeeId: session.employeeId,
          correctionType: dto.punchOut
            ? 'WRONG_CHECK_OUT_TIME'
            : 'WRONG_CHECK_IN_TIME',
          currentValue: JSON.stringify({
            punchIn: session.punchIn,
            punchOut: session.punchOut,
          }),
          requestedValue: JSON.stringify({ punchIn, punchOut }),
          reason: dto.reason,
          workflowStatus: 'APPROVED',
          approvedBy: admin.userId,
          approvedAt: new Date(),
        },
      });

      return { updated, correction };
    });

    void this.auditService.log({
      tenantId: admin.tenantId,
      actorId: admin.userId,
      module: 'ATTENDANCE',
      entityName: 'attendance_session',
      entityId: session.id,
      action: 'SESSION_TIMES_ADJUSTED',
      oldValue: { punchIn: session.punchIn, punchOut: session.punchOut },
      newValue: { punchIn, punchOut, reason: dto.reason },
    });

    return result.updated;
  }

  /** Sets the day-level status, e.g. marking an off-site day PRESENT. */
  async overrideDayStatus(admin: any, dto: OverrideDayStatusDto) {
    const attendance = await this.prisma.attendance.findFirst({
      where: {
        id: dto.attendanceId,
        tenantId: admin.tenantId,
        deletedAt: null,
      },
    });
    if (!attendance) throw new NotFoundException('Attendance record not found');

    if (attendance.status === dto.status) {
      throw new BadRequestException(
        `This day is already marked ${dto.status}.`,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.attendance.update({
        where: { id: attendance.id },
        data: { status: dto.status, updatedBy: admin.userId },
      });

      await tx.attendanceCorrection.create({
        data: {
          tenantId: admin.tenantId,
          attendanceId: attendance.id,
          employeeId: attendance.employeeId,
          correctionType: 'WRONG_ATTENDANCE_STATUS',
          currentValue: attendance.status,
          requestedValue: dto.status,
          reason: dto.reason,
          workflowStatus: 'APPROVED',
          approvedBy: admin.userId,
          approvedAt: new Date(),
        },
      });

      return updated;
    });

    void this.auditService.log({
      tenantId: admin.tenantId,
      actorId: admin.userId,
      module: 'ATTENDANCE',
      entityName: 'attendance',
      entityId: attendance.id,
      action: 'DAY_STATUS_OVERRIDDEN',
      oldValue: { status: attendance.status },
      newValue: { status: dto.status, reason: dto.reason },
    });

    return result;
  }
}
