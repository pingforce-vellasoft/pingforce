import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/theme.dart';
import '../../../core/widgets/offline_aware_scaffold.dart';

// ─────────────────────────────────────────────────────────────────────────────
// LEAVE SCREENS  (AUDIT §20 — Missing Screens)
// ─────────────────────────────────────────────────────────────────────────────
//
// Covers:
//   • LeaveScreen         — Tab host (Apply | Balance | History)
//   • _LeaveApplyTab      — Application form with date range picker
//   • _LeaveBalanceTab    — Per-type balance breakdown with progress bars
//   • _LeaveHistoryTab    — Applied leave cards with status badges

// ── Leave type ─────────────────────────────────────────────────────────────

enum LeaveType {
  annual,
  sick,
  casual,
  unpaid,
  compensatory,
  maternity,
  paternity,
}

extension LeaveTypeX on LeaveType {
  String get label => switch (this) {
        LeaveType.annual => 'Annual',
        LeaveType.sick => 'Sick',
        LeaveType.casual => 'Casual',
        LeaveType.unpaid => 'Unpaid',
        LeaveType.compensatory => 'Compensatory',
        LeaveType.maternity => 'Maternity',
        LeaveType.paternity => 'Paternity',
      };

  Color get color => switch (this) {
        LeaveType.annual => const Color(0xFF1565C0),
        LeaveType.sick => const Color(0xFFBF360C),
        LeaveType.casual => const Color(0xFF2E7D32),
        LeaveType.unpaid => const Color(0xFF4E342E),
        LeaveType.compensatory => const Color(0xFF6A1B9A),
        LeaveType.maternity => const Color(0xFFAD1457),
        LeaveType.paternity => const Color(0xFF00695C),
      };
}

// ── Leave status ───────────────────────────────────────────────────────────

enum LeaveStatus { pending, approved, rejected, cancelled }

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
        LeaveStatus.cancelled =>
          const Color(0xFF616161),
      };

  Color get bgColor => switch (this) {
        LeaveStatus.pending => PingForceColors.statusWarningContainer,
        LeaveStatus.approved => PingForceColors.statusSuccessContainer,
        LeaveStatus.rejected => PingForceColors.statusCriticalContainer,
        LeaveStatus.cancelled =>
          const Color(0xFFEEEEEE),
      };

  IconData get icon => switch (this) {
        LeaveStatus.pending => Icons.hourglass_top_rounded,
        LeaveStatus.approved => Icons.check_circle_rounded,
        LeaveStatus.rejected => Icons.cancel_rounded,
        LeaveStatus.cancelled => Icons.remove_circle_rounded,
      };
}

// ── Leave balance stub ─────────────────────────────────────────────────────

class LeaveBalance {
  final LeaveType type;
  final double entitled;
  final double used;
  final double pending;

  const LeaveBalance({
    required this.type,
    required this.entitled,
    required this.used,
    this.pending = 0,
  });

  double get available => entitled - used - pending;
  double get usedFraction => used / entitled;
  double get pendingFraction => pending / entitled;
}

// ── Leave application stub ─────────────────────────────────────────────────

class LeaveApplication {
  final String id;
  final LeaveType type;
  final DateTime from;
  final DateTime to;
  final String reason;
  final LeaveStatus status;
  final DateTime appliedOn;
  final String? rejectionReason;

  const LeaveApplication({
    required this.id,
    required this.type,
    required this.from,
    required this.to,
    required this.reason,
    required this.status,
    required this.appliedOn,
    this.rejectionReason,
  });

  int get days => to.difference(from).inDays + 1;
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

class _LeaveApplyTab extends StatefulWidget {
  const _LeaveApplyTab();

  @override
  State<_LeaveApplyTab> createState() => _LeaveApplyTabState();
}

class _LeaveApplyTabState extends State<_LeaveApplyTab> {
  LeaveType _selectedType = LeaveType.annual;
  DateTimeRange? _dateRange;
  final _reasonCtrl = TextEditingController();
  bool _submitting = false;
  bool _submitted = false;

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
    if (_dateRange == null || _reasonCtrl.text.trim().isEmpty) return;
    setState(() => _submitting = true);
    await Future<void>.delayed(const Duration(milliseconds: 900));
    if (!mounted) return;
    setState(() {
      _submitting = false;
      _submitted = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_submitted) {
      return Center(
        child: Padding(
          padding: AppSpacing.screenPaddingAll,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
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
                'Your $_days-day ${_selectedType.label} leave request has been submitted for approval.',
                textAlign: TextAlign.center,
                style: AppTypography.bodyMedium.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: AppSpacing.space6),
              FilledButton(
                onPressed: () => setState(() => _submitted = false),
                child: const Text('Apply Another'),
              ),
            ],
          ),
        ),
      );
    }

    return SingleChildScrollView(
      padding: AppSpacing.screenPaddingAll,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: AppSpacing.space3),

          // ── Leave type chips ──────────────────────────────────────────
          Text('Leave Type', style: AppTypography.labelMedium.copyWith(
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          )),
          const SizedBox(height: AppSpacing.space2),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: LeaveType.values.map((type) {
              final selected = type == _selectedType;
              return FilterChip(
                label: Text(type.label),
                selected: selected,
                onSelected: (_) => setState(() => _selectedType = type),
                selectedColor: type.color.withValues(alpha: 0.15),
                checkmarkColor: type.color,
                side: BorderSide(
                  color: selected ? type.color : Theme.of(context).colorScheme.outlineVariant,
                ),
                labelStyle: TextStyle(
                  color: selected ? type.color : Theme.of(context).colorScheme.onSurface,
                  fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
                ),
              );
            }).toList(),
          ),

          const SizedBox(height: AppSpacing.space5),

          // ── Date range ────────────────────────────────────────────────
          Text('Duration', style: AppTypography.labelMedium.copyWith(
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
                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                            ))
                        : Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${_fmt(_dateRange!.start)} → ${_fmt(_dateRange!.end)}',
                                style: AppTypography.bodyMedium.copyWith(
                                  color: Theme.of(context).colorScheme.onSurface,
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

          const SizedBox(height: AppSpacing.space6),

          // ── Submit ─────────────────────────────────────────────────
          SizedBox(
            height: 52,
            child: FilledButton.icon(
              onPressed: _submitting ||
                      _dateRange == null ||
                      _reasonCtrl.text.trim().isEmpty
                  ? null
                  : _submit,
              icon: _submitting
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(Icons.send_rounded),
              label: Text(
                  _submitting ? 'Submitting…' : 'Submit Application'),
            ),
          ),

          const SizedBox(height: AppSpacing.space4),
        ],
      ),
    );
  }

  String _fmt(DateTime dt) =>
      '${dt.day}/${dt.month}/${dt.year}';
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 2 — BALANCE
// ─────────────────────────────────────────────────────────────────────────────

class _LeaveBalanceTab extends StatelessWidget {
  const _LeaveBalanceTab();

  static const _balances = [
    LeaveBalance(type: LeaveType.annual, entitled: 21, used: 8, pending: 2),
    LeaveBalance(type: LeaveType.sick, entitled: 14, used: 3),
    LeaveBalance(type: LeaveType.casual, entitled: 7, used: 5, pending: 1),
    LeaveBalance(type: LeaveType.compensatory, entitled: 4, used: 1),
  ];

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: AppSpacing.screenPaddingAll,
      children: [
        const SizedBox(height: AppSpacing.space3),
        // Summary card
        Card(
          color: Theme.of(context).colorScheme.primaryContainer,
          child: Padding(
            padding: AppSpacing.cardPaddingAll,
            child: Row(
              children: [
                Expanded(
                  child: _SummaryCount(
                    label: 'Total Available',
                    value: _balances
                        .fold(0.0, (s, b) => s + b.available)
                        .toStringAsFixed(0),
                    color: PingForceColors.statusSuccess,
                  ),
                ),
                Expanded(
                  child: _SummaryCount(
                    label: 'Used This Year',
                    value: _balances
                        .fold(0.0, (s, b) => s + b.used)
                        .toStringAsFixed(0),
                    color: Theme.of(context).colorScheme.onPrimaryContainer,
                  ),
                ),
                Expanded(
                  child: _SummaryCount(
                    label: 'Pending Approval',
                    value: _balances
                        .fold(0.0, (s, b) => s + b.pending)
                        .toStringAsFixed(0),
                    color: PingForceColors.statusWarning,
                  ),
                ),
              ],
            ),
          ),
        ),

        const SizedBox(height: AppSpacing.space4),

        ..._balances.map((b) => Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.cardMargin),
              child: _LeaveBalanceCard(balance: b),
            )),
      ],
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
        Text(value,
            style:
                AppTypography.numericMedium.copyWith(color: color)),
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
  final LeaveBalance balance;

  @override
  Widget build(BuildContext context) {
    final type = balance.type;

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
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: type.color,
                  ),
                ),
                const SizedBox(width: AppSpacing.space2),
                Text(type.label, style: AppTypography.titleSmall),
                const Spacer(),
                Text(
                  '${balance.available.toInt()} / ${balance.entitled.toInt()} days',
                  style: AppTypography.numericSmall.copyWith(
                    color: Theme.of(context).colorScheme.onSurface,
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.space3),
            // Stacked progress bar (used + pending)
            ClipRRect(
              borderRadius: AppRadius.pillAll,
              child: Stack(
                children: [
                  // Total background
                  Container(
                    height: 8,
                    color: Theme.of(context).colorScheme.surfaceContainerHighest,
                  ),
                  // Used portion
                  FractionallySizedBox(
                    widthFactor: balance.usedFraction,
                    child: Container(height: 8, color: type.color),
                  ),
                  // Pending portion
                  if (balance.pending > 0)
                    FractionallySizedBox(
                      widthFactor:
                          balance.usedFraction + balance.pendingFraction,
                      child: Container(
                          height: 8,
                          color: type.color.withValues(alpha: 0.35)),
                    ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.space2),
            Row(
              children: [
                _Legend(color: type.color, label: 'Used ${balance.used.toInt()}'),
                const SizedBox(width: AppSpacing.space4),
                if (balance.pending > 0)
                  _Legend(
                      color: type.color.withValues(alpha: 0.4),
                      label: 'Pending ${balance.pending.toInt()}'),
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
            decoration:
                BoxDecoration(shape: BoxShape.circle, color: color)),
        const SizedBox(width: 4),
        Text(label,
            style: AppTypography.labelSmall.copyWith(
              color:
                  Theme.of(context).colorScheme.onSurfaceVariant,
            )),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 3 — HISTORY
// ─────────────────────────────────────────────────────────────────────────────

class _LeaveHistoryTab extends StatelessWidget {
  const _LeaveHistoryTab();

  static final _history = [
    LeaveApplication(
      id: '1',
      type: LeaveType.annual,
      from: DateTime(2026, 7, 1),
      to: DateTime(2026, 7, 3),
      reason: 'Family vacation',
      status: LeaveStatus.approved,
      appliedOn: DateTime(2026, 6, 20),
    ),
    LeaveApplication(
      id: '2',
      type: LeaveType.sick,
      from: DateTime(2026, 6, 15),
      to: DateTime(2026, 6, 15),
      reason: 'Fever and cold',
      status: LeaveStatus.approved,
      appliedOn: DateTime(2026, 6, 15),
    ),
    LeaveApplication(
      id: '3',
      type: LeaveType.casual,
      from: DateTime(2026, 7, 20),
      to: DateTime(2026, 7, 21),
      reason: 'Personal work',
      status: LeaveStatus.pending,
      appliedOn: DateTime(2026, 7, 14),
    ),
    LeaveApplication(
      id: '4',
      type: LeaveType.annual,
      from: DateTime(2026, 5, 10),
      to: DateTime(2026, 5, 12),
      reason: 'Wedding attendance',
      status: LeaveStatus.rejected,
      appliedOn: DateTime(2026, 5, 1),
      rejectionReason: 'Insufficient balance at the time of application.',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: AppSpacing.screenPaddingAll,
      itemCount: _history.length,
      separatorBuilder: (_, _) =>
          const SizedBox(height: AppSpacing.cardMargin),
      itemBuilder: (_, i) => _LeaveHistoryCard(app: _history[i]),
    );
  }
}

class _LeaveHistoryCard extends StatelessWidget {
  const _LeaveHistoryCard({required this.app});
  final LeaveApplication app;

  @override
  Widget build(BuildContext context) {
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
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: app.type.color,
                  ),
                ),
                const SizedBox(width: AppSpacing.space2),
                Text(app.type.label,
                    style: AppTypography.labelMedium.copyWith(
                        color: app.type.color,
                        fontWeight: FontWeight.w600)),
                const Spacer(),
                // Status badge
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: app.status.bgColor,
                    borderRadius: AppRadius.pillAll,
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(app.status.icon,
                          size: 12, color: app.status.color),
                      const SizedBox(width: 4),
                      Text(app.status.label,
                          style: AppTypography.labelSmall
                              .copyWith(color: app.status.color)),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.space2),
            Text(
              '${_fmt(app.from)} – ${_fmt(app.to)} · ${app.days} day${app.days == 1 ? '' : 's'}',
              style: AppTypography.bodyMedium,
            ),
            const SizedBox(height: AppSpacing.space1),
            Text(
              app.reason,
              style: AppTypography.bodySmall.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant),
            ),
            if (app.rejectionReason != null) ...[
              const SizedBox(height: AppSpacing.space2),
              Container(
                padding: const EdgeInsets.all(AppSpacing.space2),
                decoration: BoxDecoration(
                  color: PingForceColors.statusCriticalContainer,
                  borderRadius: AppRadius.smAll,
                ),
                child: Text(
                  'Reason: ${app.rejectionReason}',
                  style: AppTypography.bodySmall.copyWith(
                    color: PingForceColors.statusCritical,
                  ),
                ),
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

  String _fmt(DateTime dt) =>
      '${dt.day}/${dt.month}/${dt.year}';
}
