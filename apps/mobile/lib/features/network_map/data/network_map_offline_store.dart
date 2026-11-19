import 'dart:convert';

import 'package:hive_flutter/hive_flutter.dart';

/// Hive box holding the last successful network map responses.
const networkMapCacheBox = 'network_map_cache';

class CachedJson {
  const CachedJson(this.json, this.savedAt, {this.fromCache = false});

  final Map<String, dynamic> json;
  final DateTime savedAt;

  /// True when served from the device because the API was unreachable.
  final bool fromCache;
}

/// Last-known copies of the connection map API responses, so the map still
/// shows the network when the device has no signal (3.7_ConnectionMap,
/// offline map). Cleared on sign-out (AuthSession.signOut) so the next user
/// of the device never sees the previous user's network.
abstract class NetworkMapOfflineStore {
  Future<void> save(String key, Map<String, dynamic> json);

  Future<CachedJson?> read(String key);
}

class HiveNetworkMapOfflineStore implements NetworkMapOfflineStore {
  Future<Box<String>> _box() => Hive.openBox<String>(networkMapCacheBox);

  @override
  Future<void> save(String key, Map<String, dynamic> json) async {
    final box = await _box();
    await box.put(
      key,
      jsonEncode({
        'savedAt': DateTime.now().toUtc().toIso8601String(),
        'json': json,
      }),
    );
  }

  @override
  Future<CachedJson?> read(String key) async {
    final box = await _box();
    final raw = box.get(key);
    if (raw == null) return null;
    try {
      final decoded = jsonDecode(raw) as Map<String, dynamic>;
      return CachedJson(
        decoded['json'] as Map<String, dynamic>,
        DateTime.parse(decoded['savedAt'] as String).toLocal(),
      );
    } catch (_) {
      // A corrupt entry is treated as missing rather than crashing the map.
      return null;
    }
  }

  /// Removes every cached response (sign-out).
  static Future<void> clear() => Hive.deleteBoxFromDisk(networkMapCacheBox);
}

/// In-memory store for tests and for platforms without Hive.
class MemoryNetworkMapOfflineStore implements NetworkMapOfflineStore {
  final Map<String, CachedJson> entries = {};

  @override
  Future<void> save(String key, Map<String, dynamic> json) async {
    entries[key] = CachedJson(json, DateTime.now());
  }

  @override
  Future<CachedJson?> read(String key) async => entries[key];
}
