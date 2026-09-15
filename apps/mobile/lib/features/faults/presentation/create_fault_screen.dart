import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/connectivity_provider.dart';
import '../../../core/sync/sync_provider.dart';
import '../../../core/sync/sync_state.dart';
import '../../../core/widgets/app_states.dart';
import '../../../core/widgets/offline_aware_scaffold.dart';
import '../../../injection_container.dart';
import '../data/faults_remote_data_source.dart';
import 'fault_notifier.dart';
import 'fault_state.dart';

/// Raise a fault from site (channel MOBILE).
///
/// The fault number is generated on the device so the record has a stable
/// natural key before it reaches the server — that key is what `POST
/// /faults/sync` dedupes on when the same fault is replayed after an offline
/// spell.
class CreateFaultScreen extends ConsumerStatefulWidget {
  const CreateFaultScreen({super.key});

  @override
  ConsumerState<CreateFaultScreen> createState() => _CreateFaultScreenState();
}

class _CreateFaultScreenState extends ConsumerState<CreateFaultScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();

  FaultPriority _priority = FaultPriority.medium;
  bool _submitting = false;

  late final String _faultNumber = _generateFaultNumber();

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  /// `PF-<epoch36><3 digits>` — the same shape the API and portal generate.
  String _generateFaultNumber() {
    final suffix = 100 + Random().nextInt(900);
    return 'PF-${DateTime.now().millisecondsSinceEpoch.toRadixString(36).toUpperCase()}$suffix';
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;

    setState(() => _submitting = true);

    final title = _titleController.text.trim();
    final description = _descriptionController.text.trim();

    // Offline: queue against POST /faults/sync rather than losing the report.
    if (!ref.read(isOnlineProvider)) {
      final clientRef = 'fault-create-$_faultNumber';
      ref.read(syncProvider.notifier).enqueue(
            SyncQueueItem(
              id: clientRef,
              module: SyncItemModule.faults,
              entityId: _faultNumber,
              operationType: 'create',
              description: 'New fault $_faultNumber',
              queuedAt: DateTime.now(),
              payload: {
                'clientRef': clientRef,
                'action': 'CREATE',
                'timestamp': DateTime.now().toUtc().toIso8601String(),
                'faultNumber': _faultNumber,
                'title': title,
                'description': description,
                'priority': _priority.wireValue,
              },
            ),
          );

      if (!mounted) return;
      AppSnackBar.showSuccess(
        context,
        'Saved offline — will sync when you are back online',
      );
      context.pop();
      return;
    }

    try {
      await sl<FaultsRemoteDataSource>().createFault(
        faultNumber: _faultNumber,
        title: title,
        description: description,
        priority: _priority,
      );
      await ref.read(faultNotifierProvider.notifier).load();

      if (!mounted) return;
      AppSnackBar.showSuccess(context, 'Fault $_faultNumber raised');
      context.pop();
    } catch (_) {
      if (!mounted) return;
      setState(() => _submitting = false);
      AppSnackBar.showError(context, 'Could not raise the fault.');
    }
  }

  @override
  Widget build(BuildContext context) {
    return OfflineAwareScaffold(
      appBar: AppBar(title: const Text('Report a fault')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(
              controller: _titleController,
              maxLength: 200,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                labelText: 'Title',
                hintText: 'Short summary of the fault',
                border: OutlineInputBorder(),
              ),
              validator: (v) => (v == null || v.trim().isEmpty)
                  ? 'A short title is required'
                  : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _descriptionController,
              maxLength: 5000,
              maxLines: 5,
              decoration: const InputDecoration(
                labelText: 'Description',
                hintText: 'What is wrong, and what have you observed on site?',
                border: OutlineInputBorder(),
                alignLabelWithHint: true,
              ),
              validator: (v) => (v == null || v.trim().isEmpty)
                  ? 'Describe what you found on site'
                  : null,
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<FaultPriority>(
              initialValue: _priority,
              decoration: const InputDecoration(
                labelText: 'Priority',
                border: OutlineInputBorder(),
              ),
              items: FaultPriority.values
                  .map(
                    (p) => DropdownMenuItem(value: p, child: Text(p.label)),
                  )
                  .toList(),
              onChanged: (value) =>
                  setState(() => _priority = value ?? FaultPriority.medium),
            ),
            const SizedBox(height: 20),
            FilledButton(
              onPressed: _submitting ? null : _submit,
              child: _submitting
                  ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Submit fault'),
            ),
          ],
        ),
      ),
    );
  }
}
