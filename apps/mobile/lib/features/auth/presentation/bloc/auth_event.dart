import 'package:equatable/equatable.dart';

abstract class AuthEvent extends Equatable {
  const AuthEvent();

  @override
  List<Object> get props => [];
}

class CheckAuthStatus extends AuthEvent {}

class LoginRequested extends AuthEvent {
  final String email;
  final String password;

  const LoginRequested({required this.email, required this.password});

  @override
  List<Object> get props => [email, password];
}

class SignupRequested extends AuthEvent {
  final String email;
  final String password;

  const SignupRequested({
    required this.email,
    required this.password,
  });

  @override
  List<Object> get props => [email, password];
}

class GoogleSignInRequested extends AuthEvent {}

class OnboardTenantRequested extends AuthEvent {
  final String firstName;
  final String lastName;
  final String phone;
  final String companyName;

  const OnboardTenantRequested({
    required this.firstName,
    required this.lastName,
    required this.phone,
    required this.companyName,
  });

  @override
  List<Object> get props => [firstName, lastName, phone, companyName];
}

class OnboardEmployeeRequested extends AuthEvent {
  final String firstName;
  final String lastName;
  final String phone;
  final String companyCode;

  const OnboardEmployeeRequested({
    required this.firstName,
    required this.lastName,
    required this.phone,
    required this.companyCode,
  });

  @override
  List<Object> get props => [firstName, lastName, phone, companyCode];
}

class LogoutRequested extends AuthEvent {}
