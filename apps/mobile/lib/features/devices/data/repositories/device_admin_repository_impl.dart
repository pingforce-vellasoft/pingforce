import 'package:dartz/dartz.dart';
import 'package:dio/dio.dart';

import '../../../../core/error/failures.dart';
import '../../domain/entities/employee_device.dart';
import '../../domain/repositories/device_admin_repository.dart';
import '../datasources/device_admin_remote_data_source.dart';

class DeviceAdminRepositoryImpl implements DeviceAdminRepository {
  DeviceAdminRepositoryImpl({required this.remoteDataSource});

  final DeviceAdminRemoteDataSource remoteDataSource;

  @override
  Future<Either<Failure, ({List<EmployeeDevice> rows, int total})>> listDevices({
    String? search,
    int skip = 0,
    int take = 50,
  }) async {
    try {
      final page = await remoteDataSource.listDevices(
        search: search,
        skip: skip,
        take: take,
      );
      return Right((rows: page.rows.cast<EmployeeDevice>(), total: page.total));
    } on DioException catch (e) {
      return Left(ServerFailure(_message(e, 'Failed to load devices')));
    } catch (_) {
      return const Left(ServerFailure('Failed to load devices'));
    }
  }

  @override
  Future<Either<Failure, ({List<DeviceChangeRequest> rows, int total})>>
      listChangeRequests({
    DeviceChangeStatus? status,
    int skip = 0,
    int take = 50,
  }) async {
    try {
      final page = await remoteDataSource.listChangeRequests(
        status: status,
        skip: skip,
        take: take,
      );
      return Right(
        (rows: page.rows.cast<DeviceChangeRequest>(), total: page.total),
      );
    } on DioException catch (e) {
      return Left(ServerFailure(_message(e, 'Failed to load change requests')));
    } catch (_) {
      return const Left(ServerFailure('Failed to load change requests'));
    }
  }

  @override
  Future<Either<Failure, DeviceChangeRequest>> approveChangeRequest(
    String id,
  ) async {
    try {
      return Right(await remoteDataSource.approveChangeRequest(id));
    } on DioException catch (e) {
      return Left(ServerFailure(_message(e, 'Failed to approve request')));
    } catch (_) {
      return const Left(ServerFailure('Failed to approve request'));
    }
  }

  @override
  Future<Either<Failure, DeviceChangeRequest>> rejectChangeRequest(
    String id,
    String rejectionReason,
  ) async {
    try {
      return Right(
        await remoteDataSource.rejectChangeRequest(id, rejectionReason),
      );
    } on DioException catch (e) {
      return Left(ServerFailure(_message(e, 'Failed to reject request')));
    } catch (_) {
      return const Left(ServerFailure('Failed to reject request'));
    }
  }

  @override
  Future<Either<Failure, EmployeeDevice>> revokeDevice(
    String id, {
    String? reason,
  }) async {
    try {
      return Right(await remoteDataSource.revokeDevice(id, reason: reason));
    } on DioException catch (e) {
      return Left(ServerFailure(_message(e, 'Failed to revoke device')));
    } catch (_) {
      return const Left(ServerFailure('Failed to revoke device'));
    }
  }

  /// Prefer the API's own error message when present, so the user sees why an
  /// approve/revoke was rejected.
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
