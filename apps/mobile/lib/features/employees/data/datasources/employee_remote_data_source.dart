import 'package:dio/dio.dart';

import '../../domain/entities/employee.dart';
import '../models/employee_model.dart';

/// Talks to the same `/api/v1/employees` API the web admin portal uses.
abstract class EmployeeRemoteDataSource {
  Future<List<EmployeeModel>> getEmployees({String? cursor, int take});
  Future<EmployeeModel> getEmployee(String id);
  Future<EmployeeCreateResult> createEmployee(Map<String, dynamic> body);
  Future<EmployeeModel> updateEmployee(String id, Map<String, dynamic> body);
  Future<void> deleteEmployee(String id);
  Future<EmployeeInviteResult> inviteEmployee(String id);
}

class EmployeeRemoteDataSourceImpl implements EmployeeRemoteDataSource {
  EmployeeRemoteDataSourceImpl({required this.dio});

  final Dio dio;

  static const _base = '/api/v1/employees';

  @override
  Future<List<EmployeeModel>> getEmployees({String? cursor, int take = 50}) async {
    final response = await dio.get(
      _base,
      queryParameters: {
        'take': take,
        if (cursor != null && cursor.isNotEmpty) 'cursor': cursor,
      },
    );
    // The endpoint returns a bare array; tolerate a {data: [...]} envelope too
    // so a future pagination wrapper does not break the list.
    final payload = response.data;
    final rows = payload is List
        ? payload
        : (payload is Map && payload['data'] is List
            ? payload['data'] as List<dynamic>
            : const <dynamic>[]);
    return rows
        .whereType<Map<String, dynamic>>()
        .map(EmployeeModel.fromJson)
        .toList();
  }

  @override
  Future<EmployeeModel> getEmployee(String id) async {
    final response = await dio.get('$_base/$id');
    return EmployeeModel.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<EmployeeCreateResult> createEmployee(Map<String, dynamic> body) async {
    final response = await dio.post(_base, data: body);
    final data = response.data as Map<String, dynamic>;
    return EmployeeCreateResult(
      employee: EmployeeModel.fromJson(data),
      // Returned exactly once, and only when a login account was provisioned.
      tempPassword: data['tempPassword'] as String?,
    );
  }

  @override
  Future<EmployeeModel> updateEmployee(
    String id,
    Map<String, dynamic> body,
  ) async {
    final response = await dio.patch('$_base/$id', data: body);
    return EmployeeModel.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<void> deleteEmployee(String id) async {
    await dio.delete('$_base/$id');
  }

  @override
  Future<EmployeeInviteResult> inviteEmployee(String id) async {
    final response = await dio.post('$_base/$id/invite', data: const {});
    final data = (response.data as Map<String, dynamic>?) ?? const {};
    return EmployeeInviteResult(
      message: data['message'] as String? ?? 'Invite sent',
      email: data['email'] as String? ?? '',
      workspaceId: data['workspaceId'] as String? ?? '',
    );
  }
}
