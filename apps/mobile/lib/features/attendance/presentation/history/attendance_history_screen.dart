import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../injection_container.dart';
import '../../data/datasources/attendance_history_remote_data_source.dart';
import 'attendance_history_models.dart';

// ─────────────────────────────────────────────────────────────────────────────
// ATTENDANCE HISTORY — own past sessions (GET /attendance/logs).
// ─────────────────────────────────────────────────────────────────────────────

class _HistoryState {
  const _HistoryState({
    this.isLoading = true,
    this.entries = const [],
    this.errorMessage,
  });

  final bool isLoading;
  final List<AttendanceHistoryEntry> entries;
  final String? errorMessage;

  _HistoryState copyWith({
    bool? isLoading,
    List<AttendanceHistoryEntry>? entries,
    String? errorMessage,
  }) {
    return _HistoryState(
      isLoading: isLoading ?? this.isLoading,
      entries: entries ?? this.entries,
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
      final page = await sl<AttendanceHistoryRemoteDataSource>()
          .fetchLogs(limit: 30);
      state = state.copyWith(isLoading: false, entries: page.entries);
    } catch (_) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Could not load attendance history. Pull to retry.',
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
      appBar: AppBar(title: const Text('Attendance History')),
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
      padding: const EdgeInsets.symmetric(vertical: 8),
      itemCount: state.entries.length,
      separatorBuilder: (_, _) => const Divider(height: 1, indent: 72),
      itemBuilder: (context, i) => _AttendanceTile(entry: state.entries[i]),
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

class _AttendanceTile extends StatelessWidget {
  const _AttendanceTile({required this.entry});
  final AttendanceHistoryEntry entry;

  (Color, IconData, String) get _statusMeta {
    switch (entry.status) {
      case AttendanceEntryStatus.present:
        return (PingForceColors.statusSuccess, Icons.check_circle_rounded, 'Present');
      case AttendanceEntryStatus.working:
        return (PingForceColors.statusWarning, Icons.timelapse_rounded, 'Working');
      case AttendanceEntryStatus.leave:
        return (PingForceColors.statusInfo, Icons.beach_access_rounded, 'On Leave');
      case AttendanceEntryStatus.absent:
        return (PingForceColors.statusCritical, Icons.cancel_rounded, 'Absent');
    }
  }

  @override
  Widget build(BuildContext context) {
    final (color, icon, label) = _statusMeta;
    final date = entry.checkIn ?? entry.checkOut;

    return ListTile(
      leading: Container(
        width: 44,
        height: 44,
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Icon(icon, color: color),
      ),
      title: Text(date != null ? _formatDay(date) : label),
      subtitle: Text(_timeRange()),
      trailing: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Text(
            label,
            style: Theme.of(context).textTheme.labelMedium?.copyWith(
                  color: color,
                  fontWeight: FontWeight.w600,
                ),
          ),
          if (entry.worked != null)
            Text(
              _formatDuration(entry.worked!),
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
        ],
      ),
    );
  }

  String _timeRange() {
    final inT = entry.checkIn != null ? _hhmm(entry.checkIn!) : '—';
    final outT = entry.checkOut != null ? _hhmm(entry.checkOut!) : '—';
    final late = entry.isLate ? '  · Late' : '';
    return 'In $inT · Out $outT$late';
  }

  String _hhmm(DateTime dt) =>
      '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';

  String _formatDay(DateTime dt) {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    return '${dt.day} ${months[dt.month - 1]} ${dt.year}';
  }

  String _formatDuration(Duration d) {
    final h = d.inHours;
    final m = d.inMinutes.remainder(60);
    return '${h}h ${m}m';
  }
}
