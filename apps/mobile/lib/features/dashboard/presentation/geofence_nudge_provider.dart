import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive/hive.dart';

/// Persists whether the "configure a geofence" setup reminder has been
/// dismissed on this device, keyed per tenant so each workspace's admin sees
/// it once. Backed by a lightweight Hive box so no extra dependency is needed.
///
/// Mobile has no in-app geofence management (that lives in the web admin), so
/// this is an informational, permanently dismissible reminder rather than a
/// live zero-geofence check.
class GeofenceNudgeDismissal
    extends StateNotifier<Map<String, bool>> {
  GeofenceNudgeDismissal() : super(const {});

  static const _boxName = 'ui_prefs';
  static const _keyPrefix = 'geofence_nudge_dismissed_';

  String _key(String tenantId) => '$_keyPrefix$tenantId';

  /// Cached dismissal flag for [tenantId]. `null` means "not loaded yet" —
  /// callers render nothing until [ensureLoaded] resolves. Synchronous so a
  /// widget build never starts an async read (that re-triggered a state
  /// change on every build and made the banner flicker).
  bool? dismissedOrNull(String tenantId) => state[tenantId];

  /// Loads the persisted flag once per tenant. Safe to call repeatedly; it
  /// no-ops after the value is cached, so it cannot loop with a rebuild.
  Future<void> ensureLoaded(String tenantId) async {
    if (state.containsKey(tenantId)) return;
    final box = await Hive.openBox(_boxName);
    final dismissed = box.get(_key(tenantId), defaultValue: false) as bool;
    if (state.containsKey(tenantId)) return;
    state = {...state, tenantId: dismissed};
  }

  Future<void> dismiss(String tenantId) async {
    final box = await Hive.openBox(_boxName);
    await box.put(_key(tenantId), true);
    state = {...state, tenantId: true};
  }
}

final geofenceNudgeDismissalProvider =
    StateNotifierProvider<GeofenceNudgeDismissal, Map<String, bool>>(
  (ref) => GeofenceNudgeDismissal(),
);
