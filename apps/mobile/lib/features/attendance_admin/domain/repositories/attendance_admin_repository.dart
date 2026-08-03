import 'package:dartz/dartz.dart';

import '../../../../core/error/failures.dart';
import '../entities/daily_attendance.dart';

/// Tenant-wide attendance reporting for admins.
///
/// Both endpoints are data-scoped server-side: the same routes back the
/// employee's own history, and the caller's scope decides which rows come back.
abstract class AttendanceAdminRepository {
  /// Day-grouped log — one row per employee-day.
  Future<Either<Failure, DailyAttendancePage>> getDailyLogs({
    int page,
    int limit,
    DateTime? from,
    DateTime? to,
    String? search,
    String? status,
    bool exceptionsOnly,
  });

  /// Punch-level log — one row per session.
  Future<Either<Failure, AttendanceLogPage>> getLogs({
    int page,
    int limit,
    String? search,
  });
}
