import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:crypto/crypto.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:package_info_plus/package_info_plus.dart';

const _deviceIdKey = 'device_id';

/// Namespace for the device-id hash. Keeps the stored id from being a raw
/// platform identifier, so a value read off one install cannot be correlated
/// back to the hardware id by anyone who obtains it.
const _deviceIdSalt = 'pingforce.device.v2';

/// Fingerprint reported alongside a binding so an approver reviewing a device
/// change sees "Galaxy A54 / Android 14" rather than a hex string. Deliberately
/// excludes hardware serials and any personally identifying value
/// (DeviceManagement.md §6).
@immutable
class DeviceFingerprint {
  const DeviceFingerprint({
    required this.deviceId,
    this.deviceName,
    this.platform,
    this.osVersion,
    this.appVersion,
    this.model,
    this.manufacturer,
  });

  final String deviceId;
  final String? deviceName;
  final String? platform;
  final String? osVersion;
  final String? appVersion;
  final String? model;
  final String? manufacturer;

  Map<String, dynamic> toJson() => {
        'deviceId': deviceId,
        if (deviceName != null) 'deviceName': deviceName,
        if (platform != null) 'platform': platform,
        if (osVersion != null) 'osVersion': osVersion,
        if (appVersion != null) 'appVersion': appVersion,
        if (model != null) 'model': model,
        if (manufacturer != null) 'manufacturer': manufacturer,
      };
}

/// Stable device identifier (4.2 SECURITY.md — device binding).
///
/// Derived from the platform's own install/vendor identifier, hashed with a
/// namespace salt, and cached in secure storage. Deriving rather than randomly
/// generating matters: an employee is bound to one handset and only an admin
/// can move that binding, so a random per-install id would turn every app
/// reinstall into an admin-approved device change.
class DeviceIdentity {
  DeviceIdentity(this._storage);

  final FlutterSecureStorage _storage;
  final DeviceInfoPlugin _deviceInfo = DeviceInfoPlugin();

  Future<String> getOrCreate() async {
    final existing = await _storage.read(key: _deviceIdKey);
    if (existing != null && existing.isNotEmpty) return existing;

    final deviceId = await _derive();
    await _storage.write(key: _deviceIdKey, value: deviceId);
    return deviceId;
  }

  /// Full fingerprint for bind / change-request payloads.
  Future<DeviceFingerprint> fingerprint() async {
    final deviceId = await getOrCreate();

    String? appVersion;
    try {
      final info = await PackageInfo.fromPlatform();
      appVersion = '${info.version}+${info.buildNumber}';
    } catch (_) {
      // Version is descriptive only — never block a binding on it.
    }

    try {
      if (Platform.isAndroid) {
        final android = await _deviceInfo.androidInfo;
        return DeviceFingerprint(
          deviceId: deviceId,
          deviceName: android.model,
          platform: 'ANDROID',
          osVersion: 'Android ${android.version.release}',
          appVersion: appVersion,
          model: android.model,
          manufacturer: android.manufacturer,
        );
      }
      if (Platform.isIOS) {
        final ios = await _deviceInfo.iosInfo;
        return DeviceFingerprint(
          deviceId: deviceId,
          deviceName: ios.name,
          platform: 'IOS',
          osVersion: '${ios.systemName} ${ios.systemVersion}',
          appVersion: appVersion,
          model: ios.model,
          manufacturer: 'Apple',
        );
      }
    } catch (_) {
      // Fall through to the id-only fingerprint below.
    }

    return DeviceFingerprint(deviceId: deviceId, appVersion: appVersion);
  }

  /// Clears the cached id. Only for sign-out on a shared test build — a normal
  /// sign-out must NOT call this, or the employee returns as a new device and
  /// needs an admin-approved change to punch again.
  Future<void> reset() => _storage.delete(key: _deviceIdKey);

  Future<String> _derive() async {
    final platformId = await _platformIdentifier();
    if (platformId != null && platformId.isNotEmpty) {
      final digest = sha256.convert(utf8.encode('$_deviceIdSalt:$platformId'));
      return 'dev-${digest.toString().substring(0, 32)}';
    }

    // No platform id available (unsupported platform, or iOS returning null
    // after the vendor id is reset). A random id still binds correctly; it just
    // does not survive a reinstall, which is the pre-existing behaviour.
    final random = Random.secure();
    final bytes = List.generate(16, (_) => random.nextInt(256));
    return 'dev-${bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join()}';
  }

  Future<String?> _platformIdentifier() async {
    try {
      if (Platform.isAndroid) {
        // ANDROID_ID: per app-signing-key and per user, reset on factory reset.
        // Not a hardware serial, and never sent raw — only its hash leaves.
        return (await _deviceInfo.androidInfo).id;
      }
      if (Platform.isIOS) {
        return (await _deviceInfo.iosInfo).identifierForVendor;
      }
    } catch (_) {
      return null;
    }
    return null;
  }
}
