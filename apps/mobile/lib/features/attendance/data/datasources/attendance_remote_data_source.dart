import 'package:dio/dio.dart';
import '../models/attendance_model.dart';

abstract class AttendanceRemoteDataSource {
  Future<void> registerDevice(String publicKey);
  Future<AttendanceModel> punch(double lat, double lng, String signature);
}

class AttendanceRemoteDataSourceImpl implements AttendanceRemoteDataSource {
  final Dio dio;

  AttendanceRemoteDataSourceImpl({required this.dio});

  @override
  Future<void> registerDevice(String publicKey) async {
    // Note: Assuming auth token interceptor is attached to Dio elsewhere.
    final response = await dio.post(
      '/api/v1/attendance/device/register',
      data: {
        'deviceId': 'device_from_plugin', // TODO: Get actual device ID using device_info_plus
        'publicKey': publicKey,
      },
    );
    if (response.statusCode != 200 && response.statusCode != 201) {
      throw Exception('Server Error');
    }
  }

  @override
  Future<AttendanceModel> punch(double lat, double lng, String signature) async {
    final response = await dio.post(
      '/api/v1/attendance/punch',
      data: {
        'attendanceMethod': 'BIOMETRIC',
        'deviceSignature': signature,
        'latitude': lat,
        'longitude': lng,
      },
    );
    
    if (response.statusCode == 200 || response.statusCode == 201) {
      return AttendanceModel.fromJson(response.data);
    } else {
      throw Exception('Server Error');
    }
  }
}
