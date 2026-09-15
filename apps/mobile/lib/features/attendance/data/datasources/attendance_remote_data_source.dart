import 'package:dio/dio.dart';
import '../models/attendance_model.dart';
import '../models/attendance_today_model.dart';

abstract class AttendanceRemoteDataSource {
  Future<AttendanceModel> punch(
    String deviceId,
    DateTime timestamp,
    double lat,
    double lng,
    double accuracy,
    bool isMockLocation,
    bool biometricVerified,
    String signature,
  );
  Future<Map<String, dynamic>> getPolicy();
  Future<void> syncPunches(List<Map<String, dynamic>> punches);

  /// Today's snapshot — open session, punch history, totals, leave balances.
  Future<AttendanceTodayModel> getToday();
}

class AttendanceRemoteDataSourceImpl implements AttendanceRemoteDataSource {
  final Dio dio;

  AttendanceRemoteDataSourceImpl({required this.dio});

  @override
  Future<AttendanceModel> punch(
    String deviceId,
    DateTime timestamp,
    double lat,
    double lng,
    double accuracy,
    bool isMockLocation,
    bool biometricVerified,
    String signature,
  ) async {
    // Body matches the API PunchDto contract exactly
    final response = await dio.post(
      '/api/v1/attendance/punch',
      data: {
        'deviceId': deviceId,
        'latitude': lat,
        'longitude': lng,
        'accuracy': accuracy,
        'isMockLocation': isMockLocation,
        'biometricVerified': biometricVerified,
        'signature': signature,
        'timestamp': timestamp.toUtc().toIso8601String(),
      },
    );

    if (response.statusCode == 200 || response.statusCode == 201) {
      return AttendanceModel.fromJson(response.data);
    } else {
      throw Exception('Server Error');
    }
  }

  @override
  Future<Map<String, dynamic>> getPolicy() async {
    final response = await dio.get('/api/v1/attendance/policy');
    return Map<String, dynamic>.from(response.data as Map);
  }

  @override
  Future<AttendanceTodayModel> getToday() async {
    final response = await dio.get('/api/v1/attendance/today');
    if (response.statusCode == 200) {
      return AttendanceTodayModel.fromJson(
        response.data as Map<String, dynamic>,
      );
    }
    throw Exception('Failed to load today\'s attendance');
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
