import 'package:dio/dio.dart';
import '../models/attendance_model.dart';

abstract class AttendanceRemoteDataSource {
  Future<void> registerDevice(String deviceId, String publicKey);
  Future<AttendanceModel> punch(
    String deviceId,
    double lat,
    double lng,
    String signature,
  );
  Future<void> syncPunches(List<Map<String, dynamic>> punches);
}

class AttendanceRemoteDataSourceImpl implements AttendanceRemoteDataSource {
  final Dio dio;

  AttendanceRemoteDataSourceImpl({required this.dio});

  @override
  Future<void> registerDevice(String deviceId, String publicKey) async {
    final response = await dio.post(
      '/api/v1/attendance/device/register',
      data: {
        'deviceId': deviceId,
        'publicKey': publicKey,
      },
    );
    if (response.statusCode != 200 && response.statusCode != 201) {
      throw Exception('Server Error');
    }
  }

  @override
  Future<AttendanceModel> punch(
    String deviceId,
    double lat,
    double lng,
    String signature,
  ) async {
    // Body matches the API PunchDto contract exactly
    final response = await dio.post(
      '/api/v1/attendance/punch',
      data: {
        'deviceId': deviceId,
        'latitude': lat,
        'longitude': lng,
        'signature': signature,
        'timestamp': DateTime.now().toIso8601String(),
      },
    );

    if (response.statusCode == 200 || response.statusCode == 201) {
      return AttendanceModel.fromJson(response.data);
    } else {
      throw Exception('Server Error');
    }
  }

  @override
  Future<void> syncPunches(List<Map<String, dynamic>> punches) async {
    // Offline queue drain (3.1 OFFLINE_SYNC.md) — server is idempotent, so
    // retried uploads are safe.
    final response = await dio.post(
      '/api/v1/attendance/sync',
      data: {'punches': punches},
    );
    if (response.statusCode != 200 && response.statusCode != 201) {
      throw Exception('Sync failed');
    }
  }
}
