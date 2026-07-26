// Day-grouped attendance log models (GET /attendance/daily-logs).
//
// One entry per day, not per session: a day with a mid-shift check-out and a
// return is a single row carrying both sessions.

enum AttendanceEntryStatus { present, working, absent, leave, halfDay }

class AttendanceBreakRow {
  const AttendanceBreakRow({
    required this.id,
    required this.breakType,
    required this.paidBreak,
    required this.startTime,
    this.endTime,
    this.durationMinutes,
  });

  final String id;
  final String breakType;
  final bool paidBreak;
  final DateTime startTime;
  final DateTime? endTime;
  final int? durationMinutes;
}

class AttendanceSessionRow {
  const AttendanceSessionRow({
    required this.id,
    required this.punchIn,
    this.punchOut,
    required this.sessionStatus,
    this.attendanceMethod,
    this.breaks = const [],
  });

  final String id;
  final DateTime punchIn;
  final DateTime? punchOut;
  final String sessionStatus;
  final String? attendanceMethod;
  final List<AttendanceBreakRow> breaks;

  bool get isOpen => punchOut == null;
}

/// A condition on the day that a reviewer should look at.
class AttendanceException {
  const AttendanceException({
    required this.code,
    required this.severity,
    required this.detail,
  });

  final String code;
  final String severity; // low | medium | high
  final String detail;

  /// Short label for the chip shown on the row.
  String get label => switch (code) {
        'MISSING_CHECK_OUT' => 'No check-out',
        'BREAK_NOT_ENDED' => 'Break not ended',
        'MOCK_LOCATION' => 'Mock location',
        'MANUAL_PUNCH' => 'Manual entry',
        'TRACKING_GAP' => 'Location gap',
        'SHORT_DAY' => 'Short day',
        'LATE_ARRIVAL' => 'Late',
        _ => code,
      };
}

class AttendanceHistoryEntry {
  const AttendanceHistoryEntry({
    required this.attendanceId,
    required this.date,
    required this.status,
    required this.isOngoing,
    this.checkIn,
    this.checkOut,
    this.workedMinutes = 0,
    this.breakMinutes = 0,
    this.breaksTaken = 0,
    this.overtimeMinutes = 0,
    this.shortfallMinutes = 0,
    this.isLate = false,
    this.minutesLate,
    this.shiftName,
    this.sessions = const [],
    this.exceptions = const [],
    this.trackingGapMinutes = 0,
  });

  final String attendanceId;
  final DateTime date;
  final AttendanceEntryStatus status;

  /// The day has an open session — today's in-progress row.
  final bool isOngoing;

  final DateTime? checkIn;
  final DateTime? checkOut;

  /// Paid time: session minutes net of unpaid breaks. Comes from the server so
  /// it matches payroll rather than being re-derived from punch times.
  final int workedMinutes;
  final int breakMinutes;
  final int breaksTaken;
  final int overtimeMinutes;
  final int shortfallMinutes;
  final bool isLate;
  final int? minutesLate;
  final String? shiftName;
  final List<AttendanceSessionRow> sessions;
  final List<AttendanceException> exceptions;
  final int trackingGapMinutes;

  Duration get worked => Duration(minutes: workedMinutes);
  Duration get breaks => Duration(minutes: breakMinutes);
  bool get hasExceptions => exceptions.isNotEmpty;
}

/// Range totals returned alongside the rows.
class AttendanceHistorySummary {
  const AttendanceHistorySummary({
    this.daysCounted = 0,
    this.presentDays = 0,
    this.absentDays = 0,
    this.lateDays = 0,
    this.workedMinutes = 0,
    this.overtimeMinutes = 0,
    this.breakMinutes = 0,
    this.daysWithExceptions = 0,
    this.averageWorkedMinutes = 0,
  });

  final int daysCounted;
  final int presentDays;
  final int absentDays;
  final int lateDays;
  final int workedMinutes;
  final int overtimeMinutes;
  final int breakMinutes;
  final int daysWithExceptions;
  final int averageWorkedMinutes;
}

class AttendanceHistoryPage {
  const AttendanceHistoryPage({
    required this.entries,
    required this.total,
    required this.page,
    required this.limit,
    this.summary = const AttendanceHistorySummary(),
  });

  final List<AttendanceHistoryEntry> entries;
  final int total;
  final int page;
  final int limit;
  final AttendanceHistorySummary summary;
}
