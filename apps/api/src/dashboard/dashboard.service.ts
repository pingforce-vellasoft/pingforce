import { Injectable, Logger } from '@nestjs/common';
import { AuthContext, DashboardRepository } from './dashboard.repository';
import { InAppNotificationService } from '../notifications/in-app-notification.service';
import {
  DashboardActivityDto,
  DashboardAttendanceDto,
  DashboardKpiDto,
  DashboardSummaryDto,
  DashboardUserDto,
} from './dto/dashboard-summary.dto';

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD SERVICE  (business logic — DASHBOARD_SPEC.md §4)
// ─────────────────────────────────────────────────────────────────────────────
//
// Composes the Home-screen aggregate from attendance, faults and visits.
// All personal data is scoped to the caller. Failures in any one KPI source
// degrade to an empty card rather than 500-ing the whole screen.

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly repository: DashboardRepository,
    private readonly inApp: InAppNotificationService,
  ) {}

  async getSummary(ctx: AuthContext): Promise<DashboardSummaryDto> {
    const now = new Date();
    const { dayStart, dayEnd } = this.dayBounds(now);

    const employee = await this.repository.findEmployeeByUser(ctx);

    // A user without an employee record (e.g. tenant admin) still gets a
    // valid, mostly-empty dashboard rather than an error.
    if (!employee) {
      return this.emptySummary(ctx, now);
    }

    const isManager = await this.repository.hasDirectReports(
      ctx.tenantId,
      employee.id,
    );

    const [attendanceRow, faults, visits, unread] = await Promise.all([
      this.repository.findTodayAttendance(
        ctx.tenantId,
        employee.id,
        dayStart,
        dayEnd,
      ),
      this.safeFaultCounts(ctx, now),
      this.safeVisitCounts(ctx.tenantId, employee.id, dayStart, dayEnd),
      this.safeUnreadCount(ctx),
    ]);

    const attendance = this.buildAttendance(attendanceRow, now);

    const user: DashboardUserDto = {
      userId: ctx.userId,
      employeeId: employee.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      role: ctx.role,
      department: employee.department?.name ?? null,
      avatarUrl: employee.photograph ?? null,
      isManager,
    };

    return {
      user,
      attendance,
      kpiCards: this.buildKpis(attendance, faults, visits),
      activityFeed: this.buildActivity(attendanceRow, faults),
      unreadNotifications: unread,
      generatedAt: now.toISOString(),
    };
  }

  // ── Attendance hero ────────────────────────────────────────────────────────

  private buildAttendance(
    row: Awaited<ReturnType<DashboardRepository['findTodayAttendance']>> | null,
    now: Date,
  ): DashboardAttendanceDto {
    if (!row) {
      return {
        status: 'noShift',
        sessionId: null,
        checkInTime: null,
        checkOutTime: null,
        shiftName: null,
        shiftStart: null,
        shiftEnd: null,
        totalShiftMinutes: null,
        gracePeriodMinutes: null,
        workedMinutes: null,
        breaksTaken: 0,
        isLate: false,
        minutesLate: null,
      };
    }

    const shift = row.shift;
    const sessions = row.sessions ?? [];
    const firstOpen = sessions.find((s) => s.punchOut === null);
    const active = firstOpen ?? sessions[sessions.length - 1] ?? null;
    const breaksTaken = sessions.reduce(
      (sum, s) => sum + (s.breaks?.length ?? 0),
      0,
    );

    // Status: no session yet → notCheckedIn; an open session → working;
    // every session closed → checkedOut.
    let status: string;
    if (sessions.length === 0) {
      status = 'notCheckedIn';
    } else if (firstOpen) {
      status = 'working';
    } else {
      status = 'checkedOut';
    }

    const checkInTime = active?.punchIn ?? null;
    const checkOutTime =
      status === 'checkedOut'
        ? (sessions[sessions.length - 1]?.punchOut ?? null)
        : null;

    const totalShiftMinutes = shift
      ? this.shiftMinutes(shift.startTime, shift.endTime)
      : null;

    // Elapsed worked minutes across all sessions, capping open sessions at now.
    const workedMinutes = sessions.reduce((sum, s) => {
      const end = s.punchOut ?? now;
      return (
        sum +
        Math.max(0, Math.round((end.getTime() - s.punchIn.getTime()) / 60000))
      );
    }, 0);

    const { isLate, minutesLate } = this.lateness(
      checkInTime,
      shift?.startTime ?? null,
      shift?.gracePeriod ?? 0,
    );

    return {
      status,
      sessionId: active?.id ?? null,
      checkInTime: checkInTime?.toISOString() ?? null,
      checkOutTime: checkOutTime?.toISOString() ?? null,
      shiftName: shift?.name ?? null,
      shiftStart: shift?.startTime ?? null,
      shiftEnd: shift?.endTime ?? null,
      totalShiftMinutes,
      gracePeriodMinutes: shift?.gracePeriod ?? null,
      workedMinutes: sessions.length > 0 ? workedMinutes : null,
      breaksTaken,
      isLate,
      minutesLate,
    };
  }

  // ── KPI cards ────────────────────────────────────────────────────────────

  private buildKpis(
    attendance: DashboardAttendanceDto,
    faults: { open: number; overdue: number },
    visits: { total: number; remaining: number },
  ): DashboardKpiDto[] {
    const cards: DashboardKpiDto[] = [];

    const present =
      attendance.status === 'working' || attendance.status === 'checkedOut';
    cards.push({
      id: 'attendance',
      title: 'Attendance',
      primaryValue: present ? 'Present' : 'Absent',
      label: 'Today',
      iconName: 'fingerprint',
      secondaryLabel: attendance.isLate
        ? `Late ${attendance.minutesLate}m`
        : null,
      severity: attendance.isLate ? 'warning' : 'normal',
      route: '/attendance',
    });

    cards.push({
      id: 'faults',
      title: 'Faults',
      primaryValue: `${faults.open}`,
      label: 'Open Faults',
      iconName: 'build_circle',
      secondaryLabel: faults.overdue > 0 ? `${faults.overdue} Overdue` : null,
      severity: faults.overdue > 0 ? 'critical' : 'normal',
      route: '/faults',
    });

    cards.push({
      id: 'visits',
      title: 'GPS Visits',
      primaryValue: `${visits.total}`,
      label: 'Today',
      iconName: 'location_on',
      secondaryLabel:
        visits.remaining > 0 ? `${visits.remaining} remaining` : null,
      severity: 'normal',
      route: '/visits',
    });

    return cards;
  }

  // ── Activity feed ──────────────────────────────────────────────────────────

  private buildActivity(
    row: Awaited<ReturnType<DashboardRepository['findTodayAttendance']>> | null,
    _faults: { open: number; overdue: number },
  ): DashboardActivityDto[] {
    const items: DashboardActivityDto[] = [];
    const sessions = row?.sessions ?? [];

    for (const s of sessions) {
      items.push({
        id: `checkin-${s.id}`,
        type: 'checkIn',
        title: `Checked in at ${this.timeLabel(s.punchIn)}`,
        subtitle: null,
        timestamp: s.punchIn.toISOString(),
        route: null,
      });
      if (s.punchOut) {
        items.push({
          id: `checkout-${s.id}`,
          type: 'checkOut',
          title: `Checked out at ${this.timeLabel(s.punchOut)}`,
          subtitle: null,
          timestamp: s.punchOut.toISOString(),
          route: null,
        });
      }
    }

    // Newest first.
    items.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return items;
  }

  // ── Degradation helpers ────────────────────────────────────────────────────

  private async safeFaultCounts(ctx: AuthContext, now: Date) {
    try {
      return await this.repository.faultCounts(ctx.tenantId, ctx.userId, now);
    } catch (err) {
      this.logger.warn(`fault counts failed: ${(err as Error).message}`);
      return { open: 0, overdue: 0 };
    }
  }

  private async safeVisitCounts(
    tenantId: string,
    employeeId: string,
    dayStart: Date,
    dayEnd: Date,
  ) {
    try {
      return await this.repository.visitCounts(
        tenantId,
        employeeId,
        dayStart,
        dayEnd,
      );
    } catch (err) {
      this.logger.warn(`visit counts failed: ${(err as Error).message}`);
      return { total: 0, completed: 0, remaining: 0 };
    }
  }

  private async safeUnreadCount(ctx: AuthContext): Promise<number> {
    try {
      return await this.inApp.unreadCount(ctx.tenantId, ctx.userId);
    } catch (err) {
      this.logger.warn(`unread count failed: ${(err as Error).message}`);
      return 0;
    }
  }

  private emptySummary(ctx: AuthContext, now: Date): DashboardSummaryDto {
    return {
      user: {
        userId: ctx.userId,
        employeeId: null,
        firstName: '',
        lastName: '',
        role: ctx.role,
        department: null,
        avatarUrl: null,
        isManager: false,
      },
      attendance: this.buildAttendance(null, now),
      kpiCards: [],
      activityFeed: [],
      unreadNotifications: 0,
      generatedAt: now.toISOString(),
    };
  }

  // ── Pure time helpers ───────────────────────────────────────────────────────

  private dayBounds(now: Date): { dayStart: Date; dayEnd: Date } {
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(now);
    dayEnd.setHours(23, 59, 59, 999);
    return { dayStart, dayEnd };
  }

  /** Minutes between two "HH:mm" strings; handles overnight shifts. */
  private shiftMinutes(start: string, end: string): number | null {
    const s = this.parseHm(start);
    const e = this.parseHm(end);
    if (s === null || e === null) return null;
    const diff = e - s;
    return diff >= 0 ? diff : diff + 24 * 60;
  }

  private lateness(
    checkIn: Date | null,
    shiftStart: string | null,
    graceMinutes: number,
  ): { isLate: boolean; minutesLate: number | null } {
    if (!checkIn || !shiftStart) return { isLate: false, minutesLate: null };
    const startMin = this.parseHm(shiftStart);
    if (startMin === null) return { isLate: false, minutesLate: null };
    const checkInMin = checkIn.getHours() * 60 + checkIn.getMinutes();
    const late = checkInMin - (startMin + graceMinutes);
    return late > 0
      ? { isLate: true, minutesLate: late }
      : { isLate: false, minutesLate: null };
  }

  private parseHm(hm: string): number | null {
    const parts = hm.split(':');
    if (parts.length < 2) return null;
    const h = Number(parts[0]);
    const m = Number(parts[1]);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  }

  private timeLabel(dt: Date): string {
    const h24 = dt.getHours();
    const h = h24 % 12 === 0 ? 12 : h24 % 12;
    const m = dt.getMinutes().toString().padStart(2, '0');
    const ampm = h24 >= 12 ? 'PM' : 'AM';
    return `${h}:${m} ${ampm}`;
  }
}
