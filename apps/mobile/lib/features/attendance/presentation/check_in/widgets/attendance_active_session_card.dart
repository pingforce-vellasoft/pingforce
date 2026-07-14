import 'dart:async';

import 'package:flutter/material.dart';

import '../../../../../core/theme/theme.dart';
import '../check_in_state.dart';

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVE SESSION CARD  (CHECKIN_FLOW_SPEC.md §6, Screen S6)
// ─────────────────────────────────────────────────────────────────────────────
//
// Shown instead of the Shift Card when the employee is already checked in.
// Displays a live working timer, break status, and check-out / break actions.

class AttendanceActiveSessionCard extends StatefulWidget {
  const AttendanceActiveSessionCard({
    super.key,
    required this.session,
    required this.onBreak,
    required this.onCheckOut,
  });

  final ActiveSession session;
  final VoidCallback onBreak;
  final VoidCallback onCheckOut;

  @override
  State<AttendanceActiveSessionCard> createState() =>
      _AttendanceActiveSessionCardState();
}

class _AttendanceActiveSessionCardState
    extends State<AttendanceActiveSessionCard> {
  late Timer _timer;
  late Duration _elapsed;

  @override
  void initState() {
    super.initState();
    _elapsed = DateTime.now().difference(widget.session.checkInTime);

    // Update timer every second
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) {
        setState(() {
          _elapsed = DateTime.now().difference(widget.session.checkInTime);
        });
      }
    });
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  // ── Build ──────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // ── Check-in time + Working label ──────────────────────────────
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.cardPadding,
              vertical: AppSpacing.space3,
            ),
            decoration: BoxDecoration(
              color: PingForceColors.statusSuccessContainer,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(AppRadius.lg),
                topRight: Radius.circular(AppRadius.lg),
              ),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.check_circle_rounded,
                  size: AppIconSize.sm,
                  color: PingForceColors.statusSuccess,
                ),
                AppSpacing.iconGapBox,
                Text(
                  'Checked In · ${_formatTime(widget.session.checkInTime)}',
                  style: AppTypography.labelMedium.copyWith(
                    color: PingForceColors.statusSuccess,
                  ),
                ),
                const Spacer(),
                if (widget.session.isOnBreak)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.space2,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: PingForceColors.statusWarning.withValues(alpha: 0.15),
                      borderRadius: AppRadius.pillAll,
                    ),
                    child: Text(
                      '● On Break',
                      style: AppTypography.labelSmall.copyWith(
                        color: PingForceColors.statusWarning,
                      ),
                    ),
                  ),
              ],
            ),
          ),

          // ── Working timer (hero numeric) ───────────────────────────────
          Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.cardPadding,
              vertical: AppSpacing.space4,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Working',
                  style: AppTypography.labelSmall.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 4),
                Semantics(
                  label: 'Working time: ${_elapsedLabel(_elapsed)}',
                  liveRegion: true,
                  child: Text(
                    _elapsedLabel(_elapsed),
                    style: AppTypography.numericLarge.copyWith(
                      color: Theme.of(context).colorScheme.onSurface,
                    ),
                  ),
                ),

                AppSpacing.smallGapBox,

                // ── Break count ────────────────────────────────────────
                Row(
                  children: [
                    Icon(
                      Icons.coffee_rounded,
                      size: AppIconSize.xs,
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                    AppSpacing.iconGapBox,
                    Text(
                      '${widget.session.breaksTaken ?? 0} break(s) taken',
                      style: AppTypography.bodySmall.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          const Divider(height: 1),

          // ── Action buttons ─────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.all(AppSpacing.cardPadding),
            child: Row(
              children: [
                // Break button
                Expanded(
                  child: FilledButton.tonal(
                    onPressed: widget.session.isOnBreak ? null : widget.onBreak,
                    child: Text(
                      widget.session.isOnBreak ? 'On Break' : 'Start Break',
                    ),
                  ),
                ),
                const SizedBox(width: AppSpacing.space3),
                // Check-out button
                Expanded(
                  flex: 2,
                  child: FilledButton(
                    onPressed: widget.onCheckOut,
                    child: const Text('Check Out'),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  String _elapsedLabel(Duration d) {
    final h = d.inHours;
    final m = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final s = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    return h > 0 ? '$h:$m:$s' : '$m:$s';
  }

  String _formatTime(DateTime dt) {
    final hour = dt.hour > 12 ? dt.hour - 12 : (dt.hour == 0 ? 12 : dt.hour);
    final min = dt.minute.toString().padLeft(2, '0');
    final amPm = dt.hour >= 12 ? 'PM' : 'AM';
    return '$hour:$min $amPm';
  }
}
