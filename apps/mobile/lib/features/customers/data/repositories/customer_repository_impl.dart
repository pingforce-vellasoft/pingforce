import 'package:dartz/dartz.dart';
import 'package:dio/dio.dart';

import '../../../../core/error/failures.dart';
import '../../domain/entities/customer.dart';
import '../../domain/repositories/customer_repository.dart';
import '../datasources/customer_remote_data_source.dart';
import '../models/customer_model.dart';

class CustomerRepositoryImpl implements CustomerRepository {
  CustomerRepositoryImpl({required this.remoteDataSource});

  final CustomerRemoteDataSource remoteDataSource;

  @override
  Future<Either<Failure, List<Customer>>> getCustomers({
    int skip = 0,
    int take = 50,
  }) async {
    try {
      return Right(await remoteDataSource.getCustomers(skip: skip, take: take));
    } on DioException catch (e) {
      return Left(ServerFailure(_message(e, 'Failed to load customers')));
    } catch (_) {
      return const Left(ServerFailure('Failed to load customers'));
    }
  }

  @override
  Future<Either<Failure, Customer>> getCustomer(String id) async {
    try {
      return Right(await remoteDataSource.getCustomer(id));
    } on DioException catch (e) {
      return Left(ServerFailure(_message(e, 'Failed to load customer')));
    } catch (_) {
      return const Left(ServerFailure('Failed to load customer'));
    }
  }

  @override
  Future<Either<Failure, Customer>> createCustomer({
    required String customerCode,
    required String legalName,
    String? displayName,
    String? customerType,
    String? primaryEmail,
    String? primaryMobile,
    String? industry,
    String? status,
  }) async {
    try {
      final body = CustomerModel.toCreateJson(
        customerCode: customerCode,
        legalName: legalName,
        displayName: displayName,
        customerType: customerType,
        primaryEmail: primaryEmail,
        primaryMobile: primaryMobile,
        industry: industry,
        status: status,
      );
      return Right(await remoteDataSource.createCustomer(body));
    } on DioException catch (e) {
      return Left(ServerFailure(_message(e, 'Failed to create customer')));
    } catch (_) {
      return const Left(ServerFailure('Failed to create customer'));
    }
  }

  @override
  Future<Either<Failure, Customer>> updateCustomer(
    String id, {
    String? customerCode,
    String? legalName,
    String? displayName,
    String? customerType,
    String? primaryEmail,
    String? primaryMobile,
    String? industry,
    String? status,
  }) async {
    try {
      // PATCH: send only what the form carried. The two required-on-create
      // fields are included only when non-empty so an edit cannot blank them.
      final body = <String, dynamic>{
        if (customerCode != null && customerCode.trim().isNotEmpty)
          'customerCode': customerCode.trim(),
        if (legalName != null && legalName.trim().isNotEmpty)
          'legalName': legalName.trim(),
        if (displayName != null) 'displayName': displayName.trim(),
        if (customerType != null && customerType.trim().isNotEmpty)
          'customerType': customerType.trim(),
        if (primaryEmail != null) 'primaryEmail': primaryEmail.trim(),
        if (primaryMobile != null) 'primaryMobile': primaryMobile.trim(),
        if (industry != null) 'industry': industry.trim(),
        if (status != null && status.trim().isNotEmpty) 'status': status.trim(),
      };
      return Right(await remoteDataSource.updateCustomer(id, body));
    } on DioException catch (e) {
      return Left(ServerFailure(_message(e, 'Failed to update customer')));
    } catch (_) {
      return const Left(ServerFailure('Failed to update customer'));
    }
  }

  @override
  Future<Either<Failure, Unit>> deleteCustomer(String id) async {
    try {
      await remoteDataSource.deleteCustomer(id);
      return const Right(unit);
    } on DioException catch (e) {
      return Left(ServerFailure(_message(e, 'Failed to remove customer')));
    } catch (_) {
      return const Left(ServerFailure('Failed to remove customer'));
    }
  }

  /// Prefer the API's own error message (e.g. duplicate customer-code
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
