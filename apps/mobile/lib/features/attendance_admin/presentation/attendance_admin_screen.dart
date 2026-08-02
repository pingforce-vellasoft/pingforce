import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/theme.dart';
import '../domain/entities/daily_attendance.dart';
import 'attendance_admin_notifier.dart';

// ─────────────────────────────────────────────────────────────────────────────
// ATTENDANCE ADMIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
//
// Tenant-wide attendance reporting, backed by the same endpoints as the web
// portal. Two tabs mirroring the web's two entries:
//   • Daily      — /attendance/daily-logs, one row per employee-day
//   • Punch log  — /attendance/logs, one row per session
// Wired to /attendance-admin.

class AttendanceAdminScreen extends ConsumerStatefulWidget {
  const AttendanceAdminScreen({super.key});

  @override
  ConsumerState<AttendanceAdminScreen> createState() =>
      _AttendanceAdminScreenState();
}

class _AttendanceAdminScreenState extends ConsumerState<AttendanceAdminScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  final TextEditingController _searchController = TextEditingController();

  /// Statuses the API accepts on the daily-log query.
  static const _statuses = <String>[
    'PRESENT',
    'ABSENT',
    'LATE',
    'HALF_DAY',
    'ON_LEAVE',
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(attendanceAdminNotifierProvider.notifier).loadAll();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(attendanceAdminNotifierProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Attendance'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Daily'),
            Tab(text: 'Punch log'),
          ],
        ),
      ),
      body: Column(
        children: [
          _buildSearchField(context),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildDailyTab(context, state),
                _buildLogsTab(context, state),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchField(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.screenHorizontal,
        AppSpacing.space3,
        AppSpacing.screenHorizontal,
        AppSpacing.space2,
      ),
      child: TextField(
        controller: _searchController,
        textInputAction: TextInputAction.search,
        decoration: InputDecoration(
          hintText: 'Search employee name or code',
          prefixIcon: const Icon(Icons.search_rounded),
          suffixIcon: _searchController.text.isEmpty
              ? null
              : IconButton(
                  icon: const Icon(Icons.clear_rounded),
                  tooltip: 'Clear',
                  onPressed: () {
                    _searchController.clear();
                    ref
                        .read(attendanceAdminNotifierProvider.notifier)
                        .setSearch('');
                  },
                ),
          isDense: true,
        ),
        // Search is server-side on both endpoints; fire on submit rather than
        // per keystroke so typing does not spam the API.
        onSubmitted: (v) =>
            ref.read(attendanceAdminNotifierProvider.notifier).setSearch(v),
      ),
    );
  }

  // ── Daily tab ──────────────────────────────────────────────────────────────

  Widget _buildDailyTab(BuildContext context, AttendanceAdminState state) {
    return Column(
      children: [
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.screenHorizontal,
            vertical: AppSpacing.space2,
          ),
          child: Row(
            children: [
              ChoiceChip(
                label: const Text('All'),
                selected: state.statusFilter == null && !state.exceptionsOnly,
                onSelected: (_) {
                  final notifier =
                      ref.read(attendanceAdminNotifierProvider.notifier);
                  notifier.setExceptionsOnly(false);
                  notifier.setStatusFilter(null);
                },
              ),
              const SizedBox(width: AppSpacing.space2),
              ChoiceChip(
                label: const Text('Exceptions'),
                selected: state.exceptionsOnly,
                onSelected: (v) => ref
                    .read(attendanceAdminNotifierProvider.notifier)
                    .setExceptionsOnly(v),
              ),
              for (final status in _statuses) ...[
                const SizedBox(width: AppSpacing.space2),
                ChoiceChip(
                  label: Text(_statusLabel(status)),
                  selected: state.statusFilter == status,
                  onSelected: (selected) => ref
                      .read(attendanceAdminNotifierProvider.notifier)
                      .setStatusFilter(selected ? status : null),
                ),
              ],
            ],
          ),
        ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: () =>
                ref.read(attendanceAdminNotifierProvider.notifier).loadDaily(),
            child: _buildDailyBody(context, state),
          ),
        ),
      ],
    );
  }

  Widget _buildDailyBody(BuildContext context, AttendanceAdminState state) {
    if (state.isLoadingDaily && state.dailyRows.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }
    if (state.dailyError != null && state.dailyRows.isEmpty) {
      return _MessageState(
        icon: Icons.error_outline_rounded,
        title: 'Could not load attendance',
        subtitle: state.dailyError!,
        actionLabel: 'Retry',
        onAction: () =>
            ref.read(attendanceAdminNotifierProvider.notifier).loadDaily(),
      );
    }
    if (state.dailyRows.isEmpty) {
      return const _MessageState(
        icon: Icons.fact_check_outlined,
        title: 'No attendance records',
        subtitle: 'No days match the current filters.',
      );
    }

    return ListView.separated(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.screenHorizontal,
        AppSpacing.space2,
        AppSpacing.screenHorizontal,
        AppSpacing.space20,
      ),
      // One leading slot for the range summary.
      itemCount: state.dailyRows.length + 1,
      separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.space3),
      itemBuilder: (_, i) {
        if (i == 0) return _SummaryCard(summary: state.summary);
        return _DailyRowTile(row: state.dailyRows[i - 1]);
      },
    );
  }

  // ── Punch log tab ──────────────────────────────────────────────────────────

  Widget _buildLogsTab(BuildContext context, AttendanceAdminState state) {
    return RefreshIndicator(
      onRefresh: () =>
          ref.read(attendanceAdminNotifierProvider.notifier).loadLogs(),
      child: _buildLogsBody(context, state),
    );
  }

  Widget _buildLogsBody(BuildContext context, AttendanceAdminState state) {
    if (state.isLoadingLogs && state.logRows.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }
    if (state.logsError != null && state.logRows.isEmpty) {
      return _MessageState(
        icon: Icons.error_outline_rounded,
        title: 'Could not load logs',
        subtitle: state.logsError!,
        actionLabel: 'Retry',
        onAction: () =>
            ref.read(attendanceAdminNotifierProvider.notifier).loadLogs(),
      );
    }
    if (state.logRows.isEmpty) {
      return const _MessageState(
        icon: Icons.access_time_rounded,
        title: 'No punch records',
        subtitle: 'Check-ins and check-outs appear here as they happen.',
      );
    }

    return ListView.separated(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.screenHorizontal,
        AppSpacing.space2,
        AppSpacing.screenHorizontal,
        AppSpacing.space20,
      ),
      itemCount: state.logRows.length,
      separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.space3),
      itemBuilder: (_, i) => _LogRowTile(row: state.logRows[i]),
    );
  }

  static String _statusLabel(String raw) => raw
      .split('_')
      .map((w) => w.isEmpty ? w : '${w[0]}${w.substring(1).toLowerCase()}')
      .join(' ');
}

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY CARD
// ─────────────────────────────────────────────────────────────────────────────

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({required this.summary});

  final DailyAttendanceSummary summary;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Card(
      margin: EdgeInsets.zero,
      color: scheme.surfaceContainerHighest,
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.space4),
        child: Wrap(
          spacing: AppSpacing.space6,
          runSpacing: AppSpacing.space3,
          children: [
            _stat(context, 'Days', '${summary.daysCounted}'),
            _stat(context, 'Present', '${summary.presentDays}'),
            _stat(context, 'Absent', '${summary.absentDays}'),
            _stat(context, 'Late', '${summary.lateDays}'),
            _stat(context, 'Worked', _hours(summary.workedMinutes)),
            if (summary.overtimeMinutes > 0)
              _stat(context, 'Overtime', _hours(summary.overtimeMinutes)),
            if (summary.daysWithExceptions > 0)
              _stat(context, 'Exceptions', '${summary.daysWithExceptions}',
                  highlight: true),
          ],
        ),
      ),
    );
  }

  Widget _stat(BuildContext context, String label, String value,
      {bool highlight = false}) {
    final scheme = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          value,
          style: AppTypography.titleMedium.copyWith(
            color: highlight ? scheme.error : scheme.onSurface,
            fontWeight: FontWeight.w700,
          ),
        ),
        Text(
          label,
          style:
              AppTypography.labelSmall.copyWith(color: scheme.onSurfaceVariant),
        ),
      ],
    );
  }
}

/// Minutes → "7h 30m" / "45m". Server-computed minutes are the source of
/// truth; this only formats them.
String _hours(int minutes) {
  if (minutes <= 0) return '0m';
  final h = minutes ~/ 60;
  final m = minutes % 60;
  if (h == 0) return '${m}m';
  return m == 0 ? '${h}h' : '${h}h ${m}m';
}

String _time(DateTime? value) {
  if (value == null) return '—';
  return '${value.hour.toString().padLeft(2, '0')}:'
      '${value.minute.toString().padLeft(2, '0')}';
}

String _day(DateTime? value) {
  if (value == null) return '—';
  return '${value.year}-${value.month.toString().padLeft(2, '0')}-'
      '${value.day.toString().padLeft(2, '0')}';
}

// ─────────────────────────────────────────────────────────────────────────────
// ROW TILES
// ─────────────────────────────────────────────────────────────────────────────

class _DailyRowTile extends StatelessWidget {
  const _DailyRowTile({required this.row});

  final DailyAttendanceRow row;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final statusColor = switch (row.status) {
      'PRESENT' => scheme.primary,
      'LATE' => scheme.tertiary,
      'ABSENT' => scheme.error,
      _ => scheme.onSurfaceVariant,
    };

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.space4),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    row.employeeName,
                    style: AppTypography.titleSmall,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.space2,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.14),
                    borderRadius: AppRadius.pillAll,
                  ),
                  child: Text(
                    row.status.replaceAll('_', ' '),
                    style:
                        AppTypography.labelSmall.copyWith(color: statusColor),
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.space1),
            Text(
              [
                _day(row.date),
                if ((row.employeeCode ?? '').isNotEmpty) row.employeeCode!,
                if ((row.shiftName ?? '').isNotEmpty) row.shiftName!,
              ].join(' · '),
              style: AppTypography.bodySmall
                  .copyWith(color: scheme.onSurfaceVariant),
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: AppSpacing.space3),
            Row(
              children: [
                _cell(context, 'In', _time(row.checkInTime)),
                _cell(context, 'Out',
                    row.isOngoing ? 'Ongoing' : _time(row.checkOutTime)),
                _cell(context, 'Worked', _hours(row.workedMinutes)),
                if (row.breakMinutes > 0)
                  _cell(context, 'Break', _hours(row.breakMinutes)),
              ],
            ),
            if (row.isLate && (row.minutesLate ?? 0) > 0) ...[
              const SizedBox(height: AppSpacing.space2),
              Text(
                '${row.minutesLate} min late',
                style: AppTypography.bodySmall.copyWith(color: scheme.tertiary),
              ),
            ],
            if (row.hasExceptions) ...[
              const SizedBox(height: AppSpacing.space2),
              Row(
                children: [
                  Icon(Icons.flag_rounded,
                      size: AppIconSize.sm, color: scheme.error),
                  const SizedBox(width: AppSpacing.space2),
                  Text(
                    '${row.exceptionCount} exception'
                    '${row.exceptionCount == 1 ? '' : 's'} to review',
                    style: AppTypography.bodySmall
                        .copyWith(color: scheme.error),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _cell(BuildContext context, String label, String value) {
    final scheme = Theme.of(context).colorScheme;
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            value,
            style: AppTypography.bodyMedium
                .copyWith(fontWeight: FontWeight.w600),
          ),
          Text(
            label,
            style: AppTypography.labelSmall
                .copyWith(color: scheme.onSurfaceVariant),
          ),
        ],
      ),
    );
  }
}

class _LogRowTile extends StatelessWidget {
  const _LogRowTile({required this.row});

  final AttendanceLogRow row;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Card(
      margin: EdgeInsets.zero,
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: row.isSpoofed
              ? scheme.errorContainer
              : scheme.primaryContainer,
          child: Icon(
            row.isSpoofed
                ? Icons.gpp_maybe_rounded
                : Icons.access_time_rounded,
            color: row.isSpoofed
                ? scheme.onErrorContainer
                : scheme.onPrimaryContainer,
          ),
        ),
        title: Text(
          row.employeeName,
          style: AppTypography.titleSmall,
          overflow: TextOverflow.ellipsis,
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${_day(row.punchIn)} · ${_time(row.punchIn)} → '
              '${_time(row.punchOut)}',
              style: AppTypography.bodySmall
                  .copyWith(color: scheme.onSurfaceVariant),
            ),
            Text(
              [
                if ((row.employeeCode ?? '').isNotEmpty) row.employeeCode!,
                if ((row.sessionStatus ?? '').isNotEmpty) row.sessionStatus!,
                if ((row.attendanceMethod ?? '').isNotEmpty)
                  row.attendanceMethod!,
                if (row.workedMinutes != null) _hours(row.workedMinutes!),
              ].join(' · '),
              style: AppTypography.bodySmall
                  .copyWith(color: scheme.onSurfaceVariant),
              overflow: TextOverflow.ellipsis,
            ),
            // A spoofed punch is the strongest fraud signal in the log.
            if (row.isSpoofed)
              Text(
                'Mock location detected',
                style: AppTypography.bodySmall.copyWith(color: scheme.error),
              ),
          ],
        ),
        isThreeLine: true,
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EMPTY / ERROR STATE
// ─────────────────────────────────────────────────────────────────────────────

class _MessageState extends StatelessWidget {
  const _MessageState({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.actionLabel,
    this.onAction,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    // Scrollable so RefreshIndicator still works on an empty list.
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(AppSpacing.space8),
      children: [
        const SizedBox(height: AppSpacing.space12),
        Icon(icon, size: 56, color: scheme.onSurfaceVariant),
        const SizedBox(height: AppSpacing.space4),
        Text(
          title,
          textAlign: TextAlign.center,
          style: AppTypography.titleMedium.copyWith(color: scheme.onSurface),
        ),
        const SizedBox(height: AppSpacing.space2),
        Text(
          subtitle,
          textAlign: TextAlign.center,
          style:
              AppTypography.bodyMedium.copyWith(color: scheme.onSurfaceVariant),
        ),
        if (actionLabel != null && onAction != null) ...[
          const SizedBox(height: AppSpacing.space6),
          Center(
            child: FilledButton(onPressed: onAction, child: Text(actionLabel!)),
          ),
        ],
      ],
    );
  }
}
