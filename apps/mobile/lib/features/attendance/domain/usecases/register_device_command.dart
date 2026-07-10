import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../repositories/attendance_repository.dart';

class RegisterDeviceCommand implements UseCase<void, RegisterDeviceParams> {
  final AttendanceRepository repository;

  RegisterDeviceCommand(this.repository);

  @override
  Future<Either<Failure, void>> call(RegisterDeviceParams params) async {
    return await repository.registerDevice(params.publicKey);
  }
}

class RegisterDeviceParams extends Equatable {
  final String publicKey;

  const RegisterDeviceParams({required this.publicKey});

  @override
  List<Object> get props => [publicKey];
}
