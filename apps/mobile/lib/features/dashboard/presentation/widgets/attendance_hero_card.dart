import 'dart:async';

import 'package:flutter/material.dart';

import '../../../../core/theme/theme.dart';
import '../dashboard_state.dart';

// ─────────────────────────────────────────────────────────────────────────────
// ATTENDANCE HERO CARD  (DASHBOARD_SPEC.md §4.2)
// ─────────────────────────────────────────────────────────────────────────────

class AttendanceHeroCard extends StatefulWidget {
  const AttendanceHeroCard({
    super.key,
    required this.data,
    required this.isLoading,
    required this.onCheckIn,
    required this.onCheckOut,
    required this.onBreak,
    required this.onResume,
    required this.onViewDetails,
    this.onRequestCorrection,
    this.isActionInFlight = false,
    this.actionError,
  });

  final AttendanceHeroData? data;
  final bool isLoading;

  /// An inline break start/end is in flight — disables the action buttons and
  /// swaps their icon for a spinner.
  final bool isActionInFlight;

  /// Message shown when an inline attendance action is refused.
  final String? actionError;
  final VoidCallback onCheckIn;
  final VoidCallback onCheckOut;
  final VoidCallback onBreak;
  final VoidCallback onResume;
  final VoidCallback onViewDetails;
  final VoidCallback? onRequestCorrection;

  @override
  State<AttendanceHeroCard> createState() => _AttendanceHeroCardState();
}

class _AttendanceHeroCardState extends State<AttendanceHeroCard>
    with SingleTickerProviderStateMixin {
  // Shift progress bar animation
  late final AnimationController _progressController;
  late final Animation<double> _progressAnimation;

  @override
  void initState() {
    super.initState();
    _progressController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _progressAnimation = CurvedAnimation(
      parent: _progressController,
      curve: AppEasing.standard,
    );
    _progressController.forward();
  }

  @override
  void dispose() {
    _progressController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.isLoading) return _buildSkeleton(context);
    final data = widget.data;
    if (data == null) return const SizedBox.shrink();
    return _buildCard(context, data);
  }

  // ── Skeleton ───────────────────────────────────────────────────────────────

  Widget _buildSkeleton(BuildContext context) {
    return Container(
      height: 160,
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHigh,
        borderRadius: AppRadius.lgAll,
      ),
    );
  }

  // ── Loaded card ────────────────────────────────────────────────────────────

  Widget _buildCard(BuildContext context, AttendanceHeroData data) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
          colors: [
            Theme.of(context).colorScheme.primaryContainer,
            Theme.of(context).colorScheme.surfaceContainerLowest,
          ],
        ),
        borderRadius: AppRadius.lgAll,
        boxShadow: AppElevation.shadowForLevel(1),
      ),
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Left accent bar
            Container(
              width: 4,
              decoration: BoxDecoration(
                color: _accentColor(context, data.status),
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(AppRadius.lg),
                  bottomLeft: Radius.circular(AppRadius.lg),
                ),
              ),
            ),
            // Content
            Expanded(
              child: Padding(
                padding: AppSpacing.cardPaddingAll,
                child: _buildContent(context, data),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContent(BuildContext context, AttendanceHeroData data) {
    return switch (data.status) {
      AttendanceHeroStatus.notCheckedIn => _buildNotCheckedIn(context, data),
      AttendanceHeroStatus.working => _buildWorking(context, data),
      AttendanceHeroStatus.onBreak => _buildOnBreak(context, data),
      AttendanceHeroStatus.checkedOut => _buildCheckedOut(context, data),
      AttendanceHeroStatus.absent => _buildAbsent(context),
      AttendanceHeroStatus.noShift => _buildNoShift(context),
    };
  }

  // ── State A — Not Checked In ───────────────────────────────────────────────

  Widget _buildNotCheckedIn(BuildContext context, AttendanceHeroData data) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              width: 8, height: 8,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                color: PingForceColors.statusOffline,
              ),
            ),
            AppSpacing.iconGapBox,
            Text(
              'Not Checked In',
              style: AppTypography.labelMedium.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
        AppSpacing.smallGapBox,
        if (data.shiftName != null) ...[
          Text(
            data.shiftName!,
            style: AppTypography.titleSmall.copyWith(
              color: Theme.of(context).colorScheme.onSurface,
            ),
          ),
          Text(
            '${data.shiftStart ?? ''} – ${data.shiftEnd ?? ''}',
            style: AppTypography.bodySmall.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
        ],
        const SizedBox(height: AppSpacing.space4),
        SizedBox(
          width: double.infinity,
          height: 48,
          child: FilledButton.icon(
            onPressed: widget.onCheckIn,
            icon: const Icon(Icons.login_rounded),
            label: const Text('Check In Now'),
          ),
        ),
      ],
    );
  }

  // ── State B — Working ──────────────────────────────────────────────────────

  Widget _buildWorking(BuildContext context, AttendanceHeroData data) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Status row
        Row(
          children: [
            Container(
              width: 8, height: 8,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                color: PingForceColors.statusSuccess,
              ),
            ),
            AppSpacing.iconGapBox,
            Text(
              'Working',
              style: AppTypography.labelMedium.copyWith(
                color: PingForceColors.statusSuccess,
              ),
            ),
            const Spacer(),
            _ShiftStatusChip(data: data),
          ],
        ),
        AppSpacing.space2.toSizedBox,

        // Check-in time
        Text(
          data.checkInTime != null
              ? 'Checked In:  ${_fmt(data.checkInTime!)}'
              : '',
          style: AppTypography.bodySmall.copyWith(
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
        AppSpacing.space1.toSizedBox,

        // Live working timer
        Semantics(
          liveRegion: true,
          label: 'Working time: ${_fmtDuration(data.workingDuration)}',
          child: _LiveTimer(
            startTime: data.checkInTime,
            style: AppTypography.numericMedium.copyWith(
              color: Theme.of(context).colorScheme.onSurface,
            ),
          ),
        ),

        AppSpacing.space3.toSizedBox,

        // Shift progress bar
        _ShiftProgressBar(
          fraction: data.progressFraction ?? 0,
          animation: _progressAnimation,
          shiftStart: data.shiftStart ?? '',
          shiftEnd: data.shiftEnd ?? '',
        ),

        AppSpacing.space4.toSizedBox,

        // Action row. Break completes inline (no GPS needed); check-out opens
        // the attendance screen because it requires a GPS fix + geofence check.
        Row(
          children: [
            Expanded(
              child: SizedBox(
                height: 48,
                child: FilledButton.tonalIcon(
                  onPressed: widget.isActionInFlight ? null : widget.onBreak,
                  icon: widget.isActionInFlight
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.coffee_rounded, size: AppIconSize.sm),
                  label: const Text('Start Break'),
                ),
              ),
            ),
            const SizedBox(width: AppSpacing.space3),
            Expanded(
              flex: 2,
              child: SizedBox(
                height: 48,
                child: FilledButton.icon(
                  onPressed:
                      widget.isActionInFlight ? null : widget.onCheckOut,
                  icon: const Icon(Icons.logout_rounded, size: AppIconSize.sm),
                  label: const Text('Check Out'),
                ),
              ),
            ),
          ],
        ),

        if (widget.actionError != null) ...[
          AppSpacing.space2.toSizedBox,
          _ActionErrorText(message: widget.actionError!),
        ],
      ],
    );
  }

  // ── State C — On Break ─────────────────────────────────────────────────────

  Widget _buildOnBreak(BuildContext context, AttendanceHeroData data) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.coffee_rounded,
                size: AppIconSize.sm,
                color: PingForceColors.statusWarning),
            AppSpacing.iconGapBox,
            Text(
              'On Break',
              style: AppTypography.labelMedium.copyWith(
                color: PingForceColors.statusWarning,
              ),
            ),
            const Spacer(),
            _ShiftStatusChip(data: data),
          ],
        ),
        AppSpacing.space2.toSizedBox,
        if (data.breakStartTime != null)
          Text(
            'Break started:  ${_fmt(data.breakStartTime!)}',
            style: AppTypography.bodySmall.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
        AppSpacing.space1.toSizedBox,
        _LiveTimer(
          startTime: data.breakStartTime,
          style: AppTypography.numericMedium.copyWith(
            color: PingForceColors.statusWarning,
          ),
        ),
        AppSpacing.space4.toSizedBox,
        SizedBox(
          width: double.infinity,
          height: 48,
          child: FilledButton.icon(
            onPressed: widget.isActionInFlight ? null : widget.onResume,
            icon: widget.isActionInFlight
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.play_arrow_rounded),
            label: const Text('Resume Work'),
            style: FilledButton.styleFrom(
              backgroundColor: PingForceColors.statusWarning,
              foregroundColor: PingForceColors.statusOnWarning,
            ),
          ),
        ),
        if (widget.actionError != null) ...[
          AppSpacing.space2.toSizedBox,
          _ActionErrorText(message: widget.actionError!),
        ],
      ],
    );
  }

  // ── State D — Checked Out ──────────────────────────────────────────────────

  Widget _buildCheckedOut(BuildContext context, AttendanceHeroData data) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.check_circle_rounded,
                size: AppIconSize.sm,
                color: PingForceColors.statusSuccess),
            AppSpacing.iconGapBox,
            Text(
              'Checked Out',
              style: AppTypography.labelMedium.copyWith(
                color: PingForceColors.statusSuccess,
              ),
            ),
            const Spacer(),
            _CompletedChip(),
          ],
        ),
        AppSpacing.space2.toSizedBox,
        if (data.checkInTime != null && data.checkOutTime != null)
          Text(
            '${_fmt(data.checkInTime!)} → ${_fmt(data.checkOutTime!)}',
            style: AppTypography.titleSmall.copyWith(
              color: Theme.of(context).colorScheme.onSurface,
            ),
          ),
        AppSpacing.space2.toSizedBox,
        Row(
          children: [
            // Completed day: show worked time as h/m, not a running clock —
            // the h:mm:ss form reads as a live timer on a finished shift.
            _StatBadge(
              label: 'Worked',
              value: _fmtWorked(data.workingDuration),
            ),
            const SizedBox(width: AppSpacing.space3),
            _StatBadge(
              label: 'Breaks',
              value: '${data.breaksTaken ?? 0}',
            ),
            if ((data.totalOvertime ?? '').isNotEmpty) ...[
              const SizedBox(width: AppSpacing.space3),
              _StatBadge(label: 'OT', value: data.totalOvertime!),
            ],
          ],
        ),
        AppSpacing.space3.toSizedBox,
        TextButton.icon(
          onPressed: widget.onViewDetails,
          icon: const Icon(Icons.open_in_new_rounded, size: AppIconSize.sm),
          label: const Text('View Full Attendance'),
        ),
      ],
    );
  }

  // ── State E — Absent ───────────────────────────────────────────────────────

  Widget _buildAbsent(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.cancel_outlined,
                size: AppIconSize.sm,
                color: PingForceColors.statusCritical),
            AppSpacing.iconGapBox,
            Text(
              'No Attendance Today',
              style: AppTypography.labelMedium.copyWith(
                color: PingForceColors.statusCritical,
              ),
            ),
          ],
        ),
        AppSpacing.space2.toSizedBox,
        Text(
          'Leave / Holiday / Day Off',
          style: AppTypography.bodySmall.copyWith(
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
        AppSpacing.space4.toSizedBox,
        OutlinedButton(
          onPressed: widget.onRequestCorrection,
          child: const Text('Request Correction'),
        ),
      ],
    );
  }

  // ── State F — No Shift ─────────────────────────────────────────────────────

  Widget _buildNoShift(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(Icons.schedule_rounded,
                size: AppIconSize.sm,
                color: Theme.of(context).colorScheme.onSurfaceVariant),
            AppSpacing.iconGapBox,
            Text(
              'No Shift Assigned',
              style: AppTypography.labelMedium.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
        AppSpacing.space2.toSizedBox,
        Text(
          'Contact your manager to assign a shift.',
          style: AppTypography.bodySmall.copyWith(
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  Color _accentColor(BuildContext context, AttendanceHeroStatus status) {
    return switch (status) {
      AttendanceHeroStatus.working => PingForceColors.statusSuccess,
      AttendanceHeroStatus.onBreak => PingForceColors.statusWarning,
      AttendanceHeroStatus.checkedOut => Theme.of(context).colorScheme.primary,
      AttendanceHeroStatus.absent => PingForceColors.statusCritical,
      _ => Theme.of(context).colorScheme.onSurfaceVariant,
    };
  }

  String _fmt(DateTime dt) {
    final hour = dt.hour > 12 ? dt.hour - 12 : (dt.hour == 0 ? 12 : dt.hour);
    final min = dt.minute.toString().padLeft(2, '0');
    final amPm = dt.hour >= 12 ? 'PM' : 'AM';
    return '$hour:$min $amPm';
  }

  /// Completed-day worked time: "7h 45m". Distinct from [_fmtDuration], which
  /// is the running h:mm:ss form used while a session is still open.
  String _fmtWorked(Duration? d) {
    if (d == null) return '—';
    final h = d.inHours;
    final m = d.inMinutes.remainder(60);
    return h > 0 ? '${h}h ${m}m' : '${m}m';
  }

  String _fmtDuration(Duration? d) {
    if (d == null) return '--:--:--';
    final h = d.inHours;
    final m = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final s = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    return h > 0 ? '$h:$m:$s' : '$m:$s';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LIVE TIMER  — self-updating elapsed time widget
// ─────────────────────────────────────────────────────────────────────────────

class _LiveTimer extends StatefulWidget {
  const _LiveTimer({required this.startTime, required this.style});
  final DateTime? startTime;
  final TextStyle style;

  @override
  State<_LiveTimer> createState() => _LiveTimerState();
}

class _LiveTimerState extends State<_LiveTimer> {
  late Duration _elapsed;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _elapsed = widget.startTime != null
        ? DateTime.now().difference(widget.startTime!)
        : Duration.zero;
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      setState(() {
        _elapsed = widget.startTime != null
            ? DateTime.now().difference(widget.startTime!)
            : Duration.zero;
      });
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final h = _elapsed.inHours;
    final m = _elapsed.inMinutes.remainder(60).toString().padLeft(2, '0');
    final s = _elapsed.inSeconds.remainder(60).toString().padLeft(2, '0');
    return Text(
      h > 0 ? '$h:$m:$s' : '$m:$s',
      style: widget.style,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SHIFT PROGRESS BAR
// ─────────────────────────────────────────────────────────────────────────────

class _ShiftProgressBar extends StatelessWidget {
  const _ShiftProgressBar({
    required this.fraction,
    required this.animation,
    required this.shiftStart,
    required this.shiftEnd,
  });
  final double fraction;
  final Animation<double> animation;
  final String shiftStart;
  final String shiftEnd;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        AnimatedBuilder(
          animation: animation,
          builder: (_, _) {
            final animated = fraction * animation.value;
            return ClipRRect(
              borderRadius: AppRadius.pillAll,
              child: LinearProgressIndicator(
                value: animated.clamp(0.0, 1.0),
                minHeight: 6,
                backgroundColor:
                    Theme.of(context).colorScheme.primaryContainer,
                valueColor: AlwaysStoppedAnimation<Color>(
                  Theme.of(context).colorScheme.primary,
                ),
              ),
            );
          },
        ),
        const SizedBox(height: 4),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              shiftStart,
              style: AppTypography.labelSmall.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
            Text(
              shiftEnd,
              style: AppTypography.labelSmall.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SMALL WIDGETS
// ─────────────────────────────────────────────────────────────────────────────

class _ShiftStatusChip extends StatelessWidget {
  const _ShiftStatusChip({required this.data});
  final AttendanceHeroData data;

  @override
  Widget build(BuildContext context) {
    final isLate = data.isLate ?? false;
    final color = isLate ? PingForceColors.statusWarning : PingForceColors.statusSuccess;
    final bg = isLate ? PingForceColors.statusWarningContainer : PingForceColors.statusSuccessContainer;
    final label = isLate ? 'Late ${data.minutesLate}m' : 'On Time';

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: bg, borderRadius: AppRadius.xsAll),
      child: Text(label, style: AppTypography.labelSmall.copyWith(color: color)),
    );
  }
}

class _CompletedChip extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.primaryContainer,
        borderRadius: AppRadius.xsAll,
      ),
      child: Text(
        'Completed',
        style: AppTypography.labelSmall.copyWith(
          color: Theme.of(context).colorScheme.onPrimaryContainer,
        ),
      ),
    );
  }
}

class _ActionErrorText extends StatelessWidget {
  const _ActionErrorText({required this.message});
  final String message;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(
          Icons.error_outline_rounded,
          size: AppIconSize.xs,
          color: theme.colorScheme.error,
        ),
        AppSpacing.iconGapBox,
        Expanded(
          child: Text(
            message,
            style: AppTypography.labelSmall.copyWith(
              color: theme.colorScheme.error,
            ),
          ),
        ),
      ],
    );
  }
}

class _StatBadge extends StatelessWidget {
  const _StatBadge({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          value,
          style: AppTypography.numericSmall.copyWith(
            color: Theme.of(context).colorScheme.onSurface,
          ),
        ),
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

extension _DoubleX on double {
  SizedBox get toSizedBox => SizedBox(height: this);
}
