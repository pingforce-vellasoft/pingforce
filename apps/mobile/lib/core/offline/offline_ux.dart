// ─────────────────────────────────────────────────────────────────────────────
// OFFLINE UX — Barrel Export
// AUDIT §13: Offline Mode UX — Across All Screens
// ─────────────────────────────────────────────────────────────────────────────
//
// Import this single file in any feature screen to get access to all
// offline-mode UX primitives:
//
//   import 'package:pingforce/core/offline/offline_ux.dart';
//
// Exported:
//   ConnectivityProvider  → connectivityProvider, isOnlineProvider
//   SyncState             → SyncState, SyncQueueItem, SyncConflict, SyncQueueStatus
//   SyncProvider          → syncProvider, syncPendingCountProvider, lastSyncedLabelProvider
//   OfflineAwareScaffold  → OfflineAwareScaffold (wraps every Scaffold)
//   OfflineGuard          → OfflineGuard (disables widgets requiring connectivity)
//   OfflineBlockReason    → enum of reasons for blocking actions offline
//   SyncStatusChip        → App bar chip showing pending/syncing/conflict count
//   LastSyncedLabel       → "Last synced: 5m ago" text widget
//   PermissionDeniedState → Full-page GPS/Camera/Mic denied screens
//   InlinePermissionBanner→ Compact banner for inline permission asks

export '../network/connectivity_provider.dart'
    show
        ConnectivityState,
        ConnectivityStatus,
        ConnectivityNotifier,
        connectivityProvider,
        isOnlineProvider,
        connectivityTransitionProvider;

export '../sync/sync_state.dart'
    show
        SyncQueueStatus,
        SyncItemModule,
        SyncQueueItem,
        SyncConflict,
        SyncState;

export '../sync/sync_provider.dart'
    show
        SyncNotifier,
        syncProvider,
        syncPendingCountProvider,
        syncHasConflictsProvider,
        lastSyncedLabelProvider;

export '../widgets/offline_aware_scaffold.dart'
    show
        OfflineAwareScaffold,
        OfflineGuard,
        OfflineBlockReason,
        SyncStatusChip,
        LastSyncedLabel,
        PermissionType,
        PermissionDeniedState,
        InlinePermissionBanner;
