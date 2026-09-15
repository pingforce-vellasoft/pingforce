import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../../core/auth/auth_session.dart';
import '../../../core/network/token_interceptor.dart';

/// A provider a verified contact holds a portal account with.
class PortalTenant {
  const PortalTenant({required this.code, required this.name, this.logoUrl});

  final String code;
  final String name;
  final String? logoUrl;
}

/// Authentication for customer portal identities.
///
/// Customers are NOT staff `User` rows — they live in `customer_portal_users`
/// with their own login, refresh and logout endpoints. Sessions are stamped
/// with the CUSTOMER realm so [TokenInterceptor] renews them against the
/// portal route.
class PortalAuthDataSource {
  PortalAuthDataSource({required this.dio, required this.secureStorage});

  final Dio dio;
  final FlutterSecureStorage secureStorage;

  static const _base = '/api/v1/portal/auth';
  static const tenantCodeKey = 'portal_tenant_code';

  Future<void> loginWithPassword({
    required String tenantCode,
    required String password,
    String? email,
    String? phone,
  }) async {
    final response = await dio.post<Map<String, dynamic>>(
      '$_base/login',
      data: {
        'tenantCode': tenantCode,
        'password': password,
        if (email != null && email.isNotEmpty) 'email': email,
        if (phone != null && phone.isNotEmpty) 'phone': phone,
      },
    );
    await _persistSession(response.data ?? const {}, tenantCode);
  }

  /// Sends a login code. The response is identical whether or not the account
  /// exists, so callers must not treat success as proof of an account.
  Future<void> requestLoginOtp({
    required String tenantCode,
    String? email,
    String? phone,
  }) async {
    await dio.post<dynamic>(
      '$_base/otp/request',
      data: {
        'tenantCode': tenantCode,
        if (email != null && email.isNotEmpty) 'email': email,
        if (phone != null && phone.isNotEmpty) 'phone': phone,
      },
    );
  }

  Future<void> loginWithOtp({
    required String tenantCode,
    required String otp,
    String? email,
    String? phone,
  }) async {
    final response = await dio.post<Map<String, dynamic>>(
      '$_base/otp/verify',
      data: {
        'tenantCode': tenantCode,
        'otp': otp,
        if (email != null && email.isNotEmpty) 'email': email,
        if (phone != null && phone.isNotEmpty) 'phone': phone,
      },
    );
    await _persistSession(response.data ?? const {}, tenantCode);
  }

  // ── Tenant discovery — "I lost my provider code" ─────────────────────────

  Future<void> requestTenantDiscovery({String? email, String? phone}) async {
    await dio.post<dynamic>(
      '$_base/tenants/discover',
      data: {
        if (email != null && email.isNotEmpty) 'email': email,
        if (phone != null && phone.isNotEmpty) 'phone': phone,
      },
    );
  }

  /// Providers the verified contact holds an account with. The list is only
  /// released once the code proves ownership of the inbox.
  Future<List<PortalTenant>> verifyTenantDiscovery({
    required String otp,
    String? email,
    String? phone,
  }) async {
    final response = await dio.post<Map<String, dynamic>>(
      '$_base/tenants/verify',
      data: {
        'otp': otp,
        if (email != null && email.isNotEmpty) 'email': email,
        if (phone != null && phone.isNotEmpty) 'phone': phone,
      },
    );

    final rows = (response.data?['tenants'] as List<dynamic>?) ?? const [];
    return rows
        .whereType<Map<String, dynamic>>()
        .map(
          (t) => PortalTenant(
            code: (t['code'] ?? '') as String,
            name: (t['name'] ?? '') as String,
            logoUrl: t['logoUrl'] as String?,
          ),
        )
        .toList(growable: false);
  }

  // ── Invite activation ────────────────────────────────────────────────────

  /// Verifies an invite token and returns the tenant context, so the
  /// activation form can show the provider code pre-filled.
  Future<Map<String, dynamic>> verifyInvite(String token) async {
    final response = await dio.post<Map<String, dynamic>>(
      '$_base/invite/verify',
      data: {'token': token},
    );
    return response.data ?? const {};
  }

  Future<void> activate({
    required String token,
    required String otp,
    String? password,
    String? tenantCode,
  }) async {
    final response = await dio.post<Map<String, dynamic>>(
      '$_base/invite/activate',
      data: {
        'token': token,
        'otp': otp,
        if (password != null && password.isNotEmpty) 'password': password,
      },
    );
    await _persistSession(response.data ?? const {}, tenantCode);
  }

  /// The last provider code used on this device — pre-fills the login form so
  /// a returning customer does not have to find it again.
  Future<String?> cachedTenantCode() =>
      secureStorage.read(key: tenantCodeKey);

  Future<void> _persistSession(
    Map<String, dynamic> data,
    String? tenantCode,
  ) async {
    final access = (data['accessToken'] ?? data['access_token']) as String?;
    final refresh = (data['refreshToken'] ?? data['refresh_token']) as String?;
    if (access == null || access.isEmpty) {
      throw DioException(
        requestOptions: RequestOptions(path: _base),
        message: 'Invalid server response: missing access token',
      );
    }

    await secureStorage.write(key: 'jwt_token', value: access);
    if (refresh != null && refresh.isNotEmpty) {
      await secureStorage.write(key: 'refresh_token', value: refresh);
    }

    // Refresh must target the portal route for this session.
    await secureStorage.write(
      key: TokenInterceptor.realmKey,
      value: TokenInterceptor.realmCustomer,
    );

    final user = data['user'];
    if (user is Map<String, dynamic>) {
      await secureStorage.write(key: 'user_cache', value: jsonEncode(user));
      final code = (user['tenantCode'] ?? tenantCode) as String?;
      if (code != null && code.isNotEmpty) {
        await secureStorage.write(key: tenantCodeKey, value: code);
      }
    } else if (tenantCode != null && tenantCode.isNotEmpty) {
      await secureStorage.write(key: tenantCodeKey, value: tenantCode);
    }

    // The portal token carries no RBAC role claim, so the shell's role is set
    // explicitly — NavDestinations.fromRoleCode maps CUSTOMER to the customer
    // shell, which has none of the field-work tabs.
    //
    // The employee gates (profile onboarding, device binding, forced password
    // change) are cleared: they describe staff provisioning a customer can
    // never satisfy, and leaving them armed would strand the session on a
    // setup screen with no way forward.
    AuthSession.instance.signIn(roleCode: 'CUSTOMER', isOnboarded: true);
  }
}
