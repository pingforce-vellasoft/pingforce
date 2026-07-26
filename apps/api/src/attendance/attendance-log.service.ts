import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ExtendedPrismaClient } from '../prisma/prisma.module';
import { RbacService } from '../rbac/rbac.service';
import { AttendanceDailyLogQueryDto } from './dto/attendance-daily-log.dto';
import { resolveState, SessionState } from './domain/session-state';

/** Minutes between two instants, floored at zero. */
function minutesBetween(from: Date, to: Date): number {
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / 60000));
}

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

type BreakRow = {
  id: string;
  breakType: string;
  paidBreak: boolean;
  startTime: Date;
  endTime: Date | null;
  durationMinutes: number | null;
};

/**
 * Day-grouped attendance log, shared by the employee's own history and the
 * tenant-wide admin table.
 *
 * `GET /attendance/logs` returns one row per session, so a day with two
 * sessions reads as two days. This service groups by employee-day and derives
 * the figures both audiences actually review: worked time net of unpaid
 * breaks, break totals, lateness, and the exceptions that need admin action.
 */
@Injectable()
export class AttendanceLogService {
  constructor(
    @Inject('IPrismaService') private readonly prisma: ExtendedPrismaClient,
    private readonly rbacService: RbacService,
  ) {}

  async getDailyLogs(user: any, query: AttendanceDailyLogQueryDto) {
    // Data scope (DataScope.md §9): employees see their own days, managers
    // their team, HR/tenant admins the whole tenant. Broadest of READ/READ_OWN
    // wins. Never widen this from the query string.
    const scope = await this.rbacService.resolveScopeIds(
      user.tenantId,
      user.userId,
      'ATTENDANCE',
      ['READ', 'READ_OWN'],
    );
    const scopeWhere = this.rbacService.employeeScopeWhere(scope);
    if (scopeWhere === null) {
      return {
        data: [],
        total: 0,
        page: query.page,
        limit: query.limit,
        summary: this.emptySummary(),
      };
    }

    const to = query.to ? startOfDay(new Date(query.to)) : startOfDay(new Date());
    const from = query.from
      ? startOfDay(new Date(query.from))
      : startOfDay(new Date(to.getTime() - 29 * 86400000));

    // Half-open upper bound so the whole `to` day is included regardless of
    // how attendanceDate was normalised on write.
    const toExclusive = new Date(to);
    toExclusive.setDate(toExclusive.getDate() + 1);

    const where: any = {
      tenantId: user.tenantId,
      deletedAt: null,
      attendanceDate: { gte: from, lt: toExclusive },
      ...scopeWhere,
    };

    if (query.employeeId) where.employeeId = query.employeeId;
    if (query.status) where.status = query.status;

    if (query.search) {
      const term = query.search;
      where.employee = {
        OR: [
          { employeeCode: { contains: term, mode: 'insensitive' } },
          { firstName: { contains: term, mode: 'insensitive' } },
          { lastName: { contains: term, mode: 'insensitive' } },
        ],
      };
    }

    const skip = (query.page - 1) * query.limit;

    const [rows, total] = await Promise.all([
      this.prisma.attendance.findMany({
        where,
        orderBy: [{ attendanceDate: 'desc' }],
        skip,
        take: query.limit,
        include: {
          shift: {
            select: {
              name: true,
              startTime: true,
              endTime: true,
              gracePeriod: true,
            },
          },
          employee: {
            select: {
              id: true,
              employeeCode: true,
              firstName: true,
              lastName: true,
              department: { select: { id: true, name: true } },
            },
          },
          sessions: {
            where: { deletedAt: null },
            orderBy: { punchIn: 'asc' },
            include: {
              breaks: {
                where: { deletedAt: null },
                orderBy: { startTime: 'asc' },
              },
            },
          },
          corrections: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              correctionType: true,
              workflowStatus: true,
              reason: true,
              createdAt: true,
            },
          },
        },
      }),
      this.prisma.attendance.count({ where }),
    ]);

    const now = new Date();
    const employeeIds = [...new Set(rows.map((r) => r.employeeId))];

    // Tracking gaps overlapping the window, so a day can show that location
    // was off without an extra query per row.
    const gaps = employeeIds.length
      ? await this.prisma.trackingGap.findMany({
          where: {
            tenantId: user.tenantId,
            employeeId: { in: employeeIds },
            deletedAt: null,
            startedAt: { gte: from, lt: toExclusive },
          },
          select: {
            employeeId: true,
            startedAt: true,
            endedAt: true,
            durationMinutes: true,
            reason: true,
            isExcused: true,
          },
        })
      : [];

    const data = rows.map((row) => this.buildDay(row, gaps, now));

    const filtered = query.exceptionsOnly
      ? data.filter((d) => d.exceptions.length > 0)
      : data;

    return {
      data: filtered,
      total: query.exceptionsOnly ? filtered.length : total,
      page: query.page,
      limit: query.limit,
      summary: this.buildSummary(data),
      range: { from: from.toISOString(), to: to.toISOString() },
    };
  }

  // ── Row construction ───────────────────────────────────────────────────────

  private buildDay(row: any, gaps: any[], now: Date) {
    const sessions = row.sessions ?? [];
    const allBreaks: BreakRow[] = sessions.flatMap(
      (s: any) => s.breaks ?? [],
    );

    const openSession = sessions.find((s: any) => s.punchOut === null) ?? null;
    const isOngoing = openSession !== null;

    // Session minutes: an open session is measured to now, so today's row
    // shows live progress rather than zero.
    const sessionMinutes = sessions.reduce(
      (sum: number, s: any) =>
        sum + minutesBetween(s.punchIn, s.punchOut ?? now),
      0,
    );

    const breakMinutesFor = (b: BreakRow): number =>
      b.endTime === null
        ? minutesBetween(b.startTime, now)
        : (b.durationMinutes ?? minutesBetween(b.startTime, b.endTime));

    const breakMinutes = allBreaks.reduce(
      (sum, b) => sum + breakMinutesFor(b),
      0,
    );
    const unpaidBreakMinutes = allBreaks
      .filter((b) => !b.paidBreak)
      .reduce((sum, b) => sum + breakMinutesFor(b), 0);

    // Worked = session time minus unpaid breaks, matching creditWorkedMinutes
    // (what payroll actually uses). `totalWorkMinutes` is only credited at
    // check-out, so it is authoritative for closed days and zero for open ones.
    const workedMinutes = isOngoing
      ? Math.max(0, sessionMinutes - unpaidBreakMinutes)
      : (row.totalWorkMinutes ?? Math.max(0, sessionMinutes - unpaidBreakMinutes));

    const shiftMinutes = row.shift
      ? this.shiftMinutes(row.shift.startTime, row.shift.endTime)
      : null;

    const firstPunchIn = sessions.length > 0 ? sessions[0].punchIn : null;
    const closedOuts = sessions
      .map((s: any) => s.punchOut)
      .filter((p: Date | null): p is Date => p !== null);
    const lastPunchOut =
      closedOuts.length > 0
        ? closedOuts.reduce((a: Date, b: Date) => (a > b ? a : b))
        : null;

    const { isLate, minutesLate } = this.lateness(
      firstPunchIn,
      row.shift?.startTime ?? null,
      row.shift?.gracePeriod ?? 0,
    );

    const dayGaps = gaps.filter(
      (g) =>
        g.employeeId === row.employeeId &&
        startOfDay(g.startedAt).getTime() ===
          startOfDay(row.attendanceDate).getTime(),
    );
    const trackingGapMinutes = dayGaps.reduce(
      (sum, g) =>
        sum +
        (g.durationMinutes ?? minutesBetween(g.startedAt, g.endedAt ?? now)),
      0,
    );

    const exceptions = this.buildExceptions({
      row,
      sessions,
      openSession,
      isOngoing,
      shiftMinutes,
      workedMinutes,
      isLate,
      dayGaps,
      now,
    });

    return {
      attendanceId: row.id,
      date: row.attendanceDate,
      status: row.status,
      isOngoing,

      employee: {
        id: row.employee.id,
        employeeCode: row.employee.employeeCode,
        name: [row.employee.firstName, row.employee.lastName]
          .filter(Boolean)
          .join(' '),
        departmentName: row.employee.department?.name ?? null,
      },

      shift: row.shift
        ? {
            name: row.shift.name,
            startTime: row.shift.startTime,
            endTime: row.shift.endTime,
            gracePeriodMinutes: row.shift.gracePeriod,
            totalMinutes: shiftMinutes,
          }
        : null,

      checkInTime: firstPunchIn,
      checkOutTime: lastPunchOut,
      workedMinutes,
      breakMinutes,
      breaksTaken: allBreaks.length,
      overtimeMinutes:
        row.overtimeMinutes ??
        (shiftMinutes ? Math.max(0, workedMinutes - shiftMinutes) : 0),
      shortfallMinutes: shiftMinutes
        ? Math.max(0, shiftMinutes - workedMinutes)
        : 0,
      isLate,
      minutesLate,

      sessionCount: sessions.length,
      sessions: sessions.map((s: any) => ({
        id: s.id,
        punchIn: s.punchIn,
        punchOut: s.punchOut,
        sessionStatus: resolveState(s.sessionStatus),
        attendanceMethod: s.attendanceMethod,
        isSpoofed: s.isSpoofed,
        checkInLatitude: s.checkInLatitude,
        checkInLongitude: s.checkInLongitude,
        checkOutLatitude: s.checkOutLatitude,
        checkOutLongitude: s.checkOutLongitude,
        breaks: (s.breaks ?? []).map((b: BreakRow) => ({
          id: b.id,
          breakType: b.breakType,
          paidBreak: b.paidBreak,
          startTime: b.startTime,
          endTime: b.endTime,
          durationMinutes: b.durationMinutes ?? breakMinutesFor(b),
        })),
      })),

      tracking: {
        gapCount: dayGaps.length,
        gapMinutes: trackingGapMinutes,
        // An excused gap still shows, but flagged, so admins can tell a
        // reviewed low-battery device from an unexplained blackout.
        allExcused:
          dayGaps.length > 0 && dayGaps.every((g) => g.isExcused),
      },

      corrections: row.corrections ?? [],
      exceptions,
    };
  }

  /**
   * Conditions a reviewer should look at. Exceptions are advisory — they never
   * alter the stored figures, they only mark a day as needing a human.
   */
  private buildExceptions(ctx: {
    row: any;
    sessions: any[];
    openSession: any;
    isOngoing: boolean;
    shiftMinutes: number | null;
    workedMinutes: number;
    isLate: boolean;
    dayGaps: any[];
    now: Date;
  }): { code: string; severity: string; detail: string }[] {
    const out: { code: string; severity: string; detail: string }[] = [];
    const isToday =
      startOfDay(ctx.row.attendanceDate).getTime() ===
      startOfDay(ctx.now).getTime();

    // An open session on a past day means the employee never checked out.
    if (ctx.isOngoing && !isToday) {
      out.push({
        code: 'MISSING_CHECK_OUT',
        severity: 'high',
        detail: 'Session left open — no check-out was recorded for this day.',
      });
    }

    if (ctx.openSession && resolveState(ctx.openSession.sessionStatus) ===
        SessionState.ON_BREAK && !isToday) {
      out.push({
        code: 'BREAK_NOT_ENDED',
        severity: 'medium',
        detail: 'Break was never ended before the day closed.',
      });
    }

    if (ctx.sessions.some((s: any) => s.isSpoofed)) {
      out.push({
        code: 'MOCK_LOCATION',
        severity: 'high',
        detail: 'A punch on this day was flagged as a mocked location.',
      });
    }

    if (ctx.sessions.some((s: any) => s.attendanceMethod === 'MANUAL')) {
      out.push({
        code: 'MANUAL_PUNCH',
        severity: 'low',
        detail: 'This day includes an admin-entered punch.',
      });
    }

    const unexcusedGaps = ctx.dayGaps.filter((g) => !g.isExcused);
    if (unexcusedGaps.length > 0) {
      const mins = unexcusedGaps.reduce(
        (sum, g) =>
          sum +
          (g.durationMinutes ??
            minutesBetween(g.startedAt, g.endedAt ?? ctx.now)),
        0,
      );
      out.push({
        code: 'TRACKING_GAP',
        severity: mins >= 60 ? 'high' : 'medium',
        detail: `Location tracking was unavailable for ${mins} minute(s).`,
      });
    }

    if (
      ctx.shiftMinutes &&
      !ctx.isOngoing &&
      ctx.sessions.length > 0 &&
      ctx.workedMinutes < ctx.shiftMinutes / 2
    ) {
      out.push({
        code: 'SHORT_DAY',
        severity: 'medium',
        detail: 'Worked less than half the scheduled shift.',
      });
    }

    if (ctx.isLate) {
      out.push({
        code: 'LATE_ARRIVAL',
        severity: 'low',
        detail: 'Checked in after the shift grace period.',
      });
    }

    return out;
  }

  // ── Aggregates ─────────────────────────────────────────────────────────────

  private buildSummary(days: any[]) {
    const present = days.filter((d) => d.status === 'PRESENT').length;
    const absent = days.filter((d) => d.status === 'ABSENT').length;
    const late = days.filter((d) => d.isLate).length;
    const workedMinutes = days.reduce((s, d) => s + d.workedMinutes, 0);
    const overtimeMinutes = days.reduce((s, d) => s + d.overtimeMinutes, 0);
    const breakMinutes = days.reduce((s, d) => s + d.breakMinutes, 0);
    const withExceptions = days.filter((d) => d.exceptions.length > 0).length;

    return {
      daysCounted: days.length,
      presentDays: present,
      absentDays: absent,
      lateDays: late,
      workedMinutes,
      overtimeMinutes,
      breakMinutes,
      daysWithExceptions: withExceptions,
      averageWorkedMinutes:
        days.length > 0 ? Math.round(workedMinutes / days.length) : 0,
    };
  }

  private emptySummary() {
    return {
      daysCounted: 0,
      presentDays: 0,
      absentDays: 0,
      lateDays: 0,
      workedMinutes: 0,
      overtimeMinutes: 0,
      breakMinutes: 0,
      daysWithExceptions: 0,
      averageWorkedMinutes: 0,
    };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Scheduled shift length in minutes, handling overnight shifts. */
  private shiftMinutes(start: string | null, end: string | null): number | null {
    if (!start || !end) return null;
    const toMin = (hhmm: string) => {
      const [h, m] = hhmm.split(':').map(Number);
      return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
    };
    const s = toMin(start);
    const e = toMin(end);
    if (s === null || e === null) return null;
    // An end before the start means the shift crosses midnight.
    return e >= s ? e - s : 24 * 60 - s + e;
  }

  private lateness(
    checkIn: Date | null,
    shiftStart: string | null,
    graceMinutes: number,
  ): { isLate: boolean; minutesLate: number | null } {
    if (!checkIn || !shiftStart) return { isLate: false, minutesLate: null };
    const [h, m] = shiftStart.split(':').map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) {
      return { isLate: false, minutesLate: null };
    }
    const due = new Date(checkIn);
    due.setHours(h, m, 0, 0);
    const diff = Math.round((checkIn.getTime() - due.getTime()) / 60000);
    const late = diff > graceMinutes;
    return { isLate: late, minutesLate: late ? diff : null };
  }
}
