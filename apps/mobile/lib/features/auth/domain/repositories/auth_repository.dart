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

  /// Submits tenant onboarding data (profile + company + white-label branding)
  Future<Either<Failure, void>> onboardTenant(Map<String, dynamic> data);

  /// Submits employee onboarding data (profile only — no tenant/branding step)
  Future<Either<Failure, void>> onboardEmployee(Map<String, dynamic> data);

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

  /// Changes the password for the authenticated user (used for the forced
  /// rotation of an admin-provisioned temporary password). The server revokes
  /// the current session on success.
  Future<Either<Failure, void>> changePassword(
    String currentPassword,
    String newPassword,
  );
}
