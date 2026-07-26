import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/error/failures.dart';
import '../../../injection_container.dart';
import '../domain/entities/geofence_assignment.dart';
import '../domain/repositories/geofence_repository.dart';

// ─────────────────────────────────────────────────────────────────────────────
// COVERAGE (geofence list screen)
// ─────────────────────────────────────────────────────────────────────────────

class GeofenceCoverageState {
  const GeofenceCoverageState({
    this.isLoading = true,
    this.coverage = GeofenceCoverage.empty,
    this.allowMultiple = false,
    this.isPolicySaving = false,
    this.errorMessage,
  });

  final bool isLoading;
  final GeofenceCoverage coverage;
  final bool allowMultiple;
  final bool isPolicySaving;
  final String? errorMessage;

  GeofenceCoverageState copyWith({
    bool? isLoading,
    GeofenceCoverage? coverage,
    bool? allowMultiple,
    bool? isPolicySaving,
    String? errorMessage,
    bool clearError = false,
  }) {
    return GeofenceCoverageState(
      isLoading: isLoading ?? this.isLoading,
      coverage: coverage ?? this.coverage,
      allowMultiple: allowMultiple ?? this.allowMultiple,
      isPolicySaving: isPolicySaving ?? this.isPolicySaving,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

final geofenceCoverageProvider =
    NotifierProvider<GeofenceCoverageNotifier, GeofenceCoverageState>(
  GeofenceCoverageNotifier.new,
);

/// Assigned-employee counts per geofence plus the tenant's one-vs-many policy.
/// Drives the staffing badges and the "N employees cannot punch" warning on
/// the geofence list.
class GeofenceCoverageNotifier extends Notifier<GeofenceCoverageState> {
  GeofenceRepository get _repo => sl<GeofenceRepository>();

  @override
  GeofenceCoverageState build() => const GeofenceCoverageState();

  Future<void> load() async {
    state = state.copyWith(isLoading: true, clearError: true);
    // Awaited separately rather than via Future.wait so each keeps its own
    // Either type instead of collapsing to dynamic.
    final coverageResult = await _repo.getCoverage();
    final policyResult = await _repo.getAllowMultiple();

    coverageResult.fold(
      (f) => state = state.copyWith(isLoading: false, errorMessage: f.message),
      (c) => state =
          state.copyWith(isLoading: false, coverage: c, clearError: true),
    );
    // A policy read failure is not worth blocking the screen on — the counts
    // still render and the toggle falls back to the stricter default.
    policyResult.fold(
      (_) {},
      (allow) => state = state.copyWith(allowMultiple: allow),
    );
  }

  /// Returns null on success, else a message to surface.
  Future<String?> setAllowMultiple(bool allow) async {
    final previous = state.allowMultiple;
    state = state.copyWith(allowMultiple: allow, isPolicySaving: true);
    final result = await _repo.setAllowMultiple(allow);
    return result.fold(
      (f) {
        // Snap back so the switch never shows a state the server rejected.
        state = state.copyWith(allowMultiple: previous, isPolicySaving: false);
        return f.message;
      },
      (saved) {
        state = state.copyWith(allowMultiple: saved, isPolicySaving: false);
        return null;
      },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ASSIGNMENT SHEET (one geofence)
// ─────────────────────────────────────────────────────────────────────────────

class GeofenceAssignmentState {
  const GeofenceAssignmentState({
    this.isLoadingAssigned = true,
    this.isLoadingCandidates = true,
    this.isSaving = false,
    this.assigned = const [],
    this.candidates = const [],
    this.selected = const {},
    this.search = '',
    this.showAll = false,
    this.allowMultiple = false,
    this.tenantHasEmployees,
    this.errorMessage,
  });

  final bool isLoadingAssigned;
  final bool isLoadingCandidates;
  final bool isSaving;
  final List<AssignedEmployee> assigned;
  final List<AssignableEmployee> candidates;
  final Set<String> selected;
  final String search;
  final bool showAll;
  final bool allowMultiple;

  /// Null until the first candidate load resolves — the "create employees
  /// first" prompt must not flash before the answer is known.
  final bool? tenantHasEmployees;
  final String? errorMessage;

  /// Selected employees that would be moved off another geofence.
  int get reassignCount =>
      candidates.where((c) => selected.contains(c.id) && c.requiresReassign).length;

  GeofenceAssignmentState copyWith({
    bool? isLoadingAssigned,
    bool? isLoadingCandidates,
    bool? isSaving,
    List<AssignedEmployee>? assigned,
    List<AssignableEmployee>? candidates,
    Set<String>? selected,
    String? search,
    bool? showAll,
    bool? allowMultiple,
    bool? tenantHasEmployees,
    String? errorMessage,
    bool clearError = false,
  }) {
    return GeofenceAssignmentState(
      isLoadingAssigned: isLoadingAssigned ?? this.isLoadingAssigned,
      isLoadingCandidates: isLoadingCandidates ?? this.isLoadingCandidates,
      isSaving: isSaving ?? this.isSaving,
      assigned: assigned ?? this.assigned,
      candidates: candidates ?? this.candidates,
      selected: selected ?? this.selected,
      search: search ?? this.search,
      showAll: showAll ?? this.showAll,
      allowMultiple: allowMultiple ?? this.allowMultiple,
      tenantHasEmployees: tenantHasEmployees ?? this.tenantHasEmployees,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

/// Scoped per geofence so opening a second sheet does not inherit the first
/// one's selection.
final geofenceAssignmentProvider = NotifierProvider.family<
    GeofenceAssignmentNotifier, GeofenceAssignmentState, String>(
  GeofenceAssignmentNotifier.new,
);

class GeofenceAssignmentNotifier
    extends FamilyNotifier<GeofenceAssignmentState, String> {
  GeofenceRepository get _repo => sl<GeofenceRepository>();
  Timer? _searchDebounce;

  @override
  GeofenceAssignmentState build(String geofenceId) {
    ref.onDispose(() => _searchDebounce?.cancel());
    return const GeofenceAssignmentState();
  }

  String get _geofenceId => arg;

  Future<void> load() async {
    await Future.wait([loadAssigned(), loadCandidates()]);
  }

  Future<void> loadAssigned() async {
    state = state.copyWith(isLoadingAssigned: true, clearError: true);
    final result = await _repo.getAssignedEmployees(_geofenceId);
    result.fold(
      (f) => state =
          state.copyWith(isLoadingAssigned: false, errorMessage: f.message),
      (list) => state = state.copyWith(
        isLoadingAssigned: false,
        assigned: list,
        clearError: true,
      ),
    );
  }

  Future<void> loadCandidates() async {
    state = state.copyWith(isLoadingCandidates: true);
    final result = await _repo.getAssignableEmployees(
      _geofenceId,
      search: state.search.isEmpty ? null : state.search,
      showAll: state.showAll,
    );
    result.fold(
      (f) => state =
          state.copyWith(isLoadingCandidates: false, errorMessage: f.message),
      (page) {
        // Drop selections that fell out of the new result set so the save
        // button never claims more than is visible.
        final visible = page.employees.map((e) => e.id).toSet();
        state = state.copyWith(
          isLoadingCandidates: false,
          candidates: page.employees,
          allowMultiple: page.allowMultipleGeofencesPerEmployee,
          tenantHasEmployees: page.tenantHasEmployees,
          selected: state.selected.intersection(visible),
          clearError: true,
        );
      },
    );
  }

  /// Debounced so typing a name does not fire a request per keystroke.
  void onSearchChanged(String value) {
    state = state.copyWith(search: value);
    _searchDebounce?.cancel();
    _searchDebounce =
        Timer(const Duration(milliseconds: 300), () => loadCandidates());
  }

  void toggleShowAll(bool value) {
    state = state.copyWith(showAll: value);
    loadCandidates();
  }

  void toggleSelection(String employeeId) {
    final next = Set<String>.from(state.selected);
    if (!next.remove(employeeId)) next.add(employeeId);
    state = state.copyWith(selected: next);
  }

  void clearError() => state = state.copyWith(clearError: true);

  /// Assigns the selected employees. Returns null on success, else a message.
  ///
  /// The picker already showed which candidates sit on another geofence and
  /// warned about it, so `reassign` is sent when any of them is selected —
  /// hitting a 409 the admin has effectively already answered would be noise.
  Future<String?> assignSelected() async {
    final ids = state.selected.toList();
    if (ids.isEmpty) return null;

    state = state.copyWith(isSaving: true, clearError: true);
    final result = await _repo.assignEmployees(
      _geofenceId,
      ids,
      reassign: state.reassignCount > 0,
    );

    // fold cannot await, so resolve to a plain value first and do the reload
    // afterwards — otherwise the success branch returns a Future the caller
    // would have to unwrap.
    final failure = result.fold<Failure?>((f) => f, (_) => null);
    if (failure != null) {
      state = state.copyWith(isSaving: false);
      if (failure is GeofenceConflictFailure) {
        return 'Already assigned elsewhere: ${failure.conflictDescriptions.join(', ')}. '
            'Turn on "Show all employees" and re-select to move them.';
      }
      return failure.message;
    }

    state = state.copyWith(isSaving: false, selected: const {});
    await load();
    await ref.read(geofenceCoverageProvider.notifier).load();
    return null;
  }

  /// Removes one employee. Returns a warning message when they are left with
  /// no geofence at all — that person can no longer punch anywhere.
  Future<String?> remove(AssignedEmployee employee) async {
    state = state.copyWith(isSaving: true, clearError: true);
    final result = await _repo.unassignEmployees(_geofenceId, [employee.id]);
    return result.fold(
      (f) {
        state = state.copyWith(isSaving: false);
        return f.message;
      },
      (res) {
        state = state.copyWith(isSaving: false);
        load();
        ref.read(geofenceCoverageProvider.notifier).load();
        return res.leftWithoutGeofence.isNotEmpty
            ? '${employee.fullName} removed — now has no geofence and cannot punch attendance.'
            : null;
      },
    );
  }
}
