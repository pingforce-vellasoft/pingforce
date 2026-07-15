import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../injection_container.dart';
import '../data/faults_remote_data_source.dart';
import 'fault_state.dart';

// ─────────────────────────────────────────────────────────────────────────────
// FAULT NOTIFIER — loads assigned faults from the API (3.3 API.md)
// ─────────────────────────────────────────────────────────────────────────────

final faultNotifierProvider =
    NotifierProvider<FaultNotifier, FaultState>(FaultNotifier.new);

class FaultNotifier extends Notifier<FaultState> {
  @override
  FaultState build() => const FaultState(isLoading: true);

  Future<void> load() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final faults = await sl<FaultsRemoteDataSource>().fetchFaults();
      state = state.copyWith(isLoading: false, allFaults: faults);
    } catch (_) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Could not load faults. Pull to retry.',
      );
    }
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
    context.push('/faults/new');
  }

  void goToDetail(BuildContext context, String faultId) {
    context.push('/faults/$faultId');
  }
}
