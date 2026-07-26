import 'package:dartz/dartz.dart';
import 'package:dio/dio.dart';

import '../../../../core/error/failures.dart';
import '../../domain/entities/geofence.dart';
import '../../domain/entities/geofence_assignment.dart';
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

  // ── Employee assignment ────────────────────────────────────────────────────

  @override
  Future<Either<Failure, GeofenceCoverage>> getCoverage() async {
    try {
      return Right(await remoteDataSource.getCoverage());
    } on DioException catch (e) {
      return Left(ServerFailure(_message(e, 'Failed to load coverage')));
    } catch (_) {
      return const Left(ServerFailure('Failed to load coverage'));
    }
  }

  @override
  Future<Either<Failure, bool>> getAllowMultiple() async {
    try {
      return Right(await remoteDataSource.getAllowMultiple());
    } on DioException catch (e) {
      return Left(ServerFailure(_message(e, 'Failed to load geofence policy')));
    } catch (_) {
      return const Left(ServerFailure('Failed to load geofence policy'));
    }
  }

  @override
  Future<Either<Failure, bool>> setAllowMultiple(bool allow) async {
    try {
      return Right(await remoteDataSource.setAllowMultiple(allow));
    } on DioException catch (e) {
      return Left(
        ServerFailure(_message(e, 'Failed to update geofence policy')),
      );
    } catch (_) {
      return const Left(ServerFailure('Failed to update geofence policy'));
    }
  }

  @override
  Future<Either<Failure, List<AssignedEmployee>>> getAssignedEmployees(
    String geofenceId,
  ) async {
    try {
      final list = await remoteDataSource.getAssignedEmployees(geofenceId);
      return Right(list);
    } on DioException catch (e) {
      return Left(
        ServerFailure(_message(e, 'Failed to load assigned employees')),
      );
    } catch (_) {
      return const Left(ServerFailure('Failed to load assigned employees'));
    }
  }

  @override
  Future<Either<Failure, AssignableEmployeesPage>> getAssignableEmployees(
    String geofenceId, {
    String? search,
    bool showAll = false,
  }) async {
    try {
      final page = await remoteDataSource.getAssignableEmployees(
        geofenceId,
        search: search,
        showAll: showAll,
      );
      return Right(page);
    } on DioException catch (e) {
      return Left(ServerFailure(_message(e, 'Failed to load employees')));
    } catch (_) {
      return const Left(ServerFailure('Failed to load employees'));
    }
  }

  @override
  Future<Either<Failure, AssignResult>> assignEmployees(
    String geofenceId,
    List<String> employeeIds, {
    bool reassign = false,
  }) async {
    try {
      final result = await remoteDataSource.assignEmployees(
        geofenceId,
        employeeIds,
        reassign: reassign,
      );
      return Right(result);
    } on GeofenceAssignmentConflict catch (e) {
      // Typed rather than a generic server failure: the caller needs the names
      // to ask "move them?" and retry with reassign.
      return Left(
        GeofenceConflictFailure(
          'Already assigned to another geofence.',
          e.conflicts
              .map((c) =>
                  '${c.employeeName ?? 'Employee'} (on ${c.currentGeofenceName})')
              .toList(),
        ),
      );
    } on DioException catch (e) {
      return Left(ServerFailure(_message(e, 'Failed to assign employees')));
    } catch (_) {
      return const Left(ServerFailure('Failed to assign employees'));
    }
  }

  @override
  Future<Either<Failure, UnassignResult>> unassignEmployees(
    String geofenceId,
    List<String> employeeIds,
  ) async {
    try {
      final result =
          await remoteDataSource.unassignEmployees(geofenceId, employeeIds);
      return Right(result);
    } on DioException catch (e) {
      return Left(ServerFailure(_message(e, 'Failed to remove employees')));
    } catch (_) {
      return const Left(ServerFailure('Failed to remove employees'));
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
