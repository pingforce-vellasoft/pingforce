import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';

import '../../features/attendance/data/datasources/attendance_remote_data_source.dart';
import '../../features/visits/data/visits_remote_data_source.dart';
import '../../injection_container.dart';
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

  static const _boxName = 'sync_queue';

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

    // Restore the persisted queue (OFFLINE_SYNC.md §5 — survives restarts)
    unawaited(_restoreQueue());
    return const SyncState();
  }

  Future<void> _restoreQueue() async {
    try {
      final box = await Hive.openBox<Map>(_boxName);
      final items = box.values
          .map((raw) => _itemFromMap(Map<String, dynamic>.from(raw)))
          .toList();
      if (items.isNotEmpty) {
        state = state.copyWith(
          queue: [...state.queue, ...items],
          status: SyncQueueStatus.pending,
        );
        if (ref.read(isOnlineProvider)) {
          _syncDebounce?.cancel();
          _syncDebounce = Timer(const Duration(seconds: 1), _flushQueue);
        }
      }
    } catch (_) {
      // Corrupt box — start clean rather than blocking the app
    }
  }

  Future<void> _persistQueue() async {
    try {
      final box = await Hive.openBox<Map>(_boxName);
      await box.clear();
      for (final item in state.queue) {
        await box.put(item.id, _itemToMap(item));
      }
    } catch (_) {
      // Persistence is best-effort; the in-memory queue still drives sync
    }
  }

  Map<String, dynamic> _itemToMap(SyncQueueItem item) => {
        'id': item.id,
        'module': item.module.name,
        'entityId': item.entityId,
        'operationType': item.operationType,
        'description': item.description,
        'queuedAt': item.queuedAt.toIso8601String(),
        'retryCount': item.retryCount,
        'payload': item.payload,
      };

  SyncQueueItem _itemFromMap(Map<String, dynamic> map) => SyncQueueItem(
        id: map['id'] as String,
        module: SyncItemModule.values.firstWhere(
          (m) => m.name == map['module'],
          orElse: () => SyncItemModule.attendance,
        ),
        entityId: map['entityId'] as String,
        operationType: map['operationType'] as String,
        description: map['description'] as String,
        queuedAt: DateTime.parse(map['queuedAt'] as String),
        retryCount: (map['retryCount'] as int?) ?? 0,
        payload: map['payload'] != null
            ? Map<String, dynamic>.from(map['payload'] as Map)
            : null,
      );

  // ── Public API ─────────────────────────────────────────────────────────

  /// Add a new item to the sync queue (called by feature repositories)
  void enqueue(SyncQueueItem item) {
    final existing = state.queue.where((i) => i.id == item.id).isEmpty;
    if (!existing) return; // already queued

    state = state.copyWith(
      queue: [...state.queue, item],
      status: SyncQueueStatus.pending,
    );
    unawaited(_persistQueue());

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
    unawaited(_persistQueue());
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
    switch (item.module) {
      case SyncItemModule.attendance:
        final payload = item.payload;
        if (payload == null) return; // nothing to send — drop silently
        await sl<AttendanceRemoteDataSource>().syncPunches([payload]);
      case SyncItemModule.visits:
        final payload = item.payload;
        if (payload == null) return;
        // Idempotent replay via clientRef (POST /visits/sync)
        await sl<VisitsRemoteDataSource>().syncActions([payload]);
      // Remaining modules gain client sync flows in a later phase
      case SyncItemModule.faults:
      case SyncItemModule.leads:
      case SyncItemModule.documents:
      case SyncItemModule.profile:
        return;
    }
  }
}
