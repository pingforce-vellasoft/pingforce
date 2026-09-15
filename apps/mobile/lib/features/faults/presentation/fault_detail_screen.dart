import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../../../core/network/connectivity_provider.dart';
import '../../../../core/theme/theme.dart';
import '../../../../core/widgets/app_states.dart';
import '../../../injection_container.dart';
import '../data/faults_remote_data_source.dart';
import 'fault_notifier.dart';
import 'fault_state.dart';

// ─────────────────────────────────────────────────────────────────────────────
// FAULT DETAIL SCREEN  (AUDIT §7.2)
// ─────────────────────────────────────────────────────────────────────────────
//
// Layout (top → bottom):
//   1. Collapsing SliverAppBar  — fault title + status badge
//   2. SLA Countdown Banner     — traffic-light, live countdown
//   3. Customer / Site Card     — tap-to-call/navigate
//   4. Description Card
//   5. Attempts Section         — expandable cards per attempt
//   6. Activity Timeline        — chronological event log
//   7. Attachments Gallery      — thumbnail grid
//   8. Bottom Action Bar        — context-sensitive (Add Attempt / Resolve / Reassign)

class FaultDetailScreen extends ConsumerStatefulWidget {
  const FaultDetailScreen({super.key, required this.faultId});

  final String faultId;

  @override
  ConsumerState<FaultDetailScreen> createState() => _FaultDetailScreenState();
}

class _FaultDetailScreenState extends ConsumerState<FaultDetailScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  final List<String> _tabs = [
    'Overview',
    'Attempts',
    'Timeline',
    'Attachments',
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _tabs.length, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(faultNotifierProvider.notifier).loadDetail(widget.faultId);
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(faultNotifierProvider);
    final fault = state.selectedFault;

    if (fault == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Fault')),
        body: state.isLoadingDetail
            ? const Center(child: CircularProgressIndicator())
            : Center(
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Text(
                    state.errorMessage ?? 'This fault could not be loaded.',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ),
              ),
      );
    }

    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      body: NestedScrollView(
        headerSliverBuilder: (context, innerBoxIsScrolled) => [
          // ── Collapsing AppBar ──────────────────────────────────────────
          _buildSliverAppBar(context, fault),

          // ── SLA Countdown Banner ───────────────────────────────────────
          SliverToBoxAdapter(child: _SlaCountdownBanner(fault: fault.summary)),

          // ── Tab bar ────────────────────────────────────────────────────
          SliverPersistentHeader(
            pinned: true,
            delegate: _TabBarDelegate(
              TabBar(
                controller: _tabController,
                tabs: _tabs.map((t) => Tab(text: t)).toList(),
              ),
            ),
          ),
        ],
        body: TabBarView(
          controller: _tabController,
          children: [
            _buildOverviewTab(context, fault),
            _buildAttemptsTab(context, fault),
            _buildTimelineTab(context, fault),
            _buildAttachmentsTab(context, fault),
          ],
        ),
      ),
      bottomNavigationBar: _buildActionBar(context, fault),
    );
  }

  // ── Sliver App Bar ─────────────────────────────────────────────────────────

  SliverAppBar _buildSliverAppBar(BuildContext context, FaultDetail fault) {
    final s = fault.summary;
    return SliverAppBar(
      expandedHeight: 120,
      pinned: true,
      flexibleSpace: FlexibleSpaceBar(
        collapseMode: CollapseMode.pin,
        titlePadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        title: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  s.faultNumber,
                  style: AppTypography.labelMedium.copyWith(
                    color: Theme.of(context).colorScheme.primary,
                  ),
                ),
                const SizedBox(width: AppSpacing.space2),
                _StatusChipDetail(status: s.status),
              ],
            ),
            Text(
              s.title,
              style: AppTypography.titleSmall.copyWith(
                color: Theme.of(context).colorScheme.onSurface,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }

  // ── Overview Tab ───────────────────────────────────────────────────────────

  Widget _buildOverviewTab(BuildContext context, FaultDetail fault) {
    final s = fault.summary;
    return ListView(
      padding: AppSpacing.screenPaddingAll,
      children: [
        // ── Priority + Category row ────────────────────────────────────
        Row(
          children: [
            _InfoChip(
              icon: Icons.flag_rounded,
              label: s.priority.label,
              color: _priorityColor(context, s.priority),
            ),
            const SizedBox(width: AppSpacing.space2),
            if (s.categoryName != null)
              _InfoChip(
                icon: Icons.category_rounded,
                label: s.categoryName!,
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
          ],
        ),

        AppSpacing.sectionGapBox,

        // ── Customer / Site Card ───────────────────────────────────────
        _SectionCard(
          title: 'Customer & Site',
          child: Column(
            children: [
              _DetailRow(
                icon: Icons.business_rounded,
                label: 'Customer',
                value: s.customerName,
              ),
              const Divider(height: AppSpacing.space5),
              _DetailRow(
                icon: Icons.location_on_rounded,
                label: 'Site',
                value: s.siteName,
              ),
              if (fault.customerPhone != null) ...[
                const Divider(height: AppSpacing.space5),
                _DetailRow(
                  icon: Icons.phone_rounded,
                  label: 'Contact',
                  value: fault.customerPhone!,
                ),
              ],
            ],
          ),
        ),

        AppSpacing.sectionGapBox,

        // ── Description Card ───────────────────────────────────────────
        _SectionCard(
          title: 'Description',
          child: Text(
            s.description,
            style: AppTypography.bodyMedium.copyWith(
              color: Theme.of(context).colorScheme.onSurface,
            ),
          ),
        ),

        AppSpacing.sectionGapBox,

        // ── Assignee Card ──────────────────────────────────────────────
        _SectionCard(
          title: 'Assignment',
          child: s.assigneeName != null
              ? Row(
                  children: [
                    CircleAvatar(
                      radius: 20,
                      backgroundColor: Theme.of(
                        context,
                      ).colorScheme.primaryContainer,
                      child: Text(
                        s.assigneeName!
                            .split(' ')
                            .map((p) => p[0])
                            .take(2)
                            .join()
                            .toUpperCase(),
                        style: AppTypography.labelMedium.copyWith(
                          color: Theme.of(
                            context,
                          ).colorScheme.onPrimaryContainer,
                        ),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.space3),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(s.assigneeName!, style: AppTypography.titleSmall),
                      ],
                    ),
                  ],
                )
              : Text(
                  'Unassigned',
                  style: AppTypography.bodyMedium.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ),
        ),

        AppSpacing.sectionGapBox,

        // ── Meta info ──────────────────────────────────────────────────
        _SectionCard(
          title: 'Details',
          child: Column(
            children: [
              _DetailRow(
                icon: Icons.calendar_today_rounded,
                label: 'Reported',
                value: _formatDateTime(s.createdAt),
              ),
              if (s.dueAt != null) ...[
                const Divider(height: AppSpacing.space5),
                _DetailRow(
                  icon: Icons.alarm_rounded,
                  label: 'SLA Deadline',
                  value: _formatDateTime(s.dueAt!),
                  valueColor: s.slaStatus == FaultSlaStatus.breached
                      ? PingForceColors.statusCritical
                      : s.slaStatus == FaultSlaStatus.warning
                      ? PingForceColors.statusWarning
                      : null,
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  // ── Attempts Tab ───────────────────────────────────────────────────────────

  Widget _buildAttemptsTab(BuildContext context, FaultDetail fault) {
    if (fault.attempts.isEmpty) {
      return const AppEmptyState(
        type: AppEmptyStateType.noData,
        customTitle: 'No Attempts Yet',
        customSubtitle:
            'Tap "Add Attempt" to record your first service attempt.',
      );
    }

    return ListView.separated(
      padding: AppSpacing.screenPaddingAll,
      itemCount: fault.attempts.length,
      separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.cardMargin),
      itemBuilder: (context, i) {
        final attempt = fault.attempts[i];
        return _AttemptCard(attempt: attempt, attemptNumber: i + 1);
      },
    );
  }

  // ── Timeline Tab ───────────────────────────────────────────────────────────

  Widget _buildTimelineTab(BuildContext context, FaultDetail fault) {
    if (fault.timeline.isEmpty) {
      return const AppEmptyState(
        type: AppEmptyStateType.noData,
        customTitle: 'No Timeline Events',
        customSubtitle: 'Activity on this fault will appear here.',
      );
    }

    return ListView.builder(
      padding: AppSpacing.screenPaddingAll,
      itemCount: fault.timeline.length,
      itemBuilder: (context, i) {
        final event = fault.timeline[i];
        final isLast = i == fault.timeline.length - 1;
        return _TimelineEventTile(event: event, isLast: isLast);
      },
    );
  }

  // ── Attachments Tab ────────────────────────────────────────────────────────

  Widget _buildAttachmentsTab(BuildContext context, FaultDetail fault) {
    if (fault.attachmentUrls.isEmpty) {
      return const AppEmptyState(
        type: AppEmptyStateType.noData,
        customTitle: 'No Attachments',
        customSubtitle:
            'Photos and documents attached to this fault will appear here.',
      );
    }

    return GridView.builder(
      padding: AppSpacing.screenPaddingAll,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        crossAxisSpacing: AppSpacing.space2,
        mainAxisSpacing: AppSpacing.space2,
      ),
      itemCount: fault.attachmentUrls.length,
      itemBuilder: (context, i) {
        return ClipRRect(
          borderRadius: AppRadius.smAll,
          child: Image.network(
            fault.attachmentUrls[i],
            fit: BoxFit.cover,
            errorBuilder: (_, _, _) => Container(
              color: Theme.of(context).colorScheme.surfaceContainerHigh,
              child: const Icon(Icons.broken_image_rounded),
            ),
          ),
        );
      },
    );
  }

  // ── Bottom Action Bar ──────────────────────────────────────────────────────

  Widget _buildActionBar(BuildContext context, FaultDetail fault) {
    final s = fault.summary;
    final isClosed = !s.status.isActive;

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
          AppSpacing.screenHorizontal,
          AppSpacing.space2,
          AppSpacing.screenHorizontal,
          AppSpacing.space4,
        ),
        child: isClosed
            ? const SizedBox.shrink()
            : SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: () => _showStatusChangeSheet(context, fault),
                  icon: const Icon(Icons.swap_horiz_rounded),
                  label: const Text('Change Status'),
                ),
              ),
      ),
    );
  }

  // ── Action sheet helpers ───────────────────────────────────────────────────

  void _showStatusChangeSheet(BuildContext context, FaultDetail fault) {
    final current = fault.summary.status;
    // Mirrors the server state machine (faults/domain/fault-state.ts) so the
    // sheet never offers a move the API will reject with a 409.
    final transitions = switch (current) {
      FaultStatus.open => [FaultStatus.inProgress],
      FaultStatus.assigned => [FaultStatus.inProgress, FaultStatus.onHold],
      FaultStatus.inProgress => [FaultStatus.resolved, FaultStatus.onHold],
      FaultStatus.onHold => [FaultStatus.inProgress],
      FaultStatus.reopened => [FaultStatus.inProgress],
      FaultStatus.resolved => [FaultStatus.closed],
      _ => <FaultStatus>[],
    };

    showModalBottomSheet<void>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: AppSpacing.cardPaddingAll,
              child: Text('Change Status', style: AppTypography.titleMedium),
            ),
            ...transitions.map(
              (s) => ListTile(
                title: Text(s.label),
                onTap: () {
                  Navigator.pop(ctx);
                  unawaited(_applyStatus(fault, s));
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Applies a transition, prompting for the note the lifecycle requires on
  /// hold/resolve/close so the timeline records why the fault moved.
  Future<void> _applyStatus(FaultDetail fault, FaultStatus next) async {
    final needsNote =
        next == FaultStatus.onHold ||
        next == FaultStatus.resolved ||
        next == FaultStatus.closed;

    String? notes;
    if (needsNote) {
      notes = await _promptForNote(next);
      if (notes == null) return; // cancelled
    }

    // Proof-of-work photo on resolution. Offered before the write so a failed
    // upload does not leave the fault resolved with no evidence attached.
    String? photoPath;
    if (next == FaultStatus.resolved) {
      photoPath = await _capturePhoto();
    }

    final ok = await ref
        .read(faultNotifierProvider.notifier)
        .changeStatus(fault.summary.id, next, notes: notes);

    if (ok && photoPath != null) {
      try {
        await sl<FaultsRemoteDataSource>().uploadAttachment(
          fault.summary.id,
          photoPath,
        );
      } catch (_) {
        if (mounted) {
          AppSnackBar.showError(
            context,
            'Status saved, but the photo could not be uploaded.',
          );
        }
      }
    }

    if (!mounted) return;

    if (ok) {
      final queued = !ref.read(isOnlineProvider);
      AppSnackBar.showSuccess(
        context,
        queued
            ? 'Saved offline — will sync when you are back online'
            : 'Status updated to ${next.label}',
      );
    } else {
      AppSnackBar.showError(
        context,
        ref.read(faultNotifierProvider).errorMessage ??
            'Could not update the fault.',
      );
    }
  }

  /// Optional camera capture attached as resolution evidence.
  Future<String?> _capturePhoto() async {
    final wanted = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add a photo?'),
        content: const Text(
          'A photo of the completed work is attached to the fault as evidence.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Skip'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Take photo'),
          ),
        ],
      ),
    );
    if (wanted != true) return null;

    try {
      final picked = await ImagePicker().pickImage(
        source: ImageSource.camera,
        maxWidth: 1600,
        imageQuality: 85,
      );
      return picked?.path;
    } catch (_) {
      return null;
    }
  }

  Future<String?> _promptForNote(FaultStatus next) async {
    final controller = TextEditingController();
    final hint = switch (next) {
      FaultStatus.onHold => 'What is the fault waiting on?',
      FaultStatus.resolved => 'What did you do to fix it?',
      _ => 'Closing summary…',
    };

    final result = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(next.label),
        content: TextField(
          controller: controller,
          autofocus: true,
          maxLines: 4,
          maxLength: 2000,
          decoration: InputDecoration(hintText: hint),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, controller.text.trim()),
            child: const Text('Confirm'),
          ),
        ],
      ),
    );
    controller.dispose();

    // An empty note is treated as a cancel: the transition is meaningless on
    // the timeline without it.
    if (result == null || result.isEmpty) return null;
    return result;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  Color _priorityColor(BuildContext context, FaultPriority p) {
    return switch (p) {
      FaultPriority.critical => PingForceColors.statusCritical,
      FaultPriority.high => PingForceColors.statusWarning,
      FaultPriority.medium => Theme.of(context).colorScheme.primary,
      FaultPriority.low => Theme.of(context).colorScheme.onSurfaceVariant,
    };
  }

  String _formatDateTime(DateTime dt) {
    final date = '${dt.day}/${dt.month}/${dt.year}';
    final h = dt.hour > 12 ? dt.hour - 12 : dt.hour;
    final m = dt.minute.toString().padLeft(2, '0');
    final amPm = dt.hour >= 12 ? 'PM' : 'AM';
    return '$date  $h:$m $amPm';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SLA COUNTDOWN BANNER  — live countdown, traffic-light color
// ─────────────────────────────────────────────────────────────────────────────

class _SlaCountdownBanner extends StatefulWidget {
  const _SlaCountdownBanner({required this.fault});
  final FaultSummary fault;

  @override
  State<_SlaCountdownBanner> createState() => _SlaCountdownBannerState();
}

class _SlaCountdownBannerState extends State<_SlaCountdownBanner> {
  @override
  void initState() {
    super.initState();
    _tick();
  }

  void _tick() {
    Future.delayed(const Duration(seconds: 30), () {
      if (!mounted) return;
      setState(() {}); // recompute slaRemainingLabel
      _tick();
    });
  }

  @override
  Widget build(BuildContext context) {
    final sla = widget.fault.slaStatus;
    if (widget.fault.dueAt == null) return const SizedBox.shrink();
    if (!widget.fault.status.isActive) return const SizedBox.shrink();

    final (bg, fg, icon, label) = switch (sla) {
      FaultSlaStatus.breached => (
        PingForceColors.statusCriticalContainer,
        PingForceColors.statusCritical,
        Icons.alarm_off_rounded,
        'SLA Breached — ${widget.fault.slaRemainingLabel}',
      ),
      FaultSlaStatus.warning => (
        PingForceColors.statusWarningContainer,
        PingForceColors.statusWarning,
        Icons.alarm_rounded,
        'SLA Warning — ${widget.fault.slaRemainingLabel}',
      ),
      FaultSlaStatus.safe => (
        PingForceColors.statusSuccessContainer,
        PingForceColors.statusSuccess,
        Icons.alarm_on_rounded,
        'SLA On Track — ${widget.fault.slaRemainingLabel}',
      ),
    };

    return Semantics(
      liveRegion: true,
      label: label,
      child: Container(
        color: bg,
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.screenHorizontal,
          vertical: AppSpacing.space2,
        ),
        child: Row(
          children: [
            Icon(icon, size: AppIconSize.sm, color: fg),
            AppSpacing.iconGapBox,
            Text(
              label,
              style: AppTypography.labelMedium.copyWith(
                color: fg,
                fontWeight: sla == FaultSlaStatus.breached
                    ? FontWeight.w700
                    : FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ATTEMPT CARD
// ─────────────────────────────────────────────────────────────────────────────

class _AttemptCard extends StatelessWidget {
  const _AttemptCard({required this.attempt, required this.attemptNumber});
  final FaultAttempt attempt;
  final int attemptNumber;

  @override
  Widget build(BuildContext context) {
    final (outcomeColor, outcomeBg, outcomeLabel) = _outcomeStyle(
      context,
      attempt.outcome,
    );

    return Card(
      child: Padding(
        padding: AppSpacing.cardPaddingAll,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  'Attempt #$attemptNumber',
                  style: AppTypography.titleSmall,
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 3,
                  ),
                  decoration: BoxDecoration(
                    color: outcomeBg,
                    borderRadius: AppRadius.pillAll,
                  ),
                  child: Text(
                    outcomeLabel,
                    style: AppTypography.labelSmall.copyWith(
                      color: outcomeColor,
                      fontSize: 10,
                    ),
                  ),
                ),
              ],
            ),
            AppSpacing.space2.toSizedBox,
            Text(
              'By ${attempt.technicianName}',
              style: AppTypography.bodySmall.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
            Text(
              _fmtDt(attempt.startTime) +
                  (attempt.endTime != null
                      ? ' → ${_fmtDt(attempt.endTime!)}'
                      : ' (ongoing)'),
              style: AppTypography.bodySmall.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
            if (attempt.workNotes != null) ...[
              AppSpacing.space3.toSizedBox,
              Text(
                attempt.workNotes!,
                style: AppTypography.bodyMedium.copyWith(
                  color: Theme.of(context).colorScheme.onSurface,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  (Color, Color, String) _outcomeStyle(BuildContext ctx, String outcome) {
    return switch (outcome) {
      'resolved' => (
        PingForceColors.statusSuccess,
        PingForceColors.statusSuccessContainer,
        'Resolved',
      ),
      'partial' => (
        PingForceColors.statusWarning,
        PingForceColors.statusWarningContainer,
        'Partial Fix',
      ),
      'failed' => (
        PingForceColors.statusCritical,
        PingForceColors.statusCriticalContainer,
        'Failed',
      ),
      'requires_revisit' => (
        Theme.of(ctx).colorScheme.primary,
        Theme.of(ctx).colorScheme.primaryContainer,
        'Revisit Required',
      ),
      _ => (
        Theme.of(ctx).colorScheme.onSurfaceVariant,
        Theme.of(ctx).colorScheme.surfaceContainerHigh,
        outcome,
      ),
    };
  }

  String _fmtDt(DateTime dt) {
    final h = dt.hour > 12 ? dt.hour - 12 : dt.hour;
    final m = dt.minute.toString().padLeft(2, '0');
    return '$h:$m ${dt.hour >= 12 ? 'PM' : 'AM'}';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TIMELINE EVENT TILE
// ─────────────────────────────────────────────────────────────────────────────

class _TimelineEventTile extends StatelessWidget {
  const _TimelineEventTile({required this.event, required this.isLast});
  final FaultTimelineEvent event;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Timeline line + dot
          SizedBox(
            width: 40,
            child: Column(
              children: [
                Container(
                  width: 12,
                  height: 12,
                  margin: const EdgeInsets.only(top: 4),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                ),
                if (!isLast)
                  Expanded(
                    child: Container(
                      width: 2,
                      color: Theme.of(context).colorScheme.outlineVariant,
                      margin: const EdgeInsets.symmetric(horizontal: 5),
                    ),
                  ),
              ],
            ),
          ),
          // Content
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(
                bottom: AppSpacing.space5,
                left: AppSpacing.space2,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    event.description,
                    style: AppTypography.bodyMedium.copyWith(
                      color: Theme.of(context).colorScheme.onSurface,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${event.actorName ?? ''} · ${_relativeTime(event.timestamp)}',
                    style: AppTypography.labelSmall.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _relativeTime(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${dt.day}/${dt.month}/${dt.year}';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SMALL REUSABLE WIDGETS
// ─────────────────────────────────────────────────────────────────────────────

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.title, required this.child});
  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: AppSpacing.cardPaddingAll,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [Text(title, style: AppTypography.titleSmall)]),
            const SizedBox(height: AppSpacing.space3),
            child,
          ],
        ),
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({
    required this.icon,
    required this.label,
    required this.value,
    this.valueColor,
  });
  final IconData icon;
  final String label;
  final String value;
  final Color? valueColor;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(
          icon,
          size: AppIconSize.sm,
          color: Theme.of(context).colorScheme.onSurfaceVariant,
        ),
        const SizedBox(width: AppSpacing.space3),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: AppTypography.labelSmall.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
              Text(
                value,
                style: AppTypography.bodyMedium.copyWith(
                  color: valueColor ?? Theme.of(context).colorScheme.onSurface,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _InfoChip extends StatelessWidget {
  const _InfoChip({
    required this.icon,
    required this.label,
    required this.color,
  });
  final IconData icon;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: AppRadius.pillAll,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: AppIconSize.xs, color: color),
          const SizedBox(width: 4),
          Text(label, style: AppTypography.labelMedium.copyWith(color: color)),
        ],
      ),
    );
  }
}

class _StatusChipDetail extends StatelessWidget {
  const _StatusChipDetail({required this.status});
  final FaultStatus status;

  @override
  Widget build(BuildContext context) {
    final (color, bg) = switch (status) {
      FaultStatus.open => (
        Theme.of(context).colorScheme.primary,
        Theme.of(context).colorScheme.primaryContainer,
      ),
      FaultStatus.inProgress => (
        PingForceColors.statusWarning,
        PingForceColors.statusWarningContainer,
      ),
      FaultStatus.resolved || FaultStatus.closed => (
        PingForceColors.statusSuccess,
        PingForceColors.statusSuccessContainer,
      ),
      _ => (
        Theme.of(context).colorScheme.onSurfaceVariant,
        Theme.of(context).colorScheme.surfaceContainerHigh,
      ),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: bg, borderRadius: AppRadius.xsAll),
      child: Text(
        status.label,
        style: AppTypography.labelSmall.copyWith(color: color, fontSize: 10),
      ),
    );
  }
}

// Tab bar delegate for persistent header
class _TabBarDelegate extends SliverPersistentHeaderDelegate {
  _TabBarDelegate(this.tabBar);
  final TabBar tabBar;

  @override
  double get minExtent => tabBar.preferredSize.height;
  @override
  double get maxExtent => tabBar.preferredSize.height;

  @override
  Widget build(
    BuildContext context,
    double shrinkOffset,
    bool overlapsContent,
  ) {
    return Material(
      color: Theme.of(context).colorScheme.surface,
      child: tabBar,
    );
  }

  @override
  bool shouldRebuild(covariant _TabBarDelegate oldDelegate) =>
      tabBar != oldDelegate.tabBar;
}

extension _DoubleX on double {
  SizedBox get toSizedBox => SizedBox(height: this);
}
