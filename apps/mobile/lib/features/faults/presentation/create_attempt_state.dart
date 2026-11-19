// ─────────────────────────────────────────────────────────────────────────────
// CREATE ATTEMPT — request + form state (3.3 ATTEMPT_MANAGEMENT.md §4–§7).
// Wire values mirror apps/api/src/faults/dto/create-fault-attempt.dto.ts.
// ─────────────────────────────────────────────────────────────────────────────

const faultAttemptTypes = <String>[
  'INITIAL_VISIT',
  'FOLLOW_UP_VISIT',
  'REMOTE_TROUBLESHOOTING',
  'PREVENTIVE_MAINTENANCE',
  'INSPECTION',
  'VERIFICATION_VISIT',
  'VENDOR_VISIT',
  'CUSTOMER_ASSISTANCE',
  'EMERGENCY_VISIT',
  'FINAL_RESOLUTION_VISIT',
];

const faultAttemptOutcomes = <String>[
  'RESOLVED',
  'PARTIALLY_RESOLVED',
  'CUSTOMER_NOT_AVAILABLE',
  'WAITING_FOR_PARTS',
  'VENDOR_REQUIRED',
  'ESCALATED',
  'REVISIT_REQUIRED',
  'DUPLICATE_FAULT',
  'INVALID_COMPLAINT',
  'CANCELLED',
];

/// "PARTIALLY_RESOLVED" → "Partially resolved".
String prettyAttemptValue(String wire) {
  final text = wire.toLowerCase().replaceAll('_', ' ');
  return text.isEmpty ? text : '${text[0].toUpperCase()}${text.substring(1)}';
}

class CreateAttemptRequest {
  const CreateAttemptRequest({
    required this.attemptType,
    required this.outcome,
    required this.startedAt,
    this.endedAt,
    this.latitude,
    this.longitude,
    this.workNotes,
    this.nextAction,
    required this.clientRef,
  });

  final String attemptType;
  final String outcome;
  final DateTime startedAt;
  final DateTime? endedAt;
  final double? latitude;
  final double? longitude;
  final String? workNotes;
  final String? nextAction;
  final String clientRef;

  Map<String, dynamic> toJson() => {
    'attemptType': attemptType,
    'outcome': outcome,
    'startedAt': startedAt.toUtc().toIso8601String(),
    if (endedAt != null) 'endedAt': endedAt!.toUtc().toIso8601String(),
    if (latitude != null && longitude != null) ...{
      'latitude': latitude,
      'longitude': longitude,
    },
    if (workNotes != null && workNotes!.isNotEmpty) 'workNotes': workNotes,
    if (nextAction != null && nextAction!.isNotEmpty) 'nextAction': nextAction,
    'clientRef': clientRef,
  };
}

class CreateAttemptState {
  const CreateAttemptState({
    this.isSubmitting = false,
    this.saved = false,
    this.queuedOffline = false,
    this.errorMessage,
  });

  final bool isSubmitting;

  /// Recorded on the server.
  final bool saved;

  /// No connection: queued for POST /faults/sync (ADD_ATTEMPT).
  final bool queuedOffline;
  final String? errorMessage;

  bool get done => saved || queuedOffline;
}

/// The /faults/sync ADD_ATTEMPT item for an attempt captured offline. The
/// request's clientRef becomes the sync clientRef, which the API dedupes on.
Map<String, dynamic> offlineAttemptAction(
  String faultId,
  CreateAttemptRequest request,
  DateTime capturedAt,
) {
  final attempt = Map<String, dynamic>.of(request.toJson())
    ..remove('clientRef');
  return {
    'clientRef': request.clientRef,
    'action': 'ADD_ATTEMPT',
    'timestamp': capturedAt.toUtc().toIso8601String(),
    'faultId': faultId,
    'attempt': attempt,
  };
}
