import 'package:dio/dio.dart';

abstract class AuthRemoteDataSource {
  Future<Map<String, dynamic>> login(String email, String password);
  Future<Map<String, dynamic>> signup(String email, String password);
  Future<Map<String, dynamic>> googleAuth(String idToken);
}

class AuthRemoteDataSourceImpl implements AuthRemoteDataSource {
  final Dio dio;

  AuthRemoteDataSourceImpl({required this.dio});

  @override
  Future<Map<String, dynamic>> login(String email, String password) async {
    final response = await dio.post(
      '/api/v1/auth/login',
      data: {
        'email': email,
        'password': password,
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
}
