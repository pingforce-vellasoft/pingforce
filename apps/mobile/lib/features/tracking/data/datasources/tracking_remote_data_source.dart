import 'package:dio/dio.dart';

/// Uploads background location pings to the tracking ingest endpoint.
/// The server is idempotent on `clientRef`, so retried batches are safe.
abstract class TrackingRemoteDataSource {
  Future<void> sendPingBatch(List<Map<String, dynamic>> pings);

  /// Opens a tracking gap when background capture becomes unavailable.
  /// Server-side idempotent: a second open while one is already in progress
  /// returns the existing gap.
  Future<void> openTrackingGap({
    required String reason,
    String? attendanceSessionId,
    int? batteryLevel,
    String? deviceId,
  });

  /// Closes the open gap once capture resumes.
  Future<void> closeTrackingGap();
}

class TrackingRemoteDataSourceImpl implements TrackingRemoteDataSource {
  final Dio dio;

  TrackingRemoteDataSourceImpl({required this.dio});

  @override
  Future<void> sendPingBatch(List<Map<String, dynamic>> pings) async {
    // Body matches the API PingBatchDto contract exactly.
    final response = await dio.post(
      '/api/v1/tracking/ping/batch',
      data: {'pings': pings},
    );
    if (response.statusCode != 200 && response.statusCode != 201) {
      throw Exception('Tracking sync failed');
    }
  }

  @override
  Future<void> openTrackingGap({
    required String reason,
    String? attendanceSessionId,
    int? batteryLevel,
    String? deviceId,
  }) async {
    await dio.post(
      '/api/v1/attendance/tracking-gap/open',
      data: {
        'reason': reason,
        // Null-aware map entries: the key is omitted when the value is null,
        // so the server sees an absent field rather than an explicit null.
        'attendanceSessionId': ?attendanceSessionId,
        'batteryLevel': ?batteryLevel,
        'deviceId': ?deviceId,
      },
    );
  }

  @override
  Future<void> closeTrackingGap() async {
    await dio.post('/api/v1/attendance/tracking-gap/close');
  }
}
