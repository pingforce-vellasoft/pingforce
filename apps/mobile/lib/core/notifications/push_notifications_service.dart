import 'dart:io' show Platform;

import 'package:dio/dio.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

import '../auth/auth_session.dart';
import '../hardware/device_identity.dart';

/// FCM push notifications (Master Plan Phase 2, project pingforce-db47a).
///
/// Fail-soft by design: any Firebase failure (no Play Services, emulator
/// without Google APIs, network down) is logged and swallowed — push is an
/// enhancement, never a boot blocker.
///
/// Token lifecycle:
/// - [initialize] at app start: Firebase init + permission + refresh listener
/// - [registerToken] after login / authenticated splash hydration
/// - [unregisterToken] on logout
class PushNotificationsService {
  PushNotificationsService({
    required Dio dio,
    required DeviceIdentity deviceIdentity,
  })  : _dio = dio,
        _deviceIdentity = deviceIdentity;

  final Dio _dio;
  final DeviceIdentity _deviceIdentity;

  bool _firebaseReady = false;

  bool get _supported => !kIsWeb && Platform.isAndroid;

  /// Initializes Firebase and wires the token-refresh listener. Safe to call
  /// unconditionally from main() — no-ops on unsupported platforms.
  Future<void> initialize() async {
    if (!_supported) return;

    try {
      await Firebase.initializeApp();
      _firebaseReady = true;
    } catch (e) {
      debugPrint('Firebase init skipped: $e');
      return;
    }

    // Android 13+ shows a runtime prompt; older versions grant silently
    try {
      await FirebaseMessaging.instance.requestPermission();
    } catch (e) {
      debugPrint('Notification permission request failed: $e');
    }

    // Rotated tokens must reach the backend or pushes silently stop
    FirebaseMessaging.instance.onTokenRefresh.listen((token) {
      if (AuthSession.instance.isAuthenticated) {
        _sendToken(token);
      }
    });
  }

  /// Registers the current FCM token with the API. Call once authenticated.
  Future<void> registerToken() async {
    if (!_firebaseReady) return;

    try {
      final token = await FirebaseMessaging.instance.getToken();
      if (token == null || token.isEmpty) return;
      await _sendToken(token);
    } catch (e) {
      debugPrint('FCM token registration failed: $e');
    }
  }

  /// Removes this device's token server-side. Call on logout so the signed-out
  /// device stops receiving tenant notifications.
  Future<void> unregisterToken() async {
    if (!_firebaseReady) return;

    try {
      final deviceId = await _deviceIdentity.getOrCreate();
      await _dio.delete('/api/v1/notifications/device-tokens/$deviceId');
    } catch (e) {
      debugPrint('FCM token unregister failed: $e');
    }
  }

  Future<void> _sendToken(String token) async {
    try {
      final deviceId = await _deviceIdentity.getOrCreate();
      await _dio.post(
        '/api/v1/notifications/device-tokens',
        data: {
          'deviceId': deviceId,
          'fcmToken': token,
          'platform': 'ANDROID',
        },
      );
    } catch (e) {
      debugPrint('FCM token upload failed: $e');
    }
  }
}
