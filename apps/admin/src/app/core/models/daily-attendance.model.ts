/**
 * Day-grouped attendance log (GET /api/v1/attendance/daily-logs).
 *
 * One row per employee-day. Figures are computed server-side so the admin
 * table, the employee app and payroll all read the same numbers — in
 * particular `workedMinutes` is already net of unpaid breaks.
 */

export interface DailyAttendanceBreak {
  id: string;
  breakType: string;
  paidBreak: boolean;
  startTime: string;
  endTime: string | null;
  durationMinutes: number | null;
}

export interface DailyAttendanceSession {
  id: string;
  punchIn: string;
  punchOut: string | null;
  sessionStatus: string;
  attendanceMethod: string | null;
  isSpoofed: boolean;
  checkInLatitude: number | null;
  checkInLongitude: number | null;
  checkOutLatitude: number | null;
  checkOutLongitude: number | null;
  breaks: DailyAttendanceBreak[];
}

export interface DailyAttendanceException {
  code: string;
  severity: 'low' | 'medium' | 'high';
  detail: string;
}

export interface DailyAttendanceCorrection {
  id: string;
  correctionType: string;
  workflowStatus: string;
  reason: string | null;
  createdAt: string;
}

export interface DailyAttendanceRow {
  attendanceId: string;
  date: string;
  status: string;
  isOngoing: boolean;

  employee: {
    id: string;
    employeeCode: string | null;
    name: string;
    departmentName: string | null;
  };

  shift: {
    name: string;
    startTime: string;
    endTime: string;
    gracePeriodMinutes: number;
    totalMinutes: number | null;
  } | null;

  checkInTime: string | null;
  checkOutTime: string | null;
  workedMinutes: number;
  breakMinutes: number;
  breaksTaken: number;
  overtimeMinutes: number;
  shortfallMinutes: number;
  isLate: boolean;
  minutesLate: number | null;

  sessionCount: number;
  sessions: DailyAttendanceSession[];

  tracking: {
    gapCount: number;
    gapMinutes: number;
    allExcused: boolean;
  };

  corrections: DailyAttendanceCorrection[];
  exceptions: DailyAttendanceException[];
}

export interface DailyAttendanceSummary {
  daysCounted: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  workedMinutes: number;
  overtimeMinutes: number;
  breakMinutes: number;
  daysWithExceptions: number;
  averageWorkedMinutes: number;
}

export interface DailyAttendanceResponse {
  data: DailyAttendanceRow[];
  total: number;
  page: number;
  limit: number;
  summary: DailyAttendanceSummary;
  range?: { from: string; to: string };
}
