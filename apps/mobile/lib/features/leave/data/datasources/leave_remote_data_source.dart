import 'package:dio/dio.dart';

import '../models/leave_models.dart';

abstract class LeaveRemoteDataSource {
  Future<List<LeaveTypeModel>> getTypes();
  Future<List<LeaveBalanceModel>> getMyBalances(int year);
  Future<List<LeaveRequestModel>> getMyRequests({String? status});
  Future<void> requestLeave({
    required String leaveTypeId,
    required DateTime startDate,
    required DateTime endDate,
    String? reason,
  });
}

class LeaveRemoteDataSourceImpl implements LeaveRemoteDataSource {
  final Dio dio;

  LeaveRemoteDataSourceImpl({required this.dio});

  List<T> _list<T>(dynamic data, T Function(Map<String, dynamic>) fromJson) {
    final raw = (data as List?) ?? const [];
    return raw
        .map((e) => fromJson((e as Map).cast<String, dynamic>()))
        .toList();
  }

  @override
  Future<List<LeaveTypeModel>> getTypes() async {
    final res = await dio.get('/api/v1/leaves/types');
    if (res.statusCode != 200) throw Exception('Failed to load leave types');
    return _list(res.data, LeaveTypeModel.fromJson);
  }

  @override
  Future<List<LeaveBalanceModel>> getMyBalances(int year) async {
    final res = await dio.get(
      '/api/v1/leaves/my-balance',
      queryParameters: {'year': year},
    );
    if (res.statusCode != 200) throw Exception('Failed to load balances');
    return _list(res.data, LeaveBalanceModel.fromJson);
  }

  @override
  Future<List<LeaveRequestModel>> getMyRequests({String? status}) async {
    final res = await dio.get(
      '/api/v1/leaves/my',
      queryParameters: status == null ? null : {'status': status},
    );
    if (res.statusCode != 200) throw Exception('Failed to load history');
    return _list(res.data, LeaveRequestModel.fromJson);
  }

  @override
  Future<void> requestLeave({
    required String leaveTypeId,
    required DateTime startDate,
    required DateTime endDate,
    String? reason,
  }) async {
    // Body matches CreateLeaveRequestDto. Dates are date-only on the server.
    String d(DateTime dt) =>
        '${dt.year.toString().padLeft(4, '0')}-'
        '${dt.month.toString().padLeft(2, '0')}-'
        '${dt.day.toString().padLeft(2, '0')}';
    final res = await dio.post(
      '/api/v1/leaves/request',
      data: {
        'leaveTypeId': leaveTypeId,
        'startDate': d(startDate),
        'endDate': d(endDate),
        if (reason != null && reason.isNotEmpty) 'reason': reason,
      },
    );
    if (res.statusCode != 200 && res.statusCode != 201) {
      throw Exception('Failed to submit leave');
    }
  }
}
