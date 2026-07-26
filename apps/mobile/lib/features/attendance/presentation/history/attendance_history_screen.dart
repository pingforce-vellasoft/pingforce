import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../injection_container.dart';
import '../../data/datasources/attendance_history_remote_data_source.dart';
import 'attendance_history_models.dart';

// ─────────────────────────────────────────────────────────────────────────────
// ATTENDANCE LOG — own day-by-day record (GET /attendance/daily-logs).
// ─────────────────────────────────────────────────────────────────────────────
//
// One row per day, newest first, with today's in-progress day at the top when
// a session is open. Tapping a row expands it to show each session, its breaks
// and any exceptions raised for that day.

class _HistoryState {
  const _HistoryState({
    this.isLoading = true,
    this.entries = const [],
    this.summary = const AttendanceHistorySummary(),
    this.errorMessage,
  });

  final bool isLoading;
  final List<AttendanceHistoryEntry> entries;
  final AttendanceHistorySummary summary;
  final String? errorMessage;

  _HistoryState copyWith({
    bool? isLoading,
    List<AttendanceHistoryEntry>? entries,
    AttendanceHistorySummary? summary,
    String? errorMessage,
  }) {
    return _HistoryState(
      isLoading: isLoading ?? this.isLoading,
      entries: entries ?? this.entries,
      summary: summary ?? this.summary,
      errorMessage: errorMessage,
    );
  }
}

final _attHistoryProvider =
    NotifierProvider<_AttHistoryNotifier, _HistoryState>(
  _AttHistoryNotifier.new,
);

class _AttHistoryNotifier extends Notifier<_HistoryState> {
  @override
  _HistoryState build() => const _HistoryState();

  Future<void> load() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final page =
          await sl<AttendanceHistoryRemoteDataSource>().fetchLogs(limit: 30);
      state = state.copyWith(
        isLoading: false,
        entries: page.entries,
        summary: page.summary,
      );
    } catch (_) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Could not load your attendance log. Pull to retry.',
      );
    }
  }
}

class AttendanceHistoryScreen extends ConsumerStatefulWidget {
  const AttendanceHistoryScreen({super.key});

  @override
  ConsumerState<AttendanceHistoryScreen> createState() =>
      _AttendanceHistoryScreenState();
}

class _AttendanceHistoryScreenState
    extends ConsumerState<AttendanceHistoryScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(_attHistoryProvider.notifier).load();
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(_attHistoryProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('My Attendance')),
      body: RefreshIndicator(
        onRefresh: () => ref.read(_attHistoryProvider.notifier).load(),
        child: _body(context, state),
      ),
    );
  }

  Widget _body(BuildContext context, _HistoryState state) {
    if (state.isLoading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (state.errorMessage != null) {
      return _message(context, Icons.cloud_off_rounded, state.errorMessage!);
    }
    if (state.entries.isEmpty) {
      return _message(
        context,
        Icons.event_busy_rounded,
        'No attendance records yet.',
      );
    }

    return ListView.separated(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.only(bottom: 24),
      itemCount: state.entries.length + 1,
      separatorBuilder: (_, i) =>
          i == 0 ? const SizedBox.shrink() : const Divider(height: 1),
      itemBuilder: (context, i) {
        if (i == 0) return _SummaryHeader(summary: state.summary);
        return _AttendanceDayRow(entry: state.entries[i - 1]);
      },
    );
  }

  Widget _message(BuildContext context, IconData icon, String msg) {
    return ListView(
      children: [
        const SizedBox(height: 120),
        Icon(
          icon,
          size: 48,
          color: Theme.of(context).colorScheme.onSurfaceVariant,
        ),
        const SizedBox(height: 16),
        Center(child: Text(msg)),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY HEADER — totals for the visible range
// ─────────────────────────────────────────────────────────────────────────────

class _SummaryHeader extends StatelessWidget {
  const _SummaryHeader({required this.summary});
  final AttendanceHistorySummary summary;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 4),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Last ${summary.daysCounted} days',
              style: theme.textTheme.labelMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              )),
          const SizedBox(height: 12),
          Row(
            children: [
              _SummaryStat(label: 'Present', value: '${summary.presentDays}'),
              _SummaryStat(label: 'Absent', value: '${summary.absentDays}'),
              _SummaryStat(label: 'Late', value: '${summary.lateDays}'),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              _SummaryStat(
                label: 'Total worked',
                value: _fmtMinutes(summary.workedMinutes),
              ),
              _SummaryStat(
                label: 'Avg / day',
                value: _fmtMinutes(summary.averageWorkedMinutes),
              ),
              _SummaryStat(
                label: 'Overtime',
                value: _fmtMinutes(summary.overtimeMinutes),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _SummaryStat extends StatelessWidget {
  const _SummaryStat({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(value, style: theme.textTheme.titleMedium),
          Text(
            label,
            style: theme.textTheme.labelSmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DAY ROW — collapsed summary, expands to sessions + breaks
// ─────────────────────────────────────────────────────────────────────────────

class _AttendanceDayRow extends StatelessWidget {
  const _AttendanceDayRow({required this.entry});
  final AttendanceHistoryEntry entry;

  (Color, IconData, String) _statusMeta(BuildContext context) {
    switch (entry.status) {
      case AttendanceEntryStatus.present:
        return (
          PingForceColors.statusSuccess,
          Icons.check_circle_rounded,
          'Present'
        );
      case AttendanceEntryStatus.working:
        return (
          PingForceColors.statusWarning,
          Icons.timelapse_rounded,
          'Working'
        );
      case AttendanceEntryStatus.leave:
        return (
          PingForceColors.statusInfo,
          Icons.beach_access_rounded,
          'On Leave'
        );
      case AttendanceEntryStatus.halfDay:
        return (PingForceColors.statusInfo, Icons.timelapse_rounded, 'Half Day');
      case AttendanceEntryStatus.absent:
        return (
          PingForceColors.statusCritical,
          Icons.cancel_rounded,
          'Absent'
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final (color, icon, label) = _statusMeta(context);

    return ExpansionTile(
      shape: const Border(),
      collapsedShape: const Border(),
      tilePadding: const EdgeInsets.symmetric(horizontal: 16),
      leading: Container(
        width: 44,
        height: 44,
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Icon(icon, color: color),
      ),
      title: Row(
        children: [
          Expanded(child: Text(_formatDay(entry.date))),
          if (entry.isOngoing)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: PingForceColors.statusSuccess.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                'In progress',
                style: theme.textTheme.labelSmall?.copyWith(
                  color: PingForceColors.statusSuccess,
                ),
              ),
            ),
        ],
      ),
      subtitle: Padding(
        padding: const EdgeInsets.only(top: 4),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(_timeRange()),
            if (entry.hasExceptions)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Wrap(
                  spacing: 6,
                  runSpacing: 4,
                  children: entry.exceptions
                      .map((e) => _ExceptionChip(exception: e))
                      .toList(),
                ),
              ),
          ],
        ),
      ),
      trailing: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Text(
            label,
            style: theme.textTheme.labelMedium
                ?.copyWith(color: color, fontWeight: FontWeight.w600),
          ),
          Text(
            _fmtMinutes(entry.workedMinutes),
            style: theme.textTheme.labelSmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Day metrics
              Wrap(
                spacing: 20,
                runSpacing: 8,
                children: [
                  _Detail(label: 'Worked', value: _fmtMinutes(entry.workedMinutes)),
                  _Detail(
                    label: 'Breaks',
                    value:
                        '${entry.breaksTaken} · ${_fmtMinutes(entry.breakMinutes)}',
                  ),
                  if (entry.overtimeMinutes > 0)
                    _Detail(
                      label: 'Overtime',
                      value: _fmtMinutes(entry.overtimeMinutes),
                    ),
                  if (entry.shortfallMinutes > 0)
                    _Detail(
                      label: 'Shortfall',
                      value: _fmtMinutes(entry.shortfallMinutes),
                    ),
                  if (entry.isLate && entry.minutesLate != null)
                    _Detail(label: 'Late by', value: '${entry.minutesLate}m'),
                  if (entry.shiftName != null)
                    _Detail(label: 'Shift', value: entry.shiftName!),
                ],
              ),

              if (entry.sessions.isNotEmpty) ...[
                const SizedBox(height: 12),
                Text(
                  'Sessions',
                  style: theme.textTheme.labelMedium?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 4),
                ...entry.sessions.map((s) => _SessionLine(session: s)),
              ],

              // Exception detail — the chip shows what, this shows why.
              if (entry.hasExceptions) ...[
                const SizedBox(height: 12),
                ...entry.exceptions.map(
                  (e) => Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(
                          Icons.info_outline_rounded,
                          size: 14,
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            e.detail,
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: theme.colorScheme.onSurfaceVariant,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  String _timeRange() {
    final inT = entry.checkIn != null ? _hhmm(entry.checkIn!) : '—';
    final outT = entry.checkOut != null
        ? _hhmm(entry.checkOut!)
        : (entry.isOngoing ? 'ongoing' : '—');
    return 'In $inT · Out $outT';
  }
}

class _SessionLine extends StatelessWidget {
  const _SessionLine({required this.session});
  final AttendanceSessionRow session;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                session.isOpen
                    ? Icons.radio_button_checked_rounded
                    : Icons.check_circle_outline_rounded,
                size: 14,
                color: session.isOpen
                    ? PingForceColors.statusSuccess
                    : theme.colorScheme.onSurfaceVariant,
              ),
              const SizedBox(width: 6),
              Text(
                '${_hhmm(session.punchIn)} → '
                '${session.isOpen ? 'in progress' : _hhmm(session.punchOut!)}',
                style: theme.textTheme.bodySmall,
              ),
              if (session.attendanceMethod == 'MANUAL') ...[
                const SizedBox(width: 6),
                Text(
                  '(manual)',
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ],
          ),
          ...session.breaks.map(
            (b) => Padding(
              padding: const EdgeInsets.only(left: 20, top: 2),
              child: Text(
                '${b.breakType.toLowerCase()} · ${_hhmm(b.startTime)}'
                '${b.endTime == null ? ' → ongoing' : ' → ${_hhmm(b.endTime!)}'}'
                '${b.durationMinutes != null ? ' (${b.durationMinutes}m)' : ''}'
                '${b.paidBreak ? ' · paid' : ''}',
                style: theme.textTheme.labelSmall?.copyWith(
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

class _ExceptionChip extends StatelessWidget {
  const _ExceptionChip({required this.exception});
  final AttendanceException exception;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = switch (exception.severity) {
      'high' => PingForceColors.statusCritical,
      'medium' => PingForceColors.statusWarning,
      _ => theme.colorScheme.onSurfaceVariant,
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        exception.label,
        style: theme.textTheme.labelSmall?.copyWith(color: color),
      ),
    );
  }
}

class _Detail extends StatelessWidget {
  const _Detail({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          label,
          style: theme.textTheme.labelSmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        Text(value, style: theme.textTheme.bodyMedium),
      ],
    );
  }
}

// ── Shared formatters ────────────────────────────────────────────────────────

String _hhmm(DateTime dt) =>
    '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';

String _formatDay(DateTime dt) {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  final today = DateTime.now();
  final isToday = dt.year == today.year &&
      dt.month == today.month &&
      dt.day == today.day;
  final base = '${weekdays[dt.weekday - 1]}, ${dt.day} ${months[dt.month - 1]}';
  return isToday ? 'Today · $base' : base;
}

String _fmtMinutes(int minutes) {
  if (minutes <= 0) return '—';
  final h = minutes ~/ 60;
  final m = minutes % 60;
  return h > 0 ? '${h}h ${m}m' : '${m}m';
}
