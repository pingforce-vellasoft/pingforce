import 'package:dartz/dartz.dart';
import 'package:dio/dio.dart';

import '../../../../core/error/failures.dart';
import '../../domain/entities/geofence.dart';
import '../../domain/repositories/geofence_repository.dart';
import '../datasources/geofence_remote_data_source.dart';
import '../models/geofence_model.dart';

class GeofenceRepositoryImpl implements GeofenceRepository {
  final GeofenceRemoteDataSource remoteDataSource;

  GeofenceRepositoryImpl({required this.remoteDataSource});

  @override
  Future<Either<Failure, List<Geofence>>> getGeofences() async {
    try {
      final list = await remoteDataSource.getGeofences();
      return Right(list);
    } on DioException catch (e) {
      return Left(ServerFailure(_message(e, 'Failed to load geofences')));
    } catch (_) {
      return const Left(ServerFailure('Failed to load geofences'));
    }
  }

  @override
  Future<Either<Failure, Geofence>> createGeofence({
    required String name,
    required double latitude,
    required double longitude,
    required int radiusMeters,
  }) async {
    try {
      final created = await remoteDataSource.createGeofence(GeofenceModel(
        id: '',
        name: name,
        latitude: latitude,
        longitude: longitude,
        radiusMeters: radiusMeters,
      ));
      return Right(created);
    } on DioException catch (e) {
      return Left(ServerFailure(_message(e, 'Failed to create geofence')));
    } catch (_) {
      return const Left(ServerFailure('Failed to create geofence'));
    }
  }

  @override
  Future<Either<Failure, Unit>> deleteGeofence(String id) async {
    try {
      await remoteDataSource.deleteGeofence(id);
      return const Right(unit);
    } on DioException catch (e) {
      return Left(ServerFailure(_message(e, 'Failed to delete geofence')));
    } catch (_) {
      return const Left(ServerFailure('Failed to delete geofence'));
    }
  }

  /// Prefer the API's own error message (e.g. duplicate-name validation) when
  /// present, so the user sees why a create was rejected.
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
