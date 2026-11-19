// ─────────────────────────────────────────────────────────────────────────────
// LEADS — presentation models (3.4 LeadManagement, mobile capture).
// Field names follow GET /api/v1/leads/pipeline and /leads/:id.
// ─────────────────────────────────────────────────────────────────────────────

class PipelineStageItem {
  const PipelineStageItem({
    required this.id,
    required this.name,
    required this.order,
  });

  final String id;
  final String name;
  final int order;

  factory PipelineStageItem.fromJson(Map<String, dynamic> json) =>
      PipelineStageItem(
        id: json['id'] as String,
        name: (json['name'] ?? '') as String,
        order: (json['order'] as num?)?.toInt() ?? 0,
      );
}

class LeadSummary {
  const LeadSummary({
    required this.id,
    required this.leadNumber,
    required this.firstName,
    this.lastName,
    this.companyName,
    this.mobile,
    this.email,
    this.stageId,
    this.stageName,
    this.expectedValue,
    this.currencyCode,
    this.ownerName,
    this.isConverted = false,
    this.pendingSync = false,
    required this.createdAt,
  });

  final String id;
  final String leadNumber;
  final String firstName;
  final String? lastName;
  final String? companyName;
  final String? mobile;
  final String? email;
  final String? stageId;
  final String? stageName;
  final double? expectedValue;
  final String? currencyCode;
  final String? ownerName;
  final bool isConverted;

  /// Captured offline and waiting in the sync queue (no server id yet).
  final bool pendingSync;
  final DateTime createdAt;

  String get displayName => [
    firstName,
    lastName,
  ].whereType<String>().where((s) => s.isNotEmpty).join(' ');

  LeadSummary copyWith({String? stageId, String? stageName}) => LeadSummary(
    id: id,
    leadNumber: leadNumber,
    firstName: firstName,
    lastName: lastName,
    companyName: companyName,
    mobile: mobile,
    email: email,
    stageId: stageId ?? this.stageId,
    stageName: stageName ?? this.stageName,
    expectedValue: expectedValue,
    currencyCode: currencyCode,
    ownerName: ownerName,
    isConverted: isConverted,
    pendingSync: pendingSync,
    createdAt: createdAt,
  );

  factory LeadSummary.fromJson(Map<String, dynamic> json) {
    final stage = json['pipelineStage'];
    final profile = json['ownerUser']?['profile'];
    final owner = [
      profile?['firstName'],
      profile?['lastName'],
    ].whereType<String>().where((s) => s.isNotEmpty).join(' ');
    return LeadSummary(
      id: json['id'] as String,
      leadNumber: (json['leadNumber'] ?? '') as String,
      firstName: (json['firstName'] ?? '') as String,
      lastName: json['lastName'] as String?,
      companyName: json['companyName'] as String?,
      mobile: json['mobile'] as String?,
      email: json['email'] as String?,
      stageId: json['pipelineStageId'] as String?,
      stageName: stage is Map ? stage['name'] as String? : null,
      // Prisma Decimal columns may arrive as strings.
      expectedValue: switch (json['expectedValue']) {
        final num n => n.toDouble(),
        final String s => double.tryParse(s),
        _ => null,
      },
      currencyCode: json['currencyCode'] as String?,
      ownerName: owner.isEmpty
          ? (json['ownerUser']?['email'] as String?)
          : owner,
      isConverted: json['convertedCustomerId'] != null,
      createdAt:
          DateTime.tryParse((json['createdAt'] ?? '') as String)?.toLocal() ??
          DateTime.now(),
    );
  }
}

class LeadListState {
  const LeadListState({
    this.leads = const [],
    this.stages = const [],
    this.stageFilter,
    this.isLoading = false,
    this.isLoadingMore = false,
    this.hasMore = false,
    this.errorMessage,
  });

  final List<LeadSummary> leads;
  final List<PipelineStageItem> stages;

  /// null = all stages.
  final String? stageFilter;
  final bool isLoading;
  final bool isLoadingMore;
  final bool hasMore;
  final String? errorMessage;

  List<LeadSummary> get visibleLeads => stageFilter == null
      ? leads
      : leads.where((l) => l.stageId == stageFilter).toList(growable: false);

  LeadListState copyWith({
    List<LeadSummary>? leads,
    List<PipelineStageItem>? stages,
    Object? stageFilter = _keep,
    bool? isLoading,
    bool? isLoadingMore,
    bool? hasMore,
    Object? errorMessage = _keep,
  }) => LeadListState(
    leads: leads ?? this.leads,
    stages: stages ?? this.stages,
    stageFilter: identical(stageFilter, _keep)
        ? this.stageFilter
        : stageFilter as String?,
    isLoading: isLoading ?? this.isLoading,
    isLoadingMore: isLoadingMore ?? this.isLoadingMore,
    hasMore: hasMore ?? this.hasMore,
    errorMessage: identical(errorMessage, _keep)
        ? this.errorMessage
        : errorMessage as String?,
  );
}

const Object _keep = Object();

class LeadDetailState {
  const LeadDetailState({
    this.lead,
    this.isLoading = false,
    this.isMoving = false,
    this.errorMessage,
  });

  final LeadSummary? lead;
  final bool isLoading;
  final bool isMoving;
  final String? errorMessage;
}

class CreateLeadRequest {
  const CreateLeadRequest({
    required this.leadNumber,
    required this.firstName,
    this.lastName,
    this.companyName,
    this.mobile,
    this.email,
    this.expectedValue,
    this.pipelineStageId,
  });

  final String leadNumber;
  final String firstName;
  final String? lastName;
  final String? companyName;
  final String? mobile;
  final String? email;
  final double? expectedValue;
  final String? pipelineStageId;

  static String? _clean(String? v) {
    final t = v?.trim();
    return t == null || t.isEmpty ? null : t;
  }

  Map<String, dynamic> toJson() => {
    'leadNumber': leadNumber,
    'firstName': firstName.trim(),
    if (_clean(lastName) != null) 'lastName': _clean(lastName),
    if (_clean(companyName) != null) 'companyName': _clean(companyName),
    if (_clean(mobile) != null) 'mobile': _clean(mobile),
    if (_clean(email) != null) 'email': _clean(email),
    if (expectedValue != null) 'expectedValue': expectedValue,
    if (pipelineStageId != null) 'pipelineStageId': pipelineStageId,
  };
}

/// Device-generated lead number: the API dedupes /leads/sync replays on it,
/// so it must be unique per capture. Time in base 36 plus random suffix.
String generateLeadNumber(DateTime now, int random) {
  final ts = now.toUtc().millisecondsSinceEpoch.toRadixString(36).toUpperCase();
  final suffix = (random % 1679616)
      .toRadixString(36)
      .toUpperCase()
      .padLeft(4, '0');
  return 'LD-$ts-$suffix';
}

class CreateLeadState {
  const CreateLeadState({
    this.isSubmitting = false,
    this.savedOnline = false,
    this.queuedOffline = false,
    this.errorMessage,
  });

  final bool isSubmitting;
  final bool savedOnline;
  final bool queuedOffline;
  final String? errorMessage;

  bool get done => savedOnline || queuedOffline;
}

/// Marks a sync-queue payload as an offline stage move (vs a new lead).
const leadSyncKindStageMove = 'STAGE_MOVE';

/// Sync-queue payload for a stage change made offline. The API skips it if
/// the lead changed on the server after [movedAt].
Map<String, dynamic> offlineStageMove({
  required String leadId,
  required String pipelineStageId,
  required DateTime movedAt,
}) => {
  'kind': leadSyncKindStageMove,
  'clientRef': 'lead-stage-$leadId-${movedAt.toUtc().microsecondsSinceEpoch}',
  'timestamp': movedAt.toUtc().toIso8601String(),
  'leadId': leadId,
  'pipelineStageId': pipelineStageId,
};

/// Splits queued lead payloads into the POST /leads/sync body: new leads
/// and stage moves travel in their own arrays; empty arrays are omitted.
Map<String, dynamic> leadSyncBody(List<Map<String, dynamic>> payloads) {
  final leads = <Map<String, dynamic>>[];
  final moves = <Map<String, dynamic>>[];
  for (final p in payloads) {
    if (p['kind'] == leadSyncKindStageMove) {
      moves.add(Map<String, dynamic>.of(p)..remove('kind'));
    } else {
      leads.add(p);
    }
  }
  return {
    if (leads.isNotEmpty) 'leads': leads,
    if (moves.isNotEmpty) 'stageMoves': moves,
  };
}

/// Result of a stage change from the detail screen.
enum StageMoveResult { moved, queuedOffline, failed }
