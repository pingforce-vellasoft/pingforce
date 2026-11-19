import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'create_attempt_notifier.dart';
import 'create_attempt_state.dart';

// ─────────────────────────────────────────────────────────────────────────────
// CREATE ATTEMPT SCREEN — /faults/:id/attempts/new (3.3 ATTEMPT_MANAGEMENT.md)
// Records one field attempt. It does not move the fault status: the technician
// still uses "Change Status" on the detail screen for that.
// ─────────────────────────────────────────────────────────────────────────────

String _fmt(DateTime dt) {
  String two(int n) => n.toString().padLeft(2, '0');
  return '${dt.year}-${two(dt.month)}-${two(dt.day)} '
      '${two(dt.hour)}:${two(dt.minute)}';
}

class CreateAttemptScreen extends ConsumerStatefulWidget {
  const CreateAttemptScreen({super.key, required this.faultId});

  final String faultId;

  @override
  ConsumerState<CreateAttemptScreen> createState() =>
      _CreateAttemptScreenState();
}

class _CreateAttemptScreenState extends ConsumerState<CreateAttemptScreen> {
  final _formKey = GlobalKey<FormState>();
  final _notes = TextEditingController();
  final _nextAction = TextEditingController();
  String _type = 'INITIAL_VISIT';
  String _outcome = 'REVISIT_REQUIRED';
  DateTime _startedAt = DateTime.now().subtract(const Duration(minutes: 30));
  DateTime? _endedAt = DateTime.now();
  bool _captureLocation = true;

  @override
  void dispose() {
    _notes.dispose();
    _nextAction.dispose();
    super.dispose();
  }

  Future<DateTime?> _pick(DateTime initial) async {
    final now = DateTime.now();
    final date = await showDatePicker(
      context: context,
      initialDate: initial.isAfter(now) ? now : initial,
      firstDate: now.subtract(const Duration(days: 30)),
      lastDate: now,
    );
    if (date == null || !mounted) return null;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(initial),
    );
    if (time == null) return null;
    return DateTime(date.year, date.month, date.day, time.hour, time.minute);
  }

  void _submit() {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    ref
        .read(createAttemptProvider(widget.faultId).notifier)
        .submit(
          attemptType: _type,
          outcome: _outcome,
          startedAt: _startedAt,
          endedAt: _endedAt,
          workNotes: _notes.text,
          nextAction: _nextAction.text,
          captureLocation: _captureLocation,
        );
  }

  @override
  Widget build(BuildContext context) {
    final provider = createAttemptProvider(widget.faultId);
    final state = ref.watch(provider);

    ref.listen(provider, (previous, next) {
      if (next.saved && previous?.saved != true) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Attempt recorded')));
        context.pop();
        return;
      }
      final message = next.errorMessage;
      if (message != null && message != previous?.errorMessage) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(message)));
      }
    });

    return Scaffold(
      appBar: AppBar(title: const Text('Add attempt')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            DropdownButtonFormField<String>(
              initialValue: _type,
              decoration: const InputDecoration(labelText: 'Attempt type'),
              items: [
                for (final t in faultAttemptTypes)
                  DropdownMenuItem(
                    value: t,
                    child: Text(prettyAttemptValue(t)),
                  ),
              ],
              onChanged: (v) => setState(() => _type = v ?? _type),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _outcome,
              decoration: const InputDecoration(labelText: 'Outcome'),
              items: [
                for (final o in faultAttemptOutcomes)
                  DropdownMenuItem(
                    value: o,
                    child: Text(prettyAttemptValue(o)),
                  ),
              ],
              onChanged: (v) => setState(() => _outcome = v ?? _outcome),
            ),
            const SizedBox(height: 12),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.play_circle_outline),
              title: const Text('Started'),
              subtitle: Text(_fmt(_startedAt)),
              trailing: const Icon(Icons.edit_calendar_outlined),
              onTap: () async {
                final picked = await _pick(_startedAt);
                if (picked != null) setState(() => _startedAt = picked);
              },
            ),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.stop_circle_outlined),
              title: const Text('Finished'),
              subtitle: Text(
                _endedAt == null ? 'Still in progress' : _fmt(_endedAt!),
              ),
              trailing: _endedAt == null
                  ? const Icon(Icons.edit_calendar_outlined)
                  : IconButton(
                      tooltip: 'Clear finish time',
                      icon: const Icon(Icons.clear),
                      onPressed: () => setState(() => _endedAt = null),
                    ),
              onTap: () async {
                final picked = await _pick(_endedAt ?? DateTime.now());
                if (picked != null) setState(() => _endedAt = picked);
              },
            ),
            if (_endedAt != null && _endedAt!.isBefore(_startedAt))
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text(
                  'Finish time is before the start time.',
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ),
            TextFormField(
              controller: _notes,
              minLines: 3,
              maxLines: 8,
              maxLength: 4000,
              decoration: InputDecoration(
                labelText: _outcome == 'RESOLVED'
                    ? 'Work notes *'
                    : 'Work notes',
                hintText: 'What was checked, fixed or replaced',
              ),
              validator: (v) =>
                  _outcome == 'RESOLVED' && (v == null || v.trim().isEmpty)
                  ? 'Work notes are required for a resolved attempt'
                  : null,
            ),
            TextFormField(
              controller: _nextAction,
              maxLength: 1000,
              decoration: const InputDecoration(
                labelText: 'Next action',
                hintText: 'e.g. Return with replacement ONT',
              ),
            ),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              value: _captureLocation,
              onChanged: (v) => setState(() => _captureLocation = v),
              title: const Text('Attach my current location'),
              subtitle: const Text(
                'Saved without it if no GPS fix is available',
              ),
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed:
                  state.isSubmitting ||
                      (_endedAt != null && _endedAt!.isBefore(_startedAt))
                  ? null
                  : _submit,
              icon: state.isSubmitting
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.save_outlined),
              label: const Text('Save attempt'),
            ),
          ],
        ),
      ),
    );
  }
}
