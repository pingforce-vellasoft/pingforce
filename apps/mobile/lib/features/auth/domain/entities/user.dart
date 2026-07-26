import 'package:equatable/equatable.dart';

class User extends Equatable {
  final String id;
  final String email;
  final String name;
  final String role;
  final String tenantId;
  final String tenantCode;
  final bool isOnboarded;

  /// True once a handset is bound to this employee. Non-employee accounts never
  /// bind, so the API reports them bound. Defaults true: a payload from an older
  /// API that omits the field must not lock the user out of the app.
  final bool deviceBound;
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
    this.deviceBound = true,
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
        deviceBound,
        mustChangePassword,
        isAttendanceEnabled,
      ];
}
