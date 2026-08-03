/// A tenant employee record, as managed from the admin surfaces.
///
/// Mirrors the field subset the web portal's employee grid works with rather
/// than the full 30-field create DTO: the remaining fields are onboarding
/// paperwork that is filled in on a desktop, not from a handset.
class Employee {
  const Employee({
    required this.id,
    required this.employeeCode,
    required this.firstName,
    required this.lastName,
    this.displayName,
    this.primaryEmail,
    this.primaryMobile,
    this.employmentType,
    this.joiningDate,
    this.userId,
    this.createdAt,
  });

  final String id;
  final String employeeCode;
  final String firstName;
  final String lastName;
  final String? displayName;
  final String? primaryEmail;
  final String? primaryMobile;
  final String? employmentType;
  final DateTime? joiningDate;
  final String? userId;
  final DateTime? createdAt;

  /// Preferred label: the explicit display name when set, otherwise the
  /// first/last pair, falling back to the employee code so a row is never blank.
  String get fullName {
    final display = displayName?.trim();
    if (display != null && display.isNotEmpty) return display;
    final combined = '${firstName.trim()} ${lastName.trim()}'.trim();
    return combined.isEmpty ? employeeCode : combined;
  }

  /// Whether a login account has been provisioned for this employee. Drives
  /// whether the detail screen offers "Invite" or reports an existing account.
  bool get hasLogin => (userId ?? '').isNotEmpty;

  String get initials {
    final f = firstName.trim();
    final l = lastName.trim();
    final combined =
        '${f.isNotEmpty ? f[0] : ''}${l.isNotEmpty ? l[0] : ''}'.trim();
    return combined.isEmpty ? '?' : combined.toUpperCase();
  }
}

/// Result of creating an employee. `tempPassword` is present exactly once, and
/// only when a login account was provisioned (a roleId was supplied) — it is
/// never retrievable again, so the UI must surface it immediately.
class EmployeeCreateResult {
  const EmployeeCreateResult({required this.employee, this.tempPassword});

  final Employee employee;
  final String? tempPassword;
}

/// Result of (re)sending a workspace invite to an employee.
class EmployeeInviteResult {
  const EmployeeInviteResult({
    required this.message,
    required this.email,
    required this.workspaceId,
  });

  final String message;
  final String email;
  final String workspaceId;
}
