import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'sync_state.freezed.dart';

// ─────────────────────────────────────────────────────────────────────────────
// SYNC STATE  (AUDIT §13 — sync queue progress indicator, last synced at)
// ─────────────────────────────────────────────────────────────────────────────

// ── Enums ──────────────────────────────────────────────────────────────────

enum SyncQueueStatus {
  idle,       // Nothing pending
  pending,    // Items queued, not yet syncing
  syncing,    // Actively uploading
  completed,  // Last sync finished successfully
  failed,     // Last sync attempt failed
  conflict,   // One or more conflicts detected
}

/// Which feature module generated a sync item
enum SyncItemModule {
  attendance,
  faults,
  visits,
  leads,
  documents,
  profile,
}

// ── Per-item model ─────────────────────────────────────────────────────────

@freezed
class SyncQueueItem with _$SyncQueueItem {
  const factory SyncQueueItem({
    required String id,
    required SyncItemModule module,
    required String entityId,
    required String operationType,  // 'create' | 'update' | 'delete' | 'upload'
    required String description,    // Human-readable: "Check-in for Ahmed Ali"
    required DateTime queuedAt,
    @Default(0) int retryCount,
    @Default(3) int maxRetries,
    String? errorMessage,
    @Default(false) bool hasConflict,
    // Conflict data
    String? localValue,
    String? serverValue,
    String? conflictField,
  }) = _SyncQueueItem;

  const SyncQueueItem._();

  bool get canRetry => retryCount < maxRetries;
  bool get isFailed => errorMessage != null && !hasConflict;
}

// ── Conflict model ─────────────────────────────────────────────────────────

@freezed
class SyncConflict with _$SyncConflict {
  const factory SyncConflict({
    required String itemId,
    required String entityId,
    required String fieldName,
    required String localValue,
    required String serverValue,
    required DateTime localTimestamp,
    required DateTime serverTimestamp,
    required SyncItemModule module,
    required String entityDescription,
  }) = _SyncConflict;
}

// ── Main sync state ────────────────────────────────────────────────────────

@freezed
class SyncState with _$SyncState {
  const factory SyncState({
    @Default(SyncQueueStatus.idle) SyncQueueStatus status,
    @Default([]) List<SyncQueueItem> queue,
    @Default([]) List<SyncConflict> conflicts,
    DateTime? lastSyncedAt,
    @Default(0) int currentProgress,  // 0-100 for active sync
    @Default(0) int totalInBatch,
    @Default(0) int completedInBatch,
    String? lastErrorMessage,
  }) = _SyncState;

  const SyncState._();

  // ── Derived values ───────────────────────────────────────────────────

  int get pendingCount =>
      queue.where((i) => !i.hasConflict && i.errorMessage == null).length;

  int get failedCount =>
      queue.where((i) => i.isFailed).length;

  int get conflictCount => conflicts.length;

  bool get hasPending => pendingCount > 0;
  bool get hasConflicts => conflictCount > 0;
  bool get isSyncing => status == SyncQueueStatus.syncing;

  /// Human-readable "last synced" label for display in UI
  String get lastSyncedLabel {
    final t = lastSyncedAt;
    if (t == null) return 'Never synced';
    final diff = DateTime.now().difference(t);
    if (diff.inSeconds < 60) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${t.day}/${t.month}/${t.year}';
  }

  /// Count label for app bar chip: "3 pending" | "Syncing" | "✓ Synced"
  String get chipLabel {
    if (isSyncing) return 'Syncing…';
    if (hasConflicts) return '$conflictCount conflict${conflictCount > 1 ? 's' : ''}';
    if (hasPending) return '$pendingCount pending';
    return '✓ Synced';
  }

  /// Per-module breakdown for Sync Monitor Screen
  Map<SyncItemModule, int> get pendingByModule {
    final map = <SyncItemModule, int>{};
    for (final item in queue) {
      if (!item.hasConflict && item.errorMessage == null) {
        map[item.module] = (map[item.module] ?? 0) + 1;
      }
    }
    return map;
  }
}
