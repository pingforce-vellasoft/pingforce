import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:hive_flutter/hive_flutter.dart';

import '../auth/auth_session.dart';
import '../sync/sync_provider.dart';

/// Attaches the JWT access token to every request and silently renews it on a
/// 401 using the stored refresh token.
///
/// The access token lives 15 minutes (JWT_EXPIRATION). Without renewal, any
/// request made after it expires 401s with no recovery until the user signs in
/// again — the cause of the intermittent "Could not load your profile" errors.
///
/// Refresh is single-flight: concurrent 401s share one in-progress refresh via
/// [_refreshing]. This is mandatory — the backend rotates the refresh token on
/// every use and treats a reused (rotated) token as a replay, revoking every
/// session (auth.service.ts refreshToken). Firing N parallel refreshes would
/// trip that and log the user out.
class TokenInterceptor extends QueuedInterceptor {
  TokenInterceptor({required this.secureStorage, required this.baseUrl});

  final FlutterSecureStorage secureStorage;

  /// Base URL for the bare refresh Dio. A separate client is used so the
  /// refresh call itself never re-enters this interceptor (no recursion).
  final String baseUrl;

  static const _accessKey = 'jwt_token';
  static const _refreshKey = 'refresh_token';

  Future<String?>? _refreshing;

  @override
  void onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await secureStorage.read(key: _accessKey);
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    // Anti-tamper tracking ID for zero-trust (Hardness)
    options.headers['X-Device-Attestation'] = 'trusted-mobile-client';
    return handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    final isAuthError = err.response?.statusCode == 401;
    final options = err.requestOptions;

    // Only attempt a refresh once per request, and never for the refresh call
    // itself (guarded by the separate Dio, but keep this defensive).
    if (!isAuthError || options.extra['__retried__'] == true) {
      return handler.next(err);
    }

    final newToken = await _refreshAccessToken();
    if (newToken == null) {
      // Refresh failed (expired/revoked/replayed). Tear down the session so the
      // router bounces to login instead of looping on dead tokens.
      await _clearSession();
      return handler.next(err);
    }

    // Replay the original request once with the fresh token.
    //
    // The replay Dio must carry the same baseUrl as the original client:
    // datasources issue relative paths ('/api/v1/...'), and a bare `Dio()`
    // resolves those against an empty base, so every retry failed and the
    // caller saw the original 401 — defeating the silent renewal this
    // interceptor exists to provide. Interceptors are still omitted so the
    // replay cannot recurse back into onError.
    try {
      options.extra['__retried__'] = true;
      options.headers['Authorization'] = 'Bearer $newToken';
      final response = await Dio(BaseOptions(baseUrl: baseUrl))
          .fetch<dynamic>(options);
      return handler.resolve(response);
    } on DioException catch (retryErr) {
      return handler.next(retryErr);
    }
  }

  /// Returns a fresh access token, refreshing at most once across concurrent
  /// callers. Null on any failure.
  Future<String?> _refreshAccessToken() {
    return _refreshing ??= _doRefresh().whenComplete(() => _refreshing = null);
  }

  Future<String?> _doRefresh() async {
    final refresh = await secureStorage.read(key: _refreshKey);
    if (refresh == null || refresh.isEmpty) return null;

    try {
      // Bare Dio — no interceptors — so this call cannot recurse into onError.
      final res = await Dio(BaseOptions(baseUrl: baseUrl)).post<dynamic>(
        '/api/v1/auth/refresh',
        data: {'refreshToken': refresh},
      );
      final data = res.data as Map<String, dynamic>;
      final access = (data['access_token'] ?? data['accessToken']) as String?;
      final newRefresh =
          (data['refresh_token'] ?? data['refreshToken']) as String?;
      if (access == null || access.isEmpty) return null;

      await secureStorage.write(key: _accessKey, value: access);
      // The refresh token is rotated on every use — persist the new one or the
      // next refresh replays a revoked token and kills the session.
      if (newRefresh != null && newRefresh.isNotEmpty) {
        await secureStorage.write(key: _refreshKey, value: newRefresh);
      }
      return access;
    } on DioException {
      return null;
    }
  }

  Future<void> _clearSession() async {
    await secureStorage.delete(key: _accessKey);
    await secureStorage.delete(key: _refreshKey);
    await secureStorage.delete(key: 'user_cache');

    // Queued offline work belongs to the session being torn down; it uploads
    // under whatever token is current at drain time, so leaving it would
    // attribute this user's punches to whoever signs in next. Cleared via Hive
    // directly because this interceptor has no Riverpod scope — the queue is
    // rehydrated from this box on the next launch, so emptying it is enough.
    try {
      final box = await Hive.openBox<Map>(syncQueueBoxName);
      await box.clear();
    } catch (_) {
      // Best-effort; never block session teardown on cache cleanup.
    }

    AuthSession.instance.isAuthenticated = false;
    AuthSession.instance.roleCode = null;
    AuthSession.instance.mustChangePassword = false;
    AuthSession.instance.isOnboarded = false;
  }
}
