import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../visit_notifier.dart';
import '../visit_state.dart';

// Shared visit widgets used by the list and detail screens.

String formatVisitTime(DateTime dt) {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  final hour12 = dt.hour % 12 == 0 ? 12 : dt.hour % 12;
  final minute = dt.minute.toString().padLeft(2, '0');
  final meridiem = dt.hour < 12 ? 'AM' : 'PM';
  return '${dt.day} ${months[dt.month - 1]} · $hour12:$minute $meridiem';
}

class VisitActionButton extends ConsumerWidget {
  const VisitActionButton({
    super.key,
    required this.visit,
    required this.action,
    required this.enabled,
    this.onDone,
  });

  final VisitSummary visit;
  final VisitAction action;
  final bool enabled;

  /// Called after the action ran (or was queued offline), e.g. to reload a
  /// detail screen.
  final VoidCallback? onDone;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final (label, icon) = switch (action) {
      VisitAction.accept => ('Accept', Icons.check_circle_outline),
      VisitAction.start => ('Start', Icons.play_arrow_outlined),
      VisitAction.pause => ('Pause', Icons.pause_outlined),
      VisitAction.resume => ('Resume', Icons.play_arrow_outlined),
      VisitAction.complete => ('Complete', Icons.task_alt_outlined),
    };

    return FilledButton.icon(
      onPressed: enabled ? () => _run(context, ref) : null,
      icon: Icon(icon, size: 18),
      label: Text(label),
    );
  }

  Future<void> _run(BuildContext context, WidgetRef ref) async {
    if (action != VisitAction.complete) {
      await ref
          .read(visitNotifierProvider.notifier)
          .performAction(visit.id, action);
      onDone?.call();
      return;
    }

    // Completion requires an outcome (VISIT_MANAGEMENT.md §6)
    final controller = TextEditingController();
    final outcome = await showDialog<String>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Complete Visit'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(
            labelText: 'Outcome / result',
            hintText: 'e.g. Router replaced, signal restored',
          ),
          maxLines: 2,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext)
                .pop(controller.text.trim().isEmpty
                    ? 'COMPLETED_ON_SITE'
                    : controller.text.trim()),
            child: const Text('Complete'),
          ),
        ],
      ),
    );
    controller.dispose();

    if (outcome != null) {
      await ref
          .read(visitNotifierProvider.notifier)
          .performAction(visit.id, action, outcome: outcome);
      onDone?.call();
    }
  }
}

class VisitStatusChip extends StatelessWidget {
  const VisitStatusChip({super.key, required this.status});

  final VisitStatus status;

  @override
  Widget build(BuildContext context) {
    final (background, foreground) = switch (status) {
      VisitStatus.assigned => (Colors.blue.shade50, Colors.blue.shade700),
      VisitStatus.accepted => (Colors.cyan.shade50, Colors.cyan.shade800),
      VisitStatus.started => (Colors.orange.shade50, Colors.orange.shade800),
      VisitStatus.paused => (Colors.amber.shade50, Colors.amber.shade900),
      VisitStatus.completed ||
      VisitStatus.approved =>
        (Colors.green.shade50, Colors.green.shade700),
      VisitStatus.rejected ||
      VisitStatus.cancelled ||
      VisitStatus.aborted =>
        (Colors.red.shade50, Colors.red.shade700),
      _ => (Colors.grey.shade200, Colors.grey.shade700),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        status.label,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: foreground,
        ),
      ),
    );
  }
}

class VisitInfoRow extends StatelessWidget {
  const VisitInfoRow({super.key, required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 15, color: Colors.grey.shade600),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            text,
            style: TextStyle(fontSize: 13, color: Colors.grey.shade700),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}
