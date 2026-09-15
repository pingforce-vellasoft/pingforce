import 'package:dio/dio.dart';

import '../presentation/fault_state.dart';

/// Remote datasource for the faults module (3.3 API.md).
/// Maps API fault rows onto the presentation [FaultSummary] model.
abstract class FaultsRemoteDataSource {
  Future<List<FaultSummary>> fetchFaults();

  Future<FaultDetail> fetchFaultDetail(String id);

  /// Applies a lifecycle transition. [clientRef] makes the write idempotent so
  /// an offline replay cannot double-apply it.
  Future<void> updateStatus(
    String id,
    FaultStatus status, {
    String? notes,
    String? clientRef,
  });

  Future<FaultSummary> createFault({
    required String faultNumber,
    required String title,
    required String description,
    required FaultPriority priority,
    String? customerId,
  });

  /// Replays queued offline actions (POST /faults/sync).
  Future<void> syncActions(List<Map<String, dynamic>> actions);

  /// Attaches evidence to a fault. Internal by default — resolution photos are
  /// work records, and only what staff explicitly flag reaches the customer.
  Future<void> uploadAttachment(
    String faultId,
    String filePath, {
    bool isCustomerVisible = false,
  });
}

class FaultsRemoteDataSourceImpl implements FaultsRemoteDataSource {
  FaultsRemoteDataSourceImpl({required this.dio});

  final Dio dio;

  @override
  Future<List<FaultSummary>> fetchFaults() async {
    final response = await dio.get(
      '/api/v1/faults/assigned',
      queryParameters: {'take': 50},
    );

    // Assigned faults currently return a bare list; accepting an envelope keeps
    // the client compatible when server-side total-count paging is introduced.
    final data = response.data;
    final rows = switch (data) {
      List<dynamic> list => list,
      Map<String, dynamic> map =>
        (map['items'] ?? map['data']) as List<dynamic>? ?? const [],
      _ => const <dynamic>[],
    };

    return rows
        .whereType<Map<String, dynamic>>()
        .map(_mapFault)
        .toList(growable: false);
  }

  @override
  Future<FaultDetail> fetchFaultDetail(String id) async {
    final response = await dio.get<Map<String, dynamic>>('/api/v1/faults/$id');
    final json = response.data ?? const <String, dynamic>{};

    return FaultDetail(
      summary: _mapFault(json),
      timeline: _mapTimeline(json['faultTimelines']),
      customerPhone: json['customer']?['phone'] as String?,
      customerEmail: json['customer']?['email'] as String?,
      siteAddress: json['customer']?['address'] as String?,
    );
  }

  @override
  Future<void> updateStatus(
    String id,
    FaultStatus status, {
    String? notes,
    String? clientRef,
  }) async {
    final payload = <String, dynamic>{'status': status.wireValue};
    if (notes != null && notes.isNotEmpty) payload['notes'] = notes;
    if (clientRef != null) payload['clientRef'] = clientRef;
    await dio.patch<dynamic>('/api/v1/faults/$id/status', data: payload);
  }

  @override
  Future<FaultSummary> createFault({
    required String faultNumber,
    required String title,
    required String description,
    required FaultPriority priority,
    String? customerId,
  }) async {
    final payload = <String, dynamic>{
      'faultNumber': faultNumber,
      'title': title,
      'description': description,
      'priority': priority.wireValue,
      'assignToSelf': true,
    };
    if (customerId != null) payload['customerId'] = customerId;
    final response = await dio.post<Map<String, dynamic>>(
      '/api/v1/faults',
      data: payload,
    );
    return _mapFault(response.data ?? const <String, dynamic>{});
  }

  @override
  Future<void> syncActions(List<Map<String, dynamic>> actions) async {
    await dio.post<dynamic>('/api/v1/faults/sync', data: {'actions': actions});
  }

  @override
  Future<void> uploadAttachment(
    String faultId,
    String filePath, {
    bool isCustomerVisible = false,
  }) async {
    final form = FormData.fromMap({
      'file': await MultipartFile.fromFile(filePath),
      'entityType': 'FAULT',
      'entityId': faultId,
      'isCustomerVisible': isCustomerVisible.toString(),
    });
    await dio.post<dynamic>('/api/v1/files/upload', data: form);
  }

  /// Fault timeline rows, newest first, rendered as lifecycle events.
  List<FaultTimelineEvent> _mapTimeline(dynamic raw) {
    if (raw is! List) return const [];
    return raw
        .whereType<Map<String, dynamic>>()
        .map(
          (e) => FaultTimelineEvent(
            id: (e['id'] ?? '') as String,
            timestamp:
                DateTime.tryParse((e['createdAt'] ?? '') as String) ??
                DateTime.now(),
            eventType: 'status_change',
            description: (e['notes'] ?? '') as String,
            toValue: e['status'] as String?,
          ),
        )
        .toList(growable: false);
  }

  FaultSummary _mapFault(Map<String, dynamic> json) {
    return FaultSummary(
      id: json['id'] as String,
      faultNumber: (json['faultNumber'] ?? '') as String,
      title: (json['title'] ?? '') as String,
      description: (json['description'] ?? '') as String,
      status: _mapStatus(json['status'] as String?),
      priority: _mapPriority(json['priority'] as String?),
      customerName: (json['customer']?['name'] ?? '') as String,
      siteName: (json['customer']?['address'] ?? '') as String? ?? '',
      createdAt: DateTime.parse(json['createdAt'] as String),
      dueAt: json['slaDeadline'] != null
          ? DateTime.parse(json['slaDeadline'] as String)
          : null,
      assigneeName: _assigneeName(json['assignedToUser']),
    );
  }

  String? _assigneeName(dynamic user) {
    if (user is! Map<String, dynamic>) return null;
    final profile = user['profile'];
    if (profile is Map<String, dynamic>) {
      final first = profile['firstName'] ?? '';
      final last = profile['lastName'] ?? '';
      final name = '$first $last'.trim();
      if (name.isNotEmpty) return name;
    }
    return user['email'] as String?;
  }

  FaultStatus _mapStatus(String? raw) => switch (raw) {
    'ASSIGNED' => FaultStatus.assigned,
    'IN_PROGRESS' => FaultStatus.inProgress,
    'ON_HOLD' => FaultStatus.onHold,
    'RESOLVED' => FaultStatus.resolved,
    'REOPENED' => FaultStatus.reopened,
    'CLOSED' => FaultStatus.closed,
    _ => FaultStatus.open,
  };

  FaultPriority _mapPriority(String? raw) => switch (raw) {
    'CRITICAL' => FaultPriority.critical,
    'HIGH' => FaultPriority.high,
    'LOW' => FaultPriority.low,
    _ => FaultPriority.medium,
  };
}
