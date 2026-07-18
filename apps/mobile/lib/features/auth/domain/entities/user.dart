import 'package:equatable/equatable.dart';

class User extends Equatable {
  final String id;
  final String email;
  final String name;
  final String role;
  final String tenantId;
  final String tenantCode;
  final bool isOnboarded;
  final bool mustChangePassword;
  final bool isAttendanceEnabled;

  const User({
    required this.id,
    required this.email,
    required this.name,
    required this.role,
    required this.tenantId,
    required this.tenantCode,
    this.isOnboarded = false,
    this.mustChangePassword = false,
    this.isAttendanceEnabled = false,
  });

  @override
  List<Object?> get props => [
        id,
        email,
        name,
        role,
        tenantId,
        tenantCode,
        isOnboarded,
        mustChangePassword,
        isAttendanceEnabled,
      ];
}
