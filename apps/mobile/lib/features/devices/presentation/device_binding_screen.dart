import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/auth/auth_session.dart';
import '../../../core/hardware/device_identity.dart';
import '../../../injection_container.dart';
import '../data/devices_remote_data_source.dart';

// ─────────────────────────────────────────────────────────────────────────────
// DEVICE BINDING  (DeviceManagement.md §7 — registration at onboarding)
// ─────────────────────────────────────────────────────────────────────────────
//
// Final onboarding step for an employee. Binds this handset to the account,
// once. Attendance is punchable only from the bound device and only an admin
// can move that binding, so this cannot be skipped — an unbound employee is
// held here by RouteGuard.
//
// An employee who reaches this screen on a replacement handset (binding already
// exists elsewhere) is offered the change-request route instead.

class DeviceBindingScreen extends ConsumerStatefulWidget {
  const DeviceBindingScreen({super.key});

  @override
  ConsumerState<DeviceBindingScreen> createState() =>
      _DeviceBindingScreenState();
}

class _DeviceBindingScreenState extends ConsumerState<DeviceBindingScreen> {
  DeviceFingerprint? _fingerprint;
  bool _isLoading = false;
  String? _error;
  bool _alreadyBoundElsewhere = false;

  @override
  void initState() {
    super.initState();
    _loadFingerprint();
  }

  Future<void> _loadFingerprint() async {
    final fingerprint = await sl<DeviceIdentity>().fingerprint();
    if (!mounted) return;
    setState(() => _fingerprint = fingerprint);
  }

  Future<void> _bind() async {
    final fingerprint = _fingerprint;
    if (fingerprint == null) return;

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      // Device-key signing lands in a later phase; the server stores whatever
      // key the handset presents and does not yet verify punch signatures.
      await sl<DevicesRemoteDataSource>().bind(fingerprint, 'mobile-client');
      if (!mounted) return;
      AuthSession.instance.deviceBound = true;
      context.go('/home');
    } catch (e) {
      if (!mounted) return;
      final message = _messageOf(e);
      setState(() {
        _isLoading = false;
        // DEVICE-008: a binding already exists, so this handset can only be
        // adopted through the admin-approved change queue.
        _alreadyBoundElsewhere = message.contains('DEVICE-008') ||
            message.toLowerCase().contains('already bound');
        _error = _alreadyBoundElsewhere
            ? 'Your account is already bound to another device. Request a '
                'device change to move it to this one.'
            : message;
      });
    }
  }

  static String _messageOf(Object error) {
    final text = error.toString();
    return text.isEmpty ? 'Could not register this device.' : text;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final fingerprint = _fingerprint;

    return PopScope(
      // Binding is mandatory — back must not escape the gate.
      canPop: false,
      child: Scaffold(
        appBar: AppBar(
          automaticallyImplyLeading: false,
          title: const Text('Register your device'),
        ),
        body: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Icon(
                  Icons.phonelink_lock_outlined,
                  size: 56,
                  color: theme.colorScheme.primary,
                ),
                const SizedBox(height: 16),
                Text(
                  'Your attendance can only be marked from this device.',
                  style: theme.textTheme.titleMedium,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  'This keeps someone else from marking attendance on your '
                  'behalf. To use a different phone later, your administrator '
                  'has to approve the change.',
                  style: theme.textTheme.bodyMedium,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),

                if (fingerprint == null)
                  const Center(child: CircularProgressIndicator())
                else
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        children: [
                          _row(theme, 'Device',
                              fingerprint.deviceName ?? 'This device'),
                          if (fingerprint.manufacturer != null)
                            _row(theme, 'Made by', fingerprint.manufacturer!),
                          if (fingerprint.osVersion != null)
                            _row(theme, 'System', fingerprint.osVersion!),
                          if (fingerprint.appVersion != null)
                            _row(theme, 'App version', fingerprint.appVersion!),
                        ],
                      ),
                    ),
                  ),

                if (_error != null) ...[
                  const SizedBox(height: 16),
                  Text(
                    _error!,
                    style: TextStyle(color: theme.colorScheme.error),
                    textAlign: TextAlign.center,
                  ),
                ],

                const SizedBox(height: 24),
                if (_alreadyBoundElsewhere)
                  FilledButton(
                    onPressed: () => context.push('/device/change-request'),
                    child: const Padding(
                      padding: EdgeInsets.symmetric(vertical: 12),
                      child: Text('Request device change'),
                    ),
                  )
                else
                  FilledButton(
                    onPressed:
                        _isLoading || fingerprint == null ? null : _bind,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      child: _isLoading
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Register this device'),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _row(ThemeData theme, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 110,
            child: Text(label, style: theme.textTheme.bodySmall),
          ),
          Expanded(
            child: Text(value, style: theme.textTheme.bodyMedium),
          ),
        ],
      ),
    );
  }
}
