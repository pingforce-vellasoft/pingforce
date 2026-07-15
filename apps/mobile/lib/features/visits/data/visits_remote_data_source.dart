import 'package:dio/dio.dart';

import '../presentation/visit_state.dart';

/// Remote datasource for the visits module (3.2 API.md).
/// All visit HTTP traffic goes through here — never from widgets/notifiers.
abstract class VisitsRemoteDataSource {
  /// GET /visits/assigned — visits assigned to the logged-in employee.
  Future<List<VisitSummary>> fetchAssignedVisits();

  /// POST /visits/{id}/{action} — online lifecycle transition.
  Future<void> performAction(
    String visitId,
    VisitAction action, {
    double? latitude,
    double? longitude,
    String? outcome,
    String? notes,
  });

  /// POST /visits/sync — replay one offline-captured action
  /// (idempotent via clientRef; see 3.2 OFFLINE_SYNC.md).
  Future<void> syncActions(List<Map<String, dynamic>> actions);
}

class VisitsRemoteDataSourceImpl implements VisitsRemoteDataSource {
  VisitsRemoteDataSourceImpl({required this.dio});

  final Dio dio;

  @override
  Future<List<VisitSummary>> fetchAssignedVisits() async {
    final response = await dio.get(
      '/api/v1/visits/assigned',
      queryParameters: {'take': 50},
    );

    final data = response.data;
    final rows = data is List ? data : (data['data'] as List? ?? []);

    return rows
        .whereType<Map<String, dynamic>>()
        .map(_mapVisit)
        .toList(growable: false);
  }

  @override
  Future<void> performAction(
    String visitId,
    VisitAction action, {
    double? latitude,
    double? longitude,
    String? outcome,
    String? notes,
  }) async {
    final path = switch (action) {
      VisitAction.accept => 'accept',
      VisitAction.start => 'start',
      VisitAction.pause => 'pause',
      VisitAction.resume => 'resume',
      VisitAction.complete => 'complete',
    };

    await dio.post(
      '/api/v1/visits/$visitId/$path',
      data: {
        'latitude': ?latitude,
        'longitude': ?longitude,
        'notes': ?notes,
        if (action == VisitAction.complete)
          'outcome': outcome ?? 'COMPLETED_ON_SITE',
      },
    );
  }

  @override
  Future<void> syncActions(List<Map<String, dynamic>> actions) async {
    await dio.post('/api/v1/visits/sync', data: {'actions': actions});
  }

  VisitSummary _mapVisit(Map<String, dynamic> json) {
    return VisitSummary(
      id: json['id'] as String,
      visitNumber: (json['visitNumber'] ?? '') as String,
      purpose: (json['purpose'] ?? '') as String,
      visitType: (json['visitType'] ?? 'PLANNED') as String,
      priority: (json['priority'] ?? 'MEDIUM') as String,
      status: VisitStatus.fromApi(json['status'] as String?),
      plannedStartAt: DateTime.parse(json['plannedStartAt'] as String),
      description: json['description'] as String?,
      customerName: json['customer']?['legalName'] as String?,
      siteAddress: json['siteAddress'] as String?,
      actualStartAt: json['actualStartAt'] != null
          ? DateTime.parse(json['actualStartAt'] as String)
          : null,
      actualEndAt: json['actualEndAt'] != null
          ? DateTime.parse(json['actualEndAt'] as String)
          : null,
      gpsValidated: (json['gpsValidated'] ?? false) as bool,
    );
  }
}
