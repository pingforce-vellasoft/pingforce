import 'package:dartz/dartz.dart';

import '../../../../core/error/failures.dart';
import '../entities/geofence.dart';
import '../entities/geofence_assignment.dart';

abstract class GeofenceRepository {
  Future<Either<Failure, List<Geofence>>> getGeofences();
  Future<Either<Failure, Geofence>> createGeofence({
    required String name,
    required double latitude,
    required double longitude,
    required int radiusMeters,
  });
  Future<Either<Failure, Unit>> deleteGeofence(String id);

  // ── Employee assignment ────────────────────────────────────────────────────

  Future<Either<Failure, GeofenceCoverage>> getCoverage();
  Future<Either<Failure, bool>> getAllowMultiple();
  Future<Either<Failure, bool>> setAllowMultiple(bool allow);

  Future<Either<Failure, List<AssignedEmployee>>> getAssignedEmployees(
    String geofenceId,
  );

  Future<Either<Failure, AssignableEmployeesPage>> getAssignableEmployees(
    String geofenceId, {
    String? search,
    bool showAll = false,
  });

  /// Fails with a [GeofenceConflictFailure] when the tenant permits one
  /// geofence per employee and `reassign` was not requested — the caller
  /// confirms the move and retries.
  Future<Either<Failure, AssignResult>> assignEmployees(
    String geofenceId,
    List<String> employeeIds, {
    bool reassign = false,
  });

  Future<Either<Failure, UnassignResult>> unassignEmployees(
    String geofenceId,
    List<String> employeeIds,
  );
}
