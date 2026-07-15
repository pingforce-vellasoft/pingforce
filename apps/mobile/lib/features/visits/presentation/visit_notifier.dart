import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/hardware/hardware_service.dart';
import '../../../core/network/connectivity_provider.dart';
import '../../../core/sync/sync_provider.dart';
import '../../../core/sync/sync_state.dart';
import '../../../injection_container.dart';
import '../data/visits_remote_data_source.dart';
import 'visit_state.dart';

// ─────────────────────────────────────────────────────────────────────────────
// VISIT NOTIFIER — assigned-visit execution flow (3.2 MOBILE_APP.md)
//
// Online: lifecycle actions hit /visits/{id}/{action} directly.
// Offline: actions are queued (Hive-backed sync queue) with a clientRef and
// replayed through POST /visits/sync when connectivity returns; the local
// status updates optimistically and the card shows a pending-sync marker.
// ─────────────────────────────────────────────────────────────────────────────

final visitNotifierProvider =
    NotifierProvider<VisitNotifier, VisitState>(VisitNotifier.new);

class VisitNotifier extends Notifier<VisitState> {
  @override
  VisitState build() => const VisitState(isLoading: true);

  Future<void> load() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final visits = await sl<VisitsRemoteDataSource>().fetchAssignedVisits();
      state = state.copyWith(isLoading: false, visits: visits);
    } catch (_) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Could not load visits. Pull to retry.',
      );
    }
  }

  Future<void> refresh() async {
    state = state.copyWith(isRefreshing: true);
    await load();
    state = state.copyWith(isRefreshing: false);
  }

  /// Runs one lifecycle action, online or queued offline.
  Future<void> performAction(
    String visitId,
    VisitAction action, {
    String? outcome,
  }) async {
    state = state.copyWith(actionInFlightVisitId: visitId);

    // GPS capture is best-effort — server validates when coords are present
    double? latitude;
    double? longitude;
    try {
      final position = await sl<HardwareService>().getCurrentLocation();
      latitude = position.latitude;
      longitude = position.longitude;
    } catch (_) {
      // No location permission/fix — proceed without coordinates
    }

    final online = ref.read(isOnlineProvider);
    try {
      if (online) {
        await sl<VisitsRemoteDataSource>().performAction(
          visitId,
          action,
          latitude: latitude,
          longitude: longitude,
          outcome: outcome,
        );
        _applyLocalStatus(visitId, action, pendingSync: false);
      } else {
        _enqueueOfflineAction(
          visitId,
          action,
          latitude: latitude,
          longitude: longitude,
          outcome: outcome,
        );
        _applyLocalStatus(visitId, action, pendingSync: true);
      }
      state = state.copyWith(actionInFlightVisitId: null);
    } catch (_) {
      state = state.copyWith(
        actionInFlightVisitId: null,
        errorMessage: 'Action failed — check the visit state and retry.',
      );
    }
  }

  void clearError() {
    state = state.copyWith(errorMessage: null);
  }

  void _applyLocalStatus(
    String visitId,
    VisitAction action, {
    required bool pendingSync,
  }) {
    state = state.copyWith(
      visits: state.visits
          .map(
            (visit) => visit.id == visitId
                ? visit.copyWith(
                    status: action.resultingStatus,
                    pendingSync: pendingSync,
                  )
                : visit,
          )
          .toList(growable: false),
    );
  }

  /// LOCAL_SAVE → QUEUE CREATED (3.2 OFFLINE_SYNC.md): payload matches the
  /// /visits/sync item contract; SyncNotifier drains it when back online.
  void _enqueueOfflineAction(
    String visitId,
    VisitAction action, {
    double? latitude,
    double? longitude,
    String? outcome,
  }) {
    final now = DateTime.now();
    final clientRef = 'visit-${action.apiValue.toLowerCase()}-'
        '${now.microsecondsSinceEpoch}';

    ref.read(syncProvider.notifier).enqueue(
          SyncQueueItem(
            id: clientRef,
            module: SyncItemModule.visits,
            entityId: visitId,
            operationType: 'update',
            description: 'Offline visit ${action.apiValue.toLowerCase()}',
            queuedAt: now,
            payload: {
              'clientRef': clientRef,
              'visitId': visitId,
              'action': action.apiValue,
              'timestamp': now.toIso8601String(),
              'latitude': ?latitude,
              'longitude': ?longitude,
              if (action == VisitAction.complete)
                'outcome': outcome ?? 'COMPLETED_OFFLINE',
            },
          ),
        );
  }
}
