import 'package:dio/dio.dart';

abstract class AuthRemoteDataSource {
  Future<Map<String, dynamic>> login(String email, String password, String tenantCode);
  Future<Map<String, dynamic>> signup(String email, String password);
  Future<Map<String, dynamic>> googleAuth(String idToken);
  Future<Map<String, dynamic>> onboardTenant(Map<String, dynamic> data);
  Future<Map<String, dynamic>> onboardEmployee(Map<String, dynamic> data);
  Future<void> requestPasswordReset(String email, String tenantCode);
  Future<void> confirmPasswordReset(
    String email,
    String tenantCode,
    String otp,
    String newPassword,
  );
  Future<void> changePassword(String currentPassword, String newPassword);
}

class AuthRemoteDataSourceImpl implements AuthRemoteDataSource {
  final Dio dio;

  AuthRemoteDataSourceImpl({required this.dio});

  @override
  Future<Map<String, dynamic>> login(String email, String password, String tenantCode) async {
    final response = await dio.post(
      '/api/v1/auth/login',
      data: {
        'email': email,
        'password': password,
        'tenantCode': tenantCode,
        // Identifies this client so the API can enforce portal access rules
        // (platform super admins are rejected on the mobile app).
        'portalType': 'MOBILE_APP',
      },
    );

    return response.data;
  }

  @override
  Future<Map<String, dynamic>> signup(String email, String password) async {
    final response = await dio.post(
      '/api/v1/auth/register-tenant',
      data: {
        'adminEmail': email,
        'adminPassword': password,
      },
    );
    return response.data;
  }

  @override
  Future<Map<String, dynamic>> googleAuth(String idToken) async {
    final response = await dio.post(
      '/api/v1/auth/google',
      data: {
        'idToken': idToken,
        'tenantCode': 'DEFAULT',
      },
    );
    return response.data;
  }

  @override
  Future<Map<String, dynamic>> onboardTenant(Map<String, dynamic> data) async {
    final response = await dio.post(
      '/api/v1/auth/onboarding/tenant',
      data: data,
    );
    return response.data;
  }

  @override
  Future<Map<String, dynamic>> onboardEmployee(
    Map<String, dynamic> data,
  ) async {
    final response = await dio.post(
      '/api/v1/auth/onboarding/employee',
      data: data,
    );
    return response.data;
  }

  @override
  Future<void> requestPasswordReset(String email, String tenantCode) async {
    await dio.post(
      '/api/v1/auth/reset-password',
      data: {'email': email, 'tenantCode': tenantCode},
    );
  }

  @override
  Future<void> confirmPasswordReset(
    String email,
    String tenantCode,
    String otp,
    String newPassword,
  ) async {
    await dio.post(
      '/api/v1/auth/reset-password/confirm',
      data: {
        'email': email,
        'tenantCode': tenantCode,
        'otp': otp,
        'newPassword': newPassword,
      },
    );
  }

  @override
  Future<void> changePassword(
    String currentPassword,
    String newPassword,
  ) async {
    await dio.post(
      '/api/v1/auth/change-password',
      data: {
        'currentPassword': currentPassword,
        'newPassword': newPassword,
      },
    );
  }
}
