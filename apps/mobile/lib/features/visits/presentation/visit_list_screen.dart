import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'visit_notifier.dart';
import 'visit_state.dart';

// ─────────────────────────────────────────────────────────────────────────────
// VISIT LIST SCREEN — assigned visits + execution actions
// (3.2 MOBILE_APP.md; offline actions queue into the global sync provider)
// ─────────────────────────────────────────────────────────────────────────────

class VisitListScreen extends ConsumerStatefulWidget {
  const VisitListScreen({super.key});

  @override
  ConsumerState<VisitListScreen> createState() => _VisitListScreenState();
}

class _VisitListScreenState extends ConsumerState<VisitListScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(visitNotifierProvider.notifier).load();
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(visitNotifierProvider);

    ref.listen(visitNotifierProvider, (previous, next) {
      final message = next.errorMessage;
      if (message != null && message != previous?.errorMessage) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(message)));
        ref.read(visitNotifierProvider.notifier).clearError();
      }
    });

    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      appBar: AppBar(title: const Text('My Visits')),
      body: RefreshIndicator(
        onRefresh: () => ref.read(visitNotifierProvider.notifier).refresh(),
        child: _buildBody(context, state),
      ),
    );
  }

  Widget _buildBody(BuildContext context, VisitState state) {
    if (state.isLoading && state.visits.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (state.visits.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: const [
          SizedBox(height: 160),
          Icon(Icons.where_to_vote_outlined, size: 56, color: Colors.grey),
          SizedBox(height: 12),
          Center(child: Text('No visits assigned to you')),
        ],
      );
    }

    return ListView.builder(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      itemCount: state.visits.length,
      itemBuilder: (context, index) => _VisitCard(
        visit: state.visits[index],
        actionInFlight: state.actionInFlightVisitId == state.visits[index].id,
      ),
    );
  }
}

class _VisitCard extends ConsumerWidget {
  const _VisitCard({required this.visit, required this.actionInFlight});

  final VisitSummary visit;
  final bool actionInFlight;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final actions = actionsFor(visit.status);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    visit.visitNumber,
                    style: theme.textTheme.titleSmall
                        ?.copyWith(fontWeight: FontWeight.w600),
                  ),
                ),
                _StatusChip(status: visit.status),
                if (visit.pendingSync) ...[
                  const SizedBox(width: 6),
                  Tooltip(
                    message: 'Waiting for sync',
                    child: Icon(
                      Icons.cloud_upload_outlined,
                      size: 18,
                      color: theme.colorScheme.tertiary,
                    ),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 8),
            Text(visit.purpose, style: theme.textTheme.bodyLarge),
            if (visit.customerName != null) ...[
              const SizedBox(height: 4),
              _InfoRow(icon: Icons.business_outlined, text: visit.customerName!),
            ],
            if (visit.siteAddress != null) ...[
              const SizedBox(height: 4),
              _InfoRow(icon: Icons.place_outlined, text: visit.siteAddress!),
            ],
            const SizedBox(height: 4),
            _InfoRow(
              icon: Icons.schedule_outlined,
              text: _formatPlanned(visit.plannedStartAt.toLocal()),
            ),
            if (actions.isNotEmpty) ...[
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  for (final action in actions) ...[
                    const SizedBox(width: 8),
                    _ActionButton(
                      visit: visit,
                      action: action,
                      enabled: !actionInFlight,
                    ),
                  ],
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

String _formatPlanned(DateTime dt) {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  final hour12 = dt.hour % 12 == 0 ? 12 : dt.hour % 12;
  final minute = dt.minute.toString().padLeft(2, '0');
  final meridiem = dt.hour < 12 ? 'AM' : 'PM';
  return '${dt.day} ${months[dt.month - 1]} · $hour12:$minute $meridiem';
}

class _ActionButton extends ConsumerWidget {
  const _ActionButton({
    required this.visit,
    required this.action,
    required this.enabled,
  });

  final VisitSummary visit;
  final VisitAction action;
  final bool enabled;

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
    }
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status});

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

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.icon, required this.text});

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
