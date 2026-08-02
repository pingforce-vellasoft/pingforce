import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive/hive.dart';

import '../../../injection_container.dart';
import '../../geofences/domain/repositories/geofence_repository.dart';

/// Persists whether the "configure a geofence" setup reminder has been
/// dismissed on this device, keyed per tenant so each workspace's admin sees
/// it once. Backed by a lightweight Hive box so no extra dependency is needed.
///
/// Dismissal is only half the story — the banner also disappears on its own
/// once the tenant actually has a geofence (see [tenantHasGeofenceProvider]).
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

/// Whether the signed-in tenant already has at least one geofence.
///
/// The setup reminder is a "you have nothing configured yet" prompt, so it must
/// be driven by the live count, not only by the dismissal flag: an admin who
/// creates their first geofence from the banner's own Set up action has to see
/// it disappear when they come back to the dashboard. Invalidate this provider
/// after a create/delete to re-check.
///
/// On failure it resolves to `true` (i.e. "assume configured"), so a transient
/// API or offline error never shows a false "set up a geofence first" prompt to
/// a tenant that has them.
final tenantHasGeofenceProvider = FutureProvider<bool>((ref) async {
  final result = await sl<GeofenceRepository>().getGeofences();
  return result.fold((_) => true, (items) => items.isNotEmpty);
});
