import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/theme.dart';
import '../../../../core/widgets/app_states.dart';
import 'fault_state.dart';
import 'fault_notifier.dart';
import 'widgets/fault_list_card.dart';
import 'widgets/fault_filter_sheet.dart';

// ─────────────────────────────────────────────────────────────────────────────
// FAULT LIST SCREEN  (AUDIT §7.1)
// ─────────────────────────────────────────────────────────────────────────────

class FaultListScreen extends ConsumerStatefulWidget {
  const FaultListScreen({super.key});

  @override
  ConsumerState<FaultListScreen> createState() => _FaultListScreenState();
}

class _FaultListScreenState extends ConsumerState<FaultListScreen>
    with SingleTickerProviderStateMixin {
  final TextEditingController _searchController = TextEditingController();
  late final TabController _tabController;

  final List<String> _tabs = ['All', 'Open', 'In Progress', 'Overdue', 'Closed'];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _tabs.length, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(faultNotifierProvider.notifier).load();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(faultNotifierProvider);

    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      appBar: _buildAppBar(context, state),
      body: Column(
        children: [
          // ── Search bar ─────────────────────────────────────────────────
          _buildSearchBar(context),

          // ── Status tabs ────────────────────────────────────────────────
          _buildTabBar(context),

          // ── Content ────────────────────────────────────────────────────
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: _tabs.map((tab) {
                return _buildFaultList(context, state, tab);
              }).toList(),
            ),
          ),
        ],
      ),

      // ── FAB (create fault if permitted) ─────────────────────────────────
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => ref.read(faultNotifierProvider.notifier).goToCreate(context),
        icon: const Icon(Icons.add_rounded),
        label: const Text('Report Fault'),
      ),
    );
  }

  // ── AppBar ─────────────────────────────────────────────────────────────────

  PreferredSizeWidget _buildAppBar(BuildContext context, FaultState state) {
    return AppBar(
      title: const Text('Faults'),
      actions: [
        // Filter icon with active badge when filters applied
        Stack(
          alignment: Alignment.topRight,
          children: [
            IconButton(
              icon: const Icon(Icons.tune_rounded),
              tooltip: 'Filter',
              onPressed: () => _showFilterSheet(context, state),
            ),
            if (state.activeFilterCount > 0)
              Positioned(
                top: 8,
                right: 8,
                child: Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    color: PingForceColors.statusCritical,
                  ),
                ),
              ),
          ],
        ),
        IconButton(
          icon: const Icon(Icons.sort_rounded),
          tooltip: 'Sort',
          onPressed: () => _showSortMenu(context),
        ),
      ],
    );
  }

  // ── Search bar ─────────────────────────────────────────────────────────────

  Widget _buildSearchBar(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.screenHorizontal,
        AppSpacing.space3,
        AppSpacing.screenHorizontal,
        AppSpacing.space2,
      ),
      child: SearchBar(
        controller: _searchController,
        hintText: 'Search faults by ID, customer, or description...',
        leading: const Icon(Icons.search_rounded),
        trailing: [
          if (_searchController.text.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.clear_rounded),
              onPressed: () {
                _searchController.clear();
                ref.read(faultNotifierProvider.notifier).onSearchChanged('');
              },
            ),
        ],
        onChanged: (q) =>
            ref.read(faultNotifierProvider.notifier).onSearchChanged(q),
        elevation: const WidgetStatePropertyAll(0),
        backgroundColor: WidgetStatePropertyAll(
          Theme.of(context).colorScheme.surfaceContainerHigh,
        ),
        shape: WidgetStatePropertyAll(
          RoundedRectangleBorder(borderRadius: AppRadius.pillAll),
        ),
      ),
    );
  }

  // ── Tab bar ────────────────────────────────────────────────────────────────

  Widget _buildTabBar(BuildContext context) {
    return TabBar(
      controller: _tabController,
      isScrollable: true,
      tabAlignment: TabAlignment.start,
      labelStyle: AppTypography.labelMedium,
      tabs: _tabs
          .map((t) => Tab(
                child: t == 'Overdue'
                    ? Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(t),
                          const SizedBox(width: 4),
                          Consumer(builder: (_, ref, __) {
                            final count = ref
                                .watch(faultNotifierProvider)
                                .overdueCount;
                            if (count == 0) return const SizedBox.shrink();
                            return Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 5, vertical: 1),
                              decoration: BoxDecoration(
                                color: PingForceColors.statusCritical,
                                borderRadius: AppRadius.pillAll,
                              ),
                              child: Text(
                                '$count',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            );
                          }),
                        ],
                      )
                    : Text(t),
              ))
          .toList(),
    );
  }

  // ── Fault list per tab ─────────────────────────────────────────────────────

  Widget _buildFaultList(
      BuildContext context, FaultState state, String tab) {
    if (state.isLoading) {
      return const Padding(
        padding: EdgeInsets.all(AppSpacing.screenHorizontal),
        child: FullPageLoader(layout: FullPageLoaderLayout.list),
      );
    }

    final faults = state.faultsForTab(tab);

    if (faults.isEmpty) {
      return AppEmptyState(
        type: AppEmptyStateType.noFaultsAssigned,
        actionLabel: tab == 'All' ? 'Report a Fault' : null,
        onAction: tab == 'All'
            ? () => ref.read(faultNotifierProvider.notifier).goToCreate(context)
            : null,
      );
    }

    if (state.errorMessage != null) {
      return AppErrorState(
        type: AppErrorType.network,
        message: state.errorMessage,
        onRetry: () => ref.read(faultNotifierProvider.notifier).load(),
      );
    }

    return RefreshIndicator(
      onRefresh: () => ref.read(faultNotifierProvider.notifier).refresh(),
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(
          AppSpacing.screenHorizontal,
          AppSpacing.space3,
          AppSpacing.screenHorizontal,
          // Space for FAB
          80,
        ),
        itemCount: faults.length,
        separatorBuilder: (_, __) =>
            const SizedBox(height: AppSpacing.cardMargin),
        itemBuilder: (context, index) {
          final fault = faults[index];
          return FaultListCard(
            fault: fault,
            onTap: () => ref
                .read(faultNotifierProvider.notifier)
                .goToDetail(context, fault.id),
          );
        },
      ),
    );
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  void _showFilterSheet(BuildContext context, FaultState state) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (_) => FaultFilterSheet(
        currentFilters: state.activeFilters,
        onApply: (filters) {
          ref.read(faultNotifierProvider.notifier).applyFilters(filters);
          Navigator.of(context).pop();
        },
        onReset: () {
          ref.read(faultNotifierProvider.notifier).resetFilters();
          Navigator.of(context).pop();
        },
      ),
    );
  }

  void _showSortMenu(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              title: const Text('Sort by SLA Urgency'),
              leading: const Icon(Icons.alarm_rounded),
              onTap: () {
                ref.read(faultNotifierProvider.notifier).sortBy(FaultSortBy.sla);
                Navigator.of(ctx).pop();
              },
            ),
            ListTile(
              title: const Text('Sort by Priority'),
              leading: const Icon(Icons.flag_rounded),
              onTap: () {
                ref.read(faultNotifierProvider.notifier).sortBy(FaultSortBy.priority);
                Navigator.of(ctx).pop();
              },
            ),
            ListTile(
              title: const Text('Sort by Newest'),
              leading: const Icon(Icons.schedule_rounded),
              onTap: () {
                ref.read(faultNotifierProvider.notifier).sortBy(FaultSortBy.newest);
                Navigator.of(ctx).pop();
              },
            ),
            ListTile(
              title: const Text('Sort by Status'),
              leading: const Icon(Icons.list_alt_rounded),
              onTap: () {
                ref.read(faultNotifierProvider.notifier).sortBy(FaultSortBy.status);
                Navigator.of(ctx).pop();
              },
            ),
          ],
        ),
      ),
    );
  }
}
