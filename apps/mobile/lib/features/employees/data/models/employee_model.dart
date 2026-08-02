import '../../domain/entities/employee.dart';

/// Wire model for `/api/v1/employees`. Dates arrive as ISO strings and may be
/// absent, so every parse is null-tolerant — a malformed date must not sink the
/// whole list.
class EmployeeModel extends Employee {
  const EmployeeModel({
    required super.id,
    required super.employeeCode,
    required super.firstName,
    required super.lastName,
    super.displayName,
    super.primaryEmail,
    super.primaryMobile,
    super.employmentType,
    super.joiningDate,
    super.userId,
    super.createdAt,
  });

  factory EmployeeModel.fromJson(Map<String, dynamic> json) {
    return EmployeeModel(
      id: json['id'] as String? ?? '',
      employeeCode: json['employeeCode'] as String? ?? '',
      firstName: json['firstName'] as String? ?? '',
      lastName: json['lastName'] as String? ?? '',
      displayName: json['displayName'] as String?,
      primaryEmail: json['primaryEmail'] as String?,
      primaryMobile: json['primaryMobile'] as String?,
      employmentType: json['employmentType'] as String?,
      joiningDate: _date(json['joiningDate']),
      userId: json['userId'] as String?,
      createdAt: _date(json['createdAt']),
    );
  }

  static DateTime? _date(dynamic value) {
    if (value is! String || value.isEmpty) return null;
    return DateTime.tryParse(value)?.toLocal();
  }

  /// Body for create/update. Only non-empty fields are sent: the API treats a
  /// present-but-blank optional string as a real value, which would wipe a field
  /// the user never touched on an edit.
  static Map<String, dynamic> toWriteJson({
    required String employeeCode,
    required String firstName,
    required String lastName,
    String? primaryEmail,
    String? primaryMobile,
    String? employmentType,
    DateTime? joiningDate,
    String? roleId,
  }) {
    String? clean(String? v) {
      final t = v?.trim();
      return (t == null || t.isEmpty) ? null : t;
    }

    return <String, dynamic>{
      'employeeCode': employeeCode.trim(),
      'firstName': firstName.trim(),
      'lastName': lastName.trim(),
      if (clean(primaryEmail) != null) 'primaryEmail': clean(primaryEmail),
      if (clean(primaryMobile) != null) 'primaryMobile': clean(primaryMobile),
      if (clean(employmentType) != null) 'employmentType': clean(employmentType),
      // The API validates this with @IsDateString, so send a date-only ISO form.
      if (joiningDate != null)
        'joiningDate': joiningDate.toIso8601String().split('T').first,
      if (clean(roleId) != null) 'roleId': clean(roleId),
    };
  }
}
