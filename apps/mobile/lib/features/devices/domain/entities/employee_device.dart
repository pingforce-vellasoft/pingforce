/// Employee summary embedded in device and change-request rows.
class DeviceEmployee {
  const DeviceEmployee({
    required this.id,
    required this.employeeCode,
    required this.firstName,
    required this.lastName,
  });

  final String id;
  final String employeeCode;
  final String firstName;
  final String lastName;

  String get fullName {
    final combined = '${firstName.trim()} ${lastName.trim()}'.trim();
    return combined.isEmpty ? employeeCode : combined;
  }
}

/// A handset bound to an employee. One active binding per employee; a revoked
/// row is kept for audit rather than deleted.
class EmployeeDevice {
  const EmployeeDevice({
    required this.id,
    required this.employeeId,
    required this.deviceId,
    required this.isTrusted,
    required this.boundAt,
    this.deviceName,
    this.platform,
    this.osVersion,
    this.appVersion,
    this.model,
    this.manufacturer,
    this.revokedAt,
    this.revokedReason,
    this.employee,
  });

  final String id;
  final String employeeId;
  final String deviceId;
  final bool isTrusted;
  final DateTime? boundAt;
  final String? deviceName;
  final String? platform;
  final String? osVersion;
  final String? appVersion;
  final String? model;
  final String? manufacturer;
  final DateTime? revokedAt;
  final String? revokedReason;
  final DeviceEmployee? employee;

  bool get isRevoked => revokedAt != null;

  /// Best available hardware label: explicit name, else manufacturer + model,
  /// else the raw device id so a row is never blank.
  String get displayName {
    final name = deviceName?.trim();
    if (name != null && name.isNotEmpty) return name;
    final hardware = [manufacturer?.trim(), model?.trim()]
        .where((p) => p != null && p.isNotEmpty)
        .join(' ');
    return hardware.isEmpty ? deviceId : hardware;
  }
}

/// Lifecycle of an employee's request to move their binding to a new handset.
enum DeviceChangeStatus { pending, approved, rejected, cancelled, expired }

extension DeviceChangeStatusX on DeviceChangeStatus {
  static DeviceChangeStatus fromWire(String? raw) {
    return switch (raw?.toUpperCase()) {
      'APPROVED' => DeviceChangeStatus.approved,
      'REJECTED' => DeviceChangeStatus.rejected,
      'CANCELLED' => DeviceChangeStatus.cancelled,
      'EXPIRED' => DeviceChangeStatus.expired,
      _ => DeviceChangeStatus.pending,
    };
  }

  String get wire => switch (this) {
        DeviceChangeStatus.pending => 'PENDING',
        DeviceChangeStatus.approved => 'APPROVED',
        DeviceChangeStatus.rejected => 'REJECTED',
        DeviceChangeStatus.cancelled => 'CANCELLED',
        DeviceChangeStatus.expired => 'EXPIRED',
      };

  String get label => switch (this) {
        DeviceChangeStatus.pending => 'Pending',
        DeviceChangeStatus.approved => 'Approved',
        DeviceChangeStatus.rejected => 'Rejected',
        DeviceChangeStatus.cancelled => 'Cancelled',
        DeviceChangeStatus.expired => 'Expired',
      };
}

/// An employee's request to bind a different handset. Approving it rebinds the
/// employee and cuts their existing sessions, so it is an admin decision.
class DeviceChangeRequest {
  const DeviceChangeRequest({
    required this.id,
    required this.employeeId,
    required this.newDeviceId,
    required this.reason,
    required this.status,
    required this.priorRequestCount,
    this.currentDeviceId,
    this.newDeviceName,
    this.newPlatform,
    this.newModel,
    this.newManufacturer,
    this.notes,
    this.rejectionReason,
    this.expiresAt,
    this.createdAt,
    this.employee,
  });

  final String id;
  final String employeeId;
  final String newDeviceId;
  final String reason;
  final DeviceChangeStatus status;

  /// How many requests this employee has raised — a repeat pattern is signal
  /// that the admin should look closer before approving.
  final int priorRequestCount;

  final String? currentDeviceId;
  final String? newDeviceName;
  final String? newPlatform;
  final String? newModel;
  final String? newManufacturer;
  final String? notes;
  final String? rejectionReason;
  final DateTime? expiresAt;
  final DateTime? createdAt;
  final DeviceEmployee? employee;

  bool get isPending => status == DeviceChangeStatus.pending;

  String get newDeviceLabel {
    final name = newDeviceName?.trim();
    if (name != null && name.isNotEmpty) return name;
    final hardware = [newManufacturer?.trim(), newModel?.trim()]
        .where((p) => p != null && p.isNotEmpty)
        .join(' ');
    return hardware.isEmpty ? newDeviceId : hardware;
  }
}
