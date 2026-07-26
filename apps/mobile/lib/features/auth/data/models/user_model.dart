import '../../domain/entities/user.dart';

class UserModel extends User {
  const UserModel({
    required super.id,
    required super.email,
    required super.name,
    required super.role,
    required super.tenantId,
    required super.tenantCode,
    super.isOnboarded = false,
    super.deviceBound = true,
    super.mustChangePassword = false,
    super.isAttendanceEnabled = false,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? json['userId'],
      email: json['email'],
      name: json['name'] ?? (json['firstName'] != null ? '${json['firstName']} ${json['lastName']}' : 'New User'),
      role: json['role'] ?? json['roleCode'],
      tenantId: json['tenantId'],
      tenantCode: json['tenantCode'] ?? 'DEFAULT',
      isOnboarded: json['isOnboarded'] ?? false,
      // Absent means an API that predates device binding — treat as bound
      // rather than trapping the user behind a gate the server cannot clear.
      deviceBound: json['deviceBound'] ?? true,
      mustChangePassword: json['mustChangePassword'] ?? false,
      isAttendanceEnabled: json['isAttendanceEnabled'] ?? false,
    );
  }
}
