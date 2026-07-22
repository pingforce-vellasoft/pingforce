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

  /// True once the account has a completed profile (and, for a tenant admin,
  /// company details). Until then the router gates the app behind the profile
  /// setup screen — the mobile counterpart of the admin portal's /onboarding.
  bool isOnboarded = false;

  /// Whether this account owns the tenant record, and so gets the company +
  /// branding (white-label) steps during setup instead of the profile-only
  /// flow. Mirrors `AppUserRoleX.fromRoleCode`'s admin arm: `ADMIN_MANAGER` is
  /// the built-in system role, and custom tenant roles prefixed `ADMIN` are
  /// treated as admins there too.
  bool get isTenantOwner {
    final code = (roleCode ?? '').toUpperCase();
    return code == 'ADMIN_MANAGER' || code.startsWith('ADMIN');
  }

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
          isOnboarded = data['isOnboarded'] == true;
        }
      } else {
        roleCode = null;
        mustChangePassword = false;
        isOnboarded = false;
      }
    } catch (_) {
      // Storage unavailable (fresh install edge cases, tests) — stay signed out
      isAuthenticated = false;
      roleCode = null;
      mustChangePassword = false;
      isOnboarded = false;
    }
  }

  void signIn({
    String? roleCode,
    bool mustChangePassword = false,
    bool isOnboarded = false,
  }) {
    isAuthenticated = true;
    this.roleCode = roleCode;
    this.mustChangePassword = mustChangePassword;
    this.isOnboarded = isOnboarded;
  }

  Future<void> signOut(FlutterSecureStorage storage) async {
    isAuthenticated = false;
    roleCode = null;
    mustChangePassword = false;
    isOnboarded = false;
    await storage.delete(key: 'jwt_token');
    await storage.delete(key: 'user_cache');
  }
}
