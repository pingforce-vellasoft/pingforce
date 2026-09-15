import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/offline_aware_scaffold.dart';
import '../../faults/presentation/fault_state.dart' show FaultStatus;
import '../domain/entities/complaint.dart';
import 'complaint_notifier.dart';

/// The customer's own complaint register.
///
/// Deliberately plain compared with the technician fault list: a customer has
/// a handful of complaints, so there is no filtering, sorting or paging — only
/// what is open, what is done, and how to raise a new one.
class MyComplaintsScreen extends ConsumerStatefulWidget {
  const MyComplaintsScreen({super.key});

  @override
  ConsumerState<MyComplaintsScreen> createState() => _MyComplaintsScreenState();
}

class _MyComplaintsScreenState extends ConsumerState<MyComplaintsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(complaintNotifierProvider.notifier).load();
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(complaintNotifierProvider);
    final theme = Theme.of(context);

    return OfflineAwareScaffold(
      appBar: AppBar(title: const Text('My Complaints')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/complaints/new'),
        icon: const Icon(Icons.add),
        label: const Text('Raise a complaint'),
      ),
      body: RefreshIndicator(
        onRefresh: () =>
            ref.read(complaintNotifierProvider.notifier).refresh(),
        child: Builder(
          builder: (context) {
            if (state.isLoading) {
              return const Center(child: CircularProgressIndicator());
            }

            if (state.errorMessage != null && state.complaints.isEmpty) {
              return _MessageView(
                icon: Icons.error_outline,
                title: 'Something went wrong',
                message: state.errorMessage!,
                actionLabel: 'Try again',
                onAction: () =>
                    ref.read(complaintNotifierProvider.notifier).load(),
              );
            }

            if (state.complaints.isEmpty) {
              return const _MessageView(
                icon: Icons.check_circle_outline,
                title: 'No complaints',
                message:
                    'When you report an issue it will appear here so you can '
                    'follow its progress.',
              );
            }

            final open = state.open;
            final closed = state.closed;

            return ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 96),
              children: [
                if (open.isNotEmpty) ...[
                  _SectionHeader(label: 'Open (${open.length})'),
                  ...open.map((c) => _ComplaintCard(complaint: c)),
                ],
                if (closed.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  _SectionHeader(label: 'Closed (${closed.length})'),
                  ...closed.map((c) => _ComplaintCard(complaint: c)),
                ],
                if (state.errorMessage != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 16),
                    child: Text(
                      state.errorMessage!,
                      style: theme.textTheme.bodySmall
                          ?.copyWith(color: theme.colorScheme.error),
                    ),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.label});
  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Text(
        label.toUpperCase(),
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              letterSpacing: 0.8,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
      ),
    );
  }
}

class _ComplaintCard extends StatelessWidget {
  const _ComplaintCard({required this.complaint});
  final Complaint complaint;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => context.push('/complaints/${complaint.id}'),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      complaint.faultNumber,
                      style: theme.textTheme.labelMedium?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ),
                  ComplaintStatusChip(status: complaint.status),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                complaint.title,
                style: theme.textTheme.titleMedium,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Icon(
                    Icons.schedule,
                    size: 14,
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      _timingLabel(complaint),
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ),
                  if (complaint.canRate)
                    Text(
                      'Rate',
                      style: theme.textTheme.labelMedium
                          ?.copyWith(color: theme.colorScheme.primary),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Customers care about "when will this be sorted", not an SLA clock.
  String _timingLabel(Complaint c) {
    if (!c.isOpen) {
      return 'Raised ${_relative(c.createdAt)}';
    }
    final expected = c.expectedBy;
    if (expected == null) return 'Raised ${_relative(c.createdAt)}';

    final remaining = expected.difference(DateTime.now());
    if (remaining.isNegative) return 'Taking longer than expected';
    if (remaining.inHours < 1) return 'Expected within the hour';
    if (remaining.inHours < 24) return 'Expected in ${remaining.inHours}h';
    return 'Expected in ${remaining.inDays}d';
  }

  String _relative(DateTime when) {
    final diff = DateTime.now().difference(when);
    if (diff.inDays > 0) return '${diff.inDays}d ago';
    if (diff.inHours > 0) return '${diff.inHours}h ago';
    return '${diff.inMinutes}m ago';
  }
}

/// Status pill using customer-facing wording — "Assigned"/"On Hold" are
/// internal workflow states, so they read as "In Progress" here.
class ComplaintStatusChip extends StatelessWidget {
  const ComplaintStatusChip({super.key, required this.status});
  final FaultStatus status;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final (label, color, bg) = switch (status) {
      FaultStatus.open => (
          'Received',
          theme.colorScheme.primary,
          theme.colorScheme.primaryContainer,
        ),
      FaultStatus.assigned ||
      FaultStatus.inProgress ||
      FaultStatus.onHold ||
      FaultStatus.reopened =>
        (
          'In Progress',
          PingForceColors.statusWarning,
          PingForceColors.statusWarningContainer,
        ),
      FaultStatus.resolved => (
          'Resolved',
          PingForceColors.statusSuccess,
          PingForceColors.statusSuccessContainer,
        ),
      _ => (
          'Closed',
          theme.colorScheme.onSurfaceVariant,
          theme.colorScheme.surfaceContainerHigh,
        ),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: theme.textTheme.labelSmall?.copyWith(
          color: color,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _MessageView extends StatelessWidget {
  const _MessageView({
    required this.icon,
    required this.title,
    required this.message,
    this.actionLabel,
    this.onAction,
  });

  final IconData icon;
  final String title;
  final String message;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 80),
      children: [
        Icon(icon, size: 48, color: theme.colorScheme.onSurfaceVariant),
        const SizedBox(height: 16),
        Text(
          title,
          textAlign: TextAlign.center,
          style: theme.textTheme.titleMedium,
        ),
        const SizedBox(height: 8),
        Text(
          message,
          textAlign: TextAlign.center,
          style: theme.textTheme.bodyMedium
              ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
        ),
        if (actionLabel != null) ...[
          const SizedBox(height: 20),
          Center(
            child: FilledButton.tonal(
              onPressed: onAction,
              child: Text(actionLabel!),
            ),
          ),
        ],
      ],
    );
  }
}
