import 'package:dartz/dartz.dart';

import '../../../../core/error/failures.dart';
import '../../data/models/dashboard_summary_model.dart';

abstract class DashboardRepository {
  /// Fetches the aggregate Home-screen summary for the current user.
  Future<Either<Failure, DashboardSummaryModel>> getSummary();
}
