import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../repositories/auth_repository.dart';

class OnboardTenantCommand {
  final AuthRepository repository;

  OnboardTenantCommand(this.repository);

  Future<Either<Failure, void>> call(OnboardTenantParams params) async {
    final data = {
      'firstName': params.firstName,
      'lastName': params.lastName,
      'phone': params.phone,
      'tenantName': params.companyName,
    };
    
    if (params.industry != null && params.industry!.isNotEmpty) data['industry'] = params.industry!;
    if (params.legalName != null && params.legalName!.isNotEmpty) data['legalName'] = params.legalName!;
    if (params.address != null && params.address!.isNotEmpty) data['address'] = params.address!;
    if (params.city != null && params.city!.isNotEmpty) data['city'] = params.city!;
    if (params.state != null && params.state!.isNotEmpty) data['state'] = params.state!;
    if (params.themeColor != null && params.themeColor!.isNotEmpty) data['themeColor'] = params.themeColor!;
    if (params.logoBase64 != null && params.logoBase64!.isNotEmpty) data['logoBase64'] = params.logoBase64!;
    if (params.postalCode != null && params.postalCode!.isNotEmpty) data['postalCode'] = params.postalCode!;
    if (params.country != null && params.country!.isNotEmpty) data['country'] = params.country!;
    if (params.billingEmail != null && params.billingEmail!.isNotEmpty) data['billingEmail'] = params.billingEmail!;

    return await repository.onboardTenant(data);
  }
}

class OnboardTenantParams {
  final String firstName;
  final String lastName;
  final String phone;
  final String companyName;
  final String? industry;
  final String? legalName;
  final String? address;
  final String? city;
  final String? state;
  final String? themeColor;
  final String? logoBase64;
  final String? postalCode;
  final String? country;
  final String? billingEmail;

  OnboardTenantParams({
    required this.firstName,
    required this.lastName,
    required this.phone,
    required this.companyName,
    this.industry,
    this.legalName,
    this.address,
    this.city,
    this.state,
    this.themeColor,
    this.logoBase64,
    this.postalCode,
    this.country,
    this.billingEmail,
  });
}
