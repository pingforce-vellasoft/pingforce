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
        breakMinutes: 0,
        breakStartTime: null,
        overtimeMinutes: 0,
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

    // Status: no session yet → notCheckedIn; an open session → working; every
    // session closed → checkedOut.
    //
    // Breaks were removed, so there is no longer an `onBreak` status. A session
    // still carrying an unclosed break row from before the removal reports
    // `working` — the client has no onBreak state to render, and the row is
    // closed by auto-checkout.
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

    // Elapsed session minutes across all sessions, capping open sessions at now.
    const sessionMinutes = sessions.reduce((sum, s) => {
      const end = s.punchOut ?? now;
      return (
        sum +
        Math.max(0, Math.round((end.getTime() - s.punchIn.getTime()) / 60000))
      );
    }, 0);

    // Break minutes today. An open break is measured up to `now` and a closed
    // one prefers its stored duration, falling back to its own timestamps.
    const breakMinutesFor = (b: {
      startTime: Date;
      endTime: Date | null;
      durationMinutes: number | null;
    }): number => {
      if (b.endTime === null) {
        return Math.max(
          0,
          Math.round((now.getTime() - b.startTime.getTime()) / 60000),
        );
      }
      return (
        b.durationMinutes ??
        Math.max(
          0,
          Math.round((b.endTime.getTime() - b.startTime.getTime()) / 60000),
        )
      );
    };

    const allBreaks = sessions.flatMap((s) => s.breaks ?? []);
    const breakMinutes = allBreaks.reduce(
      (sum, b) => sum + breakMinutesFor(b),
      0,
    );

    // Worked = session time minus UNPAID breaks, matching creditWorkedMinutes
    // (the figure actually persisted at check-out). Counting break time as
    // worked here made the home card disagree with the attendance screen and
    // overstated the shift-progress bar.
    const unpaidBreakMinutes = allBreaks
      .filter((b) => !b.paidBreak)
      .reduce((sum, b) => sum + breakMinutesFor(b), 0);

    const workedMinutes = Math.max(0, sessionMinutes - unpaidBreakMinutes);

    // Overtime is worked time beyond the scheduled shift length.
    const overtimeMinutes =
      totalShiftMinutes && totalShiftMinutes > 0
        ? Math.max(0, workedMinutes - totalShiftMinutes)
        : 0;

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
      breakMinutes,
      // Always null since breaks were removed; retained so the response shape
      // stays stable for clients still reading the field.
      breakStartTime: null,
      overtimeMinutes,
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
        // The clock time is deliberately not rendered here: the server runs in
        // UTC, so a formatted label would disagree with the device-local time
        // shown on the attendance hero card. Clients format `timestamp`.
        title: 'Checked in',
        subtitle: null,
        timestamp: s.punchIn.toISOString(),
        route: null,
      });
      if (s.punchOut) {
        items.push({
          id: `checkout-${s.id}`,
          type: 'checkOut',
          title: 'Checked out',
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
}
