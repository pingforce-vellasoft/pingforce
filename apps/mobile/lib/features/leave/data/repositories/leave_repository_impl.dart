import 'package:dartz/dartz.dart';
import 'package:dio/dio.dart';

import '../../../../core/error/failures.dart';
import '../../domain/repositories/leave_repository.dart';
import '../datasources/leave_remote_data_source.dart';
import '../models/leave_models.dart';

class LeaveRepositoryImpl implements LeaveRepository {
  final LeaveRemoteDataSource remoteDataSource;

  LeaveRepositoryImpl({required this.remoteDataSource});

  @override
  Future<Either<Failure, void>> withdraw(String id) async {
    try {
      await remoteDataSource.withdraw(id);
      return const Right(null);
    } on DioException catch (e) {
      return Left(_mapDio(e));
    } catch (_) {
      return const Left(ServerFailure('Could not withdraw leave.'));
    }
  }

  @override
  Future<Either<Failure, double>> preview({
    required String leaveTypeId,
    required DateTime startDate,
    required DateTime endDate,
    String duration = 'FULL_DAY',
  }) async {
    try {
      return Right(
        await remoteDataSource.preview(
          leaveTypeId: leaveTypeId,
          startDate: startDate,
          endDate: endDate,
          duration: duration,
        ),
      );
    } on DioException catch (e) {
      return Left(_mapDio(e));
    } catch (_) {
      return const Left(ServerFailure('Could not calculate leave days.'));
    }
  }

  Failure _mapDio(DioException e) {
    final isNetwork =
        e.type == DioExceptionType.connectionError ||
        e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.receiveTimeout ||
        e.type == DioExceptionType.sendTimeout;
    if (isNetwork) {
      return const NetworkFailure(
        'Leave changes require an internet connection. Reconnect and retry.',
      );
    }
    // Surface the server's validation message (overlap / insufficient balance).
    final data = e.response?.data;
    final msg = data is Map && data['message'] != null
        ? (data['message'] is List
              ? (data['message'] as List).join(', ')
              : data['message'].toString())
        : 'Something went wrong. Please try again.';
    return ServerFailure(msg);
  }

  @override
  Future<Either<Failure, List<LeaveTypeModel>>> getTypes() async {
    try {
      return Right(await remoteDataSource.getTypes());
    } on DioException catch (e) {
      return Left(_mapDio(e));
    } catch (_) {
      return const Left(ServerFailure('Failed to load leave types.'));
    }
  }

  @override
  Future<Either<Failure, List<LeaveBalanceModel>>> getMyBalances(
    int year,
  ) async {
    try {
      return Right(await remoteDataSource.getMyBalances(year));
    } on DioException catch (e) {
      return Left(_mapDio(e));
    } catch (_) {
      return const Left(ServerFailure('Failed to load balances.'));
    }
  }

  @override
  Future<Either<Failure, List<LeaveRequestModel>>> getMyRequests({
    String? status,
    int skip = 0,
  }) async {
    try {
      return Right(
        await remoteDataSource.getMyRequests(status: status, skip: skip),
      );
    } on DioException catch (e) {
      return Left(_mapDio(e));
    } catch (_) {
      return const Left(ServerFailure('Failed to load history.'));
    }
  }

  @override
  Future<Either<Failure, void>> requestLeave({
    required String leaveTypeId,
    required DateTime startDate,
    required DateTime endDate,
    String? reason,
    String duration = 'FULL_DAY',
  }) async {
    try {
      await remoteDataSource.requestLeave(
        leaveTypeId: leaveTypeId,
        startDate: startDate,
        endDate: endDate,
        reason: reason,
        duration: duration,
      );
      return const Right(null);
    } on DioException catch (e) {
      return Left(_mapDio(e));
    } catch (_) {
      return const Left(ServerFailure('Failed to submit leave.'));
    }
  }
}
