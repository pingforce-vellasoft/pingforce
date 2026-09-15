import '../../../faults/presentation/fault_state.dart'
    show FaultStatus, FaultStatusX;

/// A customer-visible timeline entry. The API only returns entries flagged
/// `isCustomerVisible`, so internal staff notes never reach this model.
class ComplaintUpdate {
  const ComplaintUpdate({
    required this.status,
    required this.createdAt,
    this.notes,
  });

  final String status;
  final DateTime createdAt;
  final String? notes;
}

class ComplaintAttachment {
  const ComplaintAttachment({
    required this.id,
    required this.fileName,
    required this.fileUrl,
    required this.mimeType,
  });

  final String id;
  final String fileName;
  final String fileUrl;
  final String mimeType;

  bool get isImage => mimeType.startsWith('image/');
}

/// A complaint as the customer sees it.
///
/// Deliberately narrower than the staff [FaultSummary]: no assignee identity,
/// no escalation level, no internal notes — the portal projection (BR-9.5)
/// withholds those and this entity must not imply they are available.
class Complaint {
  const Complaint({
    required this.id,
    required this.faultNumber,
    required this.title,
    required this.description,
    required this.status,
    required this.priority,
    required this.createdAt,
    this.expectedBy,
    this.technicianFirstName,
    this.rating,
    this.updates = const [],
    this.attachments = const [],
  });

  final String id;
  final String faultNumber;
  final String title;
  final String description;
  final FaultStatus status;
  final String priority;
  final DateTime createdAt;

  /// SLA deadline, presented to the customer as an expectation rather than a
  /// commitment clock.
  final DateTime? expectedBy;

  /// First name only — the portal projection never exposes staff identities.
  final String? technicianFirstName;

  final int? rating;
  final List<ComplaintUpdate> updates;
  final List<ComplaintAttachment> attachments;

  bool get isOpen => status.isActive;

  /// Only resolved complaints can be reopened, and only inside the tenant's
  /// window — the API is the authority; this just hides an action that would
  /// certainly fail.
  bool get canReopen => status == FaultStatus.resolved;

  bool get canComment => status != FaultStatus.closed;

  bool get canRate =>
      rating == null &&
      (status == FaultStatus.resolved || status == FaultStatus.closed);
}
