import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'lead_notifiers.dart';
import 'lead_state.dart';

// ─────────────────────────────────────────────────────────────────────────────
// LEAD DETAIL — /leads/:id. Contact details, owner and pipeline stage, with
// "Move to stage" (online; the API checks the caller's LEADS:UPDATE scope).
// ─────────────────────────────────────────────────────────────────────────────

class LeadDetailScreen extends ConsumerWidget {
  const LeadDetailScreen({super.key, required this.leadId});

  final String leadId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final provider = leadDetailProvider(leadId);
    final state = ref.watch(provider);
    final stages = ref.watch(leadListProvider).stages;

    ref.listen(provider, (previous, next) {
      final message = next.errorMessage;
      if (message != null &&
          message != previous?.errorMessage &&
          next.lead != null) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(message)));
        ref.read(provider.notifier).clearError();
      }
    });

    final lead = state.lead;
    return Scaffold(
      appBar: AppBar(title: Text(lead?.leadNumber ?? 'Lead')),
      body: RefreshIndicator(
        onRefresh: () => ref.read(provider.notifier).load(),
        child: _body(context, ref, state, stages),
      ),
    );
  }

  Widget _body(
    BuildContext context,
    WidgetRef ref,
    LeadDetailState state,
    List<PipelineStageItem> stages,
  ) {
    final lead = state.lead;
    if (state.isLoading && lead == null) {
      return const Center(child: CircularProgressIndicator());
    }
    if (lead == null) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          const SizedBox(height: 160),
          const Icon(Icons.error_outline, size: 48, color: Colors.grey),
          const SizedBox(height: 12),
          Center(child: Text(state.errorMessage ?? 'Lead not found')),
        ],
      );
    }

    final theme = Theme.of(context);
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        Text(lead.displayName, style: theme.textTheme.headlineSmall),
        if (lead.companyName != null)
          Text(lead.companyName!, style: theme.textTheme.titleMedium),
        const SizedBox(height: 16),
        _row(Icons.flag_outlined, 'Stage', lead.stageName ?? 'No stage'),
        if (lead.mobile != null)
          _row(Icons.phone_outlined, 'Mobile', lead.mobile!),
        if (lead.email != null)
          _row(Icons.email_outlined, 'Email', lead.email!),
        if (lead.expectedValue != null)
          _row(
            Icons.payments_outlined,
            'Expected value',
            '${lead.expectedValue!.toStringAsFixed(0)} ${lead.currencyCode ?? ''}'
                .trim(),
          ),
        if (lead.ownerName != null)
          _row(Icons.person_outline, 'Owner', lead.ownerName!),
        if (lead.isConverted)
          _row(Icons.verified_outlined, 'Status', 'Converted to customer'),
        const SizedBox(height: 24),
        if (stages.isNotEmpty && !lead.isConverted)
          FilledButton.icon(
            onPressed: state.isMoving
                ? null
                : () => _pickStage(context, ref, lead, stages),
            icon: state.isMoving
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.swap_horiz),
            label: const Text('Move to stage'),
          ),
      ],
    );
  }

  Widget _row(IconData icon, String label, String value) => ListTile(
    contentPadding: EdgeInsets.zero,
    dense: true,
    leading: Icon(icon),
    title: Text(label),
    subtitle: Text(value),
  );

  Future<void> _pickStage(
    BuildContext context,
    WidgetRef ref,
    LeadSummary lead,
    List<PipelineStageItem> stages,
  ) async {
    final picked = await showModalBottomSheet<PipelineStageItem>(
      context: context,
      builder: (ctx) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          children: [
            const ListTile(title: Text('Move to stage')),
            for (final stage in stages)
              ListTile(
                title: Text(stage.name),
                enabled: stage.id != lead.stageId,
                trailing: stage.id == lead.stageId
                    ? const Icon(Icons.check)
                    : null,
                onTap: () => Navigator.pop(ctx, stage),
              ),
          ],
        ),
      ),
    );
    if (picked == null) return;
    final moved = await ref
        .read(leadDetailProvider(leadId).notifier)
        .moveToStage(picked);
    if (moved && context.mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Moved to ${picked.name}')));
    }
  }
}
