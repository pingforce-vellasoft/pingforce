import 'package:dio/dio.dart';

import '../../faults/presentation/fault_state.dart' show FaultStatus;
import '../domain/entities/complaint.dart';

/// Customer-facing complaint API (`/api/v1/portal/faults`).
///
/// Every call is scoped server-side to the signed-in customer account — the
/// client never sends a customer or tenant id, and must never be given one to
/// send.
abstract class CustomerFaultsRemoteDataSource {
  Future<List<Complaint>> list({String? status});
  Future<Complaint> getById(String id);
  Future<Complaint> create({
    required String title,
    required String description,
    String? connectionId,
  });
  Future<void> comment(String id, String notes);
  Future<void> reopen(String id, String notes);
  Future<void> rate(String id, int rating, String? comment);
}

class CustomerFaultsRemoteDataSourceImpl
    implements CustomerFaultsRemoteDataSource {
  CustomerFaultsRemoteDataSourceImpl({required this.dio});

  final Dio dio;

  static const _base = '/api/v1/portal/faults';

  @override
  Future<List<Complaint>> list({String? status}) async {
    final query = <String, dynamic>{'take': 50};
    if (status != null) query['status'] = status;
    final response = await dio.get<dynamic>(_base, queryParameters: query);

    final data = response.data;
    final rows = switch (data) {
      List<dynamic> list => list,
      Map<String, dynamic> map =>
        (map['items'] ?? map['data']) as List<dynamic>? ?? const [],
      _ => const <dynamic>[],
    };

    return rows
        .whereType<Map<String, dynamic>>()
        .map(_mapComplaint)
        .toList(growable: false);
  }

  @override
  Future<Complaint> getById(String id) async {
    final response = await dio.get<Map<String, dynamic>>('$_base/$id');
    return _mapComplaint(response.data ?? const {});
  }

  @override
  Future<Complaint> create({
    required String title,
    required String description,
    String? connectionId,
  }) async {
    final payload = <String, dynamic>{
      'title': title,
      'description': description,
    };
    if (connectionId != null) payload['connectionId'] = connectionId;
    final response = await dio.post<Map<String, dynamic>>(_base, data: payload);
    return _mapComplaint(response.data ?? const {});
  }

  @override
  Future<void> comment(String id, String notes) async {
    await dio.post<dynamic>('$_base/$id/comments', data: {'notes': notes});
  }

  @override
  Future<void> reopen(String id, String notes) async {
    await dio.post<dynamic>('$_base/$id/reopen', data: {'notes': notes});
  }

  @override
  Future<void> rate(String id, int rating, String? comment) async {
    await dio.post<dynamic>(
      '$_base/$id/rating',
      data: {
        'rating': rating,
        if (comment != null && comment.isNotEmpty) 'comment': comment,
      },
    );
  }

  Complaint _mapComplaint(Map<String, dynamic> json) {
    return Complaint(
      id: (json['id'] ?? '') as String,
      faultNumber: (json['faultNumber'] ?? '') as String,
      title: (json['title'] ?? '') as String,
      description: (json['description'] ?? '') as String,
      status: _mapStatus(json['status'] as String?),
      priority: (json['priority'] ?? 'MEDIUM') as String,
      createdAt:
          DateTime.tryParse((json['createdAt'] ?? '') as String) ??
          DateTime.now(),
      expectedBy: json['slaDeadline'] != null
          ? DateTime.tryParse(json['slaDeadline'] as String)
          : null,
      technicianFirstName: json['technicianFirstName'] as String?,
      rating: json['customerRating'] as int?,
      updates: _mapUpdates(json['timeline']),
      attachments: _mapAttachments(json['attachments']),
    );
  }

  List<ComplaintUpdate> _mapUpdates(dynamic raw) {
    if (raw is! List) return const [];
    return raw
        .whereType<Map<String, dynamic>>()
        .map(
          (e) => ComplaintUpdate(
            status: (e['status'] ?? '') as String,
            notes: e['notes'] as String?,
            createdAt:
                DateTime.tryParse((e['createdAt'] ?? '') as String) ??
                DateTime.now(),
          ),
        )
        .toList(growable: false);
  }

  List<ComplaintAttachment> _mapAttachments(dynamic raw) {
    if (raw is! List) return const [];
    return raw
        .whereType<Map<String, dynamic>>()
        .map(
          (e) => ComplaintAttachment(
            id: (e['id'] ?? '') as String,
            fileName: (e['fileName'] ?? '') as String,
            fileUrl: (e['fileUrl'] ?? '') as String,
            mimeType: (e['mimeType'] ?? '') as String,
          ),
        )
        .toList(growable: false);
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
}
