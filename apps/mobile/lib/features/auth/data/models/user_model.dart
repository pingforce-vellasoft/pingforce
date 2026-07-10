import '../../domain/entities/user.dart';

class UserModel extends User {
  const UserModel({
    required super.id,
    required super.email,
    required super.name,
    required super.role,
    required super.tenantId,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'],
      email: json['email'],
      name: '${json['firstName']} ${json['lastName']}',
      role: json['role'],
      tenantId: json['tenantId'],
    );
  }
}
