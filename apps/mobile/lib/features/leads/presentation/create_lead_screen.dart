import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'lead_notifiers.dart';

// ─────────────────────────────────────────────────────────────────────────────
// CREATE LEAD — /leads/new (3.4 LEAD_CAPTURE.md mobile capture). Works
// offline: the lead is queued and replayed through POST /leads/sync, where
// the device-generated lead number prevents duplicates.
// ─────────────────────────────────────────────────────────────────────────────

final _emailPattern = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');

class CreateLeadScreen extends ConsumerStatefulWidget {
  const CreateLeadScreen({super.key});

  @override
  ConsumerState<CreateLeadScreen> createState() => _CreateLeadScreenState();
}

class _CreateLeadScreenState extends ConsumerState<CreateLeadScreen> {
  final _formKey = GlobalKey<FormState>();
  final _firstName = TextEditingController();
  final _lastName = TextEditingController();
  final _company = TextEditingController();
  final _mobile = TextEditingController();
  final _email = TextEditingController();
  final _value = TextEditingController();
  String? _stageId;

  @override
  void dispose() {
    for (final c in [
      _firstName,
      _lastName,
      _company,
      _mobile,
      _email,
      _value,
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  void _submit() {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    ref
        .read(createLeadProvider.notifier)
        .submit(
          firstName: _firstName.text,
          lastName: _lastName.text,
          companyName: _company.text,
          mobile: _mobile.text,
          email: _email.text,
          expectedValue: double.tryParse(_value.text.trim()),
          pipelineStageId: _stageId,
        );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(createLeadProvider);
    final stages = ref.watch(leadListProvider).stages;

    ref.listen(createLeadProvider, (previous, next) {
      if (next.done && previous?.done != true) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              next.queuedOffline
                  ? 'Saved offline — it will sync when you are back online'
                  : 'Lead created',
            ),
          ),
        );
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
      appBar: AppBar(title: const Text('New lead')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(
              controller: _firstName,
              textInputAction: TextInputAction.next,
              textCapitalization: TextCapitalization.words,
              decoration: const InputDecoration(labelText: 'First name *'),
              validator: (v) => (v == null || v.trim().isEmpty)
                  ? 'First name is required'
                  : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _lastName,
              textInputAction: TextInputAction.next,
              textCapitalization: TextCapitalization.words,
              decoration: const InputDecoration(labelText: 'Last name'),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _company,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(labelText: 'Company'),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _mobile,
              keyboardType: TextInputType.phone,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(labelText: 'Mobile'),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(labelText: 'Email'),
              validator: (v) {
                final t = v?.trim() ?? '';
                return t.isEmpty || _emailPattern.hasMatch(t)
                    ? null
                    : 'Enter a valid email';
              },
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _value,
              keyboardType: const TextInputType.numberWithOptions(
                decimal: true,
              ),
              decoration: const InputDecoration(labelText: 'Expected value'),
              validator: (v) {
                final t = v?.trim() ?? '';
                return t.isEmpty || double.tryParse(t) != null
                    ? null
                    : 'Enter a number';
              },
            ),
            if (stages.isNotEmpty) ...[
              const SizedBox(height: 12),
              DropdownButtonFormField<String?>(
                initialValue: _stageId,
                decoration: const InputDecoration(labelText: 'Stage'),
                items: [
                  const DropdownMenuItem<String?>(
                    value: null,
                    child: Text('No stage'),
                  ),
                  for (final s in stages)
                    DropdownMenuItem<String?>(value: s.id, child: Text(s.name)),
                ],
                onChanged: (v) => setState(() => _stageId = v),
              ),
            ],
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: state.isSubmitting ? null : _submit,
              icon: state.isSubmitting
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.save_outlined),
              label: const Text('Save lead'),
            ),
          ],
        ),
      ),
    );
  }
}
