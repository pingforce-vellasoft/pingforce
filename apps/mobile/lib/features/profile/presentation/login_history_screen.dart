import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../injection_container.dart';
import '../data/profile_remote_data_source.dart';
import 'profile_models.dart';

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN HISTORY — recent sign-in attempts (GET /auth/login-history).
// ─────────────────────────────────────────────────────────────────────────────

class _HistoryState {
  const _HistoryState({
    this.isLoading = true,
    this.entries = const [],
    this.errorMessage,
  });

  final bool isLoading;
  final List<LoginHistoryEntry> entries;
  final String? errorMessage;

  _HistoryState copyWith({
    bool? isLoading,
    List<LoginHistoryEntry>? entries,
    String? errorMessage,
  }) {
    return _HistoryState(
      isLoading: isLoading ?? this.isLoading,
      entries: entries ?? this.entries,
      errorMessage: errorMessage,
    );
  }
}

final _historyProvider =
    NotifierProvider<_HistoryNotifier, _HistoryState>(_HistoryNotifier.new);

class _HistoryNotifier extends Notifier<_HistoryState> {
  @override
  _HistoryState build() => const _HistoryState();

  Future<void> load() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final page =
          await sl<ProfileRemoteDataSource>().fetchLoginHistory(pageSize: 30);
      state = state.copyWith(isLoading: false, entries: page.items);
    } catch (_) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Could not load login history. Pull to retry.',
      );
    }
  }
}

class LoginHistoryScreen extends ConsumerStatefulWidget {
  const LoginHistoryScreen({super.key});

  @override
  ConsumerState<LoginHistoryScreen> createState() => _LoginHistoryScreenState();
}

class _LoginHistoryScreenState extends ConsumerState<LoginHistoryScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(_historyProvider.notifier).load();
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(_historyProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Login History')),
      body: RefreshIndicator(
        onRefresh: () => ref.read(_historyProvider.notifier).load(),
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
      return _message(context, Icons.history_rounded, 'No sign-in activity yet.');
    }
    return ListView.separated(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(vertical: 8),
      itemCount: state.entries.length,
      separatorBuilder: (_, _) => const Divider(height: 1, indent: 72),
      itemBuilder: (context, i) => _HistoryTile(entry: state.entries[i]),
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

class _HistoryTile extends StatelessWidget {
  const _HistoryTile({required this.entry});
  final LoginHistoryEntry entry;

  @override
  Widget build(BuildContext context) {
    final ok = entry.isSuccess;
    final color = ok ? PingForceColors.statusSuccess : PingForceColors.statusCritical;
    final subtitleParts = <String>[
      if (entry.authMethod != null && entry.authMethod!.isNotEmpty)
        entry.authMethod!,
      if (entry.ipAddress != null && entry.ipAddress!.isNotEmpty)
        entry.ipAddress!,
    ];

    return ListTile(
      leading: Container(
        width: 44,
        height: 44,
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Icon(
          ok ? Icons.check_circle_rounded : Icons.error_rounded,
          color: color,
        ),
      ),
      title: Text(ok ? 'Successful sign-in' : 'Failed attempt'),
      subtitle: Text(subtitleParts.join(' · ')),
      trailing: entry.createdAt != null
          ? Text(
              _formatDate(entry.createdAt!),
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            )
          : null,
    );
  }

  String _formatDate(DateTime dt) {
    final now = DateTime.now();
    final sameDay =
        dt.year == now.year && dt.month == now.month && dt.day == now.day;
    final hh = dt.hour.toString().padLeft(2, '0');
    final mm = dt.minute.toString().padLeft(2, '0');
    if (sameDay) return '$hh:$mm';
    return '${dt.day}/${dt.month} $hh:$mm';
  }
}
