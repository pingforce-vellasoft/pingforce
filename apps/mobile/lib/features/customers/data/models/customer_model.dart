import '../../domain/entities/customer.dart';

/// Wire model for `/api/v1/customers`.
class CustomerModel extends Customer {
  const CustomerModel({
    required super.id,
    required super.customerCode,
    required super.legalName,
    super.displayName,
    super.customerType,
    super.primaryEmail,
    super.primaryMobile,
    super.industry,
    super.status,
    super.createdAt,
  });

  factory CustomerModel.fromJson(Map<String, dynamic> json) {
    return CustomerModel(
      id: json['id'] as String? ?? '',
      customerCode: json['customerCode'] as String? ?? '',
      legalName: json['legalName'] as String? ?? '',
      displayName: json['displayName'] as String?,
      customerType: json['customerType'] as String?,
      primaryEmail: json['primaryEmail'] as String?,
      primaryMobile: json['primaryMobile'] as String?,
      industry: json['industry'] as String?,
      status: json['status'] as String?,
      createdAt: _date(json['createdAt']),
    );
  }

  static DateTime? _date(dynamic value) {
    if (value is! String || value.isEmpty) return null;
    return DateTime.tryParse(value)?.toLocal();
  }

  /// Body for create. Empty optionals are omitted so the API does not persist
  /// blank strings for fields the user never filled in.
  static Map<String, dynamic> toCreateJson({
    required String customerCode,
    required String legalName,
    String? displayName,
    String? customerType,
    String? primaryEmail,
    String? primaryMobile,
    String? industry,
    String? status,
  }) {
    String? clean(String? v) {
      final t = v?.trim();
      return (t == null || t.isEmpty) ? null : t;
    }

    return <String, dynamic>{
      'customerCode': customerCode.trim(),
      'legalName': legalName.trim(),
      if (clean(displayName) != null) 'displayName': clean(displayName),
      if (clean(customerType) != null) 'customerType': clean(customerType),
      if (clean(primaryEmail) != null) 'primaryEmail': clean(primaryEmail),
      if (clean(primaryMobile) != null) 'primaryMobile': clean(primaryMobile),
      if (clean(industry) != null) 'industry': clean(industry),
      if (clean(status) != null) 'status': clean(status),
    };
  }
}
