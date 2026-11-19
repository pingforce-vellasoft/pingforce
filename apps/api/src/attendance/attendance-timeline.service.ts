import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ExtendedPrismaClient } from '../prisma/prisma.module';
import { RbacService } from '../rbac/rbac.service';

export type TimelineEventType =
  | 'CHECK_IN'
  | 'BREAK_START'
  | 'BREAK_END'
  | 'TRACKING_GAP_START'
  | 'TRACKING_GAP_END'
  | 'CORRECTION_REQUESTED'
  | 'CORRECTION_DECIDED'
  | 'CHECK_OUT';

export interface TimelineEvent {
  readonly type: TimelineEventType;
  readonly at: Date;
  readonly detail: Record<string, unknown>;
}

export interface SessionTimeline {
  readonly sessionId: string;
  readonly attendanceId: string;
  readonly employee: {
    readonly id: string;
    readonly employeeCode: string | null;
    readonly firstName: string | null;
    readonly lastName: string | null;
  };
  readonly punchIn: Date;
  readonly punchOut: Date | null;
  readonly events: readonly TimelineEvent[];
  readonly tracking: {
    readonly points: number;
    readonly firstAt: Date | null;
    readonly lastAt: Date | null;
  };
}

/**
 * Chronological view of one attendance session for the admin "View
 * timeline" action: punches, breaks, tracking gaps and correction requests,
 * plus a tracking-point summary (raw breadcrumbs stay behind the
 * TRACKING:VIEW_LIVE trail endpoint).
 *
 * Read-only. Visibility follows the same data scope as the attendance logs
 * (DataScope.md §9): a session outside the caller's scope is a 404, never a
 * 403, so ids from other teams or tenants are not confirmed to exist.
 */
@Injectable()
export class AttendanceTimelineService {
  constructor(
    @Inject('IPrismaService') private readonly prisma: ExtendedPrismaClient,
    private readonly rbacService: RbacService,
  ) {}

  async getSessionTimeline(
    user: { tenantId: string; userId: string },
    sessionId: string,
  ): Promise<SessionTimeline> {
    const scope = await this.rbacService.resolveScopeIds(
      user.tenantId,
      user.userId,
      'ATTENDANCE',
      ['READ', 'READ_OWN'],
    );
    const scopeWhere = this.rbacService.employeeScopeWhere(scope);
    if (scopeWhere === null) throw this.notFound();

    const session = await this.prisma.attendanceSession.findFirst({
      where: {
        id: sessionId,
        tenantId: user.tenantId,
        deletedAt: null,
        ...scopeWhere,
      },
      select: {
        id: true,
        attendanceId: true,
        employeeId: true,
        punchIn: true,
        punchOut: true,
        checkInLatitude: true,
        checkInLongitude: true,
        checkOutLatitude: true,
        checkOutLongitude: true,
        gpsAccuracy: true,
        attendanceMethod: true,
        isSpoofed: true,
        punchInDevice: true,
        punchOutDevice: true,
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
    if (!session) throw this.notFound();

    const windowEnd = session.punchOut ?? new Date();
    const tenantId = user.tenantId;

    const [breaks, gaps, corrections, tracking] = await Promise.all([
      this.prisma.attendanceBreak.findMany({
        where: { tenantId, attendanceSessionId: session.id, deletedAt: null },
        orderBy: { startTime: 'asc' },
        select: {
          id: true,
          breakType: true,
          paidBreak: true,
          startTime: true,
          endTime: true,
          durationMinutes: true,
        },
      }),
      this.prisma.trackingGap.findMany({
        where: { tenantId, attendanceSessionId: session.id, deletedAt: null },
        orderBy: { startedAt: 'asc' },
        select: {
          id: true,
          reason: true,
          startedAt: true,
          endedAt: true,
          durationMinutes: true,
          batteryLevel: true,
          isExcused: true,
        },
      }),
      this.prisma.attendanceCorrection.findMany({
        where: {
          tenantId,
          attendanceId: session.attendanceId,
          employeeId: session.employeeId,
          deletedAt: null,
        },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          correctionType: true,
          currentValue: true,
          requestedValue: true,
          reason: true,
          workflowStatus: true,
          approvedAt: true,
          createdAt: true,
        },
      }),
      this.prisma.employeeLocation.aggregate({
        where: {
          tenantId,
          employeeId: session.employeeId,
          capturedAt: { gte: session.punchIn, lte: windowEnd },
        },
        _count: { _all: true },
        _min: { capturedAt: true },
        _max: { capturedAt: true },
      }),
    ]);

    const events: TimelineEvent[] = [
      {
        type: 'CHECK_IN',
        at: session.punchIn,
        detail: {
          latitude: session.checkInLatitude,
          longitude: session.checkInLongitude,
          accuracy: session.gpsAccuracy,
          method: session.attendanceMethod,
          spoofed: session.isSpoofed,
          device: session.punchInDevice,
        },
      },
    ];

    for (const b of breaks) {
      events.push({
        type: 'BREAK_START',
        at: b.startTime,
        detail: { breakId: b.id, breakType: b.breakType, paid: b.paidBreak },
      });
      if (b.endTime) {
        events.push({
          type: 'BREAK_END',
          at: b.endTime,
          detail: { breakId: b.id, durationMinutes: b.durationMinutes },
        });
      }
    }

    for (const g of gaps) {
      events.push({
        type: 'TRACKING_GAP_START',
        at: g.startedAt,
        detail: {
          gapId: g.id,
          reason: g.reason,
          batteryLevel: g.batteryLevel,
          excused: g.isExcused,
        },
      });
      if (g.endedAt) {
        events.push({
          type: 'TRACKING_GAP_END',
          at: g.endedAt,
          detail: { gapId: g.id, durationMinutes: g.durationMinutes },
        });
      }
    }

    for (const c of corrections) {
      events.push({
        type: 'CORRECTION_REQUESTED',
        at: c.createdAt,
        detail: {
          correctionId: c.id,
          correctionType: c.correctionType,
          currentValue: c.currentValue,
          requestedValue: c.requestedValue,
          reason: c.reason,
        },
      });
      if (c.approvedAt) {
        events.push({
          type: 'CORRECTION_DECIDED',
          at: c.approvedAt,
          detail: { correctionId: c.id, status: c.workflowStatus },
        });
      }
    }

    if (session.punchOut) {
      events.push({
        type: 'CHECK_OUT',
        at: session.punchOut,
        detail: {
          latitude: session.checkOutLatitude,
          longitude: session.checkOutLongitude,
          device: session.punchOutDevice,
        },
      });
    }

    // Stable sort: same-instant events keep their insertion order above.
    events.sort((a, b) => a.at.getTime() - b.at.getTime());

    return {
      sessionId: session.id,
      attendanceId: session.attendanceId,
      employee: session.employee,
      punchIn: session.punchIn,
      punchOut: session.punchOut,
      events,
      tracking: {
        points: tracking._count._all,
        firstAt: tracking._min.capturedAt,
        lastAt: tracking._max.capturedAt,
      },
    };
  }

  private notFound(): NotFoundException {
    return new NotFoundException('Attendance session not found');
  }
}
