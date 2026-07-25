import 'package:equatable/equatable.dart';

/// Today's attendance snapshot for the signed-in employee, as returned by
/// GET /api/v1/attendance/today.
///
/// Drives two things on the attendance screen: resuming an open session when
/// the employee re-opens the app, and the day summary (punch history, breaks,
/// leave balances).

class AttendanceBreakEntry extends Equatable {
  final String id;
  final String breakType;
  final bool paidBreak;
  final DateTime startTime;
  final DateTime? endTime;
  final int? durationMinutes;

  const AttendanceBreakEntry({
    required this.id,
    required this.breakType,
    required this.paidBreak,
    required this.startTime,
    this.endTime,
    this.durationMinutes,
  });

  bool get isOpen => endTime == null;

  @override
  List<Object?> get props =>
      [id, breakType, paidBreak, startTime, endTime, durationMinutes];
}

class AttendanceSessionEntry extends Equatable {
  final String id;
  final DateTime punchIn;
  final DateTime? punchOut;
  final String sessionStatus;
  final List<AttendanceBreakEntry> breaks;

  const AttendanceSessionEntry({
    required this.id,
    required this.punchIn,
    this.punchOut,
    required this.sessionStatus,
    this.breaks = const [],
  });

  @override
  List<Object?> get props => [id, punchIn, punchOut, sessionStatus, breaks];
}

/// The currently open session, if the employee is checked in right now.
class ActiveSessionInfo extends Equatable {
  final String id;
  final DateTime punchIn;
  final String sessionStatus;
  final bool isOnBreak;
  final DateTime? currentBreakStartedAt;
  final int breaksTaken;
  final double? checkInLatitude;
  final double? checkInLongitude;

  const ActiveSessionInfo({
    required this.id,
    required this.punchIn,
    required this.sessionStatus,
    required this.isOnBreak,
    this.currentBreakStartedAt,
    required this.breaksTaken,
    this.checkInLatitude,
    this.checkInLongitude,
  });

  @override
  List<Object?> get props => [
        id,
        punchIn,
        sessionStatus,
        isOnBreak,
        currentBreakStartedAt,
        breaksTaken,
        checkInLatitude,
        checkInLongitude,
      ];
}

class AttendanceTotals extends Equatable {
  /// Credited on check-out only — an open session contributes 0.
  final int workedMinutes;
  final int overtimeMinutes;
  final int breaksTaken;
  final int breakMinutes;
  final DateTime? firstPunchIn;
  final DateTime? lastPunchOut;

  const AttendanceTotals({
    this.workedMinutes = 0,
    this.overtimeMinutes = 0,
    this.breaksTaken = 0,
    this.breakMinutes = 0,
    this.firstPunchIn,
    this.lastPunchOut,
  });

  @override
  List<Object?> get props => [
        workedMinutes,
        overtimeMinutes,
        breaksTaken,
        breakMinutes,
        firstPunchIn,
        lastPunchOut,
      ];
}

class LeaveBalanceEntry extends Equatable {
  final String leaveTypeId;
  final String leaveTypeName;
  final String leaveTypeCode;
  final double totalDays;
  final double usedDays;
  final double availableDays;

  const LeaveBalanceEntry({
    required this.leaveTypeId,
    required this.leaveTypeName,
    required this.leaveTypeCode,
    required this.totalDays,
    required this.usedDays,
    required this.availableDays,
  });

  @override
  List<Object?> get props => [
        leaveTypeId,
        leaveTypeName,
        leaveTypeCode,
        totalDays,
        usedDays,
        availableDays,
      ];
}

class AttendanceToday extends Equatable {
  final DateTime date;
  final String? status;
  final ActiveSessionInfo? activeSession;
  final List<AttendanceSessionEntry> sessions;
  final AttendanceTotals totals;
  final List<LeaveBalanceEntry> leaveBalances;

  const AttendanceToday({
    required this.date,
    this.status,
    this.activeSession,
    this.sessions = const [],
    this.totals = const AttendanceTotals(),
    this.leaveBalances = const [],
  });

  bool get isCheckedIn => activeSession != null;

  @override
  List<Object?> get props =>
      [date, status, activeSession, sessions, totals, leaveBalances];
}
