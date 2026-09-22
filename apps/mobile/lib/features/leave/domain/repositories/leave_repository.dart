import 'package:dartz/dartz.dart';

import '../../../../core/error/failures.dart';
import '../../data/models/leave_models.dart';

abstract class LeaveRepository {
  Future<Either<Failure, void>> withdraw(String id);
  Future<Either<Failure, double>> preview({
    required String leaveTypeId,
    required DateTime startDate,
    required DateTime endDate,
    String duration = 'FULL_DAY',
  });
  Future<Either<Failure, List<LeaveTypeModel>>> getTypes();
  Future<Either<Failure, List<LeaveBalanceModel>>> getMyBalances(int year);
  Future<Either<Failure, List<LeaveRequestModel>>> getMyRequests({
    String? status,
    int skip = 0,
  });
  Future<Either<Failure, void>> requestLeave({
    required String leaveTypeId,
    required DateTime startDate,
    required DateTime endDate,
    String? reason,
    String duration = 'FULL_DAY',
  });
}
