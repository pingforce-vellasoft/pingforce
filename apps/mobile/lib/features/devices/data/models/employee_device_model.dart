import '../../domain/entities/employee_device.dart';

DateTime? _date(dynamic value) {
  if (value is! String || value.isEmpty) return null;
  return DateTime.tryParse(value)?.toLocal();
}

DeviceEmployee? _employee(dynamic value) {
  if (value is! Map<String, dynamic>) return null;
  return DeviceEmployee(
    id: value['id'] as String? ?? '',
    employeeCode: value['employeeCode'] as String? ?? '',
    firstName: value['firstName'] as String? ?? '',
    lastName: value['lastName'] as String? ?? '',
  );
}

/// Wire model for rows from `/api/v1/devices`.
class EmployeeDeviceModel extends EmployeeDevice {
  const EmployeeDeviceModel({
    required super.id,
    required super.employeeId,
    required super.deviceId,
    required super.isTrusted,
    required super.boundAt,
    super.deviceName,
    super.platform,
    super.osVersion,
    super.appVersion,
    super.model,
    super.manufacturer,
    super.revokedAt,
    super.revokedReason,
    super.employee,
  });

  factory EmployeeDeviceModel.fromJson(Map<String, dynamic> json) {
    return EmployeeDeviceModel(
      id: json['id'] as String? ?? '',
      employeeId: json['employeeId'] as String? ?? '',
      deviceId: json['deviceId'] as String? ?? '',
      isTrusted: json['isTrusted'] as bool? ?? false,
      boundAt: _date(json['boundAt']),
      deviceName: json['deviceName'] as String?,
      platform: json['platform'] as String?,
      osVersion: json['osVersion'] as String?,
      appVersion: json['appVersion'] as String?,
      model: json['model'] as String?,
      manufacturer: json['manufacturer'] as String?,
      revokedAt: _date(json['revokedAt']),
      revokedReason: json['revokedReason'] as String?,
      employee: _employee(json['employee']),
    );
  }
}

/// Wire model for rows from `/api/v1/devices/change-requests`.
class DeviceChangeRequestModel extends DeviceChangeRequest {
  const DeviceChangeRequestModel({
    required super.id,
    required super.employeeId,
    required super.newDeviceId,
    required super.reason,
    required super.status,
    required super.priorRequestCount,
    super.currentDeviceId,
    super.newDeviceName,
    super.newPlatform,
    super.newModel,
    super.newManufacturer,
    super.notes,
    super.rejectionReason,
    super.expiresAt,
    super.createdAt,
    super.employee,
  });

  factory DeviceChangeRequestModel.fromJson(Map<String, dynamic> json) {
    return DeviceChangeRequestModel(
      id: json['id'] as String? ?? '',
      employeeId: json['employeeId'] as String? ?? '',
      newDeviceId: json['newDeviceId'] as String? ?? '',
      reason: json['reason'] as String? ?? '',
      status: DeviceChangeStatusX.fromWire(json['status'] as String?),
      priorRequestCount: (json['priorRequestCount'] as num?)?.toInt() ?? 0,
      currentDeviceId: json['currentDeviceId'] as String?,
      newDeviceName: json['newDeviceName'] as String?,
      newPlatform: json['newPlatform'] as String?,
      newModel: json['newModel'] as String?,
      newManufacturer: json['newManufacturer'] as String?,
      notes: json['notes'] as String?,
      rejectionReason: json['rejectionReason'] as String?,
      expiresAt: _date(json['expiresAt']),
      createdAt: _date(json['createdAt']),
      employee: _employee(json['employee']),
    );
  }
}

/// `{ rows, total }` envelope both device endpoints return.
class PagedResult<T> {
  const PagedResult({required this.rows, required this.total});

  final List<T> rows;
  final int total;
}
