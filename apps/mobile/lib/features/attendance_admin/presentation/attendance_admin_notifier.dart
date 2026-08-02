import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../injection_container.dart';
import '../domain/entities/daily_attendance.dart';
import '../domain/repositories/attendance_admin_repository.dart';

// ─────────────────────────────────────────────────────────────────────────────
// ATTENDANCE ADMIN STATE
// ─────────────────────────────────────────────────────────────────────────────

class AttendanceAdminState {
  const AttendanceAdminState({
    this.isLoadingDaily = true,
    this.dailyError,
    this.dailyRows = const [],
    this.summary = const DailyAttendanceSummary(),
    this.search = '',
    this.statusFilter,
    this.exceptionsOnly = false,
    this.from,
    this.to,
  });

  final bool isLoadingDaily;
  final String? dailyError;
  final List<DailyAttendanceRow> dailyRows;
  final DailyAttendanceSummary summary;
  final String search;

  /// PRESENT | ABSENT | LATE | HALF_DAY | ON_LEAVE, or null for all.
  final String? statusFilter;

  final bool exceptionsOnly;
  final DateTime? from;
  final DateTime? to;

  AttendanceAdminState copyWith({
    bool? isLoadingDaily,
    String? dailyError,
    bool clearDailyError = false,
    List<DailyAttendanceRow>? dailyRows,
    DailyAttendanceSummary? summary,
    String? search,
    String? statusFilter,
    bool clearStatusFilter = false,
    bool? exceptionsOnly,
    DateTime? from,
    DateTime? to,
  }) {
    return AttendanceAdminState(
      isLoadingDaily: isLoadingDaily ?? this.isLoadingDaily,
      dailyError: clearDailyError ? null : (dailyError ?? this.dailyError),
      dailyRows: dailyRows ?? this.dailyRows,
      summary: summary ?? this.summary,
      search: search ?? this.search,
      statusFilter:
          clearStatusFilter ? null : (statusFilter ?? this.statusFilter),
      exceptionsOnly: exceptionsOnly ?? this.exceptionsOnly,
      from: from ?? this.from,
      to: to ?? this.to,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ATTENDANCE ADMIN NOTIFIER
// ─────────────────────────────────────────────────────────────────────────────

final attendanceAdminNotifierProvider =
    NotifierProvider<AttendanceAdminNotifier, AttendanceAdminState>(
  AttendanceAdminNotifier.new,
);

class AttendanceAdminNotifier extends Notifier<AttendanceAdminState> {
  AttendanceAdminRepository get _repo => sl<AttendanceAdminRepository>();

  static const _pageSize = 50;

  @override
  AttendanceAdminState build() => const AttendanceAdminState();

  Future<void> loadDaily() async {
    state = state.copyWith(isLoadingDaily: true, clearDailyError: true);
    final result = await _repo.getDailyLogs(
      limit: _pageSize,
      from: state.from,
      to: state.to,
      search: state.search,
      status: state.statusFilter,
      exceptionsOnly: state.exceptionsOnly,
    );
    result.fold(
      (f) =>
          state = state.copyWith(isLoadingDaily: false, dailyError: f.message),
      (page) => state = state.copyWith(
        isLoadingDaily: false,
        dailyRows: page.rows,
        summary: page.summary,
        clearDailyError: true,
      ),
    );
  }

  /// Search is applied server-side, so changing it refetches.
  Future<void> setSearch(String value) async {
    state = state.copyWith(search: value);
    await loadDaily();
  }

  /// Passing null clears the filter (shows every status).
  Future<void> setStatusFilter(String? status) async {
    state = status == null
        ? state.copyWith(clearStatusFilter: true)
        : state.copyWith(statusFilter: status);
    await loadDaily();
  }

  Future<void> setExceptionsOnly(bool value) async {
    state = state.copyWith(exceptionsOnly: value);
    await loadDaily();
  }

  Future<void> setDateRange(DateTime from, DateTime to) async {
    state = state.copyWith(from: from, to: to);
    await loadDaily();
  }
}
