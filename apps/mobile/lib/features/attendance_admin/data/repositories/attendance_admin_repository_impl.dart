import 'package:dartz/dartz.dart';
import 'package:dio/dio.dart';

import '../../../../core/error/failures.dart';
import '../../domain/entities/daily_attendance.dart';
import '../../domain/repositories/attendance_admin_repository.dart';
import '../datasources/attendance_admin_remote_data_source.dart';

class AttendanceAdminRepositoryImpl implements AttendanceAdminRepository {
  AttendanceAdminRepositoryImpl({required this.remoteDataSource});

  final AttendanceAdminRemoteDataSource remoteDataSource;

  @override
  Future<Either<Failure, DailyAttendancePage>> getDailyLogs({
    int page = 1,
    int limit = 30,
    DateTime? from,
    DateTime? to,
    String? search,
    String? status,
    bool exceptionsOnly = false,
  }) async {
    try {
      return Right(await remoteDataSource.getDailyLogs(
        page: page,
        limit: limit,
        from: from,
        to: to,
        search: search,
        status: status,
        exceptionsOnly: exceptionsOnly,
      ));
    } on DioException catch (e) {
      return Left(ServerFailure(_message(e, 'Failed to load attendance')));
    } catch (_) {
      return const Left(ServerFailure('Failed to load attendance'));
    }
  }

  @override
  Future<Either<Failure, AttendanceLogPage>> getLogs({
    int page = 1,
    int limit = 30,
    String? search,
  }) async {
    try {
      return Right(await remoteDataSource.getLogs(
        page: page,
        limit: limit,
        search: search,
      ));
    } on DioException catch (e) {
      return Left(ServerFailure(_message(e, 'Failed to load attendance logs')));
    } catch (_) {
      return const Left(ServerFailure('Failed to load attendance logs'));
    }
  }

  /// Prefer the API's own error message when present.
  String _message(DioException e, String fallback) {
    final data = e.response?.data;
    if (data is Map && data['message'] != null) {
      final m = data['message'];
      if (m is String) return m;
      if (m is List && m.isNotEmpty) return m.first.toString();
    }
    return fallback;
  }
}
