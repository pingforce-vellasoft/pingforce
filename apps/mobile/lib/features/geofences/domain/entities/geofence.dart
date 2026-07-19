import 'package:equatable/equatable.dart';

/// An attendance geofence — a circular zone (centre + radius) inside which
/// employee check-ins are considered valid. Mirrors the API `attendance/geofence`
/// resource used by the web admin portal.
class Geofence extends Equatable {
  final String id;
  final String name;
  final double latitude;
  final double longitude;
  final int radiusMeters;

  const Geofence({
    required this.id,
    required this.name,
    required this.latitude,
    required this.longitude,
    required this.radiusMeters,
  });

  @override
  List<Object?> get props => [id, name, latitude, longitude, radiusMeters];
}
