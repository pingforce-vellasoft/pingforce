import '../../domain/entities/user.dart';

class UserModel extends User {
  const UserModel({
    required super.id,
    required super.email,
    required super.name,
    required super.role,
    required super.tenantId,
    super.isOnboarded = false,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? json['userId'],
      email: json['email'],
      name: json['firstName'] != null ? '${json['firstName']} ${json['lastName']}' : 'New User',
      role: json['role'] ?? json['roleCode'],
      tenantId: json['tenantId'],
      isOnboarded: json['isOnboarded'] ?? false,
    );
  }
}
