import 'package:dio/dio.dart';

import '../../domain/entities/geofence_assignment.dart';
import '../models/geofence_assignment_model.dart';
import '../models/geofence_model.dart';

/// Talks to the same `attendance/geofence` API the web admin portal uses.
abstract class GeofenceRemoteDataSource {
  Future<List<GeofenceModel>> getGeofences();
  Future<GeofenceModel> createGeofence(GeofenceModel geofence);
  Future<void> deleteGeofence(String id);

  // ── Employee assignment ────────────────────────────────────────────────────
  Future<GeofenceCoverageModel> getCoverage();
  Future<bool> getAllowMultiple();
  Future<bool> setAllowMultiple(bool allow);
  Future<List<AssignedEmployeeModel>> getAssignedEmployees(String geofenceId);
  Future<AssignableEmployeesPageModel> getAssignableEmployees(
    String geofenceId, {
    String? search,
    bool showAll = false,
  });
  Future<AssignResultModel> assignEmployees(
    String geofenceId,
    List<String> employeeIds, {
    bool reassign = false,
  });
  Future<UnassignResultModel> unassignEmployees(
    String geofenceId,
    List<String> employeeIds,
  );
}

class GeofenceRemoteDataSourceImpl implements GeofenceRemoteDataSource {
  final Dio dio;

  GeofenceRemoteDataSourceImpl({required this.dio});

  @override
  Future<List<GeofenceModel>> getGeofences() async {
    final response = await dio.get('/api/v1/attendance/geofence');
    if (response.statusCode == 200) {
      final data = (response.data as List<dynamic>?) ?? const [];
      return data
          .map((e) => GeofenceModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    throw Exception('Server Error');
  }

  @override
  Future<GeofenceModel> createGeofence(GeofenceModel geofence) async {
    final response = await dio.post(
      '/api/v1/attendance/geofence',
      data: geofence.toCreateJson(),
    );
    if (response.statusCode == 200 || response.statusCode == 201) {
      return GeofenceModel.fromJson(response.data as Map<String, dynamic>);
    }
    throw Exception('Server Error');
  }

  @override
  Future<void> deleteGeofence(String id) async {
    final response = await dio.delete('/api/v1/attendance/geofence/$id');
    if (response.statusCode != 200 && response.statusCode != 204) {
      throw Exception('Server Error');
    }
  }

  // ── Employee assignment ────────────────────────────────────────────────────

  @override
  Future<GeofenceCoverageModel> getCoverage() async {
    final response =
        await dio.get('/api/v1/attendance/geofence/assignments/summary');
    return GeofenceCoverageModel.fromJson(
      response.data as Map<String, dynamic>,
    );
  }

  @override
  Future<bool> getAllowMultiple() async {
    final response =
        await dio.get('/api/v1/attendance/geofence/assignment-policy');
    final data = response.data as Map<String, dynamic>;
    return data['allowMultipleGeofencesPerEmployee'] as bool? ?? false;
  }

  @override
  Future<bool> setAllowMultiple(bool allow) async {
    final response = await dio.put(
      '/api/v1/attendance/geofence/assignment-policy',
      data: {'allowMultipleGeofencesPerEmployee': allow},
    );
    final data = response.data as Map<String, dynamic>;
    return data['allowMultipleGeofencesPerEmployee'] as bool? ?? allow;
  }

  @override
  Future<List<AssignedEmployeeModel>> getAssignedEmployees(
    String geofenceId,
  ) async {
    final response =
        await dio.get('/api/v1/attendance/geofence/$geofenceId/employees');
    final data = response.data as Map<String, dynamic>;
    return ((data['employees'] as List<dynamic>?) ?? const [])
        .map((e) => AssignedEmployeeModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  @override
  Future<AssignableEmployeesPageModel> getAssignableEmployees(
    String geofenceId, {
    String? search,
    bool showAll = false,
  }) async {
    final response = await dio.get(
      '/api/v1/attendance/geofence/$geofenceId/assignable-employees',
      queryParameters: {
        if (search != null && search.isNotEmpty) 'search': search,
        'scope': showAll ? 'ALL' : 'ASSIGNABLE',
        'pageSize': 100,
      },
    );
    return AssignableEmployeesPageModel.fromJson(
      response.data as Map<String, dynamic>,
    );
  }

  @override
  Future<AssignResultModel> assignEmployees(
    String geofenceId,
    List<String> employeeIds, {
    bool reassign = false,
  }) async {
    try {
      final response = await dio.post(
        '/api/v1/attendance/geofence/$geofenceId/employees',
        data: {'employeeIds': employeeIds, 'reassign': reassign},
      );
      return AssignResultModel.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      // 409 means these employees already belong to another geofence and the
      // tenant allows only one. Surface who conflicts so the UI can offer to
      // move them rather than reporting a generic failure.
      if (e.response?.statusCode == 409) {
        final data = e.response?.data;
        if (data is Map && data['conflicts'] is List) {
          throw GeofenceAssignmentConflict(
            (data['conflicts'] as List<dynamic>)
                .whereType<Map<String, dynamic>>()
                .map(
                  (c) => GeofenceConflictEntry(
                    employeeId: c['employeeId'] as String? ?? '',
                    employeeName: c['employeeName'] as String?,
                    currentGeofenceName:
                        c['currentGeofenceName'] as String? ?? 'another site',
                  ),
                )
                .toList(),
          );
        }
      }
      rethrow;
    }
  }

  @override
  Future<UnassignResultModel> unassignEmployees(
    String geofenceId,
    List<String> employeeIds,
  ) async {
    final response = await dio.delete(
      '/api/v1/attendance/geofence/$geofenceId/employees',
      data: {'employeeIds': employeeIds},
    );
    return UnassignResultModel.fromJson(response.data as Map<String, dynamic>);
  }
}
