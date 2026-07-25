import 'package:flutter/material.dart';

import '../../../../../core/theme/theme.dart';
import '../../../domain/entities/attendance_today.dart';

// ─────────────────────────────────────────────────────────────────────────────
// DAY SUMMARY CARD
// ─────────────────────────────────────────────────────────────────────────────
//
// Today at a glance for the signed-in employee: first check-in / last
// check-out, worked and break totals, the punch history with per-session
// breaks, and current leave balances. Data comes from GET /attendance/today.

class AttendanceDaySummaryCard extends StatelessWidget {
  const AttendanceDaySummaryCard({super.key, required this.today});

  final AttendanceToday today;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final totals = today.totals;
    final hasActivity = today.sessions.isNotEmpty;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.cardPadding),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.today_rounded,
                  size: AppIconSize.sm,
                  color: theme.colorScheme.primary,
                ),
                AppSpacing.iconGapBox,
                Text('Today', style: AppTypography.titleSmall),
                const Spacer(),
                if (today.status != null)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.space2,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.primary.withValues(alpha: 0.12),
                      borderRadius: AppRadius.pillAll,
                    ),
                    child: Text(
                      today.status!,
                      style: AppTypography.labelSmall.copyWith(
                        color: theme.colorScheme.primary,
                      ),
                    ),
                  ),
              ],
            ),

            AppSpacing.smallGapBox,

            if (!hasActivity)
              Padding(
                padding: const EdgeInsets.symmetric(
                  vertical: AppSpacing.space3,
                ),
                child: Text(
                  'No attendance recorded yet today.',
                  style: AppTypography.bodySmall.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              )
            else ...[
              // ── Metric row ───────────────────────────────────────────
              Row(
                children: [
                  _Metric(
                    label: 'Check In',
                    value: _formatTime(totals.firstPunchIn),
                    icon: Icons.login_rounded,
                  ),
                  _Metric(
                    label: 'Check Out',
                    value: _formatTime(totals.lastPunchOut),
                    icon: Icons.logout_rounded,
                  ),
                  // Whole-day count across every session today; the active
                  // session card shows the current session's count instead.
                  _Metric(
                    label: 'Breaks today',
                    value: '${totals.breaksTaken}',
                    icon: Icons.coffee_rounded,
                  ),
                ],
              ),

              AppSpacing.smallGapBox,

              Row(
                children: [
                  _Metric(
                    label: 'Worked',
                    value: _formatMinutes(totals.workedMinutes),
                    icon: Icons.timelapse_rounded,
                  ),
                  _Metric(
                    label: 'On Break',
                    value: _formatMinutes(totals.breakMinutes),
                    icon: Icons.pause_circle_outline_rounded,
                  ),
                  _Metric(
                    label: 'Overtime',
                    value: _formatMinutes(totals.overtimeMinutes),
                    icon: Icons.more_time_rounded,
                  ),
                ],
              ),

              const Divider(height: AppSpacing.space6),

              // ── Punch history ────────────────────────────────────────
              Text(
                'Punch history',
                style: AppTypography.labelMedium.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
              AppSpacing.smallGapBox,
              ...today.sessions.map((s) => _SessionRow(session: s)),
            ],

            // ── Leave balances ─────────────────────────────────────────
            if (today.leaveBalances.isNotEmpty) ...[
              const Divider(height: AppSpacing.space6),
              Text(
                'Leave balance',
                style: AppTypography.labelMedium.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
              AppSpacing.smallGapBox,
              Wrap(
                spacing: AppSpacing.space2,
                runSpacing: AppSpacing.space2,
                children: today.leaveBalances
                    .map((b) => _LeaveChip(balance: b))
                    .toList(),
              ),
            ],
          ],
        ),
      ),
    );
  }

  static String _formatTime(DateTime? dt) {
    if (dt == null) return '—';
    final hour = dt.hour > 12 ? dt.hour - 12 : (dt.hour == 0 ? 12 : dt.hour);
    final min = dt.minute.toString().padLeft(2, '0');
    return '$hour:$min ${dt.hour >= 12 ? 'PM' : 'AM'}';
  }

  static String _formatMinutes(int minutes) {
    if (minutes <= 0) return '—';
    final h = minutes ~/ 60;
    final m = minutes % 60;
    return h > 0 ? '${h}h ${m}m' : '${m}m';
  }
}

class _Metric extends StatelessWidget {
  const _Metric({required this.label, required this.value, required this.icon});

  final String label;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                icon,
                size: AppIconSize.xs,
                color: theme.colorScheme.onSurfaceVariant,
              ),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  label,
                  style: AppTypography.labelSmall.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 2),
          Text(value, style: AppTypography.titleSmall),
        ],
      ),
    );
  }
}

class _SessionRow extends StatelessWidget {
  const _SessionRow({required this.session});

  final AttendanceSessionEntry session;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isOpen = session.punchOut == null;

    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.space2),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                isOpen
                    ? Icons.radio_button_checked_rounded
                    : Icons.check_circle_outline_rounded,
                size: AppIconSize.xs,
                color: isOpen
                    ? PingForceColors.statusSuccess
                    : theme.colorScheme.onSurfaceVariant,
              ),
              AppSpacing.iconGapBox,
              Text(
                '${AttendanceDaySummaryCard._formatTime(session.punchIn)} → '
                '${isOpen ? 'in progress' : AttendanceDaySummaryCard._formatTime(session.punchOut)}',
                style: AppTypography.bodySmall,
              ),
            ],
          ),
          // Breaks nested under their session
          ...session.breaks.map(
            (b) => Padding(
              padding: const EdgeInsets.only(
                left: AppSpacing.space6,
                top: 2,
              ),
              child: Text(
                '${b.breakType.toLowerCase()} · '
                '${AttendanceDaySummaryCard._formatTime(b.startTime)}'
                '${b.endTime == null ? ' → ongoing' : ' → ${AttendanceDaySummaryCard._formatTime(b.endTime)}'}'
                '${b.durationMinutes != null ? ' (${b.durationMinutes}m)' : ''}'
                '${b.paidBreak ? ' · paid' : ''}',
                style: AppTypography.labelSmall.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _LeaveChip extends StatelessWidget {
  const _LeaveChip({required this.balance});

  final LeaveBalanceEntry balance;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.space3,
        vertical: AppSpacing.space2,
      ),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: AppRadius.mdAll,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            balance.leaveTypeName,
            style: AppTypography.labelSmall.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            '${_trim(balance.availableDays)} / ${_trim(balance.totalDays)} days',
            style: AppTypography.labelMedium,
          ),
        ],
      ),
    );
  }

  static String _trim(double v) =>
      v == v.roundToDouble() ? v.toStringAsFixed(0) : v.toStringAsFixed(1);
}
