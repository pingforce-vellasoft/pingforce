import 'package:flutter/material.dart';

import '../theme/theme.dart';

// ─────────────────────────────────────────────────────────────────────────────
// UNIVERSAL EMPTY / LOADING / ERROR STATES
// DASHBOARD_SPEC.md §7  ·  AUDIT §13 & §14
// ─────────────────────────────────────────────────────────────────────────────
//
// This file contains the complete set of reusable "non-data" state widgets
// that every feature screen in PingForce must use consistently.
// Never build ad-hoc loading or empty states in feature widgets.
//
// Widgets exported:
//   - AppLoadingIndicator          → centered spinner, use in full-screen loads
//   - ShimmerBox                   → shimmer placeholder rectangle / circle
//   - ShimmerList                  → N-row shimmer placeholder list
//   - AppEmptyState                → full empty state with icon + text + CTA
//   - AppErrorState                → full error state with icon + retry
//   - AppOfflineBanner             → top-of-screen offline amber strip
//   - AppSyncStatusBar             → pending-sync info bar
//   - PendingSyncBadge             → small badge for unsynced records
//   - ConflictResolutionDialog     → side-by-side conflict resolution
//   - NetworkRecoveryOverlay       → "back online" animated snackbar
//   - FullPageLoader               → full-page loading with skeleton sections
// ─────────────────────────────────────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════════════════════
// 1. APP LOADING INDICATOR  — centered spinner for screen-level loads
// ══════════════════════════════════════════════════════════════════════════════

class AppLoadingIndicator extends StatelessWidget {
  const AppLoadingIndicator({
    super.key,
    this.message,
    this.size = 36,
  });

  final String? message;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: size,
            height: size,
            child: CircularProgressIndicator(
              strokeWidth: 3,
              color: Theme.of(context).colorScheme.primary,
            ),
          ),
          if (message != null) ...[
            const SizedBox(height: AppSpacing.space4),
            Text(
              message!,
              style: AppTypography.bodyMedium.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ],
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. SHIMMER BOX  — animated placeholder for content not yet loaded
// ══════════════════════════════════════════════════════════════════════════════

class ShimmerBox extends StatefulWidget {
  const ShimmerBox({
    super.key,
    required this.width,
    required this.height,
    this.borderRadius,
    this.isCircle = false,
  });

  const ShimmerBox.circle({
    super.key,
    required double size,
  })  : width = size,
        height = size,
        borderRadius = null,
        isCircle = true;

  final double width;
  final double height;
  final BorderRadiusGeometry? borderRadius;
  final bool isCircle;

  @override
  State<ShimmerBox> createState() => _ShimmerBoxState();
}

class _ShimmerBoxState extends State<ShimmerBox>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _anim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);
    _anim = CurvedAnimation(parent: _ctrl, curve: AppEasing.linear);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final base = Theme.of(context).colorScheme.surfaceContainerHigh;
    final highlight = Theme.of(context).colorScheme.surfaceContainerHighest;

    return AnimatedBuilder(
      animation: _anim,
      builder: (_, __) {
        return Container(
          width: widget.width,
          height: widget.height,
          decoration: BoxDecoration(
            color: Color.lerp(base, highlight, _anim.value),
            borderRadius: widget.isCircle
                ? null
                : (widget.borderRadius ?? AppRadius.smAll),
            shape: widget.isCircle ? BoxShape.circle : BoxShape.rectangle,
          ),
        );
      },
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. SHIMMER LIST  — N rows of shimmer content mimicking a list
// ══════════════════════════════════════════════════════════════════════════════

class ShimmerList extends StatelessWidget {
  const ShimmerList({
    super.key,
    this.itemCount = 5,
    this.showLeadingCircle = true,
    this.itemHeight = 72,
  });

  final int itemCount;
  final bool showLeadingCircle;
  final double itemHeight;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: List.generate(itemCount, (i) {
        // Vary widths for natural shimmer look
        final bodyWidth = i.isEven ? 180.0 : 140.0;
        return Padding(
          padding: const EdgeInsets.only(bottom: AppSpacing.space3),
          child: Row(
            children: [
              if (showLeadingCircle) ...[
                const ShimmerBox.circle(size: 40),
                const SizedBox(width: AppSpacing.space3),
              ],
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    ShimmerBox(
                      width: double.infinity,
                      height: 14,
                      borderRadius: AppRadius.pillAll,
                    ),
                    const SizedBox(height: AppSpacing.space2),
                    ShimmerBox(
                      width: bodyWidth,
                      height: 11,
                      borderRadius: AppRadius.pillAll,
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      }),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. SHIMMER CARD ROW  — shimmer placeholder for horizontal KPI/card rows
// ══════════════════════════════════════════════════════════════════════════════

class ShimmerCardRow extends StatelessWidget {
  const ShimmerCardRow({
    super.key,
    this.cardCount = 3,
    this.cardWidth = 150,
    this.cardHeight = 120,
  });

  final int cardCount;
  final double cardWidth;
  final double cardHeight;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: cardHeight,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: EdgeInsets.zero,
        itemCount: cardCount,
        separatorBuilder: (_, __) =>
            const SizedBox(width: AppSpacing.cardMargin),
        itemBuilder: (_, __) => ShimmerBox(
          width: cardWidth,
          height: cardHeight,
          borderRadius: AppRadius.lgAll,
        ),
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 5. APP EMPTY STATE  — full empty-state layout (audit §14)
// ══════════════════════════════════════════════════════════════════════════════

/// Predefined empty state presets matching all modules from the audit.
enum AppEmptyStateType {
  // Generic
  noData,
  noResults,
  noConnection,

  // Module-specific (audit §14)
  noAttendanceHistory,
  noVisitsAssigned,
  noFaultsAssigned,
  noLeadsInPipeline,
  noNotifications,
  noActivityToday,
  noDashboardData,
  noReports,
  noDocuments,
}

class AppEmptyState extends StatelessWidget {
  const AppEmptyState({
    super.key,
    required this.type,
    this.customTitle,
    this.customSubtitle,
    this.actionLabel,
    this.onAction,
    this.secondaryActionLabel,
    this.onSecondaryAction,
  });

  final AppEmptyStateType type;
  final String? customTitle;
  final String? customSubtitle;
  final String? actionLabel;
  final VoidCallback? onAction;
  final String? secondaryActionLabel;
  final VoidCallback? onSecondaryAction;

  @override
  Widget build(BuildContext context) {
    final config = _config(type);

    return Semantics(
      label: '${customTitle ?? config.title}. ${customSubtitle ?? config.subtitle}',
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.space8),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // ── Icon ────────────────────────────────────────────────────
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Theme.of(context).colorScheme.surfaceContainerHigh,
                ),
                child: Icon(
                  config.icon,
                  size: AppIconSize.xl,
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),

              const SizedBox(height: AppSpacing.space5),

              // ── Title ───────────────────────────────────────────────────
              Text(
                customTitle ?? config.title,
                style: AppTypography.titleMedium.copyWith(
                  color: Theme.of(context).colorScheme.onSurface,
                ),
                textAlign: TextAlign.center,
              ),

              const SizedBox(height: AppSpacing.space2),

              // ── Subtitle ────────────────────────────────────────────────
              Text(
                customSubtitle ?? config.subtitle,
                style: AppTypography.bodyMedium.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ),

              // ── Primary CTA ─────────────────────────────────────────────
              if (actionLabel != null && onAction != null) ...[
                const SizedBox(height: AppSpacing.space6),
                FilledButton.icon(
                  onPressed: onAction,
                  icon: Icon(config.actionIcon ?? Icons.add_rounded),
                  label: Text(actionLabel!),
                ),
              ] else if (config.defaultActionLabel != null &&
                  onAction != null) ...[
                const SizedBox(height: AppSpacing.space6),
                FilledButton.icon(
                  onPressed: onAction,
                  icon: Icon(config.actionIcon ?? Icons.add_rounded),
                  label: Text(config.defaultActionLabel!),
                ),
              ],

              // ── Secondary CTA ────────────────────────────────────────────
              if (secondaryActionLabel != null && onSecondaryAction != null) ...[
                const SizedBox(height: AppSpacing.space3),
                OutlinedButton(
                  onPressed: onSecondaryAction,
                  child: Text(secondaryActionLabel!),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  _EmptyStateConfig _config(AppEmptyStateType type) {
    return switch (type) {
      AppEmptyStateType.noData => const _EmptyStateConfig(
          icon: Icons.inbox_rounded,
          title: 'Nothing here yet',
          subtitle: 'Data will appear here when available.',
        ),
      AppEmptyStateType.noResults => const _EmptyStateConfig(
          icon: Icons.search_off_rounded,
          title: 'No results found',
          subtitle: 'Try adjusting your search or filters.',
        ),
      AppEmptyStateType.noConnection => const _EmptyStateConfig(
          icon: Icons.wifi_off_rounded,
          title: 'No Connection',
          subtitle:
              'You\'re offline. Connect to the internet to see the latest data.',
          defaultActionLabel: 'Try Again',
          actionIcon: Icons.refresh_rounded,
        ),
      AppEmptyStateType.noAttendanceHistory => const _EmptyStateConfig(
          icon: Icons.calendar_today_rounded,
          title: 'No Attendance Records',
          subtitle:
              'Your attendance history will appear here after your first check-in.',
          defaultActionLabel: 'Check In Now',
          actionIcon: Icons.login_rounded,
        ),
      AppEmptyStateType.noVisitsAssigned => const _EmptyStateConfig(
          icon: Icons.map_outlined,
          title: 'No Visits Assigned',
          subtitle:
              'You have no visits scheduled today. Contact your supervisor to assign visits.',
          defaultActionLabel: 'Contact Supervisor',
          actionIcon: Icons.support_agent_rounded,
        ),
      AppEmptyStateType.noFaultsAssigned => const _EmptyStateConfig(
          icon: Icons.build_circle_outlined,
          title: 'No Faults Assigned',
          subtitle: 'You\'re all clear! No faults assigned to you right now.',
          defaultActionLabel: 'Report a Fault',
          actionIcon: Icons.report_problem_rounded,
        ),
      AppEmptyStateType.noLeadsInPipeline => const _EmptyStateConfig(
          icon: Icons.person_search_rounded,
          title: 'No Leads Yet',
          subtitle:
              'Start building your pipeline by adding your first lead.',
          defaultActionLabel: 'Add Lead',
          actionIcon: Icons.person_add_rounded,
        ),
      AppEmptyStateType.noNotifications => const _EmptyStateConfig(
          icon: Icons.notifications_none_rounded,
          title: 'All Caught Up!',
          subtitle: 'You have no new notifications.',
        ),
      AppEmptyStateType.noActivityToday => const _EmptyStateConfig(
          icon: Icons.inbox_rounded,
          title: 'No Activity Today',
          subtitle: 'Your actions will appear here as you use the app.',
        ),
      AppEmptyStateType.noDashboardData => const _EmptyStateConfig(
          icon: Icons.dashboard_outlined,
          title: "You're All Set!",
          subtitle:
              'No pending actions for today. Keep up the great work!',
        ),
      AppEmptyStateType.noReports => const _EmptyStateConfig(
          icon: Icons.bar_chart_rounded,
          title: 'No Reports',
          subtitle: 'Generated reports will appear here.',
          defaultActionLabel: 'Generate Report',
          actionIcon: Icons.add_chart_rounded,
        ),
      AppEmptyStateType.noDocuments => const _EmptyStateConfig(
          icon: Icons.folder_open_rounded,
          title: 'No Documents',
          subtitle: 'Documents shared with you will appear here.',
        ),
    };
  }
}

class _EmptyStateConfig {
  const _EmptyStateConfig({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.defaultActionLabel,
    this.actionIcon,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final String? defaultActionLabel;
  final IconData? actionIcon;
}

// ══════════════════════════════════════════════════════════════════════════════
// 6. APP ERROR STATE  — full error layout with retry
// ══════════════════════════════════════════════════════════════════════════════

enum AppErrorType {
  generic,
  network,
  server,
  unauthorized,
  forbidden,
  notFound,
  sessionExpired,
  maintenanceMode,
}

class AppErrorState extends StatelessWidget {
  const AppErrorState({
    super.key,
    this.type = AppErrorType.generic,
    this.message,
    this.onRetry,
    this.onSecondaryAction,
    this.secondaryActionLabel,
  });

  final AppErrorType type;
  final String? message;
  final VoidCallback? onRetry;
  final VoidCallback? onSecondaryAction;
  final String? secondaryActionLabel;

  @override
  Widget build(BuildContext context) {
    final config = _errorConfig(type);

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.space8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // ── Icon ──────────────────────────────────────────────────────
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

            // ── Title ─────────────────────────────────────────────────────
            Text(
              config.title,
              style: AppTypography.titleMedium.copyWith(
                color: Theme.of(context).colorScheme.onSurface,
              ),
              textAlign: TextAlign.center,
            ),

            const SizedBox(height: AppSpacing.space2),

            // ── Message ───────────────────────────────────────────────────
            Text(
              message ?? config.subtitle,
              style: AppTypography.bodyMedium.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),

            // ── Retry button ──────────────────────────────────────────────
            if (onRetry != null) ...[
              const SizedBox(height: AppSpacing.space6),
              FilledButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('Try Again'),
              ),
            ],

            // ── Secondary ─────────────────────────────────────────────────
            if (onSecondaryAction != null && secondaryActionLabel != null) ...[
              const SizedBox(height: AppSpacing.space3),
              TextButton(
                onPressed: onSecondaryAction,
                child: Text(secondaryActionLabel!),
              ),
            ],
          ],
        ),
      ),
    );
  }

  _ErrorConfig _errorConfig(AppErrorType type) {
    return switch (type) {
      AppErrorType.generic => const _ErrorConfig(
          icon: Icons.error_outline_rounded,
          title: 'Something went wrong',
          subtitle:
              'An unexpected error occurred. Please try again.',
        ),
      AppErrorType.network => const _ErrorConfig(
          icon: Icons.wifi_off_rounded,
          title: 'Connection Lost',
          subtitle:
              'Check your internet connection and try again.',
        ),
      AppErrorType.server => const _ErrorConfig(
          icon: Icons.cloud_off_rounded,
          title: 'Server Error',
          subtitle:
              'Our servers are experiencing issues. Please try again in a few minutes.',
        ),
      AppErrorType.unauthorized => const _ErrorConfig(
          icon: Icons.lock_outline_rounded,
          title: 'Session Expired',
          subtitle: 'Please log in again to continue.',
        ),
      AppErrorType.forbidden => const _ErrorConfig(
          icon: Icons.block_rounded,
          title: 'Access Denied',
          subtitle:
              'You don\'t have permission to view this content.',
        ),
      AppErrorType.notFound => const _ErrorConfig(
          icon: Icons.search_off_rounded,
          title: 'Not Found',
          subtitle: 'The item you\'re looking for doesn\'t exist or has been removed.',
        ),
      AppErrorType.sessionExpired => const _ErrorConfig(
          icon: Icons.timer_off_rounded,
          title: 'Session Expired',
          subtitle: 'Your session has expired. Log in to continue.',
        ),
      AppErrorType.maintenanceMode => const _ErrorConfig(
          icon: Icons.construction_rounded,
          title: 'Under Maintenance',
          subtitle:
              'The service is temporarily unavailable for maintenance. Please check back shortly.',
        ),
    };
  }
}

class _ErrorConfig {
  const _ErrorConfig({
    required this.icon,
    required this.title,
    required this.subtitle,
  });
  final IconData icon;
  final String title;
  final String subtitle;
}

// ══════════════════════════════════════════════════════════════════════════════
// 7. APP OFFLINE BANNER  — persistent amber strip (audit §13)
// ══════════════════════════════════════════════════════════════════════════════

class AppOfflineBanner extends StatefulWidget {
  const AppOfflineBanner({
    super.key,
    this.pendingCount = 0,
    this.onSyncTap,
  });

  final int pendingCount;
  final VoidCallback? onSyncTap;

  @override
  State<AppOfflineBanner> createState() => _AppOfflineBannerState();
}

class _AppOfflineBannerState extends State<AppOfflineBanner>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<Offset> _slideAnim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: AppDurations.normal, // 200ms
    );
    _slideAnim = Tween<Offset>(
      begin: const Offset(0, -1),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _ctrl, curve: AppEasing.decelerate));
    _ctrl.forward();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final pendingLabel = widget.pendingCount > 0
        ? 'Offline · ${widget.pendingCount} item(s) pending sync'
        : 'Offline · Showing cached data';

    return SlideTransition(
      position: _slideAnim,
      child: Semantics(
        liveRegion: true,
        label: pendingLabel,
        child: Container(
          height: 40,
          color: PingForceColors.offlineBannerBg,
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.space4),
          child: Row(
            children: [
              const Icon(
                Icons.cloud_off_rounded,
                size: AppIconSize.sm,
                color: PingForceColors.offlineBannerFg,
              ),
              AppSpacing.iconGapBox,
              Expanded(
                child: Text(
                  pendingLabel,
                  style: AppTypography.labelMedium
                      .copyWith(color: PingForceColors.offlineBannerFg),
                ),
              ),
              if (widget.pendingCount > 0 && widget.onSyncTap != null)
                TextButton(
                  onPressed: widget.onSyncTap,
                  style: TextButton.styleFrom(
                    foregroundColor: PingForceColors.offlineBannerFg,
                    padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.space2),
                    minimumSize: const Size(60, 32),
                  ),
                  child: const Text('Sync'),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 8. PENDING SYNC BADGE  — small badge on unsynced record cards (audit §13)
// ══════════════════════════════════════════════════════════════════════════════

class PendingSyncBadge extends StatelessWidget {
  const PendingSyncBadge({super.key});

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: 'Pending sync',
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        decoration: BoxDecoration(
          color: PingForceColors.statusInfoContainer,
          borderRadius: AppRadius.pillAll,
          border: Border.all(
            color: PingForceColors.statusInfo.withOpacity(0.4),
            width: 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.cloud_upload_outlined,
              size: 11,
              color: PingForceColors.statusInfo,
            ),
            const SizedBox(width: 3),
            Text(
              'Pending',
              style: AppTypography.labelSmall.copyWith(
                color: PingForceColors.statusInfo,
                fontSize: 10,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 9. CONFLICT RESOLUTION DIALOG  — audit §13
// ══════════════════════════════════════════════════════════════════════════════

class ConflictResolutionDialog extends StatelessWidget {
  const ConflictResolutionDialog({
    super.key,
    required this.localVersion,
    required this.serverVersion,
    required this.fieldName,
    required this.onKeepLocal,
    required this.onKeepServer,
    this.localTimestamp,
    this.serverTimestamp,
  });

  final String localVersion;
  final String serverVersion;
  final String fieldName;
  final VoidCallback onKeepLocal;
  final VoidCallback onKeepServer;
  final DateTime? localTimestamp;
  final DateTime? serverTimestamp;

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      icon: const Icon(Icons.merge_type_rounded),
      title: const Text('Sync Conflict'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'A conflict was detected in "$fieldName". Choose which version to keep:',
            style: AppTypography.bodyMedium.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: AppSpacing.space4),

          // ── Side-by-side comparison ───────────────────────────────────
          Row(
            children: [
              Expanded(
                child: _ConflictVersion(
                  label: 'Your Version',
                  sublabel: localTimestamp != null
                      ? 'Saved ${_relativeTime(localTimestamp!)}'
                      : null,
                  value: localVersion,
                  color: Theme.of(context).colorScheme.primary,
                ),
              ),
              const SizedBox(width: AppSpacing.space3),
              Expanded(
                child: _ConflictVersion(
                  label: 'Server Version',
                  sublabel: serverTimestamp != null
                      ? 'Updated ${_relativeTime(serverTimestamp!)}'
                      : null,
                  value: serverVersion,
                  color: Theme.of(context).colorScheme.secondary,
                ),
              ),
            ],
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: onKeepServer,
          child: const Text('Keep Server'),
        ),
        FilledButton(
          onPressed: onKeepLocal,
          child: const Text('Keep Mine'),
        ),
      ],
    );
  }

  String _relativeTime(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    return '${diff.inHours}h ago';
  }
}

class _ConflictVersion extends StatelessWidget {
  const _ConflictVersion({
    required this.label,
    required this.value,
    required this.color,
    this.sublabel,
  });

  final String label;
  final String? sublabel;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.space3),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: AppRadius.smAll,
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: AppTypography.labelMedium.copyWith(color: color),
          ),
          if (sublabel != null)
            Text(
              sublabel!,
              style: AppTypography.labelSmall.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
          const SizedBox(height: AppSpacing.space2),
          Text(
            value,
            style: AppTypography.bodyMedium.copyWith(
              color: Theme.of(context).colorScheme.onSurface,
            ),
          ),
        ],
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 10. NETWORK RECOVERY OVERLAY  — "back online" animated banner (audit §13)
// ══════════════════════════════════════════════════════════════════════════════

/// Show this when the network reconnects. Slide-down green banner, auto-dismiss.
class NetworkRecoveryOverlay extends StatefulWidget {
  const NetworkRecoveryOverlay({
    super.key,
    this.syncedCount,
    this.onDismiss,
  });

  final int? syncedCount;
  final VoidCallback? onDismiss;

  @override
  State<NetworkRecoveryOverlay> createState() => _NetworkRecoveryOverlayState();
}

class _NetworkRecoveryOverlayState extends State<NetworkRecoveryOverlay>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<Offset> _slideAnim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: AppDurations.normal,
    );
    _slideAnim = Tween<Offset>(
      begin: const Offset(0, -1),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _ctrl, curve: AppEasing.decelerate));
    _ctrl.forward();

    // Auto dismiss after 3 seconds
    Future.delayed(const Duration(seconds: 3), () {
      if (mounted) {
        _ctrl.reverse().then((_) => widget.onDismiss?.call());
      }
    });
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final label = widget.syncedCount != null && widget.syncedCount! > 0
        ? 'Back online · ${widget.syncedCount} records synced ✓'
        : 'Back online ✓';

    return SlideTransition(
      position: _slideAnim,
      child: Semantics(
        liveRegion: true,
        label: label,
        child: Container(
          height: 40,
          color: PingForceColors.statusSuccess,
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.space4),
          child: Row(
            children: [
              const Icon(
                Icons.cloud_done_rounded,
                size: AppIconSize.sm,
                color: PingForceColors.statusOnSuccess,
              ),
              AppSpacing.iconGapBox,
              Expanded(
                child: Text(
                  label,
                  style: AppTypography.labelMedium
                      .copyWith(color: PingForceColors.statusOnSuccess),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 11. FULL PAGE LOADER  — complete page skeleton for initial screen loads
// ══════════════════════════════════════════════════════════════════════════════

enum FullPageLoaderLayout {
  list,         // shimmer list (e.g. fault list, lead list)
  cardAndList,  // hero card + list (e.g. dashboard)
  form,         // form fields skeleton (e.g. create screens)
  detail,       // header + sections (e.g. detail screens)
}

class FullPageLoader extends StatelessWidget {
  const FullPageLoader({
    super.key,
    this.layout = FullPageLoaderLayout.list,
  });

  final FullPageLoaderLayout layout;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: AppSpacing.screenPaddingAll,
      child: switch (layout) {
        FullPageLoaderLayout.list => _buildListLayout(),
        FullPageLoaderLayout.cardAndList => _buildCardAndListLayout(),
        FullPageLoaderLayout.form => _buildFormLayout(),
        FullPageLoaderLayout.detail => _buildDetailLayout(),
      },
    );
  }

  Widget _buildListLayout() {
    return Column(
      children: [
        // Search bar placeholder
        ShimmerBox(width: double.infinity, height: 48,
            borderRadius: AppRadius.pillAll),
        const SizedBox(height: AppSpacing.space4),
        // List items
        const ShimmerList(itemCount: 6),
      ],
    );
  }

  Widget _buildCardAndListLayout() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Hero card
        ShimmerBox(width: double.infinity, height: 160,
            borderRadius: AppRadius.lgAll),
        const SizedBox(height: AppSpacing.space4),
        // KPI row
        const ShimmerCardRow(),
        const SizedBox(height: AppSpacing.space4),
        // Section title
        ShimmerBox(width: 120, height: 14, borderRadius: AppRadius.pillAll),
        const SizedBox(height: AppSpacing.space3),
        // List
        const ShimmerList(itemCount: 4),
      ],
    );
  }

  Widget _buildFormLayout() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: List.generate(5, (i) => Padding(
        padding: const EdgeInsets.only(bottom: AppSpacing.space4),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ShimmerBox(width: 80, height: 12, borderRadius: AppRadius.pillAll),
            const SizedBox(height: AppSpacing.space2),
            ShimmerBox(width: double.infinity, height: 52,
                borderRadius: AppRadius.smAll),
          ],
        ),
      )),
    );
  }

  Widget _buildDetailLayout() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header card
        ShimmerBox(width: double.infinity, height: 100,
            borderRadius: AppRadius.lgAll),
        const SizedBox(height: AppSpacing.space5),
        // Section 1
        ShimmerBox(width: 100, height: 14, borderRadius: AppRadius.pillAll),
        const SizedBox(height: AppSpacing.space3),
        const ShimmerList(itemCount: 3, showLeadingCircle: false),
        const SizedBox(height: AppSpacing.space4),
        // Section 2
        ShimmerBox(width: 120, height: 14, borderRadius: AppRadius.pillAll),
        const SizedBox(height: AppSpacing.space3),
        const ShimmerList(itemCount: 4),
      ],
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 12. INLINE ERROR SNACKBAR HELPER  — consistent snackbars across app
// ══════════════════════════════════════════════════════════════════════════════

/// Use instead of raw ScaffoldMessenger.of(context).showSnackBar(...)
/// to ensure consistent error/success messaging across the app.
class AppSnackBar {
  const AppSnackBar._();

  static void showError(
    BuildContext context,
    String message, {
    String? actionLabel,
    VoidCallback? onAction,
  }) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.error_outline_rounded,
                size: 18, color: Colors.white),
            const SizedBox(width: 8),
            Expanded(child: Text(message)),
          ],
        ),
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.all(AppSpacing.space4),
        duration: const Duration(seconds: 4),
        backgroundColor: Colors.red.shade700,
        action: actionLabel != null
            ? SnackBarAction(
                label: actionLabel,
                textColor: Colors.white,
                onPressed: onAction ?? () {},
              )
            : null,
      ),
    );
  }

  static void showSuccess(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.check_circle_outline_rounded,
                size: 18, color: Colors.white),
            const SizedBox(width: 8),
            Expanded(child: Text(message)),
          ],
        ),
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.all(AppSpacing.space4),
        duration: const Duration(seconds: 2),
        backgroundColor: PingForceColors.statusSuccess,
      ),
    );
  }

  static void showInfo(
    BuildContext context,
    String message, {
    String? actionLabel,
    VoidCallback? onAction,
  }) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.info_outline_rounded,
                size: 18, color: Colors.white),
            const SizedBox(width: 8),
            Expanded(child: Text(message)),
          ],
        ),
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.all(AppSpacing.space4),
        duration: const Duration(seconds: 4),
        backgroundColor: PingForceColors.statusInfo,
        action: actionLabel != null
            ? SnackBarAction(
                label: actionLabel,
                textColor: Colors.white,
                onPressed: onAction ?? () {},
              )
            : null,
      ),
    );
  }

  static void showWarning(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.warning_amber_rounded,
                size: 18, color: Colors.white),
            const SizedBox(width: 8),
            Expanded(child: Text(message)),
          ],
        ),
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.all(AppSpacing.space4),
        duration: const Duration(seconds: 4),
        backgroundColor: PingForceColors.statusWarning,
      ),
    );
  }
}
