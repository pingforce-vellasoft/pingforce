// ─────────────────────────────────────────────────────────────────────────────
// VISIT STATE — presentation models for the field-visit execution flow
// (3.2 VISIT_MANAGEMENT.md §4 lifecycle, MOBILE_APP.md)
// ─────────────────────────────────────────────────────────────────────────────

/// Server visit lifecycle states relevant to the field employee.
enum VisitStatus {
  planned,
  assigned,
  accepted,
  started,
  paused,
  completed,
  approved,
  closed,
  rejected,
  cancelled,
  aborted,
  unknown;

  static VisitStatus fromApi(String? raw) => switch (raw) {
        'PLANNED' => VisitStatus.planned,
        'ASSIGNED' => VisitStatus.assigned,
        'ACCEPTED' => VisitStatus.accepted,
        'STARTED' => VisitStatus.started,
        'PAUSED' => VisitStatus.paused,
        'COMPLETED' => VisitStatus.completed,
        'APPROVED' => VisitStatus.approved,
        'CLOSED' => VisitStatus.closed,
        'REJECTED' => VisitStatus.rejected,
        'CANCELLED' => VisitStatus.cancelled,
        'ABORTED' => VisitStatus.aborted,
        _ => VisitStatus.unknown,
      };

  String get label => switch (this) {
        VisitStatus.planned => 'Planned',
        VisitStatus.assigned => 'Assigned',
        VisitStatus.accepted => 'Accepted',
        VisitStatus.started => 'In Progress',
        VisitStatus.paused => 'Paused',
        VisitStatus.completed => 'Completed',
        VisitStatus.approved => 'Approved',
        VisitStatus.closed => 'Closed',
        VisitStatus.rejected => 'Rejected',
        VisitStatus.cancelled => 'Cancelled',
        VisitStatus.aborted => 'Aborted',
        VisitStatus.unknown => 'Unknown',
      };
}

/// Lifecycle actions the assignee can perform from the mobile app.
/// Mirrors the offline sync contract (POST /visits/sync `action`).
enum VisitAction {
  accept('ACCEPT'),
  start('START'),
  pause('PAUSE'),
  resume('RESUME'),
  complete('COMPLETE');

  const VisitAction(this.apiValue);
  final String apiValue;

  /// Optimistic status applied locally while the call/queue is in flight.
  VisitStatus get resultingStatus => switch (this) {
        VisitAction.accept => VisitStatus.accepted,
        VisitAction.start => VisitStatus.started,
        VisitAction.pause => VisitStatus.paused,
        VisitAction.resume => VisitStatus.started,
        VisitAction.complete => VisitStatus.completed,
      };
}

/// Actions allowed from a given status (client-side mirror of the server
/// state machine in apps/api/src/visits/domain/visit-state.ts).
List<VisitAction> actionsFor(VisitStatus status) => switch (status) {
      VisitStatus.assigned => const [VisitAction.accept],
      VisitStatus.accepted => const [VisitAction.start],
      VisitStatus.started => const [VisitAction.pause, VisitAction.complete],
      VisitStatus.paused => const [VisitAction.resume],
      _ => const [],
    };

class VisitSummary {
  const VisitSummary({
    required this.id,
    required this.visitNumber,
    required this.purpose,
    required this.visitType,
    required this.priority,
    required this.status,
    required this.plannedStartAt,
    this.description,
    this.customerName,
    this.siteAddress,
    this.actualStartAt,
    this.actualEndAt,
    this.gpsValidated = false,
    this.pendingSync = false,
  });

  final String id;
  final String visitNumber;
  final String purpose;
  final String visitType;
  final String priority;
  final VisitStatus status;
  final DateTime plannedStartAt;
  final String? description;
  final String? customerName;
  final String? siteAddress;
  final DateTime? actualStartAt;
  final DateTime? actualEndAt;
  final bool gpsValidated;

  /// True when the latest action was queued offline and awaits sync.
  final bool pendingSync;

  VisitSummary copyWith({VisitStatus? status, bool? pendingSync}) {
    return VisitSummary(
      id: id,
      visitNumber: visitNumber,
      purpose: purpose,
      visitType: visitType,
      priority: priority,
      status: status ?? this.status,
      plannedStartAt: plannedStartAt,
      description: description,
      customerName: customerName,
      siteAddress: siteAddress,
      actualStartAt: actualStartAt,
      actualEndAt: actualEndAt,
      gpsValidated: gpsValidated,
      pendingSync: pendingSync ?? this.pendingSync,
    );
  }
}

class VisitState {
  const VisitState({
    this.isLoading = false,
    this.isRefreshing = false,
    this.visits = const [],
    this.errorMessage,
    this.actionInFlightVisitId,
  });

  final bool isLoading;
  final bool isRefreshing;
  final List<VisitSummary> visits;
  final String? errorMessage;

  /// Visit id with a lifecycle action currently running (disables buttons).
  final String? actionInFlightVisitId;

  VisitState copyWith({
    bool? isLoading,
    bool? isRefreshing,
    List<VisitSummary>? visits,
    String? errorMessage,
    Object? actionInFlightVisitId = _sentinel,
  }) {
    return VisitState(
      isLoading: isLoading ?? this.isLoading,
      isRefreshing: isRefreshing ?? this.isRefreshing,
      visits: visits ?? this.visits,
      errorMessage: errorMessage,
      actionInFlightVisitId: actionInFlightVisitId == _sentinel
          ? this.actionInFlightVisitId
          : actionInFlightVisitId as String?,
    );
  }

  static const _sentinel = Object();
}
