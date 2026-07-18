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
      mustChangePassword: json['mustChangePassword'] ?? false,
      isAttendanceEnabled: json['isAttendanceEnabled'] ?? false,
    );
  }
}
