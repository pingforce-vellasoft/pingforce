import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/widgets/offline_aware_scaffold.dart';
import 'complaint_notifier.dart';

/// Raise a complaint.
///
/// Priority and category are deliberately absent: they are triage decisions
/// the provider makes, and letting customers set them would only produce a
/// register where everything is Critical.
class RaiseComplaintScreen extends ConsumerStatefulWidget {
  const RaiseComplaintScreen({super.key});

  @override
  ConsumerState<RaiseComplaintScreen> createState() =>
      _RaiseComplaintScreenState();
}

class _RaiseComplaintScreenState extends ConsumerState<RaiseComplaintScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;

    final id = await ref.read(complaintNotifierProvider.notifier).raise(
          title: _titleController.text.trim(),
          description: _descriptionController.text.trim(),
        );

    if (!mounted) return;

    if (id == null) {
      final message = ref.read(complaintNotifierProvider).errorMessage;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(message ?? 'Could not submit your complaint.')),
      );
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Complaint submitted')),
    );
    // Replace so Back from the detail screen lands on the list, not the form.
    context.pushReplacement('/complaints/$id');
  }

  @override
  Widget build(BuildContext context) {
    final isSubmitting =
        ref.watch(complaintNotifierProvider.select((s) => s.isSubmitting));

    return OfflineAwareScaffold(
      appBar: AppBar(title: const Text('Raise a complaint')),
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
                labelText: 'What is the problem?',
                hintText: 'e.g. No internet since this morning',
                border: OutlineInputBorder(),
              ),
              validator: (value) => (value == null || value.trim().isEmpty)
                  ? 'Please describe the problem in a few words'
                  : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _descriptionController,
              maxLength: 4000,
              maxLines: 6,
              decoration: const InputDecoration(
                labelText: 'Tell us more',
                hintText:
                    'When it started, what you have already tried, anything '
                    'else that might help.',
                border: OutlineInputBorder(),
                alignLabelWithHint: true,
              ),
              validator: (value) => (value == null || value.trim().isEmpty)
                  ? 'Please add some detail so we can help faster'
                  : null,
            ),
            const SizedBox(height: 20),
            FilledButton(
              onPressed: isSubmitting ? null : _submit,
              child: isSubmitting
                  ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Submit complaint'),
            ),
          ],
        ),
      ),
    );
  }
}
