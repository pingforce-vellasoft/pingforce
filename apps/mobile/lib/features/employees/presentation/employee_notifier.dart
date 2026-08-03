import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../injection_container.dart';
import '../domain/entities/employee.dart';
import '../domain/repositories/employee_repository.dart';

// ─────────────────────────────────────────────────────────────────────────────
// EMPLOYEE LIST STATE
// ─────────────────────────────────────────────────────────────────────────────

class EmployeeState {
  const EmployeeState({
    this.isLoading = true,
    this.isLoadingMore = false,
    this.isSaving = false,
    this.errorMessage,
    this.items = const [],
    this.search = '',
    this.hasMore = true,
  });

  final bool isLoading;
  final bool isLoadingMore;
  final bool isSaving;
  final String? errorMessage;
  final List<Employee> items;
  final String search;

  /// False once a page came back short, so the list stops asking for more.
  final bool hasMore;

  /// Client-side filter. The list endpoint is cursor-paginated with no search
  /// parameter, so filtering happens over what has been loaded.
  List<Employee> get visibleItems {
    final q = search.trim().toLowerCase();
    if (q.isEmpty) return items;
    return items.where((e) {
      return e.fullName.toLowerCase().contains(q) ||
          e.employeeCode.toLowerCase().contains(q) ||
          (e.primaryEmail ?? '').toLowerCase().contains(q) ||
          (e.primaryMobile ?? '').toLowerCase().contains(q);
    }).toList();
  }

  EmployeeState copyWith({
    bool? isLoading,
    bool? isLoadingMore,
    bool? isSaving,
    String? errorMessage,
    bool clearError = false,
    List<Employee>? items,
    String? search,
    bool? hasMore,
  }) {
    return EmployeeState(
      isLoading: isLoading ?? this.isLoading,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      isSaving: isSaving ?? this.isSaving,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      items: items ?? this.items,
      search: search ?? this.search,
      hasMore: hasMore ?? this.hasMore,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EMPLOYEE NOTIFIER
// ─────────────────────────────────────────────────────────────────────────────

final employeeNotifierProvider =
    NotifierProvider<EmployeeNotifier, EmployeeState>(EmployeeNotifier.new);

class EmployeeNotifier extends Notifier<EmployeeState> {
  EmployeeRepository get _repo => sl<EmployeeRepository>();

  static const _pageSize = 50;

  @override
  EmployeeState build() => const EmployeeState();

  Future<void> load() async {
    state = state.copyWith(isLoading: true, clearError: true);
    final result = await _repo.getEmployees(take: _pageSize);
    result.fold(
      (f) => state = state.copyWith(isLoading: false, errorMessage: f.message),
      (items) => state = state.copyWith(
        isLoading: false,
        items: items,
        clearError: true,
        hasMore: items.length >= _pageSize,
      ),
    );
  }

  Future<void> refresh() => load();

  /// Loads the next page. No-ops while a load is in flight or once the last
  /// page came back short, so scrolling the bottom cannot spam the API.
  Future<void> loadMore() async {
    if (state.isLoading || state.isLoadingMore || !state.hasMore) return;
    if (state.items.isEmpty) return;

    state = state.copyWith(isLoadingMore: true);
    final result = await _repo.getEmployees(
      cursor: state.items.last.id,
      take: _pageSize,
    );
    result.fold(
      (f) =>
          state = state.copyWith(isLoadingMore: false, errorMessage: f.message),
      (page) => state = state.copyWith(
        isLoadingMore: false,
        items: [...state.items, ...page],
        hasMore: page.length >= _pageSize,
        clearError: true,
      ),
    );
  }

  void setSearch(String value) => state = state.copyWith(search: value);

  /// Creates an employee and prepends it. Returns the result on success, or
  /// null on failure with the message left in `state.errorMessage`.
  Future<EmployeeCreateResult?> create({
    required String employeeCode,
    required String firstName,
    required String lastName,
    String? primaryEmail,
    String? primaryMobile,
    String? employmentType,
    DateTime? joiningDate,
    String? roleId,
  }) async {
    state = state.copyWith(isSaving: true, clearError: true);
    final result = await _repo.createEmployee(
      employeeCode: employeeCode,
      firstName: firstName,
      lastName: lastName,
      primaryEmail: primaryEmail,
      primaryMobile: primaryMobile,
      employmentType: employmentType,
      joiningDate: joiningDate,
      roleId: roleId,
    );
    return result.fold(
      (f) {
        state = state.copyWith(isSaving: false, errorMessage: f.message);
        return null;
      },
      (created) {
        state = state.copyWith(
          isSaving: false,
          items: [created.employee, ...state.items],
          clearError: true,
        );
        return created;
      },
    );
  }

  /// Updates an employee in place. Returns null on success or an error message.
  Future<String?> update(
    String id, {
    String? employeeCode,
    String? firstName,
    String? lastName,
    String? primaryEmail,
    String? primaryMobile,
    String? employmentType,
    DateTime? joiningDate,
  }) async {
    state = state.copyWith(isSaving: true, clearError: true);
    final result = await _repo.updateEmployee(
      id,
      employeeCode: employeeCode,
      firstName: firstName,
      lastName: lastName,
      primaryEmail: primaryEmail,
      primaryMobile: primaryMobile,
      employmentType: employmentType,
      joiningDate: joiningDate,
    );
    return result.fold(
      (f) {
        state = state.copyWith(isSaving: false, errorMessage: f.message);
        return f.message;
      },
      (updated) {
        state = state.copyWith(
          isSaving: false,
          items: [
            for (final e in state.items) if (e.id == id) updated else e,
          ],
          clearError: true,
        );
        return null;
      },
    );
  }

  /// Optimistically removes the employee, persists, reverts on failure.
  Future<String?> delete(String id) async {
    final previous = state.items;
    state = state.copyWith(items: state.items.where((e) => e.id != id).toList());
    final result = await _repo.deleteEmployee(id);
    return result.fold(
      (f) {
        state = state.copyWith(items: previous, errorMessage: f.message);
        return f.message;
      },
      (_) => null,
    );
  }

  /// Sends a workspace invite. Returns the result or null on failure.
  Future<EmployeeInviteResult?> invite(String id) async {
    state = state.copyWith(isSaving: true, clearError: true);
    final result = await _repo.inviteEmployee(id);
    return result.fold(
      (f) {
        state = state.copyWith(isSaving: false, errorMessage: f.message);
        return null;
      },
      (res) {
        state = state.copyWith(isSaving: false, clearError: true);
        return res;
      },
    );
  }
}
