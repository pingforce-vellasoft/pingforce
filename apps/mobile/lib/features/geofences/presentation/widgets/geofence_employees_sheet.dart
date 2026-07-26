import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/theme.dart';
import '../../../../core/widgets/app_states.dart';
import '../../domain/entities/geofence.dart';
import '../../domain/entities/geofence_assignment.dart';
import '../geofence_assignment_notifier.dart';

/// Manages which employees may punch attendance at one geofence.
///
/// Two tabs — the current roster and a searchable picker. Under the tenant's
/// default one-geofence-per-employee policy the picker hides employees already
/// assigned elsewhere until the admin opts into showing them, and adding one
/// then moves them rather than granting a second site.
///
/// Removal is stated plainly: an employee left with no geofence cannot punch
/// anywhere, which the confirmation and the result message both say.
class GeofenceEmployeesSheet extends ConsumerStatefulWidget {
  const GeofenceEmployeesSheet({super.key, required this.geofence});

  final Geofence geofence;

  @override
  ConsumerState<GeofenceEmployeesSheet> createState() =>
      _GeofenceEmployeesSheetState();
}

class _GeofenceEmployeesSheetState
    extends ConsumerState<GeofenceEmployeesSheet> {
  final _searchController = TextEditingController();

  String get _id => widget.geofence.id;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(geofenceAssignmentProvider(_id).notifier).load();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(geofenceAssignmentProvider(_id));
    final scheme = Theme.of(context).colorScheme;

    return DefaultTabController(
      length: 2,
      child: DraggableScrollableSheet(
        initialChildSize: 0.85,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (context, scrollController) => Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.space5,
                AppSpacing.space2,
                AppSpacing.space5,
                0,
              ),
              child: Row(
                children: [
                  Icon(Icons.groups_rounded, color: scheme.primary),
                  const SizedBox(width: AppSpacing.space3),
                  Expanded(
                    child: Text(
                      widget.geofence.name,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close_rounded),
                  ),
                ],
              ),
            ),

            // The tenant having no employees at all makes both tabs pointless,
            // so route the admin to creating employees instead.
            if (state.tenantHasEmployees == false)
              Expanded(child: _buildNoEmployeesState(context, scheme))
            else ...[
              TabBar(
                tabs: [
                  Tab(text: 'Assigned (${state.assigned.length})'),
                  const Tab(text: 'Add employees'),
                ],
              ),
              Expanded(
                child: TabBarView(
                  children: [
                    _buildAssignedTab(context, state, scrollController),
                    _buildPickerTab(context, state, scrollController),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  // ── Empty tenant ───────────────────────────────────────────────────────────

  Widget _buildNoEmployeesState(BuildContext context, ColorScheme scheme) {
    return Padding(
      padding: const EdgeInsets.all(AppSpacing.space6),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.person_off_rounded,
            size: 56,
            color: scheme.onSurfaceVariant.withValues(alpha: 0.4),
          ),
          const SizedBox(height: AppSpacing.space4),
          Text(
            'No employees yet',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: AppSpacing.space2),
          Text(
            'This geofence cannot be staffed until employees exist. '
            'Create them in the admin portal under Workforce → Employees, '
            'then come back to assign them to ${widget.geofence.name}.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: scheme.onSurfaceVariant,
                ),
          ),
          const SizedBox(height: AppSpacing.space5),
          // Employee creation lives in the web admin portal only — there is no
          // mobile screen to route to, so offer a re-check instead of a link
          // that would dead-end.
          OutlinedButton.icon(
            onPressed: () =>
                ref.read(geofenceAssignmentProvider(_id).notifier).load(),
            icon: const Icon(Icons.refresh_rounded),
            label: const Text('Check again'),
          ),
        ],
      ),
    );
  }

  // ── Assigned roster ────────────────────────────────────────────────────────

  Widget _buildAssignedTab(
    BuildContext context,
    GeofenceAssignmentState state,
    ScrollController controller,
  ) {
    final scheme = Theme.of(context).colorScheme;

    if (state.isLoadingAssigned && state.assigned.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (state.assigned.isEmpty) {
      return Padding(
        padding: const EdgeInsets.all(AppSpacing.space6),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.wrong_location_rounded,
              size: 48,
              color: scheme.onSurfaceVariant.withValues(alpha: 0.4),
            ),
            const SizedBox(height: AppSpacing.space3),
            Text(
              'Nobody assigned',
              style: Theme.of(context).textTheme.titleSmall,
            ),
            const SizedBox(height: AppSpacing.space2),
            Text(
              'No employee can punch attendance here yet. '
              'Use the "Add employees" tab to assign them.',
              textAlign: TextAlign.center,
              style: Theme.of(context)
                  .textTheme
                  .bodySmall
                  ?.copyWith(color: scheme.onSurfaceVariant),
            ),
          ],
        ),
      );
    }

    return ListView.separated(
      controller: controller,
      padding: const EdgeInsets.all(AppSpacing.space4),
      itemCount: state.assigned.length,
      separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.space2),
      itemBuilder: (_, i) {
        final e = state.assigned[i];
        return Container(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.space3,
            vertical: AppSpacing.space2,
          ),
          decoration: BoxDecoration(
            color: scheme.surfaceContainerLow,
            borderRadius: AppRadius.lgAll,
            border: Border.all(color: scheme.outlineVariant),
          ),
          child: Row(
            children: [
              _Avatar(initials: e.initials),
              const SizedBox(width: AppSpacing.space3),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      e.fullName,
                      style: Theme.of(context)
                          .textTheme
                          .bodyMedium
                          ?.copyWith(fontWeight: FontWeight.w500),
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      e.employeeCode,
                      style: Theme.of(context)
                          .textTheme
                          .bodySmall
                          ?.copyWith(color: scheme.onSurfaceVariant),
                    ),
                  ],
                ),
              ),
              // Assignments carried over by the migration were never made by
              // an admin — flagged rather than hidden.
              if (e.assignedBy == null)
                Tooltip(
                  message: 'Carried over when geofence assignment was '
                      'introduced — not assigned by an admin',
                  child: Icon(
                    Icons.history_rounded,
                    size: 18,
                    color: scheme.onSurfaceVariant.withValues(alpha: 0.5),
                  ),
                ),
              IconButton(
                onPressed: state.isSaving ? null : () => _confirmRemove(e),
                icon: const Icon(Icons.person_remove_rounded),
                color: scheme.error,
                tooltip: 'Remove from this geofence',
              ),
            ],
          ),
        );
      },
    );
  }

  // ── Picker ─────────────────────────────────────────────────────────────────

  Widget _buildPickerTab(
    BuildContext context,
    GeofenceAssignmentState state,
    ScrollController controller,
  ) {
    final scheme = Theme.of(context).colorScheme;
    final notifier = ref.read(geofenceAssignmentProvider(_id).notifier);

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.space4,
            AppSpacing.space3,
            AppSpacing.space4,
            0,
          ),
          child: TextField(
            controller: _searchController,
            onChanged: notifier.onSearchChanged,
            decoration: InputDecoration(
              hintText: 'Search by name or employee code',
              prefixIcon: const Icon(Icons.search_rounded),
              suffixIcon: state.search.isEmpty
                  ? null
                  : IconButton(
                      icon: const Icon(Icons.clear_rounded),
                      onPressed: () {
                        _searchController.clear();
                        notifier.onSearchChanged('');
                      },
                    ),
            ),
          ),
        ),

        if (!state.allowMultiple)
          Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.space4,
            ),
            child: SwitchListTile(
              contentPadding: EdgeInsets.zero,
              dense: true,
              value: state.showAll,
              onChanged: notifier.toggleShowAll,
              title: const Text('Show employees on other geofences'),
              subtitle: Text(
                'This tenant allows one geofence per employee. '
                'Adding them here moves them.',
                style: Theme.of(context)
                    .textTheme
                    .bodySmall
                    ?.copyWith(color: scheme.onSurfaceVariant),
              ),
            ),
          ),

        Expanded(
          child: _buildCandidateList(context, state, controller),
        ),

        if (state.reassignCount > 0)
          Container(
            width: double.infinity,
            margin: const EdgeInsets.symmetric(
              horizontal: AppSpacing.space4,
            ),
            padding: const EdgeInsets.all(AppSpacing.space3),
            decoration: BoxDecoration(
              color: scheme.tertiaryContainer,
              borderRadius: AppRadius.mdAll,
            ),
            child: Row(
              children: [
                Icon(Icons.swap_horiz_rounded,
                    size: 18, color: scheme.onTertiaryContainer),
                const SizedBox(width: AppSpacing.space2),
                Expanded(
                  child: Text(
                    '${state.reassignCount} selected '
                    '${state.reassignCount == 1 ? 'employee is' : 'employees are'} '
                    'on another geofence. Saving will move them here.',
                    style: Theme.of(context)
                        .textTheme
                        .bodySmall
                        ?.copyWith(color: scheme.onTertiaryContainer),
                  ),
                ),
              ],
            ),
          ),

        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.space4),
            child: SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: state.selected.isEmpty || state.isSaving
                    ? null
                    : _assign,
                icon: state.isSaving
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.person_add_rounded),
                label: Text(
                  state.selected.isEmpty
                      ? 'Select employees'
                      : 'Assign ${state.selected.length}',
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildCandidateList(
    BuildContext context,
    GeofenceAssignmentState state,
    ScrollController controller,
  ) {
    final scheme = Theme.of(context).colorScheme;
    final notifier = ref.read(geofenceAssignmentProvider(_id).notifier);

    if (state.isLoadingCandidates && state.candidates.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (state.candidates.isEmpty) {
      // Three different reasons the list can be empty, each needing a
      // different next step from the admin.
      final String reason;
      if (state.search.isNotEmpty) {
        reason = 'Nothing matches "${state.search}".';
      } else if (!state.allowMultiple && !state.showAll) {
        reason = 'Every employee is already assigned to a geofence. '
            'Turn on "Show employees on other geofences" to move one here.';
      } else {
        reason = 'Everyone is already assigned to this geofence.';
      }

      return Padding(
        padding: const EdgeInsets.all(AppSpacing.space6),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.search_off_rounded,
              size: 48,
              color: scheme.onSurfaceVariant.withValues(alpha: 0.4),
            ),
            const SizedBox(height: AppSpacing.space3),
            Text(
              'No employees to add',
              style: Theme.of(context).textTheme.titleSmall,
            ),
            const SizedBox(height: AppSpacing.space2),
            Text(
              reason,
              textAlign: TextAlign.center,
              style: Theme.of(context)
                  .textTheme
                  .bodySmall
                  ?.copyWith(color: scheme.onSurfaceVariant),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      controller: controller,
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.space4),
      itemCount: state.candidates.length,
      itemBuilder: (_, i) {
        final c = state.candidates[i];
        final selected = state.selected.contains(c.id);
        return CheckboxListTile(
          value: selected,
          onChanged: (_) => notifier.toggleSelection(c.id),
          controlAffinity: ListTileControlAffinity.leading,
          contentPadding: EdgeInsets.zero,
          title: Text(c.fullName, overflow: TextOverflow.ellipsis),
          subtitle: Row(
            children: [
              Text(
                c.employeeCode,
                style: Theme.of(context)
                    .textTheme
                    .bodySmall
                    ?.copyWith(color: scheme.onSurfaceVariant),
              ),
              if (c.currentGeofences.isNotEmpty) ...[
                const SizedBox(width: AppSpacing.space2),
                Flexible(
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 6,
                      vertical: 1,
                    ),
                    decoration: BoxDecoration(
                      color: c.requiresReassign
                          ? scheme.tertiaryContainer
                          : scheme.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      c.currentGeofences.map((g) => g.name).join(', '),
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                            color: c.requiresReassign
                                ? scheme.onTertiaryContainer
                                : scheme.onSurfaceVariant,
                          ),
                    ),
                  ),
                ),
              ],
            ],
          ),
        );
      },
    );
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  Future<void> _assign() async {
    final error = await ref
        .read(geofenceAssignmentProvider(_id).notifier)
        .assignSelected();
    if (!mounted) return;
    if (error != null) {
      AppSnackBar.showError(context, error);
    } else {
      AppSnackBar.showSuccess(context, 'Employees assigned');
    }
  }

  Future<void> _confirmRemove(AssignedEmployee e) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Remove from geofence?'),
        content: Text(
          '${e.fullName} will no longer be able to punch attendance at '
          '"${widget.geofence.name}". If this is their only geofence, they '
          'will not be able to punch anywhere until reassigned.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Remove'),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;

    final warning =
        await ref.read(geofenceAssignmentProvider(_id).notifier).remove(e);
    if (!mounted) return;
    if (warning != null) {
      // Covers both a failure and the "now has no geofence" consequence —
      // either way the admin needs to see it.
      AppSnackBar.showError(context, warning);
    } else {
      AppSnackBar.showSuccess(context, '${e.fullName} removed');
    }
  }
}

class _Avatar extends StatelessWidget {
  const _Avatar({required this.initials});

  final String initials;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      width: 36,
      height: 36,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: scheme.primaryContainer,
        shape: BoxShape.circle,
      ),
      child: Text(
        initials,
        style: Theme.of(context).textTheme.labelMedium?.copyWith(
              color: scheme.onPrimaryContainer,
              fontWeight: FontWeight.w600,
            ),
      ),
    );
  }
}
