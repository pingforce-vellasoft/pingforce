import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../injection_container.dart';
import '../data/models/leave_models.dart';
import '../domain/repositories/leave_repository.dart';

// ─────────────────────────────────────────────────────────────────────────────
// LEAVE STATE
// ─────────────────────────────────────────────────────────────────────────────

enum SubmitStatus { idle, submitting, success, failure }

class LeaveState {
  const LeaveState({
    this.isLoading = true,
    this.errorMessage,
    this.types = const [],
    this.balances = const [],
    this.history = const [],
    this.submitStatus = SubmitStatus.idle,
    this.submitError,
    this.hasMore = false,
    this.loadingMore = false,
  });

  final bool isLoading;
  final String? errorMessage;
  final List<LeaveTypeModel> types;
  final List<LeaveBalanceModel> balances;
  final List<LeaveRequestModel> history;
  final SubmitStatus submitStatus;
  final String? submitError;
  final bool hasMore;
  final bool loadingMore;

  double get totalAvailable =>
      balances.fold(0.0, (s, b) => s + b.availableDays);
  double get totalUsed => balances.fold(0.0, (s, b) => s + b.usedDays);
  double get totalPending => balances.fold(0.0, (s, b) => s + b.pendingDays);

  LeaveState copyWith({
    bool? isLoading,
    String? errorMessage,
    bool clearError = false,
    List<LeaveTypeModel>? types,
    List<LeaveBalanceModel>? balances,
    List<LeaveRequestModel>? history,
    SubmitStatus? submitStatus,
    String? submitError,
    bool clearSubmitError = false,
    bool? hasMore,
    bool? loadingMore,
  }) {
    return LeaveState(
      isLoading: isLoading ?? this.isLoading,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      types: types ?? this.types,
      balances: balances ?? this.balances,
      history: history ?? this.history,
      submitStatus: submitStatus ?? this.submitStatus,
      submitError: clearSubmitError ? null : (submitError ?? this.submitError),
      hasMore: hasMore ?? this.hasMore,
      loadingMore: loadingMore ?? this.loadingMore,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LEAVE NOTIFIER
// ─────────────────────────────────────────────────────────────────────────────

final leaveNotifierProvider = StateNotifierProvider<LeaveNotifier, LeaveState>(
  (ref) => LeaveNotifier(),
);

class LeaveNotifier extends StateNotifier<LeaveState> {
  LeaveNotifier() : super(const LeaveState());
  LeaveRepository get _repo => sl<LeaveRepository>();

  /// Loads leave types, this year's balances and history in parallel.
  Future<void> load() async {
    state = state.copyWith(isLoading: true, clearError: true);
    final year = DateTime.now().year;

    final results = await Future.wait([
      _repo.getTypes(),
      _repo.getMyBalances(year),
      _repo.getMyRequests(),
    ]);
    if (!mounted) return;

    final typesRes = results[0];
    final balancesRes = results[1];
    final historyRes = results[2];

    String? firstError;
    final types = typesRes.fold((f) {
      firstError ??= f.message;
      return <LeaveTypeModel>[];
    }, (r) => r as List<LeaveTypeModel>);
    final balances = balancesRes.fold((f) {
      firstError ??= f.message;
      return <LeaveBalanceModel>[];
    }, (r) => r as List<LeaveBalanceModel>);
    final history = historyRes.fold((f) {
      firstError ??= f.message;
      return <LeaveRequestModel>[];
    }, (r) => r as List<LeaveRequestModel>);

    state = state.copyWith(
      isLoading: false,
      types: types,
      balances: balances,
      history: history,
      hasMore: history.length == 25,
      errorMessage: firstError,
    );
  }

  Future<void> refresh() => load();

  Future<void> loadMore() async {
    if (state.loadingMore || state.isLoading || !state.hasMore) return;
    state = state.copyWith(loadingMore: true, clearError: true);
    final result = await _repo.getMyRequests(skip: state.history.length);
    if (!mounted) return;
    result.fold(
      (failure) => state = state.copyWith(
        loadingMore: false,
        errorMessage: failure.message,
      ),
      (rows) => state = state.copyWith(
        loadingMore: false,
        hasMore: rows.length == 25,
        history: [
          ...state.history,
          ...rows.where(
            (row) => !state.history.any((existing) => existing.id == row.id),
          ),
        ],
      ),
    );
  }

  /// Files a leave request. On success refreshes balances + history so the
  /// new pending request and decremented balance appear immediately.
  Future<void> submit({
    required String leaveTypeId,
    required DateTime startDate,
    required DateTime endDate,
    String? reason,
    String duration = 'FULL_DAY',
  }) async {
    if (state.submitStatus == SubmitStatus.submitting) return;
    state = state.copyWith(
      submitStatus: SubmitStatus.submitting,
      clearSubmitError: true,
    );

    final result = await _repo.requestLeave(
      leaveTypeId: leaveTypeId,
      startDate: startDate,
      endDate: endDate,
      reason: reason,
      duration: duration,
    );
    if (!mounted) return;

    await result.fold(
      (failure) async {
        state = state.copyWith(
          submitStatus: SubmitStatus.failure,
          submitError: failure.message,
        );
      },
      (_) async {
        state = state.copyWith(submitStatus: SubmitStatus.success);
        // Reflect the new request without a full-screen reload.
        final year = DateTime.now().year;
        final refreshed = await Future.wait([
          _repo.getMyBalances(year),
          _repo.getMyRequests(),
        ]);
        if (!mounted) return;
        final balances = refreshed[0].fold(
          (_) => state.balances,
          (r) => r as List<LeaveBalanceModel>,
        );
        final history = refreshed[1].fold(
          (_) => state.history,
          (r) => r as List<LeaveRequestModel>,
        );
        state = state.copyWith(
          balances: balances,
          history: history,
          hasMore: history.length == 25,
        );
      },
    );
  }

  Future<String?> withdraw(String id) async {
    if (state.submitStatus == SubmitStatus.submitting) {
      return 'Another leave change is in progress.';
    }
    state = state.copyWith(submitStatus: SubmitStatus.submitting);
    final result = await _repo.withdraw(id);
    if (!mounted) return null;
    String? error;
    result.fold((failure) => error = failure.message, (_) {});
    state = state.copyWith(submitStatus: SubmitStatus.idle);
    if (error == null) await load();
    return error;
  }

  Future<double?> preview({
    required String leaveTypeId,
    required DateTime startDate,
    required DateTime endDate,
    required String duration,
  }) async {
    final result = await _repo.preview(
      leaveTypeId: leaveTypeId,
      startDate: startDate,
      endDate: endDate,
      duration: duration,
    );
    if (!mounted) return null;
    return result.fold((failure) {
      state = state.copyWith(
        submitStatus: SubmitStatus.failure,
        submitError: failure.message,
      );
      return null;
    }, (days) => days);
  }

  /// Reset the Apply form after a success so the user can file another.
  void resetSubmit() {
    state = state.copyWith(
      submitStatus: SubmitStatus.idle,
      clearSubmitError: true,
    );
  }
}
