import 'package:flutter/material.dart';

import '../../../../../core/theme/theme.dart';
import '../check_in_state.dart';

// ─────────────────────────────────────────────────────────────────────────────
// SHIFT CARD  (CHECKIN_FLOW_SPEC.md §5.1)
// ─────────────────────────────────────────────────────────────────────────────

class ShiftCard extends StatefulWidget {
  const ShiftCard({super.key, this.shift});

  final ShiftInfo? shift;

  @override
  State<ShiftCard> createState() => _ShiftCardState();
}

class _ShiftCardState extends State<ShiftCard>
    with SingleTickerProviderStateMixin {
  // Pulse animation for grace period status chip
  late final AnimationController _gracePulseController;
  late final Animation<double> _gracePulseAnimation;

  @override
  void initState() {
    super.initState();
    _gracePulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _gracePulseAnimation = Tween<double>(begin: 1.0, end: 0.5).animate(
      CurvedAnimation(parent: _gracePulseController, curve: AppEasing.standard),
    );
  }

  @override
  void didUpdateWidget(covariant ShiftCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    _updatePulse();
  }

  void _updatePulse() {
    final shift = widget.shift;
    if (shift?.isInGracePeriod == true) {
      _gracePulseController.repeat(reverse: true);
    } else {
      _gracePulseController.stop();
      _gracePulseController.reset();
    }
  }

  @override
  void dispose() {
    _gracePulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.shift == null) {
      return _buildSkeleton(context);
    }

    return _buildLoaded(context, widget.shift!);
  }

  // ── Skeleton (initializing) ────────────────────────────────────────────────

  Widget _buildSkeleton(BuildContext context) {
    return Container(
      height: 100,
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHigh,
        borderRadius: AppRadius.lgAll,
      ),
    );
  }

  // ── Loaded card ────────────────────────────────────────────────────────────

  Widget _buildLoaded(BuildContext context, ShiftInfo shift) {
    return Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // ── Left accent + header row ─────────────────────────────────────
          IntrinsicHeight(
            child: Row(
              children: [
                // Left accent bar
                Container(
                  width: 4,
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.primary,
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(AppRadius.lg),
                      bottomLeft: Radius.circular(AppRadius.lg),
                    ),
                  ),
                ),

                // Content
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.all(AppSpacing.cardPadding),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Icon(
                              Icons.work_outline_rounded,
                              size: AppIconSize.md,
                              color: Theme.of(context).colorScheme.primary,
                            ),
                            AppSpacing.iconGapBox,
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    shift.shiftName,
                                    style: AppTypography.titleMedium.copyWith(
                                      color: Theme.of(context)
                                          .colorScheme
                                          .onSurface,
                                    ),
                                  ),
                                  Text(
                                    '${shift.startTime} – ${shift.endTime}',
                                    style: AppTypography.bodyMedium.copyWith(
                                      color: Theme.of(context)
                                          .colorScheme
                                          .onSurfaceVariant,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            AppSpacing.iconGapBox,
                            _buildStatusChip(context, shift),
                          ],
                        ),

                        const Divider(height: AppSpacing.space6),

                        // ── Shift meta row ─────────────────────────────────
                        Row(
                          children: [
                            _MetaItem(
                              icon: Icons.timer_outlined,
                              label:
                                  'Grace ${shift.gracePeriodMinutes}m',
                            ),
                            const SizedBox(width: AppSpacing.space4),
                            _MetaItem(
                              icon: Icons.coffee_outlined,
                              label:
                                  '${shift.totalBreaksAllowed} Breaks',
                            ),
                            const SizedBox(width: AppSpacing.space4),
                            _MetaItem(
                              icon: Icons.schedule_outlined,
                              label:
                                  '${shift.requiredHours.toStringAsFixed(1)}h Required',
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Status chip ────────────────────────────────────────────────────────────

  Widget _buildStatusChip(BuildContext context, ShiftInfo shift) {
    late String label;
    late Color color;
    late Color bgColor;

    if (shift.isInGracePeriod) {
      label = 'Grace Period';
      color = PingForceColors.statusWarning;
      bgColor = PingForceColors.statusWarningContainer;
    } else if (shift.isLate) {
      label = 'Late ${shift.minutesLate}m';
      color = PingForceColors.statusCritical;
      bgColor = PingForceColors.statusCriticalContainer;
    } else if (shift.isCurrentlyActive) {
      label = 'On Time';
      color = PingForceColors.statusSuccess;
      bgColor = PingForceColors.statusSuccessContainer;
    } else {
      label = 'Not In Window';
      color = Theme.of(context).colorScheme.onSurfaceVariant;
      bgColor = Theme.of(context).colorScheme.surfaceContainerHigh;
    }

    Widget chip = Container(
      padding: AppSpacing.chipPaddingAll,
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: AppRadius.xsAll,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: color,
            ),
          ),
          AppSpacing.iconGapBox,
          Text(
            label,
            style: AppTypography.labelMedium.copyWith(color: color),
          ),
        ],
      ),
    );

    // Apply pulse for grace period
    if (shift.isInGracePeriod) {
      chip = AnimatedBuilder(
        animation: _gracePulseAnimation,
        builder: (_, child) =>
            Opacity(opacity: _gracePulseAnimation.value, child: child),
        child: chip,
      );
    }

    return Semantics(label: 'Shift status: $label', child: chip);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// META ITEM — small icon + label in shift card footer
// ─────────────────────────────────────────────────────────────────────────────

class _MetaItem extends StatelessWidget {
  const _MetaItem({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          icon,
          size: AppIconSize.xs,
          color: Theme.of(context).colorScheme.onSurfaceVariant,
        ),
        const SizedBox(width: 4),
        Text(
          label,
          style: AppTypography.labelSmall.copyWith(
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }
}
