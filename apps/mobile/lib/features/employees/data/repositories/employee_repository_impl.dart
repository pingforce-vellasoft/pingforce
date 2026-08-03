import 'package:dartz/dartz.dart';
import 'package:dio/dio.dart';

import '../../../../core/error/failures.dart';
import '../../domain/entities/employee.dart';
import '../../domain/repositories/employee_repository.dart';
import '../datasources/employee_remote_data_source.dart';
import '../models/employee_model.dart';

class EmployeeRepositoryImpl implements EmployeeRepository {
  EmployeeRepositoryImpl({required this.remoteDataSource});

  final EmployeeRemoteDataSource remoteDataSource;

  @override
  Future<Either<Failure, List<Employee>>> getEmployees({
    String? cursor,
    int take = 50,
  }) async {
    try {
      return Right(
        await remoteDataSource.getEmployees(cursor: cursor, take: take),
      );
    } on DioException catch (e) {
      return Left(ServerFailure(_message(e, 'Failed to load employees')));
    } catch (_) {
      return const Left(ServerFailure('Failed to load employees'));
    }
  }

  @override
  Future<Either<Failure, Employee>> getEmployee(String id) async {
    try {
      return Right(await remoteDataSource.getEmployee(id));
    } on DioException catch (e) {
      return Left(ServerFailure(_message(e, 'Failed to load employee')));
    } catch (_) {
      return const Left(ServerFailure('Failed to load employee'));
    }
  }

  @override
  Future<Either<Failure, EmployeeCreateResult>> createEmployee({
    required String employeeCode,
    required String firstName,
    required String lastName,
    String? primaryEmail,
    String? primaryMobile,
    String? employmentType,
    DateTime? joiningDate,
    String? roleId,
  }) async {
    try {
      final body = EmployeeModel.toWriteJson(
        employeeCode: employeeCode,
        firstName: firstName,
        lastName: lastName,
        primaryEmail: primaryEmail,
        primaryMobile: primaryMobile,
        employmentType: employmentType,
        joiningDate: joiningDate,
        roleId: roleId,
      );
      return Right(await remoteDataSource.createEmployee(body));
    } on DioException catch (e) {
      return Left(ServerFailure(_message(e, 'Failed to create employee')));
    } catch (_) {
      return const Left(ServerFailure('Failed to create employee'));
    }
  }

  @override
  Future<Either<Failure, Employee>> updateEmployee(
    String id, {
    String? employeeCode,
    String? firstName,
    String? lastName,
    String? primaryEmail,
    String? primaryMobile,
    String? employmentType,
    DateTime? joiningDate,
  }) async {
    try {
      // PATCH: send only what the caller supplied. toWriteJson drops empty
      // optionals, and the three required-on-create fields are only included
      // when the edit form actually carried them.
      final body = <String, dynamic>{
        if (employeeCode != null && employeeCode.trim().isNotEmpty)
          'employeeCode': employeeCode.trim(),
        if (firstName != null && firstName.trim().isNotEmpty)
          'firstName': firstName.trim(),
        if (lastName != null && lastName.trim().isNotEmpty)
          'lastName': lastName.trim(),
        if (primaryEmail != null) 'primaryEmail': primaryEmail.trim(),
        if (primaryMobile != null) 'primaryMobile': primaryMobile.trim(),
        if (employmentType != null && employmentType.trim().isNotEmpty)
          'employmentType': employmentType.trim(),
        if (joiningDate != null)
          'joiningDate': joiningDate.toIso8601String().split('T').first,
      };
      return Right(await remoteDataSource.updateEmployee(id, body));
    } on DioException catch (e) {
      return Left(ServerFailure(_message(e, 'Failed to update employee')));
    } catch (_) {
      return const Left(ServerFailure('Failed to update employee'));
    }
  }

  @override
  Future<Either<Failure, Unit>> deleteEmployee(String id) async {
    try {
      await remoteDataSource.deleteEmployee(id);
      return const Right(unit);
    } on DioException catch (e) {
      return Left(ServerFailure(_message(e, 'Failed to remove employee')));
    } catch (_) {
      return const Left(ServerFailure('Failed to remove employee'));
    }
  }

  @override
  Future<Either<Failure, EmployeeInviteResult>> inviteEmployee(
    String id,
  ) async {
    try {
      return Right(await remoteDataSource.inviteEmployee(id));
    } on DioException catch (e) {
      return Left(ServerFailure(_message(e, 'Failed to send invite')));
    } catch (_) {
      return const Left(ServerFailure('Failed to send invite'));
    }
  }

  /// Prefer the API's own error message (e.g. duplicate employee-code
  /// validation) when present, so the user sees why a write was rejected.
  String _message(DioException e, String fallback) {
    final data = e.response?.data;
    if (data is Map && data['message'] != null) {
      final m = data['message'];
      if (m is String) return m;
      if (m is List && m.isNotEmpty) return m.first.toString();
    }
    return fallback;
  }
}
