import 'dart:convert';

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

  /// True while the account still owes a forced password change (a temporary
  /// password chosen by an admin). The router gates the app behind the
  /// change-password screen until this clears.
  bool mustChangePassword = false;

  /// Restores authentication state from the stored JWT (called from splash).
  /// Also rehydrates the role and forced-password-change flag from the cached
  /// user so the shell nav and RouteGuard reflect the real account on relaunch
  /// (not just a signed-in/out boolean).
  Future<void> hydrate(FlutterSecureStorage storage) async {
    try {
      final token = await storage.read(key: 'jwt_token');
      isAuthenticated = token != null && token.isNotEmpty;

      if (isAuthenticated) {
        final userCache = await storage.read(key: 'user_cache');
        if (userCache != null) {
          final data = jsonDecode(userCache) as Map<String, dynamic>;
          roleCode = (data['role'] ?? data['roleCode']) as String?;
          mustChangePassword = data['mustChangePassword'] == true;
        }
      } else {
        roleCode = null;
        mustChangePassword = false;
      }
    } catch (_) {
      // Storage unavailable (fresh install edge cases, tests) — stay signed out
      isAuthenticated = false;
      roleCode = null;
      mustChangePassword = false;
    }
  }

  void signIn({String? roleCode, bool mustChangePassword = false}) {
    isAuthenticated = true;
    this.roleCode = roleCode;
    this.mustChangePassword = mustChangePassword;
  }

  Future<void> signOut(FlutterSecureStorage storage) async {
    isAuthenticated = false;
    roleCode = null;
    mustChangePassword = false;
    await storage.delete(key: 'jwt_token');
    await storage.delete(key: 'user_cache');
  }
}
