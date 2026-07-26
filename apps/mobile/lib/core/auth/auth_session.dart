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

  /// True once a handset is bound to this employee. Until then the router gates
  /// the app behind the device-binding step: attendance is punchable only from
  /// the bound device, and only an admin can move that binding, so binding has
  /// to happen before the employee reaches the app.
  ///
  /// Defaults true so a non-employee account, or a payload from an API that
  /// predates binding, is never trapped behind a gate it cannot clear.
  bool deviceBound = true;

  /// True once the post-login permissions flow (location + notifications) has
  /// been shown on this device. Device-local — persisted separately from the
  /// JWT-backed account state so a reinstall re-runs it. The router shows the
  /// flow once after profile setup; it is skippable, so this records "seen",
  /// not "granted".
  bool permissionsFlowSeen = false;

  static const _permissionsSeenKey = 'permissions_flow_seen';

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

      permissionsFlowSeen =
          await storage.read(key: _permissionsSeenKey) == 'true';

      if (isAuthenticated) {
        final userCache = await storage.read(key: 'user_cache');
        if (userCache != null) {
          final data = jsonDecode(userCache) as Map<String, dynamic>;
          roleCode = (data['role'] ?? data['roleCode']) as String?;
          mustChangePassword = data['mustChangePassword'] == true;
          isOnboarded = data['isOnboarded'] == true;
          deviceBound = data['deviceBound'] != false;
        }
      } else {
        roleCode = null;
        mustChangePassword = false;
        isOnboarded = false;
        deviceBound = true;
      }
    } catch (_) {
      // Storage unavailable (fresh install edge cases, tests) — stay signed out
      isAuthenticated = false;
      roleCode = null;
      mustChangePassword = false;
      isOnboarded = false;
      deviceBound = true;
    }
  }

  void signIn({
    String? roleCode,
    bool mustChangePassword = false,
    bool isOnboarded = false,
    bool deviceBound = true,
  }) {
    isAuthenticated = true;
    this.roleCode = roleCode;
    this.mustChangePassword = mustChangePassword;
    this.isOnboarded = isOnboarded;
    this.deviceBound = deviceBound;
  }

  /// Marks the permissions flow shown for this device and persists it so the
  /// router does not re-show it on the next launch. Survives sign-out (it is a
  /// device fact, not an account one).
  Future<void> markPermissionsFlowSeen(FlutterSecureStorage storage) async {
    permissionsFlowSeen = true;
    await storage.write(key: _permissionsSeenKey, value: 'true');
  }

  /// Re-arms the permissions gate on this device.
  ///
  /// The flag is device-local by design (a reinstall re-runs the flow), so the
  /// server-side gate-chain reset cannot clear it — without this, replaying the
  /// chain means clearing app storage by hand. Debug builds only: the debug
  /// panel is the sole caller.
  Future<void> resetPermissionsFlowSeen(FlutterSecureStorage storage) async {
    permissionsFlowSeen = false;
    await storage.delete(key: _permissionsSeenKey);
  }

  Future<void> signOut(FlutterSecureStorage storage) async {
    isAuthenticated = false;
    roleCode = null;
    mustChangePassword = false;
    isOnboarded = false;
    // Note: the device id itself is deliberately NOT cleared here — it is a
    // property of the handset, not the session. Clearing it would make the next
    // sign-in look like a new device and require an admin-approved change.
    deviceBound = true;
    await storage.delete(key: 'jwt_token');
    // The refresh token MUST go too. Leaving it behind meant an explicit sign
    // out still left a live credential on the device: TokenInterceptor renews
    // from it on the next 401, silently restoring the previous user's session
    // on a device someone else may now be holding.
    await storage.delete(key: 'refresh_token');
    await storage.delete(key: 'user_cache');
  }
}
