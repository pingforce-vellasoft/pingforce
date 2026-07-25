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
    this.isCheckingOut = false,
    this.checkOutError,
    this.isBreakUpdating = false,
    this.breakError,
  });

  final ActiveSession session;
  final VoidCallback onBreak;
  final VoidCallback onCheckOut;

  /// Check-out punch in progress (GPS + biometric + API).
  final bool isCheckingOut;

  /// Message shown when check-out is refused (e.g. outside the check-in zone).
  final String? checkOutError;

  /// Break start/end API call in flight.
  final bool isBreakUpdating;

  /// Message shown when a break start/end is refused.
  final String? breakError;

  @override
  State<AttendanceActiveSessionCard> createState() =>
      _AttendanceActiveSessionCardState();
}

class _AttendanceActiveSessionCardState
    extends State<AttendanceActiveSessionCard> {
  late Timer _timer;
  late Duration _elapsed;

  /// Wall-clock time since check-in, minus the break currently in progress.
  ///
  /// Unpaid break minutes are deducted from worked time server-side at
  /// check-out, so a timer that keeps counting through a break shows the
  /// employee a "Working" figure their payslip will not agree with. Only the
  /// live break is subtracted here — minutes from completed breaks are already
  /// reflected once the server credits them.
  Duration _computeElapsed() {
    final now = DateTime.now();
    var elapsed = now.difference(widget.session.checkInTime);

    final breakStart = widget.session.lastBreakStart;
    if (widget.session.isOnBreak && breakStart != null) {
      elapsed -= now.difference(breakStart);
    }

    return elapsed.isNegative ? Duration.zero : elapsed;
  }

  @override
  void initState() {
    super.initState();
    _elapsed = _computeElapsed();

    // Update timer every second
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) {
        setState(() {
          _elapsed = _computeElapsed();
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
                      widget.session.lastBreakStart != null
                          ? '● On Break · ${_elapsedLabel(DateTime.now().difference(widget.session.lastBreakStart!))}'
                          : '● On Break',
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
                  widget.session.isOnBreak ? 'Working · paused' : 'Working',
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
                    // Scoped to THIS session. The day summary card's "Breaks"
                    // metric counts every break across all of today's
                    // sessions — two different numbers, so each says which.
                    Text(
                      '${widget.session.breaksTaken ?? 0} break(s) this session',
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

          // ── Break error ────────────────────────────────────────────────
          if (widget.breakError != null)
            Container(
              margin: const EdgeInsets.fromLTRB(
                AppSpacing.cardPadding,
                AppSpacing.space3,
                AppSpacing.cardPadding,
                0,
              ),
              padding: const EdgeInsets.all(AppSpacing.space3),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.errorContainer,
                borderRadius: AppRadius.mdAll,
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    Icons.error_outline_rounded,
                    size: AppIconSize.sm,
                    color: Theme.of(context).colorScheme.onErrorContainer,
                  ),
                  AppSpacing.iconGapBox,
                  Expanded(
                    child: Text(
                      widget.breakError!,
                      style: AppTypography.bodySmall.copyWith(
                        color: Theme.of(context).colorScheme.onErrorContainer,
                      ),
                    ),
                  ),
                ],
              ),
            ),

          // ── Check-out location error ───────────────────────────────────
          if (widget.checkOutError != null)
            Container(
              margin: const EdgeInsets.fromLTRB(
                AppSpacing.cardPadding,
                AppSpacing.space3,
                AppSpacing.cardPadding,
                0,
              ),
              padding: const EdgeInsets.all(AppSpacing.space3),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.errorContainer,
                borderRadius: AppRadius.mdAll,
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    Icons.location_off_rounded,
                    size: AppIconSize.sm,
                    color: Theme.of(context).colorScheme.onErrorContainer,
                  ),
                  AppSpacing.iconGapBox,
                  Expanded(
                    child: Text(
                      widget.checkOutError!,
                      style: AppTypography.bodySmall.copyWith(
                        color: Theme.of(context).colorScheme.onErrorContainer,
                      ),
                    ),
                  ),
                ],
              ),
            ),

          // ── Action buttons ─────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.all(AppSpacing.cardPadding),
            child: Row(
              children: [
                // Break toggle. On break this becomes "End Break" — the only
                // way back to WORKING. It previously rendered as a disabled
                // "On Break" label, which stranded the employee on break and
                // duplicated the status pill already shown in the header.
                Expanded(
                  child: widget.session.isOnBreak
                      ? FilledButton.tonalIcon(
                          onPressed:
                              (widget.isBreakUpdating || widget.isCheckingOut)
                                  ? null
                                  : widget.onBreak,
                          icon: widget.isBreakUpdating
                              ? const SizedBox(
                                  width: 16,
                                  height: 16,
                                  child:
                                      CircularProgressIndicator(strokeWidth: 2),
                                )
                              : const Icon(Icons.play_arrow_rounded,
                                  size: AppIconSize.sm),
                          label: const Text('End Break'),
                          style: FilledButton.styleFrom(
                            backgroundColor: PingForceColors.statusWarning
                                .withValues(alpha: 0.16),
                            foregroundColor: PingForceColors.statusWarning,
                          ),
                        )
                      : FilledButton.tonalIcon(
                          onPressed:
                              (widget.isBreakUpdating || widget.isCheckingOut)
                                  ? null
                                  : widget.onBreak,
                          icon: widget.isBreakUpdating
                              ? const SizedBox(
                                  width: 16,
                                  height: 16,
                                  child:
                                      CircularProgressIndicator(strokeWidth: 2),
                                )
                              : const Icon(Icons.coffee_rounded,
                                  size: AppIconSize.sm),
                          label: const Text('Start Break'),
                        ),
                ),
                const SizedBox(width: AppSpacing.space3),
                // Check-out button
                Expanded(
                  flex: 2,
                  child: FilledButton(
                    onPressed: widget.isCheckingOut ? null : widget.onCheckOut,
                    child: widget.isCheckingOut
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('Check Out'),
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
