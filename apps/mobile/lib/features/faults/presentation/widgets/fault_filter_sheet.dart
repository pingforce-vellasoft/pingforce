import 'package:flutter/material.dart';

import '../../../../core/theme/theme.dart';
import '../fault_state.dart';

// ─────────────────────────────────────────────────────────────────────────────
// FAULT FILTER SHEET  (AUDIT §7.1)
// ─────────────────────────────────────────────────────────────────────────────

class FaultFilterSheet extends StatefulWidget {
  const FaultFilterSheet({
    super.key,
    required this.currentFilters,
    required this.onApply,
    required this.onReset,
  });

  final FaultFilters currentFilters;
  final void Function(FaultFilters) onApply;
  final VoidCallback onReset;

  @override
  State<FaultFilterSheet> createState() => _FaultFilterSheetState();
}

class _FaultFilterSheetState extends State<FaultFilterSheet> {
  late List<FaultStatus> _statuses;
  late List<FaultPriority> _priorities;

  @override
  void initState() {
    super.initState();
    _statuses = List.from(widget.currentFilters.statuses);
    _priorities = List.from(widget.currentFilters.priorities);
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.6,
      maxChildSize: 0.9,
      minChildSize: 0.4,
      expand: false,
      builder: (ctx, scrollCtrl) {
        return Column(
          children: [
            // ── Handle ─────────────────────────────────────────────────
            const SizedBox(height: AppSpacing.space2),
            Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.outlineVariant,
                borderRadius: AppRadius.pillAll,
              ),
            ),
            const SizedBox(height: AppSpacing.space3),

            // ── Header ─────────────────────────────────────────────────
            Padding(
              padding: AppSpacing.screenPaddingH,
              child: Row(
                children: [
                  Text('Filter Faults', style: AppTypography.titleMedium),
                  const Spacer(),
                  TextButton(
                    onPressed: widget.onReset,
                    child: const Text('Reset All'),
                  ),
                ],
              ),
            ),

            const Divider(height: 1),

            // ── Scrollable content ──────────────────────────────────────
            Expanded(
              child: ListView(
                controller: scrollCtrl,
                padding: AppSpacing.screenPaddingAll,
                children: [
                  // Status
                  Text('Status', style: AppTypography.titleSmall),
                  const SizedBox(height: AppSpacing.space3),
                  Wrap(
                    spacing: AppSpacing.space2,
                    runSpacing: AppSpacing.space2,
                    children: FaultStatus.values.map((s) {
                      final selected = _statuses.contains(s);
                      return FilterChip(
                        label: Text(s.label),
                        selected: selected,
                        onSelected: (v) => setState(() {
                          if (v) {
                            _statuses.add(s);
                          } else {
                            _statuses.remove(s);
                          }
                        }),
                      );
                    }).toList(),
                  ),

                  const SizedBox(height: AppSpacing.space5),

                  // Priority
                  Text('Priority', style: AppTypography.titleSmall),
                  const SizedBox(height: AppSpacing.space3),
                  Wrap(
                    spacing: AppSpacing.space2,
                    runSpacing: AppSpacing.space2,
                    children: FaultPriority.values.map((p) {
                      final selected = _priorities.contains(p);
                      return FilterChip(
                        label: Text(p.label),
                        selected: selected,
                        avatar: Icon(
                          Icons.flag_rounded,
                          size: AppIconSize.xs,
                          color: selected
                              ? Theme.of(context).colorScheme.onSecondaryContainer
                              : Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                        onSelected: (v) => setState(() {
                          if (v) {
                            _priorities.add(p);
                          } else {
                            _priorities.remove(p);
                          }
                        }),
                      );
                    }).toList(),
                  ),
                ],
              ),
            ),

            // ── Apply button ────────────────────────────────────────────
            SafeArea(
              child: Padding(
                padding: AppSpacing.screenPaddingAll,
                child: SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: FilledButton(
                    onPressed: () => widget.onApply(
                      FaultFilters(
                        statuses: _statuses,
                        priorities: _priorities,
                      ),
                    ),
                    child: const Text('Apply Filters'),
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}
