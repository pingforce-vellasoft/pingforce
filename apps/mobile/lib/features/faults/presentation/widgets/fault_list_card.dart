import 'package:flutter/material.dart';

import '../../../../core/theme/theme.dart';
import '../../../../core/widgets/app_states.dart';
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

