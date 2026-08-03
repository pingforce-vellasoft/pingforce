import 'package:dartz/dartz.dart';

import '../../../../core/error/failures.dart';
import '../entities/customer.dart';

abstract class CustomerRepository {
  /// One page of customers. The API pages with skip/take (offset), unlike the
  /// employees endpoint's cursor.
  Future<Either<Failure, List<Customer>>> getCustomers({int skip, int take});

  Future<Either<Failure, Customer>> getCustomer(String id);

  Future<Either<Failure, Customer>> createCustomer({
    required String customerCode,
    required String legalName,
    String? displayName,
    String? customerType,
    String? primaryEmail,
    String? primaryMobile,
    String? industry,
    String? status,
  });

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
  });

  /// Soft-deletes the customer (the API sets `deletedAt`).
  Future<Either<Failure, Unit>> deleteCustomer(String id);
}
