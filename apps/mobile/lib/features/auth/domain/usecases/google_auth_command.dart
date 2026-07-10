import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/user.dart';
import '../repositories/auth_repository.dart';

class GoogleAuthCommand implements UseCase<User, String> {
  final AuthRepository repository;

  GoogleAuthCommand(this.repository);

  @override
  Future<Either<Failure, User>> call(String idToken) async {
    return await repository.googleAuth(idToken);
  }
}
