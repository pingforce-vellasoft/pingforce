import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../injection_container.dart';
import '../data/profile_remote_data_source.dart';
import 'profile_models.dart';

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVE SESSIONS — lists own live sessions (GET /auth/sessions) with revoke.
// ─────────────────────────────────────────────────────────────────────────────

class _SessionsState {
  const _SessionsState({
    this.isLoading = true,
    this.sessions = const [],
    this.errorMessage,
    this.revokingId,
  });

  final bool isLoading;
  final List<ActiveSession> sessions;
  final String? errorMessage;
  final String? revokingId;

  _SessionsState copyWith({
    bool? isLoading,
    List<ActiveSession>? sessions,
    String? errorMessage,
    String? revokingId,
  }) {
    return _SessionsState(
      isLoading: isLoading ?? this.isLoading,
      sessions: sessions ?? this.sessions,
      errorMessage: errorMessage,
      revokingId: revokingId,
    );
  }
}

final _sessionsProvider =
    NotifierProvider<_SessionsNotifier, _SessionsState>(_SessionsNotifier.new);

class _SessionsNotifier extends Notifier<_SessionsState> {
  @override
  _SessionsState build() => const _SessionsState();

  Future<void> load() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final rows = await sl<ProfileRemoteDataSource>().fetchSessions();
      state = state.copyWith(isLoading: false, sessions: rows);
    } catch (_) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Could not load sessions. Pull to retry.',
      );
    }
  }

  Future<String?> revoke(String id) async {
    state = state.copyWith(sessions: state.sessions, revokingId: id);
    try {
      await sl<ProfileRemoteDataSource>().revokeSession(id);
      state = state.copyWith(
        sessions: state.sessions.where((s) => s.id != id).toList(),
        revokingId: null,
      );
      return null;
    } catch (_) {
      state = state.copyWith(sessions: state.sessions, revokingId: null);
      return 'Could not revoke session';
    }
  }
}

class ActiveSessionsScreen extends ConsumerStatefulWidget {
  const ActiveSessionsScreen({super.key});

  @override
  ConsumerState<ActiveSessionsScreen> createState() =>
      _ActiveSessionsScreenState();
}

class _ActiveSessionsScreenState extends ConsumerState<ActiveSessionsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(_sessionsProvider.notifier).load();
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(_sessionsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Active Sessions')),
      body: RefreshIndicator(
        onRefresh: () => ref.read(_sessionsProvider.notifier).load(),
        child: _body(context, state),
      ),
    );
  }

  Widget _body(BuildContext context, _SessionsState state) {
    if (state.isLoading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (state.errorMessage != null) {
      return _centeredMessage(
        context,
        Icons.cloud_off_rounded,
        state.errorMessage!,
      );
    }
    if (state.sessions.isEmpty) {
      return _centeredMessage(
        context,
        Icons.devices_other_rounded,
        'No active sessions.',
      );
    }
    return ListView.separated(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(vertical: 8),
      itemCount: state.sessions.length,
      separatorBuilder: (_, _) => const Divider(height: 1, indent: 72),
      itemBuilder: (context, i) {
        final s = state.sessions[i];
        return _SessionTile(
          session: s,
          isRevoking: state.revokingId == s.id,
          onRevoke: () => _revoke(s),
        );
      },
    );
  }

  Future<void> _revoke(ActiveSession s) async {
    final err = await ref.read(_sessionsProvider.notifier).revoke(s.id);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(err ?? 'Session revoked')),
    );
  }

  Widget _centeredMessage(BuildContext context, IconData icon, String msg) {
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

class _SessionTile extends StatelessWidget {
  const _SessionTile({
    required this.session,
    required this.isRevoking,
    required this.onRevoke,
  });

  final ActiveSession session;
  final bool isRevoking;
  final VoidCallback onRevoke;

  IconData get _platformIcon {
    switch (session.platform?.toLowerCase()) {
      case 'android':
        return Icons.android_rounded;
      case 'ios':
        return Icons.phone_iphone_rounded;
      case 'web':
        return Icons.language_rounded;
      default:
        return Icons.devices_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final subtitleParts = <String>[
      if (session.platform != null && session.platform!.isNotEmpty)
        session.platform!,
      if (session.ip != null && session.ip!.isNotEmpty) session.ip!,
      if (session.lastActivityAt != null)
        'Active ${_relative(session.lastActivityAt!)}',
    ];

    return ListTile(
      leading: Container(
        width: 44,
        height: 44,
        decoration: BoxDecoration(
          color: cs.primary.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Icon(_platformIcon, color: cs.primary),
      ),
      title: Text(session.deviceId ?? 'Unknown device'),
      subtitle: Text(subtitleParts.join(' · ')),
      trailing: isRevoking
          ? const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          : TextButton(
              onPressed: onRevoke,
              style: TextButton.styleFrom(foregroundColor: cs.error),
              child: const Text('Revoke'),
            ),
    );
  }

  String _relative(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return 'just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }
}
