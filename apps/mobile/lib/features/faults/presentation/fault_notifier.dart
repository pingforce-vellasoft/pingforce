import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../injection_container.dart';
import '../../../core/network/connectivity_provider.dart';
import '../../../core/sync/sync_provider.dart';
import '../../../core/sync/sync_state.dart';
import '../data/faults_remote_data_source.dart';
import 'fault_state.dart';

// ─────────────────────────────────────────────────────────────────────────────
// FAULT NOTIFIER — loads assigned faults from the API (3.3 API.md)
// ─────────────────────────────────────────────────────────────────────────────

final faultNotifierProvider =
    NotifierProvider<FaultNotifier, FaultState>(FaultNotifier.new);

class FaultNotifier extends Notifier<FaultState> {
  @override
  FaultState build() => const FaultState(isLoading: true);

  Future<void> load() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final faults = await sl<FaultsRemoteDataSource>().fetchFaults();
      state = state.copyWith(isLoading: false, allFaults: faults);
    } catch (_) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Could not load faults. Pull to retry.',
      );
    }
  }

  Future<void> refresh() async {
    state = state.copyWith(isRefreshing: true);
    await load();
    state = state.copyWith(isRefreshing: false);
  }

  void onSearchChanged(String q) {
    state = state.copyWith(
      activeFilters: state.activeFilters.copyWith(searchQuery: q),
    );
  }

  void applyFilters(FaultFilters filters) {
    state = state.copyWith(activeFilters: filters);
  }

  void resetFilters() {
    state = state.copyWith(activeFilters: const FaultFilters());
  }

  void sortBy(FaultSortBy sort) {
    state = state.copyWith(sortBy: sort);
  }

  /// Loads one fault with its timeline.
  Future<void> loadDetail(String faultId) async {
    state = state.copyWith(isLoadingDetail: true, errorMessage: null);
    try {
      final detail = await sl<FaultsRemoteDataSource>().fetchFaultDetail(
        faultId,
      );
      state = state.copyWith(isLoadingDetail: false, selectedFault: detail);
    } catch (_) {
      state = state.copyWith(
        isLoadingDetail: false,
        errorMessage: 'Could not open this fault.',
      );
    }
  }

  /// Applies a lifecycle transition.
  ///
  /// Field work happens in dead zones, so an offline change is queued against
  /// `POST /faults/sync` rather than lost: the `clientRef` is the idempotency
  /// key the server dedupes on, so a replay cannot double-apply the move.
  Future<bool> changeStatus(
    String faultId,
    FaultStatus status, {
    String? notes,
  }) async {
    final clientRef = 'fault-status-$faultId-'
        '${DateTime.now().millisecondsSinceEpoch}';

    if (!ref.read(isOnlineProvider)) {
      ref.read(syncProvider.notifier).enqueue(
            SyncQueueItem(
              id: clientRef,
              module: SyncItemModule.faults,
              entityId: faultId,
              operationType: 'update',
              description: 'Fault status → ${status.label}',
              queuedAt: DateTime.now(),
              payload: {
                'clientRef': clientRef,
                'action': 'UPDATE_STATUS',
                'timestamp': DateTime.now().toUtc().toIso8601String(),
                'faultId': faultId,
                'status': status.wireValue,
                if (notes != null && notes.isNotEmpty) 'notes': notes,
              },
            ),
          );
      // Reflect the change locally so the screen matches what will be sent.
      _applyLocalStatus(faultId, status);
      return true;
    }

    try {
      await sl<FaultsRemoteDataSource>().updateStatus(
        faultId,
        status,
        notes: notes,
        clientRef: clientRef,
      );
      await loadDetail(faultId);
      await load();
      return true;
    } catch (_) {
      state = state.copyWith(
        errorMessage: 'Could not update the fault. Please try again.',
      );
      return false;
    }
  }

  /// Optimistic local update for a queued offline transition.
  void _applyLocalStatus(String faultId, FaultStatus status) {
    final detail = state.selectedFault;
    state = state.copyWith(
      allFaults: [
        for (final f in state.allFaults)
          if (f.id == faultId) f.copyWith(status: status, isOffline: true) else f,
      ],
      selectedFault: detail != null && detail.summary.id == faultId
          ? detail.copyWith(
              summary: detail.summary.copyWith(
                status: status,
                isOffline: true,
              ),
            )
          : detail,
    );
  }

  void goToCreate(BuildContext context) {
    context.push('/faults/new');
  }

  void goToDetail(BuildContext context, String faultId) {
    context.push('/faults/$faultId');
  }
}
