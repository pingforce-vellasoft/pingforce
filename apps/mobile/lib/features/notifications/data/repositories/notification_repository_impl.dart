import 'package:dartz/dartz.dart';
import 'package:dio/dio.dart';

import '../../../../core/error/failures.dart';
import '../../domain/repositories/notification_repository.dart';
import '../datasources/notification_remote_data_source.dart';
import '../models/notification_model.dart';

class NotificationRepositoryImpl implements NotificationRepository {
  final NotificationRemoteDataSource remoteDataSource;

  NotificationRepositoryImpl({required this.remoteDataSource});

  Failure _mapDio(DioException e) {
    final isNetwork = e.type == DioExceptionType.connectionError ||
        e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.receiveTimeout ||
        e.type == DioExceptionType.sendTimeout;
    return isNetwork
        ? const NetworkFailure('No connection.')
        : const ServerFailure('Something went wrong.');
  }

  @override
  Future<Either<Failure, List<NotificationModel>>> list({
    bool unreadOnly = false,
  }) async {
    try {
      return Right(await remoteDataSource.list(unreadOnly: unreadOnly));
    } on DioException catch (e) {
      return Left(_mapDio(e));
    } catch (_) {
      return const Left(ServerFailure('Failed to load notifications.'));
    }
  }

  @override
  Future<Either<Failure, int>> unreadCount() async {
    try {
      return Right(await remoteDataSource.unreadCount());
    } on DioException catch (e) {
      return Left(_mapDio(e));
    } catch (_) {
      return const Left(ServerFailure('Failed to load count.'));
    }
  }

  @override
  Future<Either<Failure, void>> markRead(String id) async {
    try {
      await remoteDataSource.markRead(id);
      return const Right(null);
    } on DioException catch (e) {
      return Left(_mapDio(e));
    } catch (_) {
      return const Left(ServerFailure('Failed to mark read.'));
    }
  }

  @override
  Future<Either<Failure, void>> markAllRead() async {
    try {
      await remoteDataSource.markAllRead();
      return const Right(null);
    } on DioException catch (e) {
      return Left(_mapDio(e));
    } catch (_) {
      return const Left(ServerFailure('Failed to mark all read.'));
    }
  }
}
