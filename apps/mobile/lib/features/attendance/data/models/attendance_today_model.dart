import '../../domain/entities/attendance_today.dart';

/// JSON mapping for GET /api/v1/attendance/today.

DateTime? _parseDate(dynamic v) =>
    v == null ? null : DateTime.parse(v as String).toLocal();

double _parseDouble(dynamic v) => (v as num?)?.toDouble() ?? 0;

int _parseInt(dynamic v) => (v as num?)?.toInt() ?? 0;

class AttendanceBreakEntryModel extends AttendanceBreakEntry {
  const AttendanceBreakEntryModel({
    required super.id,
    required super.breakType,
    required super.paidBreak,
    required super.startTime,
    super.endTime,
    super.durationMinutes,
  });

  factory AttendanceBreakEntryModel.fromJson(Map<String, dynamic> json) {
    return AttendanceBreakEntryModel(
      id: json['id'] as String,
      breakType: json['breakType'] as String? ?? 'LUNCH',
      paidBreak: json['paidBreak'] as bool? ?? false,
      startTime: _parseDate(json['startTime'])!,
      endTime: _parseDate(json['endTime']),
      durationMinutes: (json['durationMinutes'] as num?)?.toInt(),
    );
  }
}

class AttendanceSessionEntryModel extends AttendanceSessionEntry {
  const AttendanceSessionEntryModel({
    required super.id,
    required super.punchIn,
    super.punchOut,
    required super.sessionStatus,
    super.breaks,
  });

  factory AttendanceSessionEntryModel.fromJson(Map<String, dynamic> json) {
    return AttendanceSessionEntryModel(
      id: json['id'] as String,
      punchIn: _parseDate(json['punchIn'])!,
      punchOut: _parseDate(json['punchOut']),
      sessionStatus: json['sessionStatus'] as String? ?? 'WORKING',
      breaks: (json['breaks'] as List<dynamic>? ?? [])
          .map((b) =>
              AttendanceBreakEntryModel.fromJson(b as Map<String, dynamic>))
          .toList(),
    );
  }
}

class ActiveSessionInfoModel extends ActiveSessionInfo {
  const ActiveSessionInfoModel({
    required super.id,
    required super.punchIn,
    required super.sessionStatus,
    required super.isOnBreak,
    super.currentBreakStartedAt,
    required super.breaksTaken,
    super.checkInLatitude,
    super.checkInLongitude,
  });

  factory ActiveSessionInfoModel.fromJson(Map<String, dynamic> json) {
    return ActiveSessionInfoModel(
      id: json['id'] as String,
      punchIn: _parseDate(json['punchIn'])!,
      sessionStatus: json['sessionStatus'] as String? ?? 'WORKING',
      isOnBreak: json['isOnBreak'] as bool? ?? false,
      currentBreakStartedAt: _parseDate(json['currentBreakStartedAt']),
      breaksTaken: _parseInt(json['breaksTaken']),
      checkInLatitude: (json['checkInLatitude'] as num?)?.toDouble(),
      checkInLongitude: (json['checkInLongitude'] as num?)?.toDouble(),
    );
  }
}

class AttendanceTotalsModel extends AttendanceTotals {
  const AttendanceTotalsModel({
    super.workedMinutes,
    super.overtimeMinutes,
    super.breaksTaken,
    super.breakMinutes,
    super.firstPunchIn,
    super.lastPunchOut,
  });

  factory AttendanceTotalsModel.fromJson(Map<String, dynamic> json) {
    return AttendanceTotalsModel(
      workedMinutes: _parseInt(json['workedMinutes']),
      overtimeMinutes: _parseInt(json['overtimeMinutes']),
      breaksTaken: _parseInt(json['breaksTaken']),
      breakMinutes: _parseInt(json['breakMinutes']),
      firstPunchIn: _parseDate(json['firstPunchIn']),
      lastPunchOut: _parseDate(json['lastPunchOut']),
    );
  }
}

class LeaveBalanceEntryModel extends LeaveBalanceEntry {
  const LeaveBalanceEntryModel({
    required super.leaveTypeId,
    required super.leaveTypeName,
    required super.leaveTypeCode,
    required super.totalDays,
    required super.usedDays,
    required super.availableDays,
  });

  factory LeaveBalanceEntryModel.fromJson(Map<String, dynamic> json) {
    return LeaveBalanceEntryModel(
      leaveTypeId: json['leaveTypeId'] as String? ?? '',
      leaveTypeName: json['leaveTypeName'] as String? ?? 'Leave',
      leaveTypeCode: json['leaveTypeCode'] as String? ?? '',
      totalDays: _parseDouble(json['totalDays']),
      usedDays: _parseDouble(json['usedDays']),
      availableDays: _parseDouble(json['availableDays']),
    );
  }
}

class AttendanceTodayModel extends AttendanceToday {
  const AttendanceTodayModel({
    required super.date,
    super.status,
    super.activeSession,
    super.sessions,
    super.totals,
    super.leaveBalances,
  });

  factory AttendanceTodayModel.fromJson(Map<String, dynamic> json) {
    final active = json['activeSession'] as Map<String, dynamic>?;
    final totals = json['totals'] as Map<String, dynamic>?;

    return AttendanceTodayModel(
      date: _parseDate(json['date']) ?? DateTime.now(),
      status: json['status'] as String?,
      activeSession:
          active == null ? null : ActiveSessionInfoModel.fromJson(active),
      sessions: (json['sessions'] as List<dynamic>? ?? [])
          .map((s) =>
              AttendanceSessionEntryModel.fromJson(s as Map<String, dynamic>))
          .toList(),
      totals: totals == null
          ? const AttendanceTotals()
          : AttendanceTotalsModel.fromJson(totals),
      leaveBalances: (json['leaveBalances'] as List<dynamic>? ?? [])
          .map((b) => LeaveBalanceEntryModel.fromJson(b as Map<String, dynamic>))
          .toList(),
    );
  }
}
