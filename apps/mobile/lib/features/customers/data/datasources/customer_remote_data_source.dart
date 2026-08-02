import 'package:dio/dio.dart';

import '../models/customer_model.dart';

/// Talks to the same `/api/v1/customers` API the web admin portal uses.
abstract class CustomerRemoteDataSource {
  Future<List<CustomerModel>> getCustomers({int skip, int take});
  Future<CustomerModel> getCustomer(String id);
  Future<CustomerModel> createCustomer(Map<String, dynamic> body);
  Future<CustomerModel> updateCustomer(String id, Map<String, dynamic> body);
  Future<void> deleteCustomer(String id);
}

class CustomerRemoteDataSourceImpl implements CustomerRemoteDataSource {
  CustomerRemoteDataSourceImpl({required this.dio});

  final Dio dio;

  static const _base = '/api/v1/customers';

  @override
  Future<List<CustomerModel>> getCustomers({int skip = 0, int take = 50}) async {
    final response = await dio.get(
      _base,
      queryParameters: {'skip': skip, 'take': take},
    );
    // Bare array today; tolerate a {data: [...]} envelope so a future
    // pagination wrapper does not break the list.
    final payload = response.data;
    final rows = payload is List
        ? payload
        : (payload is Map && payload['data'] is List
            ? payload['data'] as List<dynamic>
            : const <dynamic>[]);
    return rows
        .whereType<Map<String, dynamic>>()
        .map(CustomerModel.fromJson)
        .toList();
  }

  @override
  Future<CustomerModel> getCustomer(String id) async {
    final response = await dio.get('$_base/$id');
    return CustomerModel.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<CustomerModel> createCustomer(Map<String, dynamic> body) async {
    final response = await dio.post(_base, data: body);
    return CustomerModel.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<CustomerModel> updateCustomer(
    String id,
    Map<String, dynamic> body,
  ) async {
    final response = await dio.patch('$_base/$id', data: body);
    return CustomerModel.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<void> deleteCustomer(String id) async {
    await dio.delete('$_base/$id');
  }
}
