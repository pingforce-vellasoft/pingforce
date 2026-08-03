import 'package:dio/dio.dart';

import '../../domain/entities/employee_device.dart';
import '../models/employee_device_model.dart';

/// Talks to the same `/api/v1/devices` admin endpoints the web portal uses.
abstract class DeviceAdminRemoteDataSource {
  Future<PagedResult<EmployeeDeviceModel>> listDevices({
    String? search,
    int skip,
    int take,
  });

  Future<PagedResult<DeviceChangeRequestModel>> listChangeRequests({
    DeviceChangeStatus? status,
    int skip,
    int take,
  });

  Future<DeviceChangeRequestModel> approveChangeRequest(String id);
  Future<DeviceChangeRequestModel> rejectChangeRequest(
    String id,
    String rejectionReason,
  );
  Future<EmployeeDeviceModel> revokeDevice(String id, {String? reason});
}

class DeviceAdminRemoteDataSourceImpl implements DeviceAdminRemoteDataSource {
  DeviceAdminRemoteDataSourceImpl({required this.dio});

  final Dio dio;

  static const _base = '/api/v1/devices';

  /// Both list endpoints return `{ rows, total }`. Tolerate a bare array too so
  /// a shape change does not blank the screen.
  ({List<Map<String, dynamic>> rows, int total}) _unwrap(dynamic payload) {
    if (payload is Map) {
      final rows = (payload['rows'] as List<dynamic>? ?? const [])
          .whereType<Map<String, dynamic>>()
          .toList();
      return (rows: rows, total: (payload['total'] as num?)?.toInt() ?? rows.length);
    }
    if (payload is List) {
      final rows = payload.whereType<Map<String, dynamic>>().toList();
      return (rows: rows, total: rows.length);
    }
    return (rows: const <Map<String, dynamic>>[], total: 0);
  }

  @override
  Future<PagedResult<EmployeeDeviceModel>> listDevices({
    String? search,
    int skip = 0,
    int take = 50,
  }) async {
    final response = await dio.get(
      _base,
      queryParameters: {
        'skip': skip,
        'take': take,
        if (search != null && search.trim().isNotEmpty) 'search': search.trim(),
      },
    );
    final data = _unwrap(response.data);
    return PagedResult(
      rows: data.rows.map(EmployeeDeviceModel.fromJson).toList(),
      total: data.total,
    );
  }

  @override
  Future<PagedResult<DeviceChangeRequestModel>> listChangeRequests({
    DeviceChangeStatus? status,
    int skip = 0,
    int take = 50,
  }) async {
    final response = await dio.get(
      '$_base/change-requests',
      queryParameters: {
        'skip': skip,
        'take': take,
        if (status != null) 'status': status.wire,
      },
    );
    final data = _unwrap(response.data);
    return PagedResult(
      rows: data.rows.map(DeviceChangeRequestModel.fromJson).toList(),
      total: data.total,
    );
  }

  @override
  Future<DeviceChangeRequestModel> approveChangeRequest(String id) async {
    final response = await dio.post(
      '$_base/change-requests/$id/approve',
      data: const {},
    );
    return DeviceChangeRequestModel.fromJson(
      response.data as Map<String, dynamic>,
    );
  }

  @override
  Future<DeviceChangeRequestModel> rejectChangeRequest(
    String id,
    String rejectionReason,
  ) async {
    final response = await dio.post(
      '$_base/change-requests/$id/reject',
      data: {'rejectionReason': rejectionReason},
    );
    return DeviceChangeRequestModel.fromJson(
      response.data as Map<String, dynamic>,
    );
  }

  @override
  Future<EmployeeDeviceModel> revokeDevice(String id, {String? reason}) async {
    final response = await dio.post(
      '$_base/$id/revoke',
      data: {if (reason != null && reason.trim().isNotEmpty) 'reason': reason.trim()},
    );
    return EmployeeDeviceModel.fromJson(response.data as Map<String, dynamic>);
  }
}
