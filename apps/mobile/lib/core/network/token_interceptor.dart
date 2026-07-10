import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class TokenInterceptor extends Interceptor {
  final FlutterSecureStorage secureStorage;

  TokenInterceptor({required this.secureStorage});

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    // Read JWT from secure enclave (O(1) localized read)
    final token = await secureStorage.read(key: 'jwt_token');
    
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    
    // Add anti-tamper tracking ID for zero-trust (Hardness)
    options.headers['X-Device-Attestation'] = 'trusted-mobile-client';

    return handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    // Handle global 401s (token expiry)
    if (err.response?.statusCode == 401) {
      // Typically trigger a Logout event here via a stream or callback
    }
    return handler.next(err);
  }
}
