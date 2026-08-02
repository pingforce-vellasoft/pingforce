import '../../domain/entities/daily_attendance.dart';

DateTime? _date(dynamic value) {
  if (value is! String || value.isEmpty) return null;
  return DateTime.tryParse(value)?.toLocal();
}

int _int(dynamic value) => (value as num?)?.toInt() ?? 0;

/// Wire mapping for `/api/v1/attendance/daily-logs`.
///
/// The API row carries nested sessions, breaks and corrections. The mobile list
/// shows a day summary, so only the counts are lifted here — pulling the full
/// nested tree into entities would be dead weight on a handset.
class DailyAttendanceRowModel extends DailyAttendanceRow {
  const DailyAttendanceRowModel({
    required super.attendanceId,
    required super.date,
    required super.status,
    required super.isOngoing,
    required super.employeeName,
    required super.workedMinutes,
    required super.breakMinutes,
    required super.overtimeMinutes,
    required super.isLate,
    required super.sessionCount,
    required super.exceptionCount,
    super.employeeCode,
    super.departmentName,
    super.shiftName,
    super.checkInTime,
    super.checkOutTime,
    super.minutesLate,
  });

  factory DailyAttendanceRowModel.fromJson(Map<String, dynamic> json) {
    final employee = json['employee'] as Map<String, dynamic>?;
    final shift = json['shift'] as Map<String, dynamic>?;
    final exceptions = json['exceptions'] as List<dynamic>?;

    return DailyAttendanceRowModel(
      attendanceId: json['attendanceId'] as String? ?? '',
      date: _date(json['date']),
      status: json['status'] as String? ?? 'ABSENT',
      isOngoing: json['isOngoing'] as bool? ?? false,
      employeeName: employee?['name'] as String? ?? 'Unknown',
      employeeCode: employee?['employeeCode'] as String?,
      departmentName: employee?['departmentName'] as String?,
      shiftName: shift?['name'] as String?,
      checkInTime: _date(json['checkInTime']),
      checkOutTime: _date(json['checkOutTime']),
      workedMinutes: _int(json['workedMinutes']),
      breakMinutes: _int(json['breakMinutes']),
      overtimeMinutes: _int(json['overtimeMinutes']),
      isLate: json['isLate'] as bool? ?? false,
      minutesLate: (json['minutesLate'] as num?)?.toInt(),
      sessionCount: _int(json['sessionCount']),
      exceptionCount: exceptions?.length ?? 0,
    );
  }
}

class DailyAttendanceSummaryModel extends DailyAttendanceSummary {
  const DailyAttendanceSummaryModel({
    super.daysCounted,
    super.presentDays,
    super.absentDays,
    super.lateDays,
    super.workedMinutes,
    super.overtimeMinutes,
    super.daysWithExceptions,
  });

  factory DailyAttendanceSummaryModel.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const DailyAttendanceSummaryModel();
    return DailyAttendanceSummaryModel(
      daysCounted: _int(json['daysCounted']),
      presentDays: _int(json['presentDays']),
      absentDays: _int(json['absentDays']),
      lateDays: _int(json['lateDays']),
      workedMinutes: _int(json['workedMinutes']),
      overtimeMinutes: _int(json['overtimeMinutes']),
      daysWithExceptions: _int(json['daysWithExceptions']),
    );
  }
}

/// Wire mapping for `/api/v1/attendance/logs` (punch-level).
///
/// That endpoint's row shape is looser than the daily log's, so each field is
/// read defensively from the alternatives the API has used.
class AttendanceLogRowModel extends AttendanceLogRow {
  const AttendanceLogRowModel({
    required super.id,
    required super.employeeName,
    super.employeeCode,
    super.punchIn,
    super.punchOut,
    super.sessionStatus,
    super.attendanceMethod,
    super.workedMinutes,
    super.isSpoofed,
  });

  factory AttendanceLogRowModel.fromJson(Map<String, dynamic> json) {
    final employee = json['employee'] as Map<String, dynamic>?;

    // The employee may arrive as a nested object or as flattened first/last
    // name fields depending on the query path.
    String name() {
      final direct = employee?['name'] as String?;
      if (direct != null && direct.trim().isNotEmpty) return direct;
      final first = (employee?['firstName'] as String? ?? '').trim();
      final last = (employee?['lastName'] as String? ?? '').trim();
      final combined = '$first $last'.trim();
      if (combined.isNotEmpty) return combined;
      return json['employeeName'] as String? ?? 'Unknown';
    }

    return AttendanceLogRowModel(
      id: json['id'] as String? ?? '',
      employeeName: name(),
      employeeCode: employee?['employeeCode'] as String? ??
          json['employeeCode'] as String?,
      punchIn: _date(json['punchIn'] ?? json['checkInTime']),
      punchOut: _date(json['punchOut'] ?? json['checkOutTime']),
      sessionStatus:
          json['sessionStatus'] as String? ?? json['status'] as String?,
      attendanceMethod: json['attendanceMethod'] as String?,
      workedMinutes: (json['workedMinutes'] as num?)?.toInt(),
      isSpoofed: json['isSpoofed'] as bool? ?? false,
    );
  }
}
