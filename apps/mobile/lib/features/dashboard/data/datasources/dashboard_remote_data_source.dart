import 'package:dio/dio.dart';

import '../models/dashboard_summary_model.dart';

abstract class DashboardRemoteDataSource {
  /// One-shot Home-screen aggregate from GET /api/v1/dashboard/summary.
  Future<DashboardSummaryModel> getSummary();
}

class DashboardRemoteDataSourceImpl implements DashboardRemoteDataSource {
  final Dio dio;

  DashboardRemoteDataSourceImpl({required this.dio});

  @override
  Future<DashboardSummaryModel> getSummary() async {
    final response = await dio.get('/api/v1/dashboard/summary');
    if (response.statusCode == 200) {
      return DashboardSummaryModel.fromJson(
        (response.data as Map).cast<String, dynamic>(),
      );
    }
    throw Exception('Failed to load dashboard');
  }
}
