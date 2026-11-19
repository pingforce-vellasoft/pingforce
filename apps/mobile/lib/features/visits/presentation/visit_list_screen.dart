import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/auth/auth_session.dart';
import '../../../core/navigation/nav_destinations.dart';

import 'visit_notifier.dart';
import 'visit_state.dart';
import 'widgets/visit_widgets.dart';

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
      // Only roles holding VISITS:CREATE see this; the API enforces it too.
      floatingActionButton: _canCreateVisits()
          ? FloatingActionButton.extended(
              onPressed: () async {
                await context.push('/visits/new');
                if (mounted) {
                  ref.read(visitNotifierProvider.notifier).refresh();
                }
              },
              icon: const Icon(Icons.add),
              label: const Text('New visit'),
            )
          : null,
      body: RefreshIndicator(
        onRefresh: () => ref.read(visitNotifierProvider.notifier).refresh(),
        child: _buildBody(context, state),
      ),
    );
  }

  bool _canCreateVisits() {
    final role = AppUserRoleX.fromRoleCode(AuthSession.instance.roleCode);
    return role == AppUserRole.manager || role == AppUserRole.admin;
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
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push('/visits/${visit.id}'),
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
                VisitStatusChip(status: visit.status),
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
              VisitInfoRow(icon: Icons.business_outlined, text: visit.customerName!),
            ],
            if (visit.siteAddress != null) ...[
              const SizedBox(height: 4),
              VisitInfoRow(icon: Icons.place_outlined, text: visit.siteAddress!),
            ],
            const SizedBox(height: 4),
            VisitInfoRow(
              icon: Icons.schedule_outlined,
              text: formatVisitTime(visit.plannedStartAt.toLocal()),
            ),
            if (actions.isNotEmpty) ...[
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  for (final action in actions) ...[
                    const SizedBox(width: 8),
                    VisitActionButton(
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
      ),
    );
  }
}
