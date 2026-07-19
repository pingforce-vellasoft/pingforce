import 'package:dio/dio.dart';

/// Uploads background location pings to the tracking ingest endpoint.
/// The server is idempotent on `clientRef`, so retried batches are safe.
abstract class TrackingRemoteDataSource {
  Future<void> sendPingBatch(List<Map<String, dynamic>> pings);
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
}
