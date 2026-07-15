import 'package:dio/dio.dart';

import '../presentation/fault_state.dart';

/// Remote datasource for the faults module (3.3 API.md — GET /faults).
/// Maps API fault rows onto the presentation [FaultSummary] model.
abstract class FaultsRemoteDataSource {
  Future<List<FaultSummary>> fetchFaults();
}

class FaultsRemoteDataSourceImpl implements FaultsRemoteDataSource {
  FaultsRemoteDataSourceImpl({required this.dio});

  final Dio dio;

  @override
  Future<List<FaultSummary>> fetchFaults() async {
    final response = await dio.get(
      '/api/v1/faults',
      queryParameters: {'take': 50},
    );

    final data = response.data;
    final rows = data is List ? data : (data['data'] as List? ?? []);

    return rows
        .whereType<Map<String, dynamic>>()
        .map(_mapFault)
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
        'IN_PROGRESS' => FaultStatus.inProgress,
        'RESOLVED' => FaultStatus.resolved,
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
