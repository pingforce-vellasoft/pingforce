import 'package:equatable/equatable.dart';

/// Today's attendance snapshot for the signed-in employee, as returned by
/// GET /api/v1/attendance/today.
///
/// Drives two things on the attendance screen: resuming an open session when
/// the employee re-opens the app, and the day summary (punch history and
/// leave balances).

class AttendanceSessionEntry extends Equatable {
  final String id;
  final DateTime punchIn;
  final DateTime? punchOut;
  final String sessionStatus;

  const AttendanceSessionEntry({
    required this.id,
    required this.punchIn,
    this.punchOut,
    required this.sessionStatus,
  });

  @override
  List<Object?> get props => [id, punchIn, punchOut, sessionStatus];
}

/// The currently open session, if the employee is checked in right now.
class ActiveSessionInfo extends Equatable {
  final String id;
  final DateTime punchIn;
  final String sessionStatus;
  final double? checkInLatitude;
  final double? checkInLongitude;

  const ActiveSessionInfo({
    required this.id,
    required this.punchIn,
    required this.sessionStatus,
    this.checkInLatitude,
    this.checkInLongitude,
  });

  @override
  List<Object?> get props => [
        id,
        punchIn,
        sessionStatus,
        checkInLatitude,
        checkInLongitude,
      ];
}

class AttendanceTotals extends Equatable {
  /// Credited on check-out only — an open session contributes 0.
  final int workedMinutes;
  final int overtimeMinutes;
  final DateTime? firstPunchIn;
  final DateTime? lastPunchOut;

  const AttendanceTotals({
    this.workedMinutes = 0,
    this.overtimeMinutes = 0,
    this.firstPunchIn,
    this.lastPunchOut,
  });

  @override
  List<Object?> get props => [
        workedMinutes,
        overtimeMinutes,
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
