import 'package:dio/dio.dart';

import '../models/geofence_model.dart';

/// Talks to the same `attendance/geofence` API the web admin portal uses.
abstract class GeofenceRemoteDataSource {
  Future<List<GeofenceModel>> getGeofences();
  Future<GeofenceModel> createGeofence(GeofenceModel geofence);
  Future<void> deleteGeofence(String id);
}

class GeofenceRemoteDataSourceImpl implements GeofenceRemoteDataSource {
  final Dio dio;

  GeofenceRemoteDataSourceImpl({required this.dio});

  @override
  Future<List<GeofenceModel>> getGeofences() async {
    final response = await dio.get('/api/v1/attendance/geofence');
    if (response.statusCode == 200) {
      final data = (response.data as List<dynamic>?) ?? const [];
      return data
          .map((e) => GeofenceModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    throw Exception('Server Error');
  }

  @override
  Future<GeofenceModel> createGeofence(GeofenceModel geofence) async {
    final response = await dio.post(
      '/api/v1/attendance/geofence',
      data: geofence.toCreateJson(),
    );
    if (response.statusCode == 200 || response.statusCode == 201) {
      return GeofenceModel.fromJson(response.data as Map<String, dynamic>);
    }
    throw Exception('Server Error');
  }

  @override
  Future<void> deleteGeofence(String id) async {
    final response = await dio.delete('/api/v1/attendance/geofence/$id');
    if (response.statusCode != 200 && response.statusCode != 204) {
      throw Exception('Server Error');
    }
  }
}
