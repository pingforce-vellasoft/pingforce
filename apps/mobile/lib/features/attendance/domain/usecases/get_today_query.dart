import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/attendance_today.dart';
import '../repositories/attendance_repository.dart';

/// Loads today's attendance snapshot so the attendance screen can resume an
/// open session instead of showing a fresh check-in page.
class GetTodayQuery implements UseCase<AttendanceToday, NoParams> {
  final AttendanceRepository repository;

  GetTodayQuery(this.repository);

  @override
  Future<Either<Failure, AttendanceToday>> call(NoParams params) async {
    return repository.getToday();
  }
}
