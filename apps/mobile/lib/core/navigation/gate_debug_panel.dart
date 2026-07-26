import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:go_router/go_router.dart';

import '../auth/auth_session.dart';
import '../../injection_container.dart';
import 'app_shell.dart';

/// Debug-only view of the mobile gate chain.
///
/// The chain parks the app on the first gate whose condition holds, and the
/// gate screens issue no API calls, so a stall looks identical from the outside
/// whatever caused it. On a release APK — how this app is currently tested —
/// there is no `flutter logs` to read the RouteGuard diagnostics from, so the
/// flags are invisible. This panel puts them on screen.
///
/// It also clears `permissionsFlowSeen`, which is device-local and therefore
/// untouched by the server-side gate-chain reset.
///
/// Debug builds only. `show` is a no-op when `kDebugMode` is false, so the
/// panel cannot be opened in a release build even if a caller is left behind.
class GateDebugPanel extends StatefulWidget {
  const GateDebugPanel._();

  /// Opens the panel. No-op outside debug builds.
  static Future<void> show(BuildContext context) {
    if (!kDebugMode) return Future<void>.value();
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => const GateDebugPanel._(),
    );
  }

  @override
  State<GateDebugPanel> createState() => _GateDebugPanelState();
}

class _GateDebugPanelState extends State<GateDebugPanel> {
  @override
  Widget build(BuildContext context) {
    final session = AuthSession.instance;
    final theme = Theme.of(context);

    // What the guard would decide for /home right now — i.e. the gate the app
    // is currently parked on.
    final pending = RouteGuard.resolve(
      GateState.fromSession('/home'),
    );

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Gate chain', style: theme.textTheme.titleLarge),
            const SizedBox(height: 4),
            Text(
              'Debug build only',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 16),

            _GateRow(
              label: '1  authenticated',
              // Every other gate is behind auth, so an unauthenticated session
              // reads as "blocked" rather than "cleared".
              cleared: session.isAuthenticated,
            ),
            _GateRow(
              label: '1b password rotated',
              cleared: !session.mustChangePassword,
            ),
            _GateRow(
              label: '1c profile complete',
              cleared: session.isOnboarded,
            ),
            _GateRow(
              label: '1c-bis device bound',
              cleared: session.deviceBound,
            ),
            _GateRow(
              label: '1d permissions seen',
              cleared: session.permissionsFlowSeen,
              // The only flag the server reset cannot clear.
              deviceLocal: true,
            ),
            const Divider(height: 28),

            _KeyValue(label: 'role', value: session.roleCode ?? '—'),
            _KeyValue(
              label: 'next redirect',
              value: pending ?? 'none (chain clear)',
            ),
            const SizedBox(height: 20),

            FilledButton.tonalIcon(
              onPressed: _resetPermissionsGate,
              icon: const Icon(Icons.refresh),
              label: const Text('Re-arm permissions gate'),
            ),
            const SizedBox(height: 8),
            Text(
              'Clears the device-local permissions flag so the flow replays. '
              'The other gates are server state — reset them with '
              'POST /api/v1/testing/reset-gate-chain.',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _resetPermissionsGate() async {
    await AuthSession.instance
        .resetPermissionsFlowSeen(sl<FlutterSecureStorage>());
    if (!mounted) return;
    setState(() {});
    // Kick the router so the re-armed gate fires immediately rather than on the
    // next navigation.
    context.go('/home');
  }
}

class _GateRow extends StatelessWidget {
  const _GateRow({
    required this.label,
    required this.cleared,
    this.deviceLocal = false,
  });

  final String label;
  final bool cleared;
  final bool deviceLocal;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        children: [
          Icon(
            cleared ? Icons.check_circle : Icons.radio_button_unchecked,
            size: 20,
            color: cleared ? Colors.green : scheme.error,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
          if (deviceLocal)
            Text(
              'device-local',
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: scheme.onSurfaceVariant,
                  ),
            ),
        ],
      ),
    );
  }
}

class _KeyValue extends StatelessWidget {
  const _KeyValue({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 110,
            child: Text(
              label,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ),
          Expanded(
            child: Text(value, style: theme.textTheme.bodyMedium),
          ),
        ],
      ),
    );
  }
}
