/// Day-grouped attendance for one employee-day (GET /attendance/daily-logs).
///
/// Figures are computed server-side so the admin table, the employee app and
/// payroll all read the same numbers — `workedMinutes` is already net of unpaid
/// breaks, so the client must never recompute it.
class DailyAttendanceRow {
  const DailyAttendanceRow({
    required this.attendanceId,
    required this.date,
    required this.status,
    required this.isOngoing,
    required this.employeeName,
    required this.workedMinutes,
    required this.breakMinutes,
    required this.overtimeMinutes,
    required this.isLate,
    required this.sessionCount,
    required this.exceptionCount,
    this.employeeCode,
    this.departmentName,
    this.shiftName,
    this.checkInTime,
    this.checkOutTime,
    this.minutesLate,
  });

  final String attendanceId;
  final DateTime? date;

  /// PRESENT | ABSENT | LATE | HALF_DAY | ON_LEAVE
  final String status;

  /// True while the employee is still checked in — the day is not final.
  final bool isOngoing;

  final String employeeName;
  final String? employeeCode;
  final String? departmentName;
  final String? shiftName;
  final DateTime? checkInTime;
  final DateTime? checkOutTime;
  final int workedMinutes;
  final int breakMinutes;
  final int overtimeMinutes;
  final bool isLate;
  final int? minutesLate;
  final int sessionCount;

  /// Number of flagged exceptions on the day — the admin's "needs a look" cue.
  final int exceptionCount;

  bool get hasExceptions => exceptionCount > 0;
}

/// Tenant-wide totals for the queried range, computed server-side.
class DailyAttendanceSummary {
  const DailyAttendanceSummary({
    this.daysCounted = 0,
    this.presentDays = 0,
    this.absentDays = 0,
    this.lateDays = 0,
    this.workedMinutes = 0,
    this.overtimeMinutes = 0,
    this.daysWithExceptions = 0,
  });

  final int daysCounted;
  final int presentDays;
  final int absentDays;
  final int lateDays;
  final int workedMinutes;
  final int overtimeMinutes;
  final int daysWithExceptions;
}

/// One page of the day-grouped log.
class DailyAttendancePage {
  const DailyAttendancePage({
    required this.rows,
    required this.total,
    required this.summary,
  });

  final List<DailyAttendanceRow> rows;
  final int total;
  final DailyAttendanceSummary summary;
}

/// A punch-level attendance record (GET /attendance/logs) — the raw session
/// view, as opposed to the day roll-up above.
class AttendanceLogRow {
  const AttendanceLogRow({
    required this.id,
    required this.employeeName,
    this.employeeCode,
    this.punchIn,
    this.punchOut,
    this.sessionStatus,
    this.attendanceMethod,
    this.workedMinutes,
    this.isSpoofed = false,
  });

  final String id;
  final String employeeName;
  final String? employeeCode;
  final DateTime? punchIn;
  final DateTime? punchOut;
  final String? sessionStatus;
  final String? attendanceMethod;
  final int? workedMinutes;

  /// The server's mock-location verdict for the punch. Worth surfacing: a
  /// spoofed punch is the single strongest fraud signal in the log.
  final bool isSpoofed;
}

/// One page of punch-level logs.
class AttendanceLogPage {
  const AttendanceLogPage({required this.rows, required this.total});

  final List<AttendanceLogRow> rows;
  final int total;
}
