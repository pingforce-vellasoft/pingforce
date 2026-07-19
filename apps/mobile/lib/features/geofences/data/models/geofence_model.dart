import '../../domain/entities/geofence.dart';

class GeofenceModel extends Geofence {
  const GeofenceModel({
    required super.id,
    required super.name,
    required super.latitude,
    required super.longitude,
    required super.radiusMeters,
  });

  factory GeofenceModel.fromJson(Map<String, dynamic> json) {
    return GeofenceModel(
      id: json['id'] as String,
      name: (json['name'] as String?) ?? '',
      latitude: (json['latitude'] as num?)?.toDouble() ?? 0,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 0,
      radiusMeters: (json['radiusMeters'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toCreateJson() => {
        'name': name,
        'latitude': latitude,
        'longitude': longitude,
        'radiusMeters': radiusMeters,
      };
}
