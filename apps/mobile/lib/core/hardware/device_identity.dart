import 'dart:math';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

const _deviceIdKey = 'device_id';

/// Stable per-install device identifier (4.2 SECURITY.md — device binding).
/// Generated once, persisted in secure storage, survives app restarts.
class DeviceIdentity {
  DeviceIdentity(this._storage);

  final FlutterSecureStorage _storage;

  Future<String> getOrCreate() async {
    final existing = await _storage.read(key: _deviceIdKey);
    if (existing != null && existing.isNotEmpty) return existing;

    final random = Random.secure();
    final id = List.generate(16, (_) => random.nextInt(256))
        .map((b) => b.toRadixString(16).padLeft(2, '0'))
        .join();
    final deviceId = 'dev-$id';

    await _storage.write(key: _deviceIdKey, value: deviceId);
    return deviceId;
  }
}
