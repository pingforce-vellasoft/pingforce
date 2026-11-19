import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'create_visit_notifier.dart';
import 'visit_state.dart';
import 'widgets/visit_widgets.dart';

// ─────────────────────────────────────────────────────────────────────────────
// CREATE VISIT SCREEN — /visits/new (3.2 VISIT_MANAGEMENT.md §5)
// Creates an unassigned (PLANNED) visit; assignment stays in the admin portal.
// ─────────────────────────────────────────────────────────────────────────────

const _visitTypes = [
  'PLANNED',
  'AD_HOC',
  'EMERGENCY',
  'MAINTENANCE',
  'INSPECTION',
  'INSTALLATION',
  'COMPLAINT',
  'SALES',
  'SURVEY',
  'FOLLOW_UP',
];

const _priorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

String _pretty(String value) {
  final words = value.toLowerCase().split('_');
  return words
      .map((w) => w.isEmpty ? w : '${w[0].toUpperCase()}${w.substring(1)}')
      .join(' ');
}

class CreateVisitScreen extends ConsumerStatefulWidget {
  const CreateVisitScreen({super.key});

  @override
  ConsumerState<CreateVisitScreen> createState() => _CreateVisitScreenState();
}

class _CreateVisitScreenState extends ConsumerState<CreateVisitScreen> {
  final _formKey = GlobalKey<FormState>();
  final _purpose = TextEditingController();
  final _description = TextEditingController();
  final _address = TextEditingController();
  String _visitType = 'PLANNED';
  String _priority = 'MEDIUM';
  DateTime _plannedStart = DateTime.now().add(const Duration(hours: 1));

  @override
  void dispose() {
    _purpose.dispose();
    _description.dispose();
    _address.dispose();
    super.dispose();
  }

  Future<void> _pickStart() async {
    final now = DateTime.now();
    final date = await showDatePicker(
      context: context,
      initialDate: _plannedStart,
      firstDate: DateTime(now.year, now.month, now.day),
      lastDate: now.add(const Duration(days: 365)),
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(_plannedStart),
    );
    if (time == null) return;
    setState(() {
      _plannedStart =
          DateTime(date.year, date.month, date.day, time.hour, time.minute);
    });
  }

  void _submit() {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    ref.read(createVisitProvider.notifier).submit(
          CreateVisitRequest(
            purpose: _purpose.text.trim(),
            description: _description.text.trim(),
            siteAddress: _address.text.trim(),
            visitType: _visitType,
            priority: _priority,
            plannedStartAt: _plannedStart,
          ),
        );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(createVisitProvider);

    ref.listen(createVisitProvider, (previous, next) {
      final created = next.createdVisitId;
      if (created != null && created != previous?.createdVisitId) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Visit created')),
        );
        context.pop();
        return;
      }
      final message = next.errorMessage;
      if (message != null && message != previous?.errorMessage) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(message)));
      }
    });

    return Scaffold(
      appBar: AppBar(title: const Text('New visit')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(
              controller: _purpose,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(labelText: 'Purpose *'),
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? 'Purpose is required' : null,
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _visitType,
              decoration: const InputDecoration(labelText: 'Visit type'),
              items: [
                for (final t in _visitTypes)
                  DropdownMenuItem(value: t, child: Text(_pretty(t))),
              ],
              onChanged: (v) => setState(() => _visitType = v ?? _visitType),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _priority,
              decoration: const InputDecoration(labelText: 'Priority'),
              items: [
                for (final p in _priorities)
                  DropdownMenuItem(value: p, child: Text(_pretty(p))),
              ],
              onChanged: (v) => setState(() => _priority = v ?? _priority),
            ),
            const SizedBox(height: 12),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.schedule_outlined),
              title: const Text('Planned start'),
              subtitle: Text(formatVisitTime(_plannedStart)),
              trailing: const Icon(Icons.edit_calendar_outlined),
              onTap: _pickStart,
            ),
            TextFormField(
              controller: _address,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(labelText: 'Site address'),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _description,
              minLines: 2,
              maxLines: 5,
              decoration: const InputDecoration(labelText: 'Description'),
            ),
            const SizedBox(height: 8),
            Text(
              'The visit is created unassigned. Assign it to an employee from '
              'the admin portal.',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: state.isSubmitting ? null : _submit,
              icon: state.isSubmitting
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.add_task),
              label: const Text('Create visit'),
            ),
          ],
        ),
      ),
    );
  }
}
