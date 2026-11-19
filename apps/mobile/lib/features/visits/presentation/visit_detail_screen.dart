import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'visit_detail_notifier.dart';
import 'visit_notifier.dart';
import 'visit_state.dart';
import 'widgets/visit_widgets.dart';

// ─────────────────────────────────────────────────────────────────────────────
// VISIT DETAIL SCREEN — /visits/:id (3.2 MOBILE_APP.md)
// Details, lifecycle actions (start / pause / resume / complete), status
// history and notes.
// ─────────────────────────────────────────────────────────────────────────────

class VisitDetailScreen extends ConsumerStatefulWidget {
  const VisitDetailScreen({super.key, required this.visitId});

  final String visitId;

  @override
  ConsumerState<VisitDetailScreen> createState() => _VisitDetailScreenState();
}

class _VisitDetailScreenState extends ConsumerState<VisitDetailScreen> {
  final _noteController = TextEditingController();

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final provider = visitDetailProvider(widget.visitId);
    final state = ref.watch(provider);
    final listState = ref.watch(visitNotifierProvider);

    ref.listen(provider, (previous, next) {
      final message = next.errorMessage;
      if (message != null &&
          message != previous?.errorMessage &&
          next.detail != null) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(message)));
        ref.read(provider.notifier).clearError();
      }
    });

    final detail = state.detail;

    // An action queued offline only exists in the list notifier's optimistic
    // copy; overlay its status so the detail never contradicts the list.
    // Otherwise the freshly loaded detail is the source of truth.
    VisitSummary? summary = detail?.summary;
    for (final v in listState.visits) {
      if (v.id == widget.visitId && v.pendingSync && summary != null) {
        summary = summary.copyWith(status: v.status, pendingSync: true);
        break;
      }
    }

    return Scaffold(
      appBar: AppBar(title: Text(summary?.visitNumber ?? 'Visit')),
      body: RefreshIndicator(
        onRefresh: () => ref.read(provider.notifier).load(),
        child: _buildBody(context, state, summary, listState),
      ),
    );
  }

  Widget _buildBody(
    BuildContext context,
    VisitDetailState state,
    VisitSummary? summary,
    VisitState listState,
  ) {
    final detail = state.detail;
    if (state.isLoading && detail == null) {
      return const Center(child: CircularProgressIndicator());
    }
    if (detail == null || summary == null) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          const SizedBox(height: 160),
          const Icon(Icons.error_outline, size: 48, color: Colors.grey),
          const SizedBox(height: 12),
          Center(child: Text(state.errorMessage ?? 'Visit not found')),
        ],
      );
    }

    final theme = Theme.of(context);
    final actions = actionsFor(summary.status);
    final actionInFlight = listState.actionInFlightVisitId == summary.id;

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          children: [
            Expanded(
              child: Text(summary.purpose, style: theme.textTheme.titleLarge),
            ),
            VisitStatusChip(status: summary.status),
          ],
        ),
        if (summary.pendingSync) ...[
          const SizedBox(height: 8),
          Row(
            children: [
              Icon(
                Icons.cloud_upload_outlined,
                size: 16,
                color: theme.colorScheme.tertiary,
              ),
              const SizedBox(width: 6),
              const Text('Saved offline — will sync when back online'),
            ],
          ),
        ],
        const SizedBox(height: 12),
        if (summary.customerName != null)
          VisitInfoRow(
            icon: Icons.business_outlined,
            text: summary.customerName!,
          ),
        if (summary.siteAddress != null)
          VisitInfoRow(icon: Icons.place_outlined, text: summary.siteAddress!),
        if (detail.geofenceName != null)
          VisitInfoRow(
            icon: Icons.radar_outlined,
            text: 'Geofence: ${detail.geofenceName}',
          ),
        VisitInfoRow(
          icon: Icons.schedule_outlined,
          text: 'Planned ${formatVisitTime(summary.plannedStartAt.toLocal())}',
        ),
        if (summary.actualStartAt != null)
          VisitInfoRow(
            icon: Icons.play_circle_outline,
            text: 'Started ${formatVisitTime(summary.actualStartAt!.toLocal())}'
                '${summary.gpsValidated ? ' · on site' : ''}',
          ),
        if (summary.actualEndAt != null)
          VisitInfoRow(
            icon: Icons.task_alt_outlined,
            text: 'Completed ${formatVisitTime(summary.actualEndAt!.toLocal())}',
          ),
        if (detail.outcome != null)
          VisitInfoRow(
            icon: Icons.assignment_turned_in_outlined,
            text: 'Outcome: ${detail.outcome}',
          ),
        if (summary.description != null &&
            summary.description!.isNotEmpty) ...[
          const SizedBox(height: 12),
          Text(summary.description!, style: theme.textTheme.bodyMedium),
        ],
        if (actions.isNotEmpty) ...[
          const SizedBox(height: 16),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            alignment: WrapAlignment.end,
            children: [
              for (final action in actions)
                VisitActionButton(
                  visit: summary,
                  action: action,
                  enabled: !actionInFlight,
                  onDone: () => ref
                      .read(visitDetailProvider(widget.visitId).notifier)
                      .load(),
                ),
            ],
          ),
        ],
        const SizedBox(height: 24),
        Text('Notes', style: theme.textTheme.titleMedium),
        const SizedBox(height: 8),
        if (detail.notes.isEmpty)
          Text(
            'No notes yet',
            style: theme.textTheme.bodySmall,
          ),
        for (final note in detail.notes)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(note.note),
                Text(
                  formatVisitTime(note.at.toLocal()),
                  style: theme.textTheme.bodySmall,
                ),
              ],
            ),
          ),
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _noteController,
                minLines: 1,
                maxLines: 4,
                decoration: const InputDecoration(hintText: 'Add a note'),
              ),
            ),
            const SizedBox(width: 8),
            IconButton.filled(
              tooltip: 'Save note',
              onPressed: state.isSavingNote ? null : _saveNote,
              icon: const Icon(Icons.send),
            ),
          ],
        ),
        const SizedBox(height: 24),
        Text('History', style: theme.textTheme.titleMedium),
        const SizedBox(height: 8),
        for (final entry in detail.history.reversed)
          ListTile(
            dense: true,
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.history, size: 18),
            title: Text(
              entry.fromStatus == null
                  ? entry.toStatus.label
                  : '${entry.fromStatus!.label} → ${entry.toStatus.label}',
            ),
            subtitle: Text(
              [
                formatVisitTime(entry.at.toLocal()),
                if (entry.notes != null && entry.notes!.isNotEmpty)
                  entry.notes!,
              ].join(' · '),
            ),
          ),
      ],
    );
  }

  Future<void> _saveNote() async {
    final saved = await ref
        .read(visitDetailProvider(widget.visitId).notifier)
        .addNote(_noteController.text);
    if (saved) _noteController.clear();
  }
}
