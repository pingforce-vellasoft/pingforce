import 'dart:async';
import 'dart:math';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';

import '../../features/attendance/data/datasources/attendance_remote_data_source.dart';
import '../../features/tracking/data/datasources/tracking_remote_data_source.dart';
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

  /// Items are sent to the idempotent /sync endpoints in chunks of this size
  /// — one HTTP round-trip per chunk instead of per item.
  static const _batchSize = 25;

  /// Items failing this many times stop auto-syncing (manual retry only) so
  /// a poison item can't burn battery and bandwidth forever.
  static const _maxAutoRetries = 5;

  final _random = Random();

  /// Randomized delay before flushing after reconnect. When office WiFi
  /// returns, every device regains connectivity in the same instant — a
  /// fixed delay would stampede the server (SCALABILITY_AUDIT).
  Duration _reconnectJitter() =>
      Duration(milliseconds: 1000 + _random.nextInt(7000));

  @override
  SyncState build() {
    // Auto-sync when connectivity comes back online
    ref.listen(isOnlineProvider, (previous, next) {
      if (previous == false && next == true) {
        _syncDebounce?.cancel();
        _syncDebounce = Timer(_reconnectJitter(), _flushQueue);
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
          _syncDebounce = Timer(_reconnectJitter(), _flushQueue);
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
    // Persist so retry counts survive restarts (max-retry cap stays honest)
    unawaited(_persistQueue());
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
  //
  // Items are grouped by module and shipped to the idempotent /sync
  // endpoints in chunks (_batchSize per HTTP call); modules run in parallel.
  // Items past _maxAutoRetries are skipped — visible in the Sync Monitor
  // for a manual retry, never auto-hammered again.

  Future<void> _flushQueue() async {
    final pendingItems = state.queue
        .where((i) =>
            !i.hasConflict &&
            i.errorMessage == null &&
            i.retryCount < _maxAutoRetries)
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

    final byModule = <SyncItemModule, List<SyncQueueItem>>{};
    for (final item in pendingItems) {
      byModule.putIfAbsent(item.module, () => []).add(item);
    }

    await Future.wait(
      byModule.entries.map((e) => _syncModuleBatches(e.key, e.value)),
    );

    final hasRemaining =
        state.queue.any((i) => !i.hasConflict && i.errorMessage != null);
    state = state.copyWith(
      status: hasRemaining ? SyncQueueStatus.failed : SyncQueueStatus.completed,
      lastSyncedAt: DateTime.now(),
      currentProgress: 100,
    );
  }

  Future<void> _syncModuleBatches(
    SyncItemModule module,
    List<SyncQueueItem> items,
  ) async {
    for (var offset = 0; offset < items.length; offset += _batchSize) {
      // Connectivity can drop mid-flush — stop, leave the rest queued
      if (!ref.read(isOnlineProvider)) {
        state = state.copyWith(status: SyncQueueStatus.pending);
        return;
      }

      final chunk = items.sublist(
        offset,
        min(offset + _batchSize, items.length),
      );
      final withPayload =
          chunk.where((i) => i.payload != null).toList(growable: false);

      try {
        await _syncBatch(
          module,
          withPayload.map((i) => i.payload!).toList(growable: false),
        );
        // Server endpoints are idempotent (signature/clientRef dedupe), so a
        // whole-chunk success dequeues everything in it. Payload-less items
        // have nothing to send — drop them too.
        for (final item in chunk) {
          dequeue(item.id);
        }
      } catch (e) {
        for (final item in chunk) {
          markFailed(item.id, e.toString());
        }
      }

      state = state.copyWith(
        currentProgress: state.totalInBatch == 0
            ? 100
            : ((state.completedInBatch / state.totalInBatch) * 100).round(),
      );
    }
  }

  Future<void> _syncBatch(
    SyncItemModule module,
    List<Map<String, dynamic>> payloads,
  ) async {
    if (payloads.isEmpty) return;
    switch (module) {
      case SyncItemModule.attendance:
        await sl<AttendanceRemoteDataSource>().syncPunches(payloads);
      case SyncItemModule.visits:
        // Idempotent replay via clientRef (POST /visits/sync)
        await sl<VisitsRemoteDataSource>().syncActions(payloads);
      case SyncItemModule.tracking:
        // Background location pings — idempotent on clientRef.
        await sl<TrackingRemoteDataSource>().sendPingBatch(payloads);
      // Remaining modules gain client sync flows in a later phase
      case SyncItemModule.faults:
      case SyncItemModule.leads:
      case SyncItemModule.documents:
      case SyncItemModule.profile:
        return;
    }
  }
}
