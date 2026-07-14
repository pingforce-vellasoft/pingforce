import 'package:freezed_annotation/freezed_annotation.dart';

part 'fault_state.freezed.dart';

// ─────────────────────────────────────────────────────────────────────────────
// FAULT STATE  (AUDIT §7.1 / §7.2 / §7.3)
// ─────────────────────────────────────────────────────────────────────────────

// ── Enums ──────────────────────────────────────────────────────────────────

enum FaultStatus {
  open,
  inProgress,
  onHold,
  resolved,
  closed,
  cancelled,
}

enum FaultPriority { critical, high, medium, low }

enum FaultSlaStatus {
  safe,     // > 4h remaining
  warning,  // 1–4h remaining
  breached, // 0h remaining (overdue)
}

enum FaultSortBy { sla, priority, newest, status }

extension FaultStatusX on FaultStatus {
  String get label => switch (this) {
        FaultStatus.open => 'Open',
        FaultStatus.inProgress => 'In Progress',
        FaultStatus.onHold => 'On Hold',
        FaultStatus.resolved => 'Resolved',
        FaultStatus.closed => 'Closed',
        FaultStatus.cancelled => 'Cancelled',
      };

  bool get isActive =>
      this == FaultStatus.open || this == FaultStatus.inProgress;
}

extension FaultPriorityX on FaultPriority {
  String get label => switch (this) {
        FaultPriority.critical => 'Critical',
        FaultPriority.high => 'High',
        FaultPriority.medium => 'Medium',
        FaultPriority.low => 'Low',
      };

  int get sortOrder => switch (this) {
        FaultPriority.critical => 0,
        FaultPriority.high => 1,
        FaultPriority.medium => 2,
        FaultPriority.low => 3,
      };
}

// ── Data models ───────────────────────────────────────────────────────────────

@freezed
class FaultSummary with _$FaultSummary {
  const factory FaultSummary({
    required String id,
    required String faultNumber,      // e.g. "F-1032"
    required String title,
    required String description,
    required FaultStatus status,
    required FaultPriority priority,
    required String customerName,
    required String siteName,
    required DateTime createdAt,
    DateTime? dueAt,                  // SLA deadline
    String? assigneeName,
    String? assigneeAvatarUrl,
    String? categoryName,
    int? attemptsCount,
    @Default(false) bool isOffline,   // pending sync
    @Default(false) bool hasAttachments,
    @Default(0) int commentsCount,
  }) = _FaultSummary;

  const FaultSummary._();

  /// Derived: SLA urgency level
  FaultSlaStatus get slaStatus {
    final due = dueAt;
    if (due == null) return FaultSlaStatus.safe;
    if (status == FaultStatus.closed || status == FaultStatus.resolved) {
      return FaultSlaStatus.safe;
    }
    final remaining = due.difference(DateTime.now());
    if (remaining.isNegative) return FaultSlaStatus.breached;
    if (remaining.inHours < 4) return FaultSlaStatus.warning;
    return FaultSlaStatus.safe;
  }

  /// Derived: human-readable SLA remaining label
  String get slaRemainingLabel {
    final due = dueAt;
    if (due == null) return '';
    final remaining = due.difference(DateTime.now());
    if (remaining.isNegative) {
      final overdue = remaining.abs();
      if (overdue.inHours > 0) return '${overdue.inHours}h overdue';
      return '${overdue.inMinutes}m overdue';
    }
    if (remaining.inHours > 0) {
      return '${remaining.inHours}h ${remaining.inMinutes.remainder(60)}m left';
    }
    return '${remaining.inMinutes}m left';
  }

  bool get isOverdue =>
      slaStatus == FaultSlaStatus.breached && status.isActive;
}

@freezed
class FaultFilters with _$FaultFilters {
  const factory FaultFilters({
    @Default([]) List<FaultStatus> statuses,
    @Default([]) List<FaultPriority> priorities,
    DateTime? dueBefore,
    String? assigneeId,
    String? categoryId,
    String? searchQuery,
  }) = _FaultFilters;

  const FaultFilters._();

  bool get isEmpty =>
      statuses.isEmpty &&
      priorities.isEmpty &&
      dueBefore == null &&
      assigneeId == null &&
      categoryId == null &&
      (searchQuery == null || searchQuery!.isEmpty);

  int get activeCount {
    int count = 0;
    if (statuses.isNotEmpty) count++;
    if (priorities.isNotEmpty) count++;
    if (dueBefore != null) count++;
    if (assigneeId != null) count++;
    if (categoryId != null) count++;
    return count;
  }
}

// ── Fault detail models ────────────────────────────────────────────────────

@freezed
class FaultAttempt with _$FaultAttempt {
  const factory FaultAttempt({
    required String id,
    required String attemptNumber,
    required DateTime startTime,
    DateTime? endTime,
    required String technicianName,
    String? workNotes,
    required String outcome,         // 'resolved' | 'partial' | 'failed' | 'revisit'
    @Default([]) List<String> attachmentUrls,
    String? gpsLocation,
  }) = _FaultAttempt;
}

@freezed
class FaultTimelineEvent with _$FaultTimelineEvent {
  const factory FaultTimelineEvent({
    required String id,
    required DateTime timestamp,
    required String eventType,        // 'status_change' | 'assignment' | 'comment' | 'attempt'
    required String description,
    String? actorName,
    String? actorAvatarUrl,
    String? fromValue,
    String? toValue,
  }) = _FaultTimelineEvent;
}

@freezed
class FaultDetail with _$FaultDetail {
  const factory FaultDetail({
    required FaultSummary summary,
    @Default([]) List<FaultAttempt> attempts,
    @Default([]) List<FaultTimelineEvent> timeline,
    @Default([]) List<String> attachmentUrls,
    String? customerPhone,
    String? customerEmail,
    String? siteAddress,
    double? siteLatitude,
    double? siteLongitude,
    String? internalNotes,
  }) = _FaultDetail;
}

// ── Main fault state ───────────────────────────────────────────────────────

@freezed
class FaultState with _$FaultState {
  const factory FaultState({
    // Loading
    @Default(true) bool isLoading,
    @Default(false) bool isRefreshing,

    // List data
    @Default([]) List<FaultSummary> allFaults,

    // Detail (when viewing a fault)
    FaultDetail? selectedFault,
    @Default(false) bool isLoadingDetail,

    // Filters + Sort
    @Default(FaultFilters()) FaultFilters activeFilters,
    @Default(FaultSortBy.sla) FaultSortBy sortBy,

    // Error
    String? errorMessage,

    // Online state
    @Default(true) bool isOnline,
  }) = _FaultState;

  const FaultState._();

  int get overdueCount =>
      allFaults.where((f) => f.isOverdue).length;

  int get activeFilterCount => activeFilters.activeCount;

  /// Returns filtered + sorted faults for the given tab.
  List<FaultSummary> faultsForTab(String tab) {
    List<FaultSummary> result;

    // Tab filter
    result = switch (tab) {
      'Open' => allFaults.where((f) => f.status == FaultStatus.open).toList(),
      'In Progress' =>
        allFaults.where((f) => f.status == FaultStatus.inProgress).toList(),
      'Overdue' => allFaults.where((f) => f.isOverdue).toList(),
      'Closed' => allFaults
          .where((f) =>
              f.status == FaultStatus.closed ||
              f.status == FaultStatus.resolved)
          .toList(),
      _ => List<FaultSummary>.from(allFaults),
    };

    // Search query
    final q = activeFilters.searchQuery;
    if (q != null && q.isNotEmpty) {
      final lower = q.toLowerCase();
      result = result
          .where((f) =>
              f.faultNumber.toLowerCase().contains(lower) ||
              f.title.toLowerCase().contains(lower) ||
              f.customerName.toLowerCase().contains(lower))
          .toList();
    }

    // Priority filter
    if (activeFilters.priorities.isNotEmpty) {
      result = result
          .where((f) => activeFilters.priorities.contains(f.priority))
          .toList();
    }

    // Sort
    result.sort((a, b) => switch (sortBy) {
          FaultSortBy.sla => (a.dueAt ?? DateTime(2100))
              .compareTo(b.dueAt ?? DateTime(2100)),
          FaultSortBy.priority =>
            a.priority.sortOrder.compareTo(b.priority.sortOrder),
          FaultSortBy.newest => b.createdAt.compareTo(a.createdAt),
          FaultSortBy.status => a.status.index.compareTo(b.status.index),
        });

    return result;
  }
}
