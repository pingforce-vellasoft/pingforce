import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/hardware/device_identity.dart';
import '../../../injection_container.dart';
import '../data/devices_remote_data_source.dart';

// ─────────────────────────────────────────────────────────────────────────────
// DEVICE CHANGE REQUEST  (DeviceManagement.md §15 — administrator features)
// ─────────────────────────────────────────────────────────────────────────────
//
// The only route from one handset to the next. The employee states why; an
// administrator approves or rejects. Nothing here moves the binding on its own —
// that is the point: self-service rebinding is what lets a lent phone punch for
// a colleague.

const _reasons = <String, String>{
  'LOST': 'I lost my previous phone',
  'STOLEN': 'My previous phone was stolen',
  'DAMAGED': 'My previous phone is damaged',
  'UPGRADED': 'I changed to a new phone',
  'OTHER': 'Another reason',
};

class DeviceChangeRequestScreen extends ConsumerStatefulWidget {
  const DeviceChangeRequestScreen({super.key});

  @override
  ConsumerState<DeviceChangeRequestScreen> createState() =>
      _DeviceChangeRequestScreenState();
}

class _DeviceChangeRequestScreenState
    extends ConsumerState<DeviceChangeRequestScreen> {
  final _notesCtrl = TextEditingController();

  DeviceFingerprint? _fingerprint;
  String _reason = 'LOST';
  bool _isLoading = false;
  bool _isChecking = true;
  String? _error;
  Map<String, dynamic>? _pendingRequest;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final fingerprint = await sl<DeviceIdentity>().fingerprint();

    // An employee who already asked must see the pending request, not a second
    // form — the API rejects a duplicate with DEVICE-010 anyway.
    Map<String, dynamic>? pending;
    try {
      final me = await sl<DevicesRemoteDataSource>().getMyDevice();
      final raw = me['pendingRequest'];
      if (raw is Map) pending = Map<String, dynamic>.from(raw);
    } catch (_) {
      // Offline or unreachable: fall through to the form. Submitting will
      // surface the real error.
    }

    if (!mounted) return;
    setState(() {
      _fingerprint = fingerprint;
      _pendingRequest = pending;
      _isChecking = false;
    });
  }

  Future<void> _submit() async {
    final fingerprint = _fingerprint;
    if (fingerprint == null) return;

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final request = await sl<DevicesRemoteDataSource>().createChangeRequest(
        fingerprint: fingerprint,
        publicKey: 'mobile-client',
        reason: _reason,
        notes: _notesCtrl.text.trim(),
      );
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _pendingRequest = request;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _error = e.toString();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Device change')),
      body: SafeArea(
        child: _isChecking
            ? const Center(child: CircularProgressIndicator())
            : SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: _pendingRequest != null
                    ? _buildPending(theme)
                    : _buildForm(theme),
              ),
      ),
    );
  }

  Widget _buildPending(ThemeData theme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Icon(Icons.hourglass_top_outlined,
            size: 56, color: theme.colorScheme.primary),
        const SizedBox(height: 16),
        Text(
          'Your request is with your administrator',
          style: theme.textTheme.titleMedium,
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 8),
        Text(
          'Once it is approved you can mark attendance from this phone. Until '
          'then, use your previous device if you still have it.',
          style: theme.textTheme.bodyMedium,
          textAlign: TextAlign.center,
        ),
      ],
    );
  }

  Widget _buildForm(ThemeData theme) {
    final fingerprint = _fingerprint;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Attendance can only be marked from the phone registered to you. '
          'Tell your administrator why you need to change it.',
          style: theme.textTheme.bodyMedium,
        ),
        const SizedBox(height: 24),

        if (fingerprint != null)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('This phone', style: theme.textTheme.titleSmall),
                  const SizedBox(height: 8),
                  Text(
                    [
                      fingerprint.deviceName,
                      fingerprint.osVersion,
                    ].whereType<String>().join(' · '),
                    style: theme.textTheme.bodyMedium,
                  ),
                ],
              ),
            ),
          ),

        const SizedBox(height: 16),
        Text('Reason', style: theme.textTheme.titleSmall),
        const SizedBox(height: 8),
        // AbsorbPointer rather than a null onChanged: RadioGroup requires a
        // non-nullable callback, so the in-flight state is enforced here.
        AbsorbPointer(
          absorbing: _isLoading,
          child: RadioGroup<String>(
            groupValue: _reason,
            onChanged: (value) => setState(() => _reason = value ?? _reason),
            child: Column(
              children: [
                for (final entry in _reasons.entries)
                  RadioListTile<String>(
                    contentPadding: EdgeInsets.zero,
                    value: entry.key,
                    title: Text(entry.value),
                  ),
              ],
            ),
          ),
        ),

        const SizedBox(height: 8),
        TextField(
          controller: _notesCtrl,
          maxLines: 3,
          maxLength: 1000,
          decoration: const InputDecoration(
            labelText: 'Anything else your administrator should know',
            border: OutlineInputBorder(),
          ),
        ),

        if (_error != null) ...[
          const SizedBox(height: 8),
          Text(
            _error!,
            style: TextStyle(color: theme.colorScheme.error),
          ),
        ],

        const SizedBox(height: 16),
        FilledButton(
          onPressed: _isLoading ? null : _submit,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: _isLoading
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Send request'),
          ),
        ),
      ],
    );
  }
}
