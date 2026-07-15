import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../entities/user.dart';

abstract class AuthRepository {
  /// Attempts to log the user in and securely caches the JWT
  Future<Either<Failure, User>> login(String email, String password, String tenantCode);

  /// Registers a new user and securely caches the JWT
  Future<Either<Failure, User>> signup(
    String email,
    String password,
  );

  /// Authenticates with Google and securely caches the JWT
  Future<Either<Failure, User>> googleAuth(String idToken);

  /// Submits tenant onboarding data
  Future<Either<Failure, void>> onboardTenant(Map<String, dynamic> data);

  /// Checks if a valid session exists in secure storage
  Future<Either<Failure, User?>> getCachedUser();

  /// Destroys the secure session
  Future<Either<Failure, void>> logout();

  /// Requests a password-reset OTP to be emailed (no user enumeration).
  Future<Either<Failure, void>> requestPasswordReset(
    String email,
    String tenantCode,
  );

  /// Confirms the reset with the emailed OTP and sets the new password.
  Future<Either<Failure, void>> confirmPasswordReset(
    String email,
    String tenantCode,
    String otp,
    String newPassword,
  );
}
