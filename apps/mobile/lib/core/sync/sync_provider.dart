import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'sync_state.dart';
import '../network/connectivity_provider.dart';

// ─────────────────────────────────────────────────────────────────────────────
// SYNC PROVIDER  (AUDIT §13)
// ─────────────────────────────────────────────────────────────────────────────
//
// This provider manages the global sync queue:
//   - Watches connectivity and auto-triggers sync when back online
//   - Exposes enqueue/dequeue/conflict-resolve API
//   - Feeds SyncMonitorScreen and all offline banners/chips

final syncProvider =
    NotifierProvider<SyncNotifier, SyncState>(SyncNotifier.new);

// ── Convenience selectors ──────────────────────────────────────────────────

/// Total pending count — use this for the app-bar chip badge number
final syncPendingCountProvider = Provider<int>(
  (ref) => ref.watch(syncProvider).pendingCount,
);

/// True when there are unresolved conflicts
final syncHasConflictsProvider = Provider<bool>(
  (ref) => ref.watch(syncProvider).hasConflicts,
);

/// Human-readable "last synced" string for display
final lastSyncedLabelProvider = Provider<String>(
  (ref) => ref.watch(syncProvider).lastSyncedLabel,
);

// ── Notifier ───────────────────────────────────────────────────────────────

class SyncNotifier extends Notifier<SyncState> {
  Timer? _syncDebounce;

  @override
  SyncState build() {
    // Auto-sync when connectivity comes back online
    ref.listen(isOnlineProvider, (previous, next) {
      if (previous == false && next == true) {
        // Just recovered: debounce 1s then flush queue
        _syncDebounce?.cancel();
        _syncDebounce = Timer(const Duration(seconds: 1), _flushQueue);
      }
    });

    ref.onDispose(() => _syncDebounce?.cancel());
    return const SyncState();
  }

  // ── Public API ─────────────────────────────────────────────────────────

  /// Add a new item to the sync queue (called by feature repositories)
  void enqueue(SyncQueueItem item) {
    final existing = state.queue.where((i) => i.id == item.id).isEmpty;
    if (!existing) return; // already queued

    state = state.copyWith(
      queue: [...state.queue, item],
      status: SyncQueueStatus.pending,
    );

    // If online, sync immediately
    if (ref.read(isOnlineProvider)) {
      _syncDebounce?.cancel();
      _syncDebounce = Timer(const Duration(milliseconds: 500), _flushQueue);
    }
  }

  /// Remove a successfully synced item from the queue
  void dequeue(String itemId) {
    final updated = state.queue.where((i) => i.id != itemId).toList();
    state = state.copyWith(
      queue: updated,
      status: updated.isEmpty ? SyncQueueStatus.idle : state.status,
      completedInBatch: state.completedInBatch + 1,
    );
  }

  /// Mark an item as failed (will show in Sync Monitor with error)
  void markFailed(String itemId, String errorMessage) {
    state = state.copyWith(
      queue: state.queue.map((item) {
        if (item.id != itemId) return item;
        return item.copyWith(
          retryCount: item.retryCount + 1,
          errorMessage: errorMessage,
        );
      }).toList(),
      status: SyncQueueStatus.failed,
      lastErrorMessage: errorMessage,
    );
  }

  /// Mark an item as having a server conflict
  void markConflict(
    String itemId, {
    required String localValue,
    required String serverValue,
    required String conflictField,
    required DateTime serverTimestamp,
  }) {
    // Move item to conflicts list
    final item = state.queue.firstWhere((i) => i.id == itemId);
    final conflict = SyncConflict(
      itemId: itemId,
      entityId: item.entityId,
      fieldName: conflictField,
      localValue: localValue,
      serverValue: serverValue,
      localTimestamp: item.queuedAt,
      serverTimestamp: serverTimestamp,
      module: item.module,
      entityDescription: item.description,
    );

    state = state.copyWith(
      queue: state.queue.where((i) => i.id != itemId).toList(),
      conflicts: [...state.conflicts, conflict],
      status: SyncQueueStatus.conflict,
    );
  }

  /// Resolve a conflict — keepLocal=true uses local value, false uses server
  Future<void> resolveConflict(String itemId, {required bool keepLocal}) async {
    final updated = state.conflicts.where((c) => c.itemId != itemId).toList();
    state = state.copyWith(
      conflicts: updated,
      status: updated.isEmpty && state.queue.isEmpty
          ? SyncQueueStatus.idle
          : state.status,
    );
    // TODO: call repository to apply the chosen value to backend/local DB
  }

  /// Manually trigger sync (for "Sync Now" button in UI)
  Future<void> syncNow() async {
    if (!ref.read(isOnlineProvider)) return;
    await _flushQueue();
  }

  /// Retry a specific failed item
  Future<void> retryItem(String itemId) async {
    state = state.copyWith(
      queue: state.queue.map((item) {
        if (item.id != itemId) return item;
        return item.copyWith(errorMessage: null);
      }).toList(),
    );
    await _flushQueue();
  }

  /// Clear all failed items that have exhausted retries
  void clearFailed() {
    state = state.copyWith(
      queue: state.queue.where((i) => i.canRetry || i.errorMessage == null).toList(),
    );
  }

  // ── Internal sync engine ───────────────────────────────────────────────

  Future<void> _flushQueue() async {
    final pendingItems = state.queue
        .where((i) => !i.hasConflict && i.errorMessage == null)
        .toList();

    if (pendingItems.isEmpty) {
      state = state.copyWith(
        status: SyncQueueStatus.idle,
        lastSyncedAt: DateTime.now(),
      );
      return;
    }

    state = state.copyWith(
      status: SyncQueueStatus.syncing,
      totalInBatch: pendingItems.length,
      completedInBatch: 0,
      currentProgress: 0,
    );

    for (var i = 0; i < pendingItems.length; i++) {
      final item = pendingItems[i];

      // Check connectivity mid-sync
      if (!ref.read(isOnlineProvider)) {
        state = state.copyWith(status: SyncQueueStatus.pending);
        return;
      }

      try {
        await _syncItem(item);
        dequeue(item.id);
        state = state.copyWith(
          currentProgress: ((i + 1) / pendingItems.length * 100).round(),
        );
      } catch (e) {
        markFailed(item.id, e.toString());
      }
    }

    final hasRemaining = state.queue.isNotEmpty;
    state = state.copyWith(
      status: hasRemaining ? SyncQueueStatus.failed : SyncQueueStatus.completed,
      lastSyncedAt: DateTime.now(),
      currentProgress: 100,
    );
  }

  Future<void> _syncItem(SyncQueueItem item) async {
    // TODO: Dispatch to the correct repository based on item.module:
    //
    // switch (item.module) {
    //   case SyncItemModule.attendance:
    //     await ref.read(attendanceRepositoryProvider).sync(item);
    //   case SyncItemModule.faults:
    //     await ref.read(faultRepositoryProvider).sync(item);
    //   case SyncItemModule.visits:
    //     await ref.read(visitRepositoryProvider).sync(item);
    //   case SyncItemModule.leads:
    //     await ref.read(leadRepositoryProvider).sync(item);
    //   case SyncItemModule.documents:
    //     await ref.read(documentRepositoryProvider).sync(item);
    //   case SyncItemModule.profile:
    //     await ref.read(profileRepositoryProvider).sync(item);
    // }
    //
    // Stub: simulate 200ms network call
    await Future<void>.delayed(const Duration(milliseconds: 200));
  }
}
