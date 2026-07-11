import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/user.dart';
import '../repositories/auth_repository.dart';

class SignupParams {
  final String email;
  final String password;

  SignupParams({
    required this.email,
    required this.password,
  });
}

class SignupCommand implements UseCase<User, SignupParams> {
  final AuthRepository repository;

  SignupCommand(this.repository);

  @override
  Future<Either<Failure, User>> call(SignupParams params) async {
    return await repository.signup(
      params.email,
      params.password,
    );
  }
}
