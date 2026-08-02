/// A tenant customer (the account a field job is done for).
///
/// Mirrors the field subset the web portal's customer grid works with; the
/// remaining CreateCustomerDto fields (GST/VAT, registration number, metadata)
/// are back-office paperwork entered on a desktop.
class Customer {
  const Customer({
    required this.id,
    required this.customerCode,
    required this.legalName,
    this.displayName,
    this.customerType,
    this.primaryEmail,
    this.primaryMobile,
    this.industry,
    this.status,
    this.createdAt,
  });

  final String id;
  final String customerCode;
  final String legalName;
  final String? displayName;
  final String? customerType;
  final String? primaryEmail;
  final String? primaryMobile;
  final String? industry;
  final String? status;
  final DateTime? createdAt;

  /// Preferred label: display name when set, else the legal name, falling back
  /// to the customer code so a row is never blank.
  String get name {
    final display = displayName?.trim();
    if (display != null && display.isNotEmpty) return display;
    final legal = legalName.trim();
    return legal.isEmpty ? customerCode : legal;
  }

  String get initials {
    final source = name.trim();
    if (source.isEmpty) return '?';
    final parts = source.split(RegExp(r'\s+'));
    final first = parts.first.isNotEmpty ? parts.first[0] : '';
    final last =
        parts.length > 1 && parts.last.isNotEmpty ? parts.last[0] : '';
    final combined = '$first$last';
    return combined.isEmpty ? '?' : combined.toUpperCase();
  }
}
