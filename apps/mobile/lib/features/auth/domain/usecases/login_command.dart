import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/user.dart';
import '../repositories/auth_repository.dart';

class LoginCommand implements UseCase<User, LoginParams> {
  final AuthRepository repository;

  LoginCommand(this.repository);

  @override
  Future<Either<Failure, User>> call(LoginParams params) {
    return repository.login(params.email, params.password, params.tenantCode);
  }
}

class LoginParams extends Equatable {
  final String email;
  final String password;
  final String tenantCode;

  const LoginParams({
    required this.email,
    required this.password,
    required this.tenantCode,
  });

  @override
  List<Object> get props => [email, password, tenantCode];
}
