import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/theme.dart';
import '../../../core/widgets/offline_aware_scaffold.dart';
import 'data/models/leave_models.dart';
import 'presentation/leave_notifier.dart';

// ─────────────────────────────────────────────────────────────────────────────
// LEAVE SCREENS  (AUDIT §20)
// ─────────────────────────────────────────────────────────────────────────────
//
//   • LeaveScreen         — Tab host (Apply | Balance | History)
//   • _LeaveApplyTab      — Application form → POST /leaves/request
//   • _LeaveBalanceTab    — Per-type balance from GET /leaves/my-balance
//   • _LeaveHistoryTab    — Applied leave cards from GET /leaves/my

// ── Leave status display styling ─────────────────────────────────────────────

enum LeaveStatus { pending, approved, rejected, cancelled }

LeaveStatus _statusFrom(String raw) => switch (raw.toUpperCase()) {
      'APPROVED' => LeaveStatus.approved,
      'REJECTED' => LeaveStatus.rejected,
      'CANCELLED' => LeaveStatus.cancelled,
      _ => LeaveStatus.pending,
    };

extension LeaveStatusX on LeaveStatus {
  String get label => switch (this) {
        LeaveStatus.pending => 'Pending',
        LeaveStatus.approved => 'Approved',
        LeaveStatus.rejected => 'Rejected',
        LeaveStatus.cancelled => 'Cancelled',
      };

  Color get color => switch (this) {
        LeaveStatus.pending => PingForceColors.statusWarning,
        LeaveStatus.approved => PingForceColors.statusSuccess,
        LeaveStatus.rejected => PingForceColors.statusCritical,
        LeaveStatus.cancelled => const Color(0xFF616161),
      };

  Color get bgColor => switch (this) {
        LeaveStatus.pending => PingForceColors.statusWarningContainer,
        LeaveStatus.approved => PingForceColors.statusSuccessContainer,
        LeaveStatus.rejected => PingForceColors.statusCriticalContainer,
        LeaveStatus.cancelled => const Color(0xFFEEEEEE),
      };

  IconData get icon => switch (this) {
        LeaveStatus.pending => Icons.hourglass_top_rounded,
        LeaveStatus.approved => Icons.check_circle_rounded,
        LeaveStatus.rejected => Icons.cancel_rounded,
        LeaveStatus.cancelled => Icons.remove_circle_rounded,
      };
}

/// Stable per-name colour so each leave type reads consistently across tabs.
Color _typeColor(String name) {
  const palette = [
    Color(0xFF1565C0),
    Color(0xFFBF360C),
    Color(0xFF2E7D32),
    Color(0xFF6A1B9A),
    Color(0xFFAD1457),
    Color(0xFF00695C),
    Color(0xFF4E342E),
  ];
  return palette[name.hashCode.abs() % palette.length];
}

// ─────────────────────────────────────────────────────────────────────────────
// LEAVE SCREEN  (Tab host)
// ─────────────────────────────────────────────────────────────────────────────

class LeaveScreen extends ConsumerStatefulWidget {
  const LeaveScreen({super.key});

  @override
  ConsumerState<LeaveScreen> createState() => _LeaveScreenState();
}

class _LeaveScreenState extends ConsumerState<LeaveScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabCtrl;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 3, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(leaveNotifierProvider.notifier).load();
    });
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return OfflineAwareScaffold(
      appBar: AppBar(
        title: const Text('Leave'),
        bottom: TabBar(
          controller: _tabCtrl,
          tabs: const [
            Tab(text: 'Apply'),
            Tab(text: 'Balance'),
            Tab(text: 'History'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabCtrl,
        children: const [
          _LeaveApplyTab(),
          _LeaveBalanceTab(),
          _LeaveHistoryTab(),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 1 — APPLY
// ─────────────────────────────────────────────────────────────────────────────

class _LeaveApplyTab extends ConsumerStatefulWidget {
  const _LeaveApplyTab();

  @override
  ConsumerState<_LeaveApplyTab> createState() => _LeaveApplyTabState();
}

class _LeaveApplyTabState extends ConsumerState<_LeaveApplyTab> {
  LeaveTypeModel? _selectedType;
  DateTimeRange? _dateRange;
  final _reasonCtrl = TextEditingController();

  @override
  void dispose() {
    _reasonCtrl.dispose();
    super.dispose();
  }

  int get _days {
    if (_dateRange == null) return 0;
    return _dateRange!.end.difference(_dateRange!.start).inDays + 1;
  }

  Future<void> _pickDateRange() async {
    final result = await showDateRangePicker(
      context: context,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      initialDateRange: _dateRange,
      builder: (context, child) => Theme(
        data: Theme.of(context),
        child: child!,
      ),
    );
    if (result != null) setState(() => _dateRange = result);
  }

  Future<void> _submit() async {
    final type = _selectedType;
    if (type == null || _dateRange == null) return;
    await ref.read(leaveNotifierProvider.notifier).submit(
          leaveTypeId: type.id,
          startDate: _dateRange!.start,
          endDate: _dateRange!.end,
          reason: _reasonCtrl.text.trim(),
        );
  }

  void _resetForm() {
    ref.read(leaveNotifierProvider.notifier).resetSubmit();
    setState(() {
      _dateRange = null;
      _reasonCtrl.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(leaveNotifierProvider);

    // Default the selection to the first type once loaded.
    if (_selectedType == null && state.types.isNotEmpty) {
      _selectedType = state.types.first;
    }

    if (state.submitStatus == SubmitStatus.success) {
      return _SuccessView(
        days: _days,
        typeName: _selectedType?.name ?? 'leave',
        onAnother: _resetForm,
      );
    }

    if (state.isLoading && state.types.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (state.types.isEmpty) {
      return _EmptyView(
        icon: Icons.event_busy_rounded,
        title: 'No leave types configured',
        subtitle: state.errorMessage ?? 'Contact your administrator.',
        onRetry: () => ref.read(leaveNotifierProvider.notifier).refresh(),
      );
    }

    final submitting = state.submitStatus == SubmitStatus.submitting;
    final canSubmit = _selectedType != null && _dateRange != null && !submitting;

    return SingleChildScrollView(
      padding: AppSpacing.screenPaddingAll,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: AppSpacing.space3),

          // ── Leave type chips ──────────────────────────────────────────
          Text('Leave Type',
              style: AppTypography.labelMedium.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              )),
          const SizedBox(height: AppSpacing.space2),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: state.types.map((type) {
              final selected = type.id == _selectedType?.id;
              final color = _typeColor(type.name);
              return FilterChip(
                label: Text(type.name),
                selected: selected,
                onSelected: (_) => setState(() => _selectedType = type),
                selectedColor: color.withValues(alpha: 0.15),
                checkmarkColor: color,
                side: BorderSide(
                  color: selected
                      ? color
                      : Theme.of(context).colorScheme.outlineVariant,
                ),
                labelStyle: TextStyle(
                  color: selected
                      ? color
                      : Theme.of(context).colorScheme.onSurface,
                  fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
                ),
              );
            }).toList(),
          ),

          const SizedBox(height: AppSpacing.space5),

          // ── Date range ────────────────────────────────────────────────
          Text('Duration',
              style: AppTypography.labelMedium.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              )),
          const SizedBox(height: AppSpacing.space2),
          GestureDetector(
            onTap: _pickDateRange,
            child: Container(
              padding: const EdgeInsets.all(AppSpacing.space4),
              decoration: BoxDecoration(
                border: Border.all(
                  color: _dateRange != null
                      ? Theme.of(context).colorScheme.primary
                      : Theme.of(context).colorScheme.outline,
                ),
                borderRadius: AppRadius.mdAll,
              ),
              child: Row(
                children: [
                  Icon(Icons.date_range_rounded,
                      color: Theme.of(context).colorScheme.primary),
                  const SizedBox(width: AppSpacing.space3),
                  Expanded(
                    child: _dateRange == null
                        ? Text('Select dates',
                            style: AppTypography.bodyMedium.copyWith(
                              color:
                                  Theme.of(context).colorScheme.onSurfaceVariant,
                            ))
                        : Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${_fmt(_dateRange!.start)} → ${_fmt(_dateRange!.end)}',
                                style: AppTypography.bodyMedium.copyWith(
                                  color:
                                      Theme.of(context).colorScheme.onSurface,
                                ),
                              ),
                              Text(
                                '$_days day${_days == 1 ? '' : 's'}',
                                style: AppTypography.labelSmall.copyWith(
                                  color: Theme.of(context).colorScheme.primary,
                                ),
                              ),
                            ],
                          ),
                  ),
                  Icon(Icons.chevron_right_rounded,
                      color: Theme.of(context).colorScheme.onSurfaceVariant),
                ],
              ),
            ),
          ),

          const SizedBox(height: AppSpacing.space5),

          // ── Reason ───────────────────────────────────────────────────
          TextField(
            controller: _reasonCtrl,
            maxLines: 3,
            textInputAction: TextInputAction.done,
            decoration: const InputDecoration(
              labelText: 'Reason',
              hintText: 'Describe the reason for your leave…',
              alignLabelWithHint: true,
            ),
          ),

          // ── Submit error ─────────────────────────────────────────────
          if (state.submitStatus == SubmitStatus.failure &&
              state.submitError != null) ...[
            const SizedBox(height: AppSpacing.space4),
            Container(
              padding: const EdgeInsets.all(AppSpacing.space3),
              decoration: BoxDecoration(
                color: PingForceColors.statusCriticalContainer,
                borderRadius: AppRadius.smAll,
              ),
              child: Row(
                children: [
                  const Icon(Icons.error_outline_rounded,
                      size: AppIconSize.sm,
                      color: PingForceColors.statusCritical),
                  const SizedBox(width: AppSpacing.space2),
                  Expanded(
                    child: Text(
                      state.submitError!,
                      style: AppTypography.bodySmall.copyWith(
                        color: PingForceColors.statusCritical,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],

          const SizedBox(height: AppSpacing.space6),

          // ── Submit ─────────────────────────────────────────────────
          SizedBox(
            height: 52,
            child: FilledButton.icon(
              onPressed: canSubmit ? _submit : null,
              icon: submitting
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(Icons.send_rounded),
              label: Text(submitting ? 'Submitting…' : 'Submit Application'),
            ),
          ),

          const SizedBox(height: AppSpacing.space4),
        ],
      ),
    );
  }

  String _fmt(DateTime dt) => '${dt.day}/${dt.month}/${dt.year}';
}

class _SuccessView extends StatelessWidget {
  const _SuccessView({
    required this.days,
    required this.typeName,
    required this.onAnother,
  });
  final int days;
  final String typeName;
  final VoidCallback onAnother;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: AppSpacing.screenPaddingAll,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                color: PingForceColors.statusSuccessContainer,
              ),
              child: const Icon(Icons.check_rounded,
                  size: 36, color: PingForceColors.statusSuccess),
            ),
            const SizedBox(height: AppSpacing.space4),
            Text('Leave Applied!', style: AppTypography.titleLarge),
            const SizedBox(height: AppSpacing.space2),
            Text(
              'Your ${days > 0 ? '$days-day ' : ''}$typeName leave request has been submitted for approval.',
              textAlign: TextAlign.center,
              style: AppTypography.bodyMedium.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: AppSpacing.space6),
            FilledButton(
              onPressed: onAnother,
              child: const Text('Apply Another'),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 2 — BALANCE
// ─────────────────────────────────────────────────────────────────────────────

class _LeaveBalanceTab extends ConsumerWidget {
  const _LeaveBalanceTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(leaveNotifierProvider);

    if (state.isLoading && state.balances.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }
    if (state.balances.isEmpty) {
      return _EmptyView(
        icon: Icons.account_balance_wallet_outlined,
        title: 'No balance data',
        subtitle: state.errorMessage ?? 'No leave balances for this year.',
        onRetry: () => ref.read(leaveNotifierProvider.notifier).refresh(),
      );
    }

    return RefreshIndicator(
      onRefresh: () => ref.read(leaveNotifierProvider.notifier).refresh(),
      child: ListView(
        padding: AppSpacing.screenPaddingAll,
        children: [
          const SizedBox(height: AppSpacing.space3),
          Card(
            color: Theme.of(context).colorScheme.primaryContainer,
            child: Padding(
              padding: AppSpacing.cardPaddingAll,
              child: Row(
                children: [
                  Expanded(
                    child: _SummaryCount(
                      label: 'Total Available',
                      value: state.totalAvailable.toStringAsFixed(0),
                      color: PingForceColors.statusSuccess,
                    ),
                  ),
                  Expanded(
                    child: _SummaryCount(
                      label: 'Used This Year',
                      value: state.totalUsed.toStringAsFixed(0),
                      color: Theme.of(context).colorScheme.onPrimaryContainer,
                    ),
                  ),
                  Expanded(
                    child: _SummaryCount(
                      label: 'Pending Approval',
                      value: state.totalPending.toStringAsFixed(0),
                      color: PingForceColors.statusWarning,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.space4),
          ...state.balances.map((b) => Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.cardMargin),
                child: _LeaveBalanceCard(balance: b),
              )),
        ],
      ),
    );
  }
}

class _SummaryCount extends StatelessWidget {
  const _SummaryCount({
    required this.label,
    required this.value,
    required this.color,
  });
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(value, style: AppTypography.numericMedium.copyWith(color: color)),
        Text(label,
            style: AppTypography.labelSmall.copyWith(
              color: Theme.of(context).colorScheme.onPrimaryContainer,
            ),
            textAlign: TextAlign.center),
      ],
    );
  }
}

class _LeaveBalanceCard extends StatelessWidget {
  const _LeaveBalanceCard({required this.balance});
  final LeaveBalanceModel balance;

  @override
  Widget build(BuildContext context) {
    final color = _typeColor(balance.leaveTypeName);

    return Card(
      child: Padding(
        padding: AppSpacing.cardPaddingAll,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 12,
                  height: 12,
                  decoration:
                      BoxDecoration(shape: BoxShape.circle, color: color),
                ),
                const SizedBox(width: AppSpacing.space2),
                Text(balance.leaveTypeName, style: AppTypography.titleSmall),
                const Spacer(),
                Text(
                  '${balance.availableDays.toInt()} / ${balance.totalDays.toInt()} days',
                  style: AppTypography.numericSmall.copyWith(
                    color: Theme.of(context).colorScheme.onSurface,
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.space3),
            ClipRRect(
              borderRadius: AppRadius.pillAll,
              child: Stack(
                children: [
                  Container(
                    height: 8,
                    color:
                        Theme.of(context).colorScheme.surfaceContainerHighest,
                  ),
                  FractionallySizedBox(
                    widthFactor: balance.usedFraction.clamp(0.0, 1.0),
                    child: Container(height: 8, color: color),
                  ),
                  if (balance.pendingDays > 0)
                    FractionallySizedBox(
                      widthFactor: (balance.usedFraction +
                              balance.pendingFraction)
                          .clamp(0.0, 1.0),
                      child: Container(
                        height: 8,
                        color: color.withValues(alpha: 0.35),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.space2),
            Row(
              children: [
                _Legend(color: color, label: 'Used ${balance.usedDays.toInt()}'),
                const SizedBox(width: AppSpacing.space4),
                if (balance.pendingDays > 0)
                  _Legend(
                    color: color.withValues(alpha: 0.4),
                    label: 'Pending ${balance.pendingDays.toInt()}',
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _Legend extends StatelessWidget {
  const _Legend({required this.color, required this.label});
  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(shape: BoxShape.circle, color: color)),
        const SizedBox(width: 4),
        Text(label,
            style: AppTypography.labelSmall.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            )),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 3 — HISTORY
// ─────────────────────────────────────────────────────────────────────────────

class _LeaveHistoryTab extends ConsumerWidget {
  const _LeaveHistoryTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(leaveNotifierProvider);

    if (state.isLoading && state.history.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }
    if (state.history.isEmpty) {
      return _EmptyView(
        icon: Icons.history_rounded,
        title: 'No leave history',
        subtitle:
            state.errorMessage ?? 'Your applied leaves will appear here.',
        onRetry: () => ref.read(leaveNotifierProvider.notifier).refresh(),
      );
    }

    return RefreshIndicator(
      onRefresh: () => ref.read(leaveNotifierProvider.notifier).refresh(),
      child: ListView.separated(
        padding: AppSpacing.screenPaddingAll,
        itemCount: state.history.length,
        separatorBuilder: (_, _) =>
            const SizedBox(height: AppSpacing.cardMargin),
        itemBuilder: (_, i) => _LeaveHistoryCard(app: state.history[i]),
      ),
    );
  }
}

class _LeaveHistoryCard extends StatelessWidget {
  const _LeaveHistoryCard({required this.app});
  final LeaveRequestModel app;

  @override
  Widget build(BuildContext context) {
    final status = _statusFrom(app.status);
    final color = _typeColor(app.leaveTypeName);

    return Card(
      child: Padding(
        padding: AppSpacing.cardPaddingAll,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 10,
                  height: 10,
                  decoration:
                      BoxDecoration(shape: BoxShape.circle, color: color),
                ),
                const SizedBox(width: AppSpacing.space2),
                Text(app.leaveTypeName,
                    style: AppTypography.labelMedium.copyWith(
                        color: color, fontWeight: FontWeight.w600)),
                const Spacer(),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: status.bgColor,
                    borderRadius: AppRadius.pillAll,
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(status.icon, size: 12, color: status.color),
                      const SizedBox(width: 4),
                      Text(status.label,
                          style: AppTypography.labelSmall
                              .copyWith(color: status.color)),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.space2),
            Text(
              '${_fmt(app.startDate)} – ${_fmt(app.endDate)} · ${app.days} day${app.days == 1 ? '' : 's'}',
              style: AppTypography.bodyMedium,
            ),
            if (app.reason != null && app.reason!.isNotEmpty) ...[
              const SizedBox(height: AppSpacing.space1),
              Text(
                app.reason!,
                style: AppTypography.bodySmall.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant),
              ),
            ],
            const SizedBox(height: AppSpacing.space2),
            Text(
              'Applied: ${_fmt(app.appliedOn)}',
              style: AppTypography.labelSmall.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant),
            ),
          ],
        ),
      ),
    );
  }

  String _fmt(DateTime dt) => '${dt.day}/${dt.month}/${dt.year}';
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED — empty / error state
// ─────────────────────────────────────────────────────────────────────────────

class _EmptyView extends StatelessWidget {
  const _EmptyView({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onRetry,
  });
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: AppSpacing.screenPaddingAll,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon,
                size: AppIconSize.xl,
                color: Theme.of(context).colorScheme.onSurfaceVariant),
            const SizedBox(height: AppSpacing.space3),
            Text(title, style: AppTypography.titleSmall),
            const SizedBox(height: AppSpacing.space1),
            Text(subtitle,
                textAlign: TextAlign.center,
                style: AppTypography.bodySmall.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                )),
            const SizedBox(height: AppSpacing.space4),
            OutlinedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }
}
