import 'package:dartz/dartz.dart';

import '../../../../core/error/failures.dart';
import '../entities/geofence.dart';

abstract class GeofenceRepository {
  Future<Either<Failure, List<Geofence>>> getGeofences();
  Future<Either<Failure, Geofence>> createGeofence({
    required String name,
    required double latitude,
    required double longitude,
    required int radiusMeters,
  });
  Future<Either<Failure, Unit>> deleteGeofence(String id);
}
