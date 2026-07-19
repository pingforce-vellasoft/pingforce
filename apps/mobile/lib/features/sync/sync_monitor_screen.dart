import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/theme.dart';
import '../../../core/sync/sync_state.dart';
import '../../../core/sync/sync_provider.dart';
import '../../../core/network/connectivity_provider.dart';
import '../../../core/widgets/offline_aware_scaffold.dart';
import '../../../core/widgets/app_states.dart';

// ─────────────────────────────────────────────────────────────────────────────
// SYNC MONITOR SCREEN  (AUDIT §20 — missing screens list)
//
// Shows:
//   • Current connectivity status + connection type
//   • Last synced timestamp
//   • Active sync progress bar
//   • Per-module pending item breakdown
//   • Failed items with retry
//   • Conflicts with resolve CTA
//   • Full queue list
// ─────────────────────────────────────────────────────────────────────────────

class SyncMonitorScreen extends ConsumerWidget {
  const SyncMonitorScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final syncState = ref.watch(syncProvider);
    final connectivity = ref.watch(connectivityProvider);

    return OfflineAwareScaffold(
      appBar: AppBar(
        title: const Text('Sync Monitor'),
        actions: [
          // Manual sync button
          if (connectivity.isOnline && syncState.hasPending)
            TextButton.icon(
              onPressed: () => ref.read(syncProvider.notifier).syncNow(),
              icon: const Icon(Icons.sync_rounded),
              label: const Text('Sync Now'),
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(syncProvider.notifier).syncNow(),
        child: ListView(
          padding: AppSpacing.screenPaddingAll,
          children: [
            // ── 1. Connectivity Card ─────────────────────────────────────
            _ConnectivityCard(connectivity: connectivity),

            AppSpacing.sectionGapBox,

            // ── 2. Sync Status Card ──────────────────────────────────────
            _SyncStatusCard(syncState: syncState),

            // ── 3. Active progress bar ───────────────────────────────────
            if (syncState.isSyncing) ...[
              AppSpacing.sectionGapBox,
              _ActiveSyncProgress(syncState: syncState),
            ],

            // ── 4. Conflicts (urgent — shown first) ──────────────────────
            if (syncState.hasConflicts) ...[
              AppSpacing.sectionGapBox,
              _ConflictsSection(
                conflicts: syncState.conflicts,
                onResolve: (itemId, keepLocal) => ref
                    .read(syncProvider.notifier)
                    .resolveConflict(itemId, keepLocal: keepLocal),
              ),
            ],

            // ── 5. Failed items ───────────────────────────────────────────
            if (syncState.failedCount > 0) ...[
              AppSpacing.sectionGapBox,
              _FailedItemsSection(
                items: syncState.queue.where((i) => i.isFailed).toList(),
                onRetry: (id) =>
                    ref.read(syncProvider.notifier).retryItem(id),
                onClearAll: () =>
                    ref.read(syncProvider.notifier).clearFailed(),
              ),
            ],

            // ── 6. Per-module breakdown ────────────────────────────────
            if (syncState.hasPending) ...[
              AppSpacing.sectionGapBox,
              _ModuleBreakdownCard(breakdown: syncState.pendingByModule),
            ],

            // ── 7. Full queue list ────────────────────────────────────
            if (syncState.queue.isNotEmpty) ...[
              AppSpacing.sectionGapBox,
              _QueueListSection(
                items: syncState.queue
                    .where((i) => !i.isFailed && !i.hasConflict)
                    .toList(),
              ),
            ],

            // ── 8. Empty state ────────────────────────────────────────
            if (syncState.queue.isEmpty &&
                syncState.conflicts.isEmpty &&
                syncState.status != SyncQueueStatus.syncing)
              const AppEmptyState(
                type: AppEmptyStateType.noData,
                customTitle: 'All Synced ✓',
                customSubtitle:
                    'All your data is up to date with the server.',
              ),

            const SizedBox(height: AppSpacing.space8),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONNECTIVITY CARD
// ─────────────────────────────────────────────────────────────────────────────

class _ConnectivityCard extends StatelessWidget {
  const _ConnectivityCard({required this.connectivity});
  final ConnectivityState connectivity;

  @override
  Widget build(BuildContext context) {
    final isOnline = connectivity.isOnline;
    final (color, bg, icon, label) = isOnline
        ? (
            PingForceColors.statusSuccess,
            PingForceColors.statusSuccessContainer,
            Icons.wifi_rounded,
            'Online${connectivity.connectionType != null ? ' · ${connectivity.connectionType!.toUpperCase()}' : ''}',
          )
        : (
            PingForceColors.statusCritical,
            PingForceColors.statusCriticalContainer,
            Icons.wifi_off_rounded,
            'Offline',
          );

    return Card(
      child: Padding(
        padding: AppSpacing.cardPaddingAll,
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(shape: BoxShape.circle, color: bg),
              child: Icon(icon, color: color, size: AppIconSize.md),
            ),
            const SizedBox(width: AppSpacing.space4),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Connection',
                  style: AppTypography.labelSmall.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ),
                Text(
                  label,
                  style: AppTypography.titleSmall.copyWith(color: color),
                ),
                if (!isOnline && connectivity.lastOnlineAt != null)
                  Text(
                    'Last online: ${_relTime(connectivity.lastOnlineAt!)}',
                    style: AppTypography.labelSmall.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _relTime(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${dt.day}/${dt.month}/${dt.year}';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SYNC STATUS CARD  — last synced + summary counts
// ─────────────────────────────────────────────────────────────────────────────

class _SyncStatusCard extends StatelessWidget {
  const _SyncStatusCard({required this.syncState});
  final SyncState syncState;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: AppSpacing.cardPaddingAll,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text('Sync Status', style: AppTypography.titleSmall),
                const Spacer(),
                // Last synced timestamp
                Text(
                  'Last synced: ${syncState.lastSyncedLabel}',
                  style: AppTypography.labelSmall.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.space4),
            Row(
              children: [
                _CountBadge(
                  count: syncState.pendingCount,
                  label: 'Pending',
                  color: PingForceColors.statusInfo,
                  bg: PingForceColors.statusInfoContainer,
                ),
                const SizedBox(width: AppSpacing.space3),
                _CountBadge(
                  count: syncState.failedCount,
                  label: 'Failed',
                  color: PingForceColors.statusCritical,
                  bg: PingForceColors.statusCriticalContainer,
                ),
                const SizedBox(width: AppSpacing.space3),
                _CountBadge(
                  count: syncState.conflictCount,
                  label: 'Conflicts',
                  color: PingForceColors.statusWarning,
                  bg: PingForceColors.statusWarningContainer,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _CountBadge extends StatelessWidget {
  const _CountBadge({
    required this.count,
    required this.label,
    required this.color,
    required this.bg,
  });
  final int count;
  final String label;
  final Color color;
  final Color bg;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: AppSpacing.space3),
        decoration: BoxDecoration(color: bg, borderRadius: AppRadius.smAll),
        child: Column(
          children: [
            Text(
              '$count',
              style: AppTypography.numericMedium.copyWith(color: color),
            ),
            Text(
              label,
              style: AppTypography.labelSmall.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVE SYNC PROGRESS
// ─────────────────────────────────────────────────────────────────────────────

class _ActiveSyncProgress extends StatelessWidget {
  const _ActiveSyncProgress({required this.syncState});
  final SyncState syncState;

  @override
  Widget build(BuildContext context) {
    final completed = syncState.completedInBatch;
    final total = syncState.totalInBatch;

    return Card(
      color: Theme.of(context).colorScheme.primaryContainer,
      child: Padding(
        padding: AppSpacing.cardPaddingAll,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const _SpinnerSmall(),
                const SizedBox(width: AppSpacing.space3),
                Text(
                  'Syncing… $completed / $total',
                  style: AppTypography.titleSmall.copyWith(
                    color: Theme.of(context).colorScheme.onPrimaryContainer,
                  ),
                ),
                const Spacer(),
                Text(
                  '${syncState.currentProgress}%',
                  style: AppTypography.numericSmall.copyWith(
                    color: Theme.of(context).colorScheme.onPrimaryContainer,
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.space3),
            TweenAnimationBuilder<double>(
              tween: Tween(
                  begin: 0, end: syncState.currentProgress / 100),
              duration: const Duration(milliseconds: 400),
              builder: (_, value, _) => ClipRRect(
                borderRadius: AppRadius.pillAll,
                child: LinearProgressIndicator(
                  value: value,
                  minHeight: 6,
                  backgroundColor:
                      Theme.of(context).colorScheme.primary.withValues(alpha: 0.2),
                  color: Theme.of(context).colorScheme.primary,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SpinnerSmall extends StatefulWidget {
  const _SpinnerSmall();

  @override
  State<_SpinnerSmall> createState() => _SpinnerSmallState();
}

class _SpinnerSmallState extends State<_SpinnerSmall>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 1000))
      ..repeat();
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
      child: Icon(
        Icons.sync_rounded,
        size: AppIconSize.sm,
        color: Theme.of(context).colorScheme.primary,
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFLICTS SECTION
// ─────────────────────────────────────────────────────────────────────────────

class _ConflictsSection extends StatelessWidget {
  const _ConflictsSection({
    required this.conflicts,
    required this.onResolve,
  });
  final List<SyncConflict> conflicts;
  final void Function(String itemId, bool keepLocal) onResolve;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _SectionTitle(
          title: 'Conflicts (${conflicts.length})',
          color: PingForceColors.statusWarning,
          icon: Icons.merge_type_rounded,
        ),
        const SizedBox(height: AppSpacing.space3),
        ...conflicts.map(
          (c) => Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.cardMargin),
            child: Card(
              color: PingForceColors.statusWarningContainer,
              child: Padding(
                padding: AppSpacing.cardPaddingAll,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header
                    Row(
                      children: [
                        Icon(Icons.merge_type_rounded,
                            size: AppIconSize.sm,
                            color: PingForceColors.statusWarning),
                        const SizedBox(width: AppSpacing.space2),
                        Expanded(
                          child: Text(
                            c.entityDescription,
                            style: AppTypography.titleSmall,
                          ),
                        ),
                        _ModuleBadge(module: c.module),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.space2),
                    Text(
                      'Field: ${c.fieldName}',
                      style: AppTypography.labelSmall.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.space3),
                    // Side-by-side comparison
                    Row(
                      children: [
                        Expanded(
                          child: _ConflictVersionCard(
                            label: 'Your Version',
                            value: c.localValue,
                            timestamp: c.localTimestamp,
                            color: Theme.of(context).colorScheme.primary,
                          ),
                        ),
                        const SizedBox(width: AppSpacing.space3),
                        Expanded(
                          child: _ConflictVersionCard(
                            label: 'Server Version',
                            value: c.serverValue,
                            timestamp: c.serverTimestamp,
                            color: Theme.of(context).colorScheme.secondary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.space3),
                    // Action buttons
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () => onResolve(c.itemId, false),
                            child: const Text('Keep Server'),
                          ),
                        ),
                        const SizedBox(width: AppSpacing.space3),
                        Expanded(
                          child: FilledButton(
                            onPressed: () => onResolve(c.itemId, true),
                            child: const Text('Keep Mine'),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _ConflictVersionCard extends StatelessWidget {
  const _ConflictVersionCard({
    required this.label,
    required this.value,
    required this.timestamp,
    required this.color,
  });
  final String label;
  final String value;
  final DateTime timestamp;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final diff = DateTime.now().difference(timestamp);
    final timeLabel = diff.inMinutes < 60
        ? '${diff.inMinutes}m ago'
        : '${diff.inHours}h ago';

    return Container(
      padding: const EdgeInsets.all(AppSpacing.space3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: AppRadius.smAll,
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style: AppTypography.labelMedium.copyWith(color: color)),
          Text(timeLabel,
              style: AppTypography.labelSmall.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              )),
          const SizedBox(height: AppSpacing.space2),
          Text(value, style: AppTypography.bodyMedium),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FAILED ITEMS SECTION
// ─────────────────────────────────────────────────────────────────────────────

class _FailedItemsSection extends StatelessWidget {
  const _FailedItemsSection({
    required this.items,
    required this.onRetry,
    required this.onClearAll,
  });
  final List<SyncQueueItem> items;
  final void Function(String id) onRetry;
  final VoidCallback onClearAll;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            _SectionTitle(
              title: 'Failed (${items.length})',
              color: PingForceColors.statusCritical,
              icon: Icons.sync_problem_rounded,
            ),
            const Spacer(),
            TextButton(
              onPressed: onClearAll,
              style: TextButton.styleFrom(
                foregroundColor: PingForceColors.statusCritical,
              ),
              child: const Text('Clear All'),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.space3),
        ...items.map(
          (item) => Padding(
            padding:
                const EdgeInsets.only(bottom: AppSpacing.cardMargin),
            child: Card(
              child: ListTile(
                leading: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: PingForceColors.statusCriticalContainer,
                  ),
                  child: const Icon(Icons.sync_problem_rounded,
                      size: AppIconSize.sm,
                      color: PingForceColors.statusCritical),
                ),
                title: Text(item.description,
                    style: AppTypography.bodyMedium),
                subtitle: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.errorMessage ?? 'Unknown error',
                      style: AppTypography.labelSmall.copyWith(
                        color: PingForceColors.statusCritical,
                      ),
                    ),
                    Text(
                      'Attempt ${item.retryCount}/${item.maxRetries}',
                      style: AppTypography.labelSmall.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
                trailing: item.canRetry
                    ? IconButton(
                        icon: const Icon(Icons.refresh_rounded),
                        tooltip: 'Retry',
                        onPressed: () => onRetry(item.id),
                      )
                    : Tooltip(
                        message: 'Max retries reached',
                        child: Icon(Icons.block_rounded,
                            color: Theme.of(context)
                                .colorScheme
                                .onSurfaceVariant),
                      ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULE BREAKDOWN CARD
// ─────────────────────────────────────────────────────────────────────────────

class _ModuleBreakdownCard extends StatelessWidget {
  const _ModuleBreakdownCard({required this.breakdown});
  final Map<SyncItemModule, int> breakdown;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: AppSpacing.cardPaddingAll,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Pending by Module', style: AppTypography.titleSmall),
            const SizedBox(height: AppSpacing.space3),
            ...breakdown.entries.map((entry) {
              final (icon, label) = _moduleInfo(entry.key);
              return Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.space2),
                child: Row(
                  children: [
                    Icon(icon,
                        size: AppIconSize.sm,
                        color: Theme.of(context).colorScheme.primary),
                    const SizedBox(width: AppSpacing.space3),
                    Expanded(
                      child: Text(label,
                          style: AppTypography.bodyMedium),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.primaryContainer,
                        borderRadius: AppRadius.pillAll,
                      ),
                      child: Text(
                        '${entry.value}',
                        style: AppTypography.labelMedium.copyWith(
                          color:
                              Theme.of(context).colorScheme.onPrimaryContainer,
                        ),
                      ),
                    ),
                  ],
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  (IconData, String) _moduleInfo(SyncItemModule module) {
    return switch (module) {
      SyncItemModule.attendance => (Icons.fingerprint_rounded, 'Attendance'),
      SyncItemModule.faults => (Icons.build_circle_rounded, 'Faults'),
      SyncItemModule.visits => (Icons.location_on_rounded, 'Visits'),
      SyncItemModule.leads => (Icons.person_search_rounded, 'Leads'),
      SyncItemModule.documents => (Icons.folder_rounded, 'Documents'),
      SyncItemModule.profile => (Icons.person_rounded, 'Profile'),
      SyncItemModule.tracking => (Icons.my_location_rounded, 'Tracking'),
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// QUEUE LIST SECTION  — pending items not yet failed/conflicted
// ─────────────────────────────────────────────────────────────────────────────

class _QueueListSection extends StatelessWidget {
  const _QueueListSection({required this.items});
  final List<SyncQueueItem> items;

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _SectionTitle(
          title: 'Queued Items (${items.length})',
          color: PingForceColors.statusInfo,
          icon: Icons.cloud_upload_rounded,
        ),
        const SizedBox(height: AppSpacing.space3),
        Container(
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surfaceContainerLowest,
            borderRadius: AppRadius.lgAll,
            boxShadow: AppElevation.shadowForLevel(1),
          ),
          child: Column(
            children: items.asMap().entries.map((entry) {
              final i = entry.key;
              final item = entry.value;
              final (icon, _) = _moduleInfo(item.module);

              return Column(
                children: [
                  ListTile(
                    leading: Icon(icon,
                        color: Theme.of(context).colorScheme.primary,
                        size: AppIconSize.md),
                    title: Text(item.description,
                        style: AppTypography.bodyMedium),
                    subtitle: Text(
                      '${item.operationType.toUpperCase()} · ${_relTime(item.queuedAt)}',
                      style: AppTypography.labelSmall.copyWith(
                        color:
                            Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                    trailing: const PendingSyncBadge(),
                  ),
                  if (i < items.length - 1)
                    Divider(
                      height: 1,
                      indent: 56,
                      color: Theme.of(context).colorScheme.outlineVariant,
                    ),
                ],
              );
            }).toList(),
          ),
        ),
      ],
    );
  }

  (IconData, String) _moduleInfo(SyncItemModule module) {
    return switch (module) {
      SyncItemModule.attendance => (Icons.fingerprint_rounded, 'Attendance'),
      SyncItemModule.faults => (Icons.build_circle_rounded, 'Faults'),
      SyncItemModule.visits => (Icons.location_on_rounded, 'Visits'),
      SyncItemModule.leads => (Icons.person_search_rounded, 'Leads'),
      SyncItemModule.documents => (Icons.folder_rounded, 'Documents'),
      SyncItemModule.profile => (Icons.person_rounded, 'Profile'),
      SyncItemModule.tracking => (Icons.my_location_rounded, 'Tracking'),
    };
  }

  String _relTime(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inSeconds < 60) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    return '${diff.inHours}h ago';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SMALL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({
    required this.title,
    required this.color,
    required this.icon,
  });
  final String title;
  final Color color;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: AppIconSize.sm, color: color),
        const SizedBox(width: AppSpacing.space2),
        Text(
          title,
          style: AppTypography.titleSmall.copyWith(color: color),
        ),
      ],
    );
  }
}

class _ModuleBadge extends StatelessWidget {
  const _ModuleBadge({required this.module});
  final SyncItemModule module;

  @override
  Widget build(BuildContext context) {
    final label = switch (module) {
      SyncItemModule.attendance => 'Attendance',
      SyncItemModule.faults => 'Faults',
      SyncItemModule.visits => 'Visits',
      SyncItemModule.leads => 'Leads',
      SyncItemModule.documents => 'Docs',
      SyncItemModule.profile => 'Profile',
      SyncItemModule.tracking => 'Tracking',
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.secondaryContainer,
        borderRadius: AppRadius.pillAll,
      ),
      child: Text(
        label,
        style: AppTypography.labelSmall.copyWith(
          color: Theme.of(context).colorScheme.onSecondaryContainer,
          fontSize: 10,
        ),
      ),
    );
  }
}


