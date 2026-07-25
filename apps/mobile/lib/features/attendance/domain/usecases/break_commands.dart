import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../repositories/attendance_repository.dart';

/// WORKING → ON_BREAK. Persists an `attendance_breaks` row server-side so the
/// unpaid break time is deducted from worked minutes at check-out.
class StartBreakCommand implements UseCase<void, StartBreakParams> {
  final AttendanceRepository repository;

  StartBreakCommand(this.repository);

  @override
  Future<Either<Failure, void>> call(StartBreakParams params) async {
    return repository.startBreak(params.breakType);
  }
}

class StartBreakParams extends Equatable {
  final String breakType;

  const StartBreakParams({this.breakType = 'LUNCH'});

  @override
  List<Object> get props => [breakType];
}

/// ON_BREAK → WORKING. Closes the open break and stamps its duration.
class EndBreakCommand implements UseCase<void, NoParams> {
  final AttendanceRepository repository;

  EndBreakCommand(this.repository);

  @override
  Future<Either<Failure, void>> call(NoParams params) async {
    return repository.endBreak();
  }
}
