import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/attendance_session.dart';
import '../repositories/attendance_repository.dart';

class PunchCommand implements UseCase<AttendanceSession, PunchParams> {
  final AttendanceRepository repository;

  PunchCommand(this.repository);

  @override
  Future<Either<Failure, AttendanceSession>> call(PunchParams params) async {
    return await repository.punch(
      params.latitude,
      params.longitude,
      params.accuracy,
      params.isMockLocation,
      params.biometricVerified,
    );
  }
}

class PunchParams extends Equatable {
  final double latitude;
  final double longitude;
  final double accuracy;
  final bool isMockLocation;
  final bool biometricVerified;

  const PunchParams({
    required this.latitude,
    required this.longitude,
    required this.accuracy,
    required this.isMockLocation,
    required this.biometricVerified,
  });

  @override
  List<Object> get props => [
    latitude,
    longitude,
    accuracy,
    isMockLocation,
    biometricVerified,
  ];
}
