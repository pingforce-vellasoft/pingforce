import 'package:dio/dio.dart';

abstract class AuthRemoteDataSource {
  Future<Map<String, dynamic>> login(String email, String password);
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
    
    if (response.statusCode == 200 || response.statusCode == 201) {
      return response.data; // Expected to contain { token: "...", user: {...} }
    } else {
      throw Exception('Invalid credentials');
    }
  }
}
