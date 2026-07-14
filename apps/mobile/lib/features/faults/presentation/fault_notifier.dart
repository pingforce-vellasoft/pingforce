import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'fault_state.dart';

// ─────────────────────────────────────────────────────────────────────────────
// FAULT NOTIFIER
// TODO(phase-2): wire to the faults remote datasource via get_it — the stub
// data below exists only so the screen renders until the data layer is bridged.
// ─────────────────────────────────────────────────────────────────────────────

final faultNotifierProvider =
    NotifierProvider<FaultNotifier, FaultState>(FaultNotifier.new);

class FaultNotifier extends Notifier<FaultState> {
  @override
  FaultState build() => const FaultState(isLoading: true);

  Future<void> load() async {
    state = state.copyWith(isLoading: true);
    await Future<void>.delayed(const Duration(milliseconds: 600));
    state = state.copyWith(
      isLoading: false,
      allFaults: _stubFaults(),
    );
  }

  Future<void> refresh() async {
    state = state.copyWith(isRefreshing: true);
    await load();
    state = state.copyWith(isRefreshing: false);
  }

  void onSearchChanged(String q) {
    state = state.copyWith(
      activeFilters: state.activeFilters.copyWith(searchQuery: q),
    );
  }

  void applyFilters(FaultFilters filters) {
    state = state.copyWith(activeFilters: filters);
  }

  void resetFilters() {
    state = state.copyWith(activeFilters: const FaultFilters());
  }

  void sortBy(FaultSortBy sort) {
    state = state.copyWith(sortBy: sort);
  }

  void goToCreate(BuildContext context) {
    // TODO: context.push('/faults/new');
  }

  void goToDetail(BuildContext context, String faultId) {
    // TODO: context.push('/faults/$faultId');
  }

  // Stub data
  List<FaultSummary> _stubFaults() {
    final now = DateTime.now();
    return [
      FaultSummary(
        id: '1',
        faultNumber: 'F-1032',
        title: 'AC Unit Failure — Building 4, Floor 3',
        description: 'Central AC unit not cooling below 25°C',
        status: FaultStatus.inProgress,
        priority: FaultPriority.critical,
        customerName: 'ACME Corp',
        siteName: 'Headquarters',
        createdAt: now.subtract(const Duration(hours: 6)),
        dueAt: now.subtract(const Duration(hours: 1)), // breached!
        assigneeName: 'Ahmed Ali',
        attemptsCount: 2,
        hasAttachments: true,
        commentsCount: 3,
      ),
      FaultSummary(
        id: '2',
        faultNumber: 'F-1031',
        title: 'Water Leak — Basement Pump Room',
        description: 'Minor water leak from main supply pipe',
        status: FaultStatus.open,
        priority: FaultPriority.high,
        customerName: 'Star Mall',
        siteName: 'Basement Level',
        createdAt: now.subtract(const Duration(hours: 3)),
        dueAt: now.add(const Duration(hours: 2)), // warning
        commentsCount: 1,
      ),
      FaultSummary(
        id: '3',
        faultNumber: 'F-1029',
        title: 'Elevator Control Panel Fault',
        description: 'Elevator 3 not responding to floor 5 call',
        status: FaultStatus.open,
        priority: FaultPriority.medium,
        customerName: 'City Tower',
        siteName: 'Tower B',
        createdAt: now.subtract(const Duration(hours: 1)),
        dueAt: now.add(const Duration(hours: 8)), // safe
        isOffline: true,
      ),
    ];
  }
}
