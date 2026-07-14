import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../network/connectivity_provider.dart';
import '../sync/sync_provider.dart';
import '../sync/sync_state.dart';
import '../theme/theme.dart';
import 'app_states.dart';

// ─────────────────────────────────────────────────────────────────────────────
// OFFLINE-AWARE SCAFFOLD  (AUDIT §13)
// ─────────────────────────────────────────────────────────────────────────────
//
// Every feature screen MUST wrap its Scaffold with OfflineAwareScaffold.
//
// This widget:
//   1. Automatically shows/hides the amber offline banner at the top
//   2. Shows the green "back online" recovery overlay and auto-dismisses it
//   3. Shows a rotating sync progress bar under the offline banner during sync
//   4. Watches connectivity and sync state via Riverpod — zero boilerplate
//      needed in individual screens
//
// Usage:
//   @override
//   Widget build(BuildContext context) {
//     return OfflineAwareScaffold(
//       appBar: AppBar(title: Text('My Screen')),
//       body: MyScreenContent(),
//     );
//   }

class OfflineAwareScaffold extends ConsumerStatefulWidget {
  const OfflineAwareScaffold({
    super.key,
    required this.body,
    this.appBar,
    this.floatingActionButton,
    this.floatingActionButtonLocation,
    this.bottomNavigationBar,
    this.backgroundColor,
    this.resizeToAvoidBottomInset,
    this.extendBodyBehindAppBar = false,
    this.drawer,
  });

  final Widget body;
  final PreferredSizeWidget? appBar;
  final Widget? floatingActionButton;
  final FloatingActionButtonLocation? floatingActionButtonLocation;
  final Widget? bottomNavigationBar;
  final Color? backgroundColor;
  final bool? resizeToAvoidBottomInset;
  final bool extendBodyBehindAppBar;
  final Widget? drawer;

  @override
  ConsumerState<OfflineAwareScaffold> createState() =>
      _OfflineAwareScaffoldState();
}

class _OfflineAwareScaffoldState extends ConsumerState<OfflineAwareScaffold> {
  // Tracks whether we just came back online (for recovery overlay)
  bool _showRecoveryOverlay = false;
  int? _syncedOnRecovery;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _listenToConnectivityTransitions();
    });
  }

  void _listenToConnectivityTransitions() {
    // Watches for online→offline→online transitions and shows recovery banner
    ref.listenManual(connectivityTransitionProvider, (_, next) {
      next.whenData((status) {
        if (status == ConnectivityStatus.online && mounted) {
          setState(() {
            _showRecoveryOverlay = true;
            _syncedOnRecovery =
                ref.read(syncProvider).completedInBatch;
          });
        }
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    final isOnline = ref.watch(isOnlineProvider);
    final syncState = ref.watch(syncProvider);

    return Scaffold(
      backgroundColor:
          widget.backgroundColor ?? Theme.of(context).colorScheme.surface,
      appBar: widget.appBar,
      drawer: widget.drawer,
      floatingActionButton: widget.floatingActionButton,
      floatingActionButtonLocation: widget.floatingActionButtonLocation,
      bottomNavigationBar: widget.bottomNavigationBar,
      resizeToAvoidBottomInset: widget.resizeToAvoidBottomInset,
      extendBodyBehindAppBar: widget.extendBodyBehindAppBar,
      body: Stack(
        children: [
          // ── Main screen body ─────────────────────────────────────────
          Column(
            children: [
              // ── Offline amber banner ─────────────────────────────
              AnimatedSize(
                duration: AppDurations.normal,
                curve: AppEasing.standard,
                child: isOnline
                    ? const SizedBox.shrink()
                    : AppOfflineBanner(
                        pendingCount: syncState.pendingCount,
                        onSyncTap: isOnline
                            ? () => ref.read(syncProvider.notifier).syncNow()
                            : null,
                      ),
              ),

              // ── Active sync progress bar ─────────────────────────
              AnimatedSize(
                duration: AppDurations.fast,
                child: syncState.isSyncing
                    ? _SyncProgressBar(progress: syncState.currentProgress)
                    : const SizedBox.shrink(),
              ),

              // ── Main content ─────────────────────────────────────
              Expanded(child: widget.body),
            ],
          ),

          // ── Network recovery overlay (green, auto-dismiss) ───────────
          if (_showRecoveryOverlay)
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: NetworkRecoveryOverlay(
                syncedCount: _syncedOnRecovery,
                onDismiss: () {
                  if (mounted) {
                    setState(() {
                      _showRecoveryOverlay = false;
                      _syncedOnRecovery = null;
                    });
                  }
                },
              ),
            ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SYNC PROGRESS BAR  — thin animated bar during active sync
// ─────────────────────────────────────────────────────────────────────────────

class _SyncProgressBar extends StatelessWidget {
  const _SyncProgressBar({required this.progress});
  final int progress;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: 'Syncing: $progress% complete',
      child: SizedBox(
        height: 3,
        child: TweenAnimationBuilder<double>(
          tween: Tween(begin: 0, end: progress / 100),
          duration: const Duration(milliseconds: 300),
          builder: (_, value, _) => LinearProgressIndicator(
            value: value,
            backgroundColor: Theme.of(context).colorScheme.surfaceContainerHigh,
            color: Theme.of(context).colorScheme.primary,
            minHeight: 3,
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// OFFLINE GUARD  (AUDIT §13 — "which actions are disabled offline")
// ─────────────────────────────────────────────────────────────────────────────
//
// Wraps any widget that requires connectivity to function.
// When offline: disables the child widget and optionally shows a tooltip.
//
// ── OFFLINE-DISABLED ACTIONS (per audit §13) ──────────────────────────────
//
// The following actions MUST use OfflineGuard:
//
//   ALWAYS REQUIRES ONLINE:
//     • Check-in / Check-out  (GPS validation must hit server)
//     • New fault report submission
//     • New lead creation (deduplication check)
//     • Quotation send to customer
//     • Report generation / export
//     • Password change
//     • Session management (logout all devices)
//     • File upload to server (photo evidence, documents)
//
//   WORKS OFFLINE (cached data, sync on recovery):
//     • Browsing fault/visit/lead lists (read from local DB)
//     • Editing draft fault / draft lead
//     • Adding work notes to existing fault attempt
//     • Viewing attendance history
//     • Viewing profile (read-only)
//     • Navigation between screens
//
// Usage:
//   OfflineGuard(
//     reason: OfflineBlockReason.checkIn,
//     child: FilledButton(onPressed: _checkIn, child: Text('Check In')),
//   )

enum OfflineBlockReason {
  checkIn,
  checkOut,
  submitFault,
  submitLead,
  sendQuotation,
  generateReport,
  uploadFile,
  changePassword,
  sessionManagement,
  generic,
}

extension OfflineBlockReasonX on OfflineBlockReason {
  String get message => switch (this) {
        OfflineBlockReason.checkIn =>
          'Check-in requires a live connection for GPS validation.',
        OfflineBlockReason.checkOut =>
          'Check-out requires a live connection.',
        OfflineBlockReason.submitFault =>
          'Fault submission requires a connection. Your data will be saved as a draft.',
        OfflineBlockReason.submitLead =>
          'Lead creation requires a connection to check for duplicates.',
        OfflineBlockReason.sendQuotation =>
          'Sending a quotation requires a connection.',
        OfflineBlockReason.generateReport =>
          'Report generation requires a server connection.',
        OfflineBlockReason.uploadFile =>
          'File upload requires a connection. Files will be queued and uploaded when back online.',
        OfflineBlockReason.changePassword =>
          'Password changes require a secure connection.',
        OfflineBlockReason.sessionManagement =>
          'Session management requires a connection.',
        OfflineBlockReason.generic =>
          'This action requires an internet connection.',
      };

  IconData get icon => switch (this) {
        OfflineBlockReason.checkIn || OfflineBlockReason.checkOut =>
          Icons.gps_off_rounded,
        OfflineBlockReason.submitFault || OfflineBlockReason.submitLead =>
          Icons.cloud_upload_rounded,
        OfflineBlockReason.generateReport => Icons.bar_chart_rounded,
        OfflineBlockReason.uploadFile => Icons.upload_file_rounded,
        OfflineBlockReason.changePassword ||
        OfflineBlockReason.sessionManagement =>
          Icons.lock_rounded,
        _ => Icons.wifi_off_rounded,
      };
}

class OfflineGuard extends ConsumerWidget {
  const OfflineGuard({
    super.key,
    required this.child,
    this.reason = OfflineBlockReason.generic,
    this.showTooltip = true,
    this.onOfflineTap,
  });

  final Widget child;
  final OfflineBlockReason reason;
  final bool showTooltip;

  /// If provided, called instead of the default snackbar when the
  /// user taps the disabled widget offline.
  final VoidCallback? onOfflineTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isOnline = ref.watch(isOnlineProvider);
    if (isOnline) return child;

    // Offline — wrap with tooltip + opacity + absorb gestures
    return Tooltip(
      message: showTooltip ? reason.message : '',
      triggerMode: TooltipTriggerMode.tap,
      child: GestureDetector(
        onTap: () {
          if (onOfflineTap != null) {
            onOfflineTap!();
          } else {
            _showOfflineSnackBar(context, reason);
          }
        },
        child: Opacity(
          opacity: 0.45,
          child: AbsorbPointer(child: child),
        ),
      ),
    );
  }

  void _showOfflineSnackBar(BuildContext context, OfflineBlockReason reason) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(reason.icon, size: 18, color: Colors.white),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                reason.message,
                style: const TextStyle(color: Colors.white),
              ),
            ),
          ],
        ),
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.all(AppSpacing.space4),
        duration: const Duration(seconds: 4),
        backgroundColor: PingForceColors.offlineBannerBg,
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SYNC STATUS CHIP  (AUDIT §13 — "sync status chip in app bar")
// ─────────────────────────────────────────────────────────────────────────────
//
// Place this in an AppBar's actions list:
//
//   AppBar(
//     actions: [
//       const SyncStatusChip(),
//       ...
//     ],
//   )

class SyncStatusChip extends ConsumerWidget {
  const SyncStatusChip({super.key, this.onTap});

  /// Called when the chip is tapped — navigate to SyncMonitorScreen
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final syncState = ref.watch(syncProvider);
    final isOnline = ref.watch(isOnlineProvider);

    if (isOnline && syncState.status == SyncQueueStatus.idle) {
      // All clear — show nothing (clean UI)
      return const SizedBox.shrink();
    }

    final (color, bg, icon) = _style(context, syncState, isOnline);

    return Semantics(
      label: syncState.chipLabel,
      button: true,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          margin: const EdgeInsets.symmetric(
            vertical: 10,
            horizontal: AppSpacing.space2,
          ),
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: bg,
            borderRadius: AppRadius.pillAll,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Spinning icon during sync
              syncState.isSyncing
                  ? _SpinningIcon(icon: icon, color: color)
                  : Icon(icon, size: 14, color: color),
              const SizedBox(width: 4),
              Text(
                syncState.chipLabel,
                style: AppTypography.labelSmall.copyWith(color: color),
              ),
            ],
          ),
        ),
      ),
    );
  }

  (Color, Color, IconData) _style(
    BuildContext context,
    SyncState state,
    bool isOnline,
  ) {
    if (!isOnline) {
      return (
        PingForceColors.offlineBannerFg,
        PingForceColors.offlineBannerBg,
        Icons.cloud_off_rounded,
      );
    }
    return switch (state.status) {
      SyncQueueStatus.syncing => (
          Theme.of(context).colorScheme.primary,
          Theme.of(context).colorScheme.primaryContainer,
          Icons.sync_rounded,
        ),
      SyncQueueStatus.failed => (
          PingForceColors.statusCritical,
          PingForceColors.statusCriticalContainer,
          Icons.sync_problem_rounded,
        ),
      SyncQueueStatus.conflict => (
          PingForceColors.statusWarning,
          PingForceColors.statusWarningContainer,
          Icons.merge_type_rounded,
        ),
      SyncQueueStatus.pending => (
          PingForceColors.statusInfo,
          PingForceColors.statusInfoContainer,
          Icons.cloud_upload_rounded,
        ),
      SyncQueueStatus.completed => (
          PingForceColors.statusSuccess,
          PingForceColors.statusSuccessContainer,
          Icons.cloud_done_rounded,
        ),
      _ => (
          Theme.of(context).colorScheme.onSurfaceVariant,
          Theme.of(context).colorScheme.surfaceContainerHigh,
          Icons.sync_rounded,
        ),
    };
  }
}

class _SpinningIcon extends StatefulWidget {
  const _SpinningIcon({required this.icon, required this.color});
  final IconData icon;
  final Color color;

  @override
  State<_SpinningIcon> createState() => _SpinningIconState();
}

class _SpinningIconState extends State<_SpinningIcon>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return RotationTransition(
      turns: _ctrl,
      child: Icon(widget.icon, size: 14, color: widget.color),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LAST SYNCED LABEL WIDGET  (AUDIT §13 — "last synced at" display)
// ─────────────────────────────────────────────────────────────────────────────
//
// Shows "Last synced: 5m ago" in app bars or settings screens.
//
// Usage:
//   const LastSyncedLabel()

class LastSyncedLabel extends ConsumerWidget {
  const LastSyncedLabel({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final label = ref.watch(lastSyncedLabelProvider);
    return Text(
      'Last synced: $label',
      style: AppTypography.labelSmall.copyWith(
        color: Theme.of(context).colorScheme.onSurfaceVariant,
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PERMISSION DENIED STATES  (AUDIT §16 — GPS/Camera denied)
// ─────────────────────────────────────────────────────────────────────────────

enum PermissionType {
  gps,
  camera,
  microphone,
  notifications,
  storage,
}

class PermissionDeniedState extends StatelessWidget {
  const PermissionDeniedState({
    super.key,
    required this.permission,
    required this.onOpenSettings,
    this.onDismiss,
  });

  final PermissionType permission;
  final VoidCallback onOpenSettings;
  final VoidCallback? onDismiss;

  @override
  Widget build(BuildContext context) {
    final config = _config(permission);

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.space8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // ── Icon in colored circle ─────────────────────────────────
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Theme.of(context).colorScheme.errorContainer,
              ),
              child: Icon(
                config.icon,
                size: AppIconSize.xl,
                color: Theme.of(context).colorScheme.onErrorContainer,
              ),
            ),

            const SizedBox(height: AppSpacing.space5),

            Text(
              config.title,
              style: AppTypography.titleMedium.copyWith(
                color: Theme.of(context).colorScheme.onSurface,
              ),
              textAlign: TextAlign.center,
            ),

            const SizedBox(height: AppSpacing.space2),

            Text(
              config.body,
              style: AppTypography.bodyMedium.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),

            const SizedBox(height: AppSpacing.space6),

            // ── Open Settings CTA ──────────────────────────────────────
            FilledButton.icon(
              onPressed: onOpenSettings,
              icon: const Icon(Icons.settings_rounded),
              label: const Text('Open Settings'),
            ),

            const SizedBox(height: AppSpacing.space3),

            if (onDismiss != null)
              TextButton(
                onPressed: onDismiss,
                child: const Text('Maybe Later'),
              ),
          ],
        ),
      ),
    );
  }

  _PermissionConfig _config(PermissionType p) {
    return switch (p) {
      PermissionType.gps => const _PermissionConfig(
          icon: Icons.gps_off_rounded,
          title: 'Location Access Required',
          body:
              'PingForce needs your location for GPS check-in and visit tracking. '
              'Please enable location permission in Settings.',
        ),
      PermissionType.camera => const _PermissionConfig(
          icon: Icons.no_photography_rounded,
          title: 'Camera Access Required',
          body:
              'Camera permission is needed for selfie verification and fault photo capture. '
              'Please enable it in Settings.',
        ),
      PermissionType.microphone => const _PermissionConfig(
          icon: Icons.mic_off_rounded,
          title: 'Microphone Access Required',
          body:
              'Microphone permission is needed to record voice notes for fault reports. '
              'Please enable it in Settings.',
        ),
      PermissionType.notifications => const _PermissionConfig(
          icon: Icons.notifications_off_rounded,
          title: 'Notifications Disabled',
          body:
              'Enable notifications to receive alerts for fault assignments, '
              'SLA warnings, and attendance reminders.',
        ),
      PermissionType.storage => const _PermissionConfig(
          icon: Icons.folder_off_rounded,
          title: 'Storage Access Required',
          body:
              'Storage permission is needed to save and upload documents. '
              'Please enable it in Settings.',
        ),
    };
  }
}

class _PermissionConfig {
  const _PermissionConfig({
    required this.icon,
    required this.title,
    required this.body,
  });
  final IconData icon;
  final String title;
  final String body;
}

// ─────────────────────────────────────────────────────────────────────────────
// INLINE PERMISSION BANNER  — compact banner for non-blocking permission asks
// ─────────────────────────────────────────────────────────────────────────────
//
// Use this inside a screen (not full-page) when a feature needs a permission
// but the screen can still be partially used without it.
//
// Example: Attendance screen showing map — GPS denied → show this banner
// above the map area, not full screen.

class InlinePermissionBanner extends StatelessWidget {
  const InlinePermissionBanner({
    super.key,
    required this.permission,
    required this.onGrantTap,
    this.onDismiss,
  });

  final PermissionType permission;
  final VoidCallback onGrantTap;
  final VoidCallback? onDismiss;

  @override
  Widget build(BuildContext context) {
    final config = _label(permission);

    return Container(
      margin: const EdgeInsets.symmetric(
        horizontal: AppSpacing.screenHorizontal,
        vertical: AppSpacing.space2,
      ),
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.space4,
        vertical: AppSpacing.space3,
      ),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.errorContainer,
        borderRadius: AppRadius.lgAll,
      ),
      child: Row(
        children: [
          Icon(
            config.$1,
            size: AppIconSize.sm,
            color: Theme.of(context).colorScheme.onErrorContainer,
          ),
          AppSpacing.iconGapBox,
          Expanded(
            child: Text(
              config.$2,
              style: AppTypography.labelMedium.copyWith(
                color: Theme.of(context).colorScheme.onErrorContainer,
              ),
            ),
          ),
          TextButton(
            onPressed: onGrantTap,
            style: TextButton.styleFrom(
              foregroundColor:
                  Theme.of(context).colorScheme.onErrorContainer,
              padding: const EdgeInsets.symmetric(horizontal: 8),
              minimumSize: const Size(60, 32),
            ),
            child: const Text('Allow'),
          ),
          if (onDismiss != null)
            IconButton(
              icon: const Icon(Icons.close_rounded, size: 16),
              onPressed: onDismiss,
              color: Theme.of(context).colorScheme.onErrorContainer,
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
            ),
        ],
      ),
    );
  }

  (IconData, String) _label(PermissionType p) {
    return switch (p) {
      PermissionType.gps => (
          Icons.gps_off_rounded,
          'Location permission required for GPS check-in',
        ),
      PermissionType.camera => (
          Icons.no_photography_rounded,
          'Camera permission required for photo capture',
        ),
      PermissionType.microphone => (
          Icons.mic_off_rounded,
          'Microphone permission required for voice notes',
        ),
      PermissionType.notifications => (
          Icons.notifications_off_rounded,
          'Enable notifications to receive SLA alerts',
        ),
      PermissionType.storage => (
          Icons.folder_off_rounded,
          'Storage permission required to save files',
        ),
    };
  }
}
