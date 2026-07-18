import 'package:dartz/dartz.dart';
import 'package:dio/dio.dart';

import '../../../../core/error/failures.dart';
import '../../domain/repositories/dashboard_repository.dart';
import '../datasources/dashboard_remote_data_source.dart';
import '../models/dashboard_summary_model.dart';

class DashboardRepositoryImpl implements DashboardRepository {
  final DashboardRemoteDataSource remoteDataSource;

  DashboardRepositoryImpl({required this.remoteDataSource});

  @override
  Future<Either<Failure, DashboardSummaryModel>> getSummary() async {
    try {
      final summary = await remoteDataSource.getSummary();
      return Right(summary);
    } on DioException catch (e) {
      // No connection vs. server error — the notifier shows cached data on
      // network failures and an error banner on server failures.
      final isNetwork = e.type == DioExceptionType.connectionError ||
          e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.receiveTimeout ||
          e.type == DioExceptionType.sendTimeout;
      return Left(
        isNetwork
            ? const NetworkFailure('No connection. Showing cached data.')
            : const ServerFailure('Failed to load dashboard.'),
      );
    } catch (_) {
      return const Left(ServerFailure('Failed to load dashboard.'));
    }
  }
}
