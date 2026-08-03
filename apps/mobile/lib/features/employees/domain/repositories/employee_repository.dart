import 'package:dartz/dartz.dart';

import '../../../../core/error/failures.dart';
import '../entities/employee.dart';

abstract class EmployeeRepository {
  /// One page of employees. [cursor] is the id of the last row of the previous
  /// page; null loads the first page.
  Future<Either<Failure, List<Employee>>> getEmployees({
    String? cursor,
    int take,
  });

  Future<Either<Failure, Employee>> getEmployee(String id);

  Future<Either<Failure, EmployeeCreateResult>> createEmployee({
    required String employeeCode,
    required String firstName,
    required String lastName,
    String? primaryEmail,
    String? primaryMobile,
    String? employmentType,
    DateTime? joiningDate,
    String? roleId,
  });

  Future<Either<Failure, Employee>> updateEmployee(
    String id, {
    String? employeeCode,
    String? firstName,
    String? lastName,
    String? primaryEmail,
    String? primaryMobile,
    String? employmentType,
    DateTime? joiningDate,
  });

  /// Soft-deletes the employee (the API sets `deletedAt`; nothing is destroyed).
  Future<Either<Failure, Unit>> deleteEmployee(String id);

  /// Sends (or resends) the workspace invite email for an employee.
  Future<Either<Failure, EmployeeInviteResult>> inviteEmployee(String id);
}
