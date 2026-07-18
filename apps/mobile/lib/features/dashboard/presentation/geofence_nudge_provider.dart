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

  /// Whether the reminder was already dismissed for [tenantId].
  Future<bool> isDismissed(String tenantId) async {
    if (state.containsKey(tenantId)) return state[tenantId]!;
    final box = await Hive.openBox(_boxName);
    final dismissed = box.get(_key(tenantId), defaultValue: false) as bool;
    state = {...state, tenantId: dismissed};
    return dismissed;
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
