import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'lead_notifiers.dart';
import 'lead_state.dart';

// ─────────────────────────────────────────────────────────────────────────────
// LEAD LIST — /leads. Leads the caller can see (own/created unless the role
// has wider scope), newest first, filterable by pipeline stage.
// ─────────────────────────────────────────────────────────────────────────────

class LeadListScreen extends ConsumerWidget {
  const LeadListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(leadListProvider);
    final notifier = ref.read(leadListProvider.notifier);
    final leads = state.visibleLeads;

    return Scaffold(
      appBar: AppBar(title: const Text('Leads')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/leads/new'),
        icon: const Icon(Icons.person_add_alt_1),
        label: const Text('New lead'),
      ),
      body: Column(
        children: [
          if (state.stages.isNotEmpty)
            SizedBox(
              height: 52,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 8,
                ),
                children: [
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: const Text('All'),
                      selected: state.stageFilter == null,
                      onSelected: (_) => notifier.setStageFilter(null),
                    ),
                  ),
                  for (final stage in state.stages)
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                        label: Text(stage.name),
                        selected: state.stageFilter == stage.id,
                        onSelected: (_) => notifier.setStageFilter(stage.id),
                      ),
                    ),
                ],
              ),
            ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: notifier.load,
              child: _buildList(context, state, leads, notifier),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildList(
    BuildContext context,
    LeadListState state,
    List<LeadSummary> leads,
    LeadListNotifier notifier,
  ) {
    if (state.isLoading && state.leads.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }
    if (leads.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          const SizedBox(height: 140),
          const Icon(Icons.groups_outlined, size: 48, color: Colors.grey),
          const SizedBox(height: 12),
          Center(
            child: Text(
              state.errorMessage ??
                  (state.stageFilter == null
                      ? 'No leads yet. Tap "New lead" to add one.'
                      : 'No leads in this stage.'),
              textAlign: TextAlign.center,
            ),
          ),
        ],
      );
    }

    final showMore = state.hasMore && state.stageFilter == null;
    return ListView.builder(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(12, 4, 12, 96),
      itemCount: leads.length + (showMore ? 1 : 0),
      itemBuilder: (context, i) {
        if (i == leads.length) {
          return Center(
            child: TextButton(
              onPressed: state.isLoadingMore ? null : notifier.loadMore,
              child: Text(state.isLoadingMore ? 'Loading…' : 'Load more'),
            ),
          );
        }
        return _LeadCard(lead: leads[i]);
      },
    );
  }
}

class _LeadCard extends StatelessWidget {
  const _LeadCard({required this.lead});

  final LeadSummary lead;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final subtitle = [
      lead.companyName,
      lead.mobile,
    ].whereType<String>().where((s) => s.isNotEmpty).join(' · ');

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        // Offline captures have no server id until they sync.
        onTap: lead.pendingSync
            ? null
            : () => context.push('/leads/${lead.id}'),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      lead.displayName,
                      style: theme.textTheme.titleMedium,
                    ),
                  ),
                  if (lead.stageName != null)
                    Chip(
                      label: Text(lead.stageName!),
                      visualDensity: VisualDensity.compact,
                    ),
                ],
              ),
              if (subtitle.isNotEmpty)
                Text(subtitle, style: theme.textTheme.bodySmall),
              const SizedBox(height: 4),
              Row(
                children: [
                  Text(lead.leadNumber, style: theme.textTheme.bodySmall),
                  const Spacer(),
                  if (lead.pendingSync)
                    Row(
                      children: [
                        Icon(
                          Icons.cloud_upload_outlined,
                          size: 16,
                          color: theme.colorScheme.tertiary,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          'Waiting to sync',
                          style: theme.textTheme.bodySmall,
                        ),
                      ],
                    )
                  else if (lead.isConverted)
                    Text(
                      'Converted',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: Colors.green.shade700,
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
