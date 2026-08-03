import 'package:dio/dio.dart';

import '../../domain/entities/daily_attendance.dart';
import '../models/daily_attendance_model.dart';

/// Talks to the same attendance reporting endpoints the web admin portal uses.
abstract class AttendanceAdminRemoteDataSource {
  Future<DailyAttendancePage> getDailyLogs({
    int page,
    int limit,
    DateTime? from,
    DateTime? to,
    String? search,
    String? status,
    bool exceptionsOnly,
  });

  Future<AttendanceLogPage> getLogs({int page, int limit, String? search});
}

class AttendanceAdminRemoteDataSourceImpl
    implements AttendanceAdminRemoteDataSource {
  AttendanceAdminRemoteDataSourceImpl({required this.dio});

  final Dio dio;

  /// The API validates `from`/`to` as plain ISO dates (YYYY-MM-DD).
  static String _isoDate(DateTime d) =>
      d.toIso8601String().split('T').first;

  @override
  Future<DailyAttendancePage> getDailyLogs({
    int page = 1,
    int limit = 30,
    DateTime? from,
    DateTime? to,
    String? search,
    String? status,
    bool exceptionsOnly = false,
  }) async {
    final response = await dio.get(
      '/api/v1/attendance/daily-logs',
      queryParameters: {
        'page': page,
        'limit': limit,
        if (from != null) 'from': _isoDate(from),
        if (to != null) 'to': _isoDate(to),
        if (search != null && search.trim().isNotEmpty) 'search': search.trim(),
        if (status != null && status.isNotEmpty) 'status': status,
        if (exceptionsOnly) 'exceptionsOnly': 'true',
      },
    );

    final data = (response.data as Map<String, dynamic>?) ?? const {};
    final rows = (data['data'] as List<dynamic>? ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(DailyAttendanceRowModel.fromJson)
        .toList();

    return DailyAttendancePage(
      rows: rows,
      total: (data['total'] as num?)?.toInt() ?? rows.length,
      summary: DailyAttendanceSummaryModel.fromJson(
        data['summary'] as Map<String, dynamic>?,
      ),
    );
  }

  @override
  Future<AttendanceLogPage> getLogs({
    int page = 1,
    int limit = 30,
    String? search,
  }) async {
    final response = await dio.get(
      '/api/v1/attendance/logs',
      queryParameters: {
        'page': page,
        'limit': limit,
        if (search != null && search.trim().isNotEmpty) 'search': search.trim(),
      },
    );

    final payload = response.data;
    // `{ data, total }` today; tolerate a bare array so a shape change does
    // not blank the screen.
    final rawRows = payload is Map
        ? (payload['data'] as List<dynamic>? ?? const [])
        : (payload is List ? payload : const <dynamic>[]);
    final rows = rawRows
        .whereType<Map<String, dynamic>>()
        .map(AttendanceLogRowModel.fromJson)
        .toList();

    return AttendanceLogPage(
      rows: rows,
      total: payload is Map
          ? ((payload['total'] as num?)?.toInt() ?? rows.length)
          : rows.length,
    );
  }
}
