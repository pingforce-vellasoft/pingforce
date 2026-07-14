import 'package:flutter/material.dart';

import '../../../../../core/theme/theme.dart';
import '../fault_state.dart';

// ─────────────────────────────────────────────────────────────────────────────
// FAULT LIST CARD  (AUDIT §7.1 — list card design with SLA countdown)
// ─────────────────────────────────────────────────────────────────────────────

class FaultListCard extends StatefulWidget {
  const FaultListCard({
    super.key,
    required this.fault,
    required this.onTap,
  });

  final FaultSummary fault;
  final VoidCallback onTap;

  @override
  State<FaultListCard> createState() => _FaultListCardState();
}

class _FaultListCardState extends State<FaultListCard>
    with SingleTickerProviderStateMixin {
  // Pulse animation for breached SLA
  late final AnimationController _pulseCtrl;
  late final Animation<double> _pulseAnim;

  bool _pressed = false;

  @override
  void initState() {
    super.initState();
    _pulseCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );
    _pulseAnim = Tween<double>(begin: 1.0, end: 0.5).animate(
      CurvedAnimation(parent: _pulseCtrl, curve: AppEasing.standard),
    );
    if (widget.fault.slaStatus == FaultSlaStatus.breached) {
      _pulseCtrl.repeat(reverse: true);
    }
  }

  @override
  void dispose() {
    _pulseCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final fault = widget.fault;
    final sla = fault.slaStatus;
    final (borderColor, slaColor, slaBg) = _slaColors(context, sla);

    return Semantics(
      label: 'Fault ${fault.faultNumber}: ${fault.title}. '
          'Status: ${fault.status.label}. Priority: ${fault.priority.label}. '
          '${fault.slaRemainingLabel}',
      button: true,
      child: GestureDetector(
        onTapDown: (_) => setState(() => _pressed = true),
        onTapUp: (_) {
          setState(() => _pressed = false);
          widget.onTap();
        },
        onTapCancel: () => setState(() => _pressed = false),
        child: AnimatedScale(
          scale: _pressed ? 0.98 : 1.0,
          duration: const Duration(milliseconds: 100),
          child: Container(
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surfaceContainerLowest,
              borderRadius: AppRadius.lgAll,
              border: Border(
                left: BorderSide(color: borderColor, width: 4),
              ),
              boxShadow: AppElevation.shadowForLevel(1),
            ),
            child: Padding(
              padding: AppSpacing.cardPaddingAll,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ── Row 1: Fault number + Status + Priority ──────────
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Fault number
                      Text(
                        fault.faultNumber,
                        style: AppTypography.labelMedium.copyWith(
                          color: Theme.of(context).colorScheme.primary,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const Spacer(),

                      // Priority badge
                      _PriorityBadge(priority: fault.priority),
                      const SizedBox(width: AppSpacing.space2),

                      // Status chip
                      _StatusChip(status: fault.status),
                    ],
                  ),

                  const SizedBox(height: AppSpacing.space2),

                  // ── Title ──────────────────────────────────────────
                  Text(
                    fault.title,
                    style: AppTypography.titleSmall.copyWith(
                      color: Theme.of(context).colorScheme.onSurface,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),

                  const SizedBox(height: AppSpacing.space2),

                  // ── Customer + site ─────────────────────────────────
                  Row(
                    children: [
                      Icon(
                        Icons.business_rounded,
                        size: AppIconSize.xs,
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          '${fault.customerName}  ·  ${fault.siteName}',
                          style: AppTypography.bodySmall.copyWith(
                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: AppSpacing.space3),

                  // ── Footer: SLA + assignee + attachments ─────────────
                  Row(
                    children: [
                      // SLA countdown (traffic-light)
                      if (fault.dueAt != null)
                        AnimatedBuilder(
                          animation: _pulseAnim,
                          builder: (_, child) => Opacity(
                            opacity: sla == FaultSlaStatus.breached
                                ? _pulseAnim.value
                                : 1.0,
                            child: child,
                          ),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 3,
                            ),
                            decoration: BoxDecoration(
                              color: slaBg,
                              borderRadius: AppRadius.pillAll,
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  sla == FaultSlaStatus.breached
                                      ? Icons.alarm_off_rounded
                                      : Icons.alarm_rounded,
                                  size: 12,
                                  color: slaColor,
                                ),
                                const SizedBox(width: 3),
                                Text(
                                  fault.slaRemainingLabel,
                                  style: AppTypography.labelSmall.copyWith(
                                    color: slaColor,
                                    fontWeight: sla == FaultSlaStatus.breached
                                        ? FontWeight.w700
                                        : FontWeight.w500,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),

                      const Spacer(),

                      // Pending sync badge
                      if (fault.isOffline) ...[
                        const PendingSyncBadge(),
                        const SizedBox(width: AppSpacing.space2),
                      ],

                      // Attachment icon
                      if (fault.hasAttachments)
                        Icon(
                          Icons.attachment_rounded,
                          size: AppIconSize.xs,
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),

                      if (fault.commentsCount > 0) ...[
                        const SizedBox(width: AppSpacing.space2),
                        Icon(
                          Icons.chat_bubble_outline_rounded,
                          size: AppIconSize.xs,
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                        const SizedBox(width: 2),
                        Text(
                          '${fault.commentsCount}',
                          style: AppTypography.labelSmall.copyWith(
                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],

                      // Assignee avatar
                      if (fault.assigneeName != null) ...[
                        const SizedBox(width: AppSpacing.space3),
                        CircleAvatar(
                          radius: 12,
                          backgroundColor:
                              Theme.of(context).colorScheme.primaryContainer,
                          child: Text(
                            fault.assigneeName!
                                .split(' ')
                                .map((p) => p[0])
                                .take(2)
                                .join()
                                .toUpperCase(),
                            style: const TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  // ── Color helpers ──────────────────────────────────────────────────────────

  (Color, Color, Color) _slaColors(BuildContext context, FaultSlaStatus sla) {
    return switch (sla) {
      FaultSlaStatus.breached => (
          PingForceColors.statusCritical,
          PingForceColors.statusCritical,
          PingForceColors.statusCriticalContainer,
        ),
      FaultSlaStatus.warning => (
          PingForceColors.statusWarning,
          PingForceColors.statusWarning,
          PingForceColors.statusWarningContainer,
        ),
      FaultSlaStatus.safe => (
          Theme.of(context).colorScheme.primary,
          PingForceColors.statusSuccess,
          PingForceColors.statusSuccessContainer,
        ),
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIORITY BADGE
// ─────────────────────────────────────────────────────────────────────────────

class _PriorityBadge extends StatelessWidget {
  const _PriorityBadge({required this.priority});
  final FaultPriority priority;

  @override
  Widget build(BuildContext context) {
    final (color, bg, icon) = switch (priority) {
      FaultPriority.critical => (
          PingForceColors.statusCritical,
          PingForceColors.statusCriticalContainer,
          Icons.keyboard_double_arrow_up_rounded,
        ),
      FaultPriority.high => (
          PingForceColors.statusWarning,
          PingForceColors.statusWarningContainer,
          Icons.keyboard_arrow_up_rounded,
        ),
      FaultPriority.medium => (
          Theme.of(context).colorScheme.primary,
          Theme.of(context).colorScheme.primaryContainer,
          Icons.remove_rounded,
        ),
      FaultPriority.low => (
          Theme.of(context).colorScheme.onSurfaceVariant,
          Theme.of(context).colorScheme.surfaceContainerHigh,
          Icons.keyboard_arrow_down_rounded,
        ),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(color: bg, borderRadius: AppRadius.xsAll),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 11, color: color),
          const SizedBox(width: 2),
          Text(
            priority.label,
            style: AppTypography.labelSmall.copyWith(
              color: color,
              fontSize: 10,
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS CHIP
// ─────────────────────────────────────────────────────────────────────────────

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status});
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
      FaultStatus.onHold => (
          Theme.of(context).colorScheme.onSurfaceVariant,
          Theme.of(context).colorScheme.surfaceContainerHigh,
        ),
      FaultStatus.resolved || FaultStatus.closed => (
          PingForceColors.statusSuccess,
          PingForceColors.statusSuccessContainer,
        ),
      FaultStatus.cancelled => (
          Theme.of(context).colorScheme.onSurfaceVariant,
          Theme.of(context).colorScheme.surfaceContainerHigh,
        ),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(color: bg, borderRadius: AppRadius.xsAll),
      child: Text(
        status.label,
        style: AppTypography.labelSmall.copyWith(color: color, fontSize: 10),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FAULT FILTER SHEET  (AUDIT §7.1)
// ─────────────────────────────────────────────────────────────────────────────

class FaultFilterSheet extends StatefulWidget {
  const FaultFilterSheet({
    super.key,
    required this.currentFilters,
    required this.onApply,
    required this.onReset,
  });

  final FaultFilters currentFilters;
  final void Function(FaultFilters) onApply;
  final VoidCallback onReset;

  @override
  State<FaultFilterSheet> createState() => _FaultFilterSheetState();
}

class _FaultFilterSheetState extends State<FaultFilterSheet> {
  late List<FaultStatus> _statuses;
  late List<FaultPriority> _priorities;

  @override
  void initState() {
    super.initState();
    _statuses = List.from(widget.currentFilters.statuses);
    _priorities = List.from(widget.currentFilters.priorities);
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.6,
      maxChildSize: 0.9,
      minChildSize: 0.4,
      expand: false,
      builder: (ctx, scrollCtrl) {
        return Column(
          children: [
            // ── Handle ─────────────────────────────────────────────────
            const SizedBox(height: AppSpacing.space2),
            Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.outlineVariant,
                borderRadius: AppRadius.pillAll,
              ),
            ),
            const SizedBox(height: AppSpacing.space3),

            // ── Header ─────────────────────────────────────────────────
            Padding(
              padding: AppSpacing.screenPaddingH,
              child: Row(
                children: [
                  Text('Filter Faults', style: AppTypography.titleMedium),
                  const Spacer(),
                  TextButton(
                    onPressed: widget.onReset,
                    child: const Text('Reset All'),
                  ),
                ],
              ),
            ),

            const Divider(height: 1),

            // ── Scrollable content ──────────────────────────────────────
            Expanded(
              child: ListView(
                controller: scrollCtrl,
                padding: AppSpacing.screenPaddingAll,
                children: [
                  // Status
                  Text('Status', style: AppTypography.titleSmall),
                  const SizedBox(height: AppSpacing.space3),
                  Wrap(
                    spacing: AppSpacing.space2,
                    runSpacing: AppSpacing.space2,
                    children: FaultStatus.values.map((s) {
                      final selected = _statuses.contains(s);
                      return FilterChip(
                        label: Text(s.label),
                        selected: selected,
                        onSelected: (v) => setState(() {
                          if (v) {
                            _statuses.add(s);
                          } else {
                            _statuses.remove(s);
                          }
                        }),
                      );
                    }).toList(),
                  ),

                  const SizedBox(height: AppSpacing.space5),

                  // Priority
                  Text('Priority', style: AppTypography.titleSmall),
                  const SizedBox(height: AppSpacing.space3),
                  Wrap(
                    spacing: AppSpacing.space2,
                    runSpacing: AppSpacing.space2,
                    children: FaultPriority.values.map((p) {
                      final selected = _priorities.contains(p);
                      return FilterChip(
                        label: Text(p.label),
                        selected: selected,
                        avatar: Icon(
                          Icons.flag_rounded,
                          size: AppIconSize.xs,
                          color: selected
                              ? Theme.of(context).colorScheme.onSecondaryContainer
                              : Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                        onSelected: (v) => setState(() {
                          if (v) {
                            _priorities.add(p);
                          } else {
                            _priorities.remove(p);
                          }
                        }),
                      );
                    }).toList(),
                  ),
                ],
              ),
            ),

            // ── Apply button ────────────────────────────────────────────
            SafeArea(
              child: Padding(
                padding: AppSpacing.screenPaddingAll,
                child: SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: FilledButton(
                    onPressed: () => widget.onApply(
                      FaultFilters(
                        statuses: _statuses,
                        priorities: _priorities,
                      ),
                    ),
                    child: const Text('Apply Filters'),
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// FAULT NOTIFIER STUB
// ─────────────────────────────────────────────────────────────────────────────

import 'package:flutter_riverpod/flutter_riverpod.dart';

final faultNotifierProvider =
    NotifierProvider<FaultNotifier, FaultState>(FaultNotifier.new);

class FaultNotifier extends Notifier<FaultState> {
  @override
  FaultState build() => const FaultState(isLoading: true);

  Future<void> load() async {
    state = state.copyWith(isLoading: true);
    await Future<void>.delayed(const Duration(milliseconds: 600));
    state = state.copyWith(
      isLoading: false,
      allFaults: _stubFaults(),
    );
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

  void goToCreate(BuildContext context) {
    // TODO: context.push('/faults/new');
  }

  void goToDetail(BuildContext context, String faultId) {
    // TODO: context.push('/faults/$faultId');
  }

  // Stub data
  List<FaultSummary> _stubFaults() {
    final now = DateTime.now();
    return [
      FaultSummary(
        id: '1',
        faultNumber: 'F-1032',
        title: 'AC Unit Failure — Building 4, Floor 3',
        description: 'Central AC unit not cooling below 25°C',
        status: FaultStatus.inProgress,
        priority: FaultPriority.critical,
        customerName: 'ACME Corp',
        siteName: 'Headquarters',
        createdAt: now.subtract(const Duration(hours: 6)),
        dueAt: now.subtract(const Duration(hours: 1)), // breached!
        assigneeName: 'Ahmed Ali',
        attemptsCount: 2,
        hasAttachments: true,
        commentsCount: 3,
      ),
      FaultSummary(
        id: '2',
        faultNumber: 'F-1031',
        title: 'Water Leak — Basement Pump Room',
        description: 'Minor water leak from main supply pipe',
        status: FaultStatus.open,
        priority: FaultPriority.high,
        customerName: 'Star Mall',
        siteName: 'Basement Level',
        createdAt: now.subtract(const Duration(hours: 3)),
        dueAt: now.add(const Duration(hours: 2)), // warning
        commentsCount: 1,
      ),
      FaultSummary(
        id: '3',
        faultNumber: 'F-1029',
        title: 'Elevator Control Panel Fault',
        description: 'Elevator 3 not responding to floor 5 call',
        status: FaultStatus.open,
        priority: FaultPriority.medium,
        customerName: 'City Tower',
        siteName: 'Tower B',
        createdAt: now.subtract(const Duration(hours: 1)),
        dueAt: now.add(const Duration(hours: 8)), // safe
        isOffline: true,
      ),
    ];
  }
}
