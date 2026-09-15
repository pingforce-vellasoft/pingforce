import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/widgets/offline_aware_scaffold.dart';
import '../domain/entities/complaint.dart';
import 'complaint_notifier.dart';
import 'my_complaints_screen.dart' show ComplaintStatusChip;

/// A single complaint as the customer sees it: what has happened, and the
/// three things they can do about it — add a note, reopen, or rate.
class ComplaintDetailScreen extends ConsumerStatefulWidget {
  const ComplaintDetailScreen({super.key, required this.complaintId});

  final String complaintId;

  @override
  ConsumerState<ComplaintDetailScreen> createState() =>
      _ComplaintDetailScreenState();
}

class _ComplaintDetailScreenState
    extends ConsumerState<ComplaintDetailScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref
          .read(complaintNotifierProvider.notifier)
          .loadDetail(widget.complaintId);
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(complaintNotifierProvider);
    final complaint = state.selected;
    final theme = Theme.of(context);

    return OfflineAwareScaffold(
      appBar: AppBar(title: Text(complaint?.faultNumber ?? 'Complaint')),
      body: Builder(
        builder: (context) {
          if (state.isLoadingDetail && complaint == null) {
            return const Center(child: CircularProgressIndicator());
          }
          if (complaint == null) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Text(
                  state.errorMessage ?? 'This complaint could not be loaded.',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodyMedium,
                ),
              ),
            );
          }

          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(complaint.title,
                        style: theme.textTheme.titleLarge),
                  ),
                  ComplaintStatusChip(status: complaint.status),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                complaint.description,
                style: theme.textTheme.bodyMedium,
              ),
              const SizedBox(height: 16),

              if (complaint.isOpen && complaint.expectedBy != null)
                _InfoTile(
                  icon: Icons.schedule,
                  label: 'Expected by',
                  value: _formatDate(complaint.expectedBy!),
                ),
              if (complaint.technicianFirstName != null)
                _InfoTile(
                  icon: Icons.engineering,
                  label: 'Handled by',
                  value: complaint.technicianFirstName!,
                ),
              if (complaint.rating != null)
                _InfoTile(
                  icon: Icons.star,
                  label: 'Your rating',
                  value: '${complaint.rating}/5',
                ),

              if (complaint.attachments.isNotEmpty) ...[
                const SizedBox(height: 20),
                Text('Attachments', style: theme.textTheme.titleSmall),
                const SizedBox(height: 8),
                ...complaint.attachments.map(
                  (a) => ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: Icon(
                      a.isImage ? Icons.image : Icons.insert_drive_file,
                    ),
                    title: Text(a.fileName),
                    dense: true,
                  ),
                ),
              ],

              const SizedBox(height: 20),
              Text('Updates', style: theme.textTheme.titleSmall),
              const SizedBox(height: 8),
              if (complaint.updates.isEmpty)
                Text(
                  'No updates yet. We will post here as we make progress.',
                  style: theme.textTheme.bodySmall
                      ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                ),
              ...complaint.updates.map((u) => _UpdateTile(update: u)),

              const SizedBox(height: 24),
              if (complaint.canComment)
                OutlinedButton.icon(
                  onPressed: state.isSubmitting
                      ? null
                      : () => _promptForNotes(
                            title: 'Add a note',
                            hint: 'Anything else we should know?',
                            confirmLabel: 'Send',
                            onConfirm: (notes) => ref
                                .read(complaintNotifierProvider.notifier)
                                .comment(complaint.id, notes),
                          ),
                  icon: const Icon(Icons.chat_bubble_outline),
                  label: const Text('Add a note'),
                ),
              if (complaint.canReopen) ...[
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  onPressed: state.isSubmitting
                      ? null
                      : () => _promptForNotes(
                            title: 'Reopen complaint',
                            hint: 'What is still wrong?',
                            confirmLabel: 'Reopen',
                            onConfirm: (notes) => ref
                                .read(complaintNotifierProvider.notifier)
                                .reopen(complaint.id, notes),
                          ),
                  icon: const Icon(Icons.refresh),
                  label: const Text('Still not fixed — reopen'),
                ),
              ],
              if (complaint.canRate) ...[
                const SizedBox(height: 8),
                FilledButton.icon(
                  onPressed:
                      state.isSubmitting ? null : () => _promptForRating(complaint),
                  icon: const Icon(Icons.star_outline),
                  label: const Text('Rate this resolution'),
                ),
              ],
            ],
          );
        },
      ),
    );
  }

  Future<void> _promptForNotes({
    required String title,
    required String hint,
    required String confirmLabel,
    required Future<bool> Function(String notes) onConfirm,
  }) async {
    final controller = TextEditingController();
    final notes = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(title),
        content: TextField(
          controller: controller,
          maxLines: 4,
          maxLength: 2000,
          autofocus: true,
          decoration: InputDecoration(hintText: hint),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(ctx).pop(controller.text.trim()),
            child: Text(confirmLabel),
          ),
        ],
      ),
    );
    controller.dispose();

    if (notes == null || notes.isEmpty) return;

    final ok = await onConfirm(notes);
    if (!mounted) return;
    _reportOutcome(ok, 'Sent');
  }

  Future<void> _promptForRating(Complaint complaint) async {
    var rating = 5;
    final controller = TextEditingController();

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('How did we do?'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(5, (i) {
                  final value = i + 1;
                  return IconButton(
                    onPressed: () => setDialogState(() => rating = value),
                    icon: Icon(
                      value <= rating ? Icons.star : Icons.star_border,
                      color: Theme.of(ctx).colorScheme.primary,
                    ),
                  );
                }),
              ),
              TextField(
                controller: controller,
                maxLength: 1000,
                maxLines: 3,
                decoration: const InputDecoration(
                  hintText: 'Anything you would like to add? (optional)',
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(ctx).pop(true),
              child: const Text('Submit'),
            ),
          ],
        ),
      ),
    );

    final comment = controller.text.trim();
    controller.dispose();

    if (confirmed != true) return;

    final ok = await ref
        .read(complaintNotifierProvider.notifier)
        .rate(complaint.id, rating, comment.isEmpty ? null : comment);

    if (!mounted) return;
    _reportOutcome(ok, 'Thank you for your feedback');
  }

  void _reportOutcome(bool ok, String successMessage) {
    final message = ok
        ? successMessage
        : ref.read(complaintNotifierProvider).errorMessage ??
            'That did not go through. Please try again.';
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }

  String _formatDate(DateTime when) {
    final local = when.toLocal();
    final d = local.day.toString().padLeft(2, '0');
    final m = local.month.toString().padLeft(2, '0');
    final h = local.hour.toString().padLeft(2, '0');
    final min = local.minute.toString().padLeft(2, '0');
    return '$d/$m $h:$min';
  }
}

class _InfoTile extends StatelessWidget {
  const _InfoTile({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(icon, size: 16, color: theme.colorScheme.onSurfaceVariant),
          const SizedBox(width: 8),
          Text(
            '$label: ',
            style: theme.textTheme.bodySmall
                ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
          ),
          Expanded(child: Text(value, style: theme.textTheme.bodySmall)),
        ],
      ),
    );
  }
}

class _UpdateTile extends StatelessWidget {
  const _UpdateTile({required this.update});
  final ComplaintUpdate update;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            margin: const EdgeInsets.only(top: 5),
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: theme.colorScheme.primary,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _relative(update.createdAt),
                  style: theme.textTheme.labelSmall
                      ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                ),
                if (update.notes != null && update.notes!.isNotEmpty)
                  Text(update.notes!, style: theme.textTheme.bodyMedium),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _relative(DateTime when) {
    final diff = DateTime.now().difference(when);
    if (diff.inDays > 0) return '${diff.inDays}d ago';
    if (diff.inHours > 0) return '${diff.inHours}h ago';
    if (diff.inMinutes > 0) return '${diff.inMinutes}m ago';
    return 'Just now';
  }
}
