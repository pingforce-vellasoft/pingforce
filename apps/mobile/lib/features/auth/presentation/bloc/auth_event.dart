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
  final String tenantCode;

  const LoginRequested({
    required this.email,
    required this.password,
    required this.tenantCode,
  });

  @override
  List<Object> get props => [email, password, tenantCode];
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
  final String companyName;
  final String firstName;
  final String lastName;
  final String phone;
  final String? industry;
  final String? legalName;
  final String? address;
  final String? city;
  final String? state;
  final String? themeColor;
  final String? logoBase64;
  final String? postalCode;
  final String? country;
  final String? billingEmail;

  const OnboardTenantRequested({
    required this.companyName,
    required this.firstName,
    required this.lastName,
    required this.phone,
    this.industry,
    this.legalName,
    this.address,
    this.city,
    this.state,
    this.themeColor,
    this.logoBase64,
    this.postalCode,
    this.country,
    this.billingEmail,
  });

  @override
  List<Object> get props => [
        companyName,
        firstName,
        lastName,
        phone,
        industry ?? '',
        legalName ?? '',
        address ?? '',
        city ?? '',
        state ?? '',
        themeColor ?? '',
        logoBase64 ?? '',
        postalCode ?? '',
        country ?? '',
        billingEmail ?? '',
      ];
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
