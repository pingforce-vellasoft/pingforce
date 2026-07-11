import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../entities/user.dart';

abstract class AuthRepository {
  /// Attempts to log the user in and securely caches the JWT
  Future<Either<Failure, User>> login(String email, String password);

  /// Registers a new user and securely caches the JWT
  Future<Either<Failure, User>> signup(
    String email,
    String password,
  );

  /// Authenticates with Google and securely caches the JWT
  Future<Either<Failure, User>> googleAuth(String idToken);

  /// Checks if a valid session exists in secure storage
  Future<Either<Failure, User?>> getCachedUser();

  /// Destroys the secure session
  Future<Either<Failure, void>> logout();
}
