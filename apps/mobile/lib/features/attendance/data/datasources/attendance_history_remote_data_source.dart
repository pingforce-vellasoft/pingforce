import 'package:dio/dio.dart';

import '../../presentation/history/attendance_history_models.dart';

/// Remote datasource for the day-grouped attendance log
/// (attendance.controller.ts — GET /attendance/daily-logs). Scope is enforced
/// server-side: a field employee only receives their own days.
abstract class AttendanceHistoryRemoteDataSource {
  Future<AttendanceHistoryPage> fetchLogs({int page, int limit});
}

class AttendanceHistoryRemoteDataSourceImpl
    implements AttendanceHistoryRemoteDataSource {
  AttendanceHistoryRemoteDataSourceImpl({required this.dio});

  final Dio dio;

  @override
  Future<AttendanceHistoryPage> fetchLogs({int page = 1, int limit = 30}) async {
    final res = await dio.get(
      '/api/v1/attendance/daily-logs',
      queryParameters: {'page': page, 'limit': limit},
    );
    final data = res.data as Map<String, dynamic>;
    final rows = (data['data'] as List? ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(_mapEntry)
        .toList(growable: false);

    return AttendanceHistoryPage(
      entries: rows,
      total: (data['total'] as num?)?.toInt() ?? rows.length,
      page: (data['page'] as num?)?.toInt() ?? page,
      limit: (data['limit'] as num?)?.toInt() ?? limit,
      summary: _mapSummary(data['summary'] as Map<String, dynamic>?),
    );
  }

  AttendanceHistoryEntry _mapEntry(Map<String, dynamic> json) {
    final shift = json['shift'] as Map<String, dynamic>?;
    final tracking = json['tracking'] as Map<String, dynamic>?;

    return AttendanceHistoryEntry(
      attendanceId: (json['attendanceId'] ?? '') as String,
      date: _parseDate(json['date']) ?? DateTime.now(),
      status: _deriveStatus(json['status'] as String?, json['isOngoing'] == true),
      isOngoing: json['isOngoing'] == true,
      checkIn: _parseDate(json['checkInTime']),
      checkOut: _parseDate(json['checkOutTime']),
      workedMinutes: _int(json['workedMinutes']),
      breakMinutes: _int(json['breakMinutes']),
      breaksTaken: _int(json['breaksTaken']),
      overtimeMinutes: _int(json['overtimeMinutes']),
      shortfallMinutes: _int(json['shortfallMinutes']),
      isLate: json['isLate'] == true,
      minutesLate: (json['minutesLate'] as num?)?.toInt(),
      shiftName: shift?['name'] as String?,
      sessions: (json['sessions'] as List? ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(_mapSession)
          .toList(growable: false),
      exceptions: (json['exceptions'] as List? ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(
            (e) => AttendanceException(
              code: (e['code'] ?? '') as String,
              severity: (e['severity'] ?? 'low') as String,
              detail: (e['detail'] ?? '') as String,
            ),
          )
          .toList(growable: false),
      trackingGapMinutes: _int(tracking?['gapMinutes']),
    );
  }

  AttendanceSessionRow _mapSession(Map<String, dynamic> json) {
    return AttendanceSessionRow(
      id: (json['id'] ?? '') as String,
      punchIn: _parseDate(json['punchIn']) ?? DateTime.now(),
      punchOut: _parseDate(json['punchOut']),
      sessionStatus: (json['sessionStatus'] ?? 'WORKING') as String,
      attendanceMethod: json['attendanceMethod'] as String?,
      breaks: (json['breaks'] as List? ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(
            (b) => AttendanceBreakRow(
              id: (b['id'] ?? '') as String,
              breakType: (b['breakType'] ?? 'LUNCH') as String,
              paidBreak: b['paidBreak'] == true,
              startTime: _parseDate(b['startTime']) ?? DateTime.now(),
              endTime: _parseDate(b['endTime']),
              durationMinutes: (b['durationMinutes'] as num?)?.toInt(),
            ),
          )
          .toList(growable: false),
    );
  }

  AttendanceHistorySummary _mapSummary(Map<String, dynamic>? json) {
    if (json == null) return const AttendanceHistorySummary();
    return AttendanceHistorySummary(
      daysCounted: _int(json['daysCounted']),
      presentDays: _int(json['presentDays']),
      absentDays: _int(json['absentDays']),
      lateDays: _int(json['lateDays']),
      workedMinutes: _int(json['workedMinutes']),
      overtimeMinutes: _int(json['overtimeMinutes']),
      breakMinutes: _int(json['breakMinutes']),
      daysWithExceptions: _int(json['daysWithExceptions']),
      averageWorkedMinutes: _int(json['averageWorkedMinutes']),
    );
  }

  AttendanceEntryStatus _deriveStatus(String? raw, bool isOngoing) {
    // An open session outranks the stored status: the day reads "Working"
    // while it is still in progress.
    if (isOngoing) return AttendanceEntryStatus.working;
    switch (raw?.toUpperCase()) {
      case 'ABSENT':
        return AttendanceEntryStatus.absent;
      case 'ON_LEAVE':
      case 'LEAVE':
        return AttendanceEntryStatus.leave;
      case 'HALF_DAY':
        return AttendanceEntryStatus.halfDay;
      case 'PRESENT':
      case 'LATE':
        return AttendanceEntryStatus.present;
    }
    return AttendanceEntryStatus.absent;
  }

  int _int(dynamic v) => (v as num?)?.toInt() ?? 0;

  /// The API sends UTC; render in the device's zone.
  DateTime? _parseDate(dynamic v) {
    if (v is String && v.isNotEmpty) return DateTime.tryParse(v)?.toLocal();
    return null;
  }
}
