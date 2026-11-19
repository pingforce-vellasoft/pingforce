import 'package:dio/dio.dart';

import '../presentation/lead_state.dart';

/// Remote datasource for leads (3.4 LeadManagement). All lead HTTP traffic
/// goes through here — never from widgets or notifiers. The API scopes every
/// call to the caller (owner/creator unless the role has wider scope).
abstract class LeadsRemoteDataSource {
  /// GET /leads/pipeline — newest first; [cursor] is the last lead id.
  Future<List<LeadSummary>> fetchLeads({String? cursor, int take});

  /// GET /leads/stages — seeds the tenant's default stages on first call.
  Future<List<PipelineStageItem>> fetchStages();

  /// GET /leads/:id (404 outside the caller's scope).
  Future<LeadSummary> fetchLead(String id);

  /// POST /leads — returns the new lead.
  Future<LeadSummary> createLead(CreateLeadRequest request);

  /// PATCH /leads/:id/stage
  Future<void> updateStage(String id, String pipelineStageId);

  /// POST /leads/sync — replays offline captures (new leads, dedupe on
  /// leadNumber) and offline stage moves. Throws when any item FAILED so the
  /// queue keeps it for retry; SKIPPED (superseded) moves are dropped.
  Future<void> syncLeads(List<Map<String, dynamic>> payloads);
}

/// The API caps a page at 100.
const leadPageSize = 50;

class LeadsRemoteDataSourceImpl implements LeadsRemoteDataSource {
  LeadsRemoteDataSourceImpl({required this.dio});

  final Dio dio;
  static const _base = '/api/v1/leads';

  List<Map<String, dynamic>> _rows(dynamic payload) {
    final rows = payload is List
        ? payload
        : (payload is Map && payload['data'] is List
              ? payload['data'] as List<dynamic>
              : const <dynamic>[]);
    return rows.whereType<Map<String, dynamic>>().toList(growable: false);
  }

  @override
  Future<List<LeadSummary>> fetchLeads({
    String? cursor,
    int take = leadPageSize,
  }) async {
    final response = await dio.get<dynamic>(
      '$_base/pipeline',
      queryParameters: {'take': take, 'cursor': ?cursor},
    );
    return _rows(response.data).map(LeadSummary.fromJson).toList();
  }

  @override
  Future<List<PipelineStageItem>> fetchStages() async {
    final response = await dio.get<dynamic>('$_base/stages');
    return _rows(response.data).map(PipelineStageItem.fromJson).toList();
  }

  @override
  Future<LeadSummary> fetchLead(String id) async {
    final response = await dio.get<Map<String, dynamic>>('$_base/$id');
    return LeadSummary.fromJson(response.data ?? const {});
  }

  @override
  Future<LeadSummary> createLead(CreateLeadRequest request) async {
    final response = await dio.post<Map<String, dynamic>>(
      _base,
      data: request.toJson(),
    );
    return LeadSummary.fromJson(response.data ?? const {});
  }

  @override
  Future<void> updateStage(String id, String pipelineStageId) async {
    await dio.patch<dynamic>(
      '$_base/$id/stage',
      data: {'pipelineStageId': pipelineStageId},
    );
  }

  @override
  Future<void> syncLeads(List<Map<String, dynamic>> payloads) async {
    final response = await dio.post<Map<String, dynamic>>(
      '$_base/sync',
      data: leadSyncBody(payloads),
    );
    final results = response.data?['results'];
    if (results is! List) return;
    final failed = results
        .whereType<Map<String, dynamic>>()
        .where((r) => r['status'] == 'FAILED')
        .map((r) => '${r['clientRef']}: ${r['error'] ?? 'failed'}')
        .toList();
    if (failed.isNotEmpty) {
      throw StateError('Lead sync failed for ${failed.join('; ')}');
    }
  }
}
