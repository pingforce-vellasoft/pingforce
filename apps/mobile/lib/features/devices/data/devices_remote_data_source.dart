import 'package:dio/dio.dart';

import '../../../core/hardware/device_identity.dart';

/// Device binding API (DeviceManagement.md §13).
///
/// Binding is one-shot: /devices/bind succeeds only while the employee has no
/// active device. Every later move is an admin-approved change request, so this
/// datasource deliberately exposes no "re-register" call.
abstract class DevicesRemoteDataSource {
  Future<Map<String, dynamic>> bind(
    DeviceFingerprint fingerprint,
    String publicKey,
  );

  /// Activates a binding an admin approved, with this handset's own key.
  Future<Map<String, dynamic>> claim(String deviceId, String publicKey);

  Future<Map<String, dynamic>> getMyDevice();

  Future<Map<String, dynamic>> createChangeRequest({
    required DeviceFingerprint fingerprint,
    required String publicKey,
    required String reason,
    String? notes,
  });

  Future<void> cancelChangeRequest(String requestId);
}

class DevicesRemoteDataSourceImpl implements DevicesRemoteDataSource {
  DevicesRemoteDataSourceImpl({required this.dio});

  final Dio dio;

  @override
  Future<Map<String, dynamic>> bind(
    DeviceFingerprint fingerprint,
    String publicKey,
  ) async {
    final response = await dio.post(
      '/api/v1/devices/bind',
      data: {...fingerprint.toJson(), 'publicKey': publicKey},
    );
    return Map<String, dynamic>.from(response.data as Map);
  }

  @override
  Future<Map<String, dynamic>> claim(String deviceId, String publicKey) async {
    final response = await dio.post(
      '/api/v1/devices/claim',
      data: {'deviceId': deviceId, 'publicKey': publicKey},
    );
    return Map<String, dynamic>.from(response.data as Map);
  }

  @override
  Future<Map<String, dynamic>> getMyDevice() async {
    final response = await dio.get('/api/v1/devices/me');
    return Map<String, dynamic>.from(response.data as Map);
  }

  @override
  Future<Map<String, dynamic>> createChangeRequest({
    required DeviceFingerprint fingerprint,
    required String publicKey,
    required String reason,
    String? notes,
  }) async {
    final json = fingerprint.toJson();
    final response = await dio.post(
      '/api/v1/devices/change-requests',
      data: {
        // The server names the incoming handset "newDeviceId" — the binding
        // being replaced is the one it already has on file.
        'newDeviceId': json.remove('deviceId'),
        ...json,
        'publicKey': publicKey,
        'reason': reason,
        if (notes != null && notes.isNotEmpty) 'notes': notes,
      },
    );
    return Map<String, dynamic>.from(response.data as Map);
  }

  @override
  Future<void> cancelChangeRequest(String requestId) async {
    await dio.post('/api/v1/devices/change-requests/$requestId/cancel');
  }
}
