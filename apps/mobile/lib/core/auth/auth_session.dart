import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Process-wide authentication state (4.2 AUTHENTICATION.md).
///
/// GoRouter's redirect is a static function without provider access, so the
/// session lives in a lightweight singleton: hydrated from secure storage at
/// splash, updated by the login/logout flows.
class AuthSession {
  AuthSession._();

  static final AuthSession instance = AuthSession._();

  bool isAuthenticated = false;
  String? roleCode;

  /// Restores authentication state from the stored JWT (called from splash).
  Future<void> hydrate(FlutterSecureStorage storage) async {
    try {
      final token = await storage.read(key: 'jwt_token');
      isAuthenticated = token != null && token.isNotEmpty;
    } catch (_) {
      // Storage unavailable (fresh install edge cases, tests) — stay signed out
      isAuthenticated = false;
    }
  }

  void signIn({String? roleCode}) {
    isAuthenticated = true;
    this.roleCode = roleCode;
  }

  Future<void> signOut(FlutterSecureStorage storage) async {
    isAuthenticated = false;
    roleCode = null;
    await storage.delete(key: 'jwt_token');
    await storage.delete(key: 'user_cache');
  }
}
