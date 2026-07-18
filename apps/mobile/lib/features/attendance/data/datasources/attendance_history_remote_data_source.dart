import 'package:dio/dio.dart';

import '../../presentation/history/attendance_history_models.dart';

/// Remote datasource for attendance history (attendance.controller.ts —
/// GET /attendance/logs). Scope is enforced server-side: a field employee only
/// receives their own sessions.
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
      '/api/v1/attendance/logs',
      queryParameters: {'page': page, 'limit': limit},
    );
    final data = res.data as Map<String, dynamic>;
    final rows = (data['data'] as List? ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(_mapEntry)
        .toList(growable: false);
    return AttendanceHistoryPage(
      entries: rows,
      total: (data['total'] ?? rows.length) as int,
      page: (data['page'] ?? page) as int,
      limit: (data['limit'] ?? limit) as int,
    );
  }

  AttendanceHistoryEntry _mapEntry(Map<String, dynamic> json) {
    final checkIn = _parseDate(json['punchIn']);
    final checkOut = _parseDate(json['punchOut']);
    return AttendanceHistoryEntry(
      id: (json['id'] ?? '') as String,
      checkIn: checkIn,
      checkOut: checkOut,
      status: _deriveStatus(json['status'] as String?, checkIn, checkOut),
      isLate: (json['isLate'] ?? false) as bool? ?? false,
    );
  }

  AttendanceEntryStatus _deriveStatus(
    String? raw,
    DateTime? checkIn,
    DateTime? checkOut,
  ) {
    switch (raw?.toUpperCase()) {
      case 'ABSENT':
        return AttendanceEntryStatus.absent;
      case 'ON_LEAVE':
      case 'LEAVE':
        return AttendanceEntryStatus.leave;
    }
    if (checkIn != null && checkOut == null) {
      return AttendanceEntryStatus.working;
    }
    if (checkIn != null && checkOut != null) {
      return AttendanceEntryStatus.present;
    }
    return AttendanceEntryStatus.absent;
  }

  DateTime? _parseDate(dynamic v) {
    if (v is String && v.isNotEmpty) return DateTime.tryParse(v);
    return null;
  }
}
