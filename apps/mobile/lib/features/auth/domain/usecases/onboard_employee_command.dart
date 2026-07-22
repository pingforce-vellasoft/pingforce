import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../repositories/auth_repository.dart';

/// Completes first-login profile setup for a non-admin account. Employees have
/// no company or branding step — the tenant already exists, so only the user's
/// own profile is captured.
class OnboardEmployeeCommand {
  final AuthRepository repository;

  OnboardEmployeeCommand(this.repository);

  Future<Either<Failure, void>> call(OnboardEmployeeParams params) async {
    return await repository.onboardEmployee({
      'firstName': params.firstName,
      'lastName': params.lastName,
      'phone': params.phone,
      'tenantCode': params.tenantCode,
    });
  }
}

class OnboardEmployeeParams {
  final String firstName;
  final String lastName;
  final String phone;
  final String tenantCode;

  OnboardEmployeeParams({
    required this.firstName,
    required this.lastName,
    required this.phone,
    required this.tenantCode,
  });
}
