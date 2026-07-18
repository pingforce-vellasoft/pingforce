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
  });

  final bool isLoading;
  final String? errorMessage;
  final List<LeaveTypeModel> types;
  final List<LeaveBalanceModel> balances;
  final List<LeaveRequestModel> history;
  final SubmitStatus submitStatus;
  final String? submitError;

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
  }) {
    return LeaveState(
      isLoading: isLoading ?? this.isLoading,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      types: types ?? this.types,
      balances: balances ?? this.balances,
      history: history ?? this.history,
      submitStatus: submitStatus ?? this.submitStatus,
      submitError:
          clearSubmitError ? null : (submitError ?? this.submitError),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LEAVE NOTIFIER
// ─────────────────────────────────────────────────────────────────────────────

final leaveNotifierProvider =
    NotifierProvider<LeaveNotifier, LeaveState>(LeaveNotifier.new);

class LeaveNotifier extends Notifier<LeaveState> {
  LeaveRepository get _repo => sl<LeaveRepository>();

  @override
  LeaveState build() => const LeaveState();

  /// Loads leave types, this year's balances and history in parallel.
  Future<void> load() async {
    state = state.copyWith(isLoading: true, clearError: true);
    final year = DateTime.now().year;

    final results = await Future.wait([
      _repo.getTypes(),
      _repo.getMyBalances(year),
      _repo.getMyRequests(),
    ]);

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
      errorMessage: firstError,
    );
  }

  Future<void> refresh() => load();

  /// Files a leave request. On success refreshes balances + history so the
  /// new pending request and decremented balance appear immediately.
  Future<void> submit({
    required String leaveTypeId,
    required DateTime startDate,
    required DateTime endDate,
    String? reason,
  }) async {
    state = state.copyWith(
      submitStatus: SubmitStatus.submitting,
      clearSubmitError: true,
    );

    final result = await _repo.requestLeave(
      leaveTypeId: leaveTypeId,
      startDate: startDate,
      endDate: endDate,
      reason: reason,
    );

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
        final balances = refreshed[0].fold(
          (_) => state.balances,
          (r) => r as List<LeaveBalanceModel>,
        );
        final history = refreshed[1].fold(
          (_) => state.history,
          (r) => r as List<LeaveRequestModel>,
        );
        state = state.copyWith(balances: balances, history: history);
      },
    );
  }

  /// Reset the Apply form after a success so the user can file another.
  void resetSubmit() {
    state = state.copyWith(
      submitStatus: SubmitStatus.idle,
      clearSubmitError: true,
    );
  }
}
