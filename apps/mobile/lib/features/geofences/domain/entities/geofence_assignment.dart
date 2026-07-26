import 'package:equatable/equatable.dart';

/// A geofence referenced from an assignment, without the geometry.
class GeofenceRef extends Equatable {
  final String id;
  final String name;

  const GeofenceRef({required this.id, required this.name});

  @override
  List<Object?> get props => [id, name];
}

/// An employee currently allowed to punch attendance at a geofence.
class AssignedEmployee extends Equatable {
  final String id;
  final String assignmentId;
  final String employeeCode;
  final String firstName;
  final String lastName;
  final String? displayName;

  /// Null marks a row created by the backfill migration rather than by an
  /// admin — worth showing during an audit instead of hiding.
  final String? assignedBy;

  const AssignedEmployee({
    required this.id,
    required this.assignmentId,
    required this.employeeCode,
    required this.firstName,
    required this.lastName,
    this.displayName,
    this.assignedBy,
  });

  String get fullName {
    final display = displayName?.trim();
    if (display != null && display.isNotEmpty) return display;
    return '$firstName $lastName'.trim();
  }

  String get initials {
    final f = firstName.isNotEmpty ? firstName[0] : '';
    final l = lastName.isNotEmpty ? lastName[0] : '';
    return '$f$l'.toUpperCase();
  }

  @override
  List<Object?> get props => [id, assignmentId, employeeCode];
}

/// A candidate for assignment, with whatever geofences they already hold.
class AssignableEmployee extends Equatable {
  final String id;
  final String employeeCode;
  final String firstName;
  final String lastName;
  final String? displayName;

  /// Geofences other than the one being edited.
  final List<GeofenceRef> currentGeofences;

  /// True when adding this employee means moving them off another geofence,
  /// which only happens under the single-geofence-per-employee policy.
  final bool requiresReassign;

  const AssignableEmployee({
    required this.id,
    required this.employeeCode,
    required this.firstName,
    required this.lastName,
    this.displayName,
    this.currentGeofences = const [],
    this.requiresReassign = false,
  });

  String get fullName {
    final display = displayName?.trim();
    if (display != null && display.isNotEmpty) return display;
    return '$firstName $lastName'.trim();
  }

  String get initials {
    final f = firstName.isNotEmpty ? firstName[0] : '';
    final l = lastName.isNotEmpty ? lastName[0] : '';
    return '$f$l'.toUpperCase();
  }

  @override
  List<Object?> get props => [id, employeeCode, requiresReassign];
}

/// Picker payload. [tenantHasEmployees] distinguishes "this tenant has no
/// employees at all" — which needs a create-employees prompt — from "the
/// current search matched nothing".
class AssignableEmployeesPage extends Equatable {
  final List<AssignableEmployee> employees;
  final bool allowMultipleGeofencesPerEmployee;
  final bool tenantHasEmployees;
  final int total;

  const AssignableEmployeesPage({
    required this.employees,
    required this.allowMultipleGeofencesPerEmployee,
    required this.tenantHasEmployees,
    required this.total,
  });

  @override
  List<Object?> get props => [
        employees,
        allowMultipleGeofencesPerEmployee,
        tenantHasEmployees,
        total,
      ];
}

/// Outcome of an assign call. [skipped] were already assigned here (the call
/// is idempotent), [reassigned] were moved off another geofence.
class AssignResult extends Equatable {
  final int assigned;
  final int skipped;
  final int reassigned;

  const AssignResult({
    required this.assigned,
    required this.skipped,
    required this.reassigned,
  });

  @override
  List<Object?> get props => [assigned, skipped, reassigned];
}

/// Outcome of an unassign call. Employees in [leftWithoutGeofence] now hold no
/// assignment at all and cannot punch attendance anywhere until reassigned.
class UnassignResult extends Equatable {
  final int removed;
  final List<String> leftWithoutGeofence;

  const UnassignResult({
    required this.removed,
    required this.leftWithoutGeofence,
  });

  @override
  List<Object?> get props => [removed, leftWithoutGeofence];
}

/// Tenant-wide coverage for the geofence list screen.
class GeofenceCoverage extends Equatable {
  final Map<String, int> countsByGeofence;
  final int totalEmployees;

  /// Active employees holding no assignment — these people cannot punch.
  final int unassignedEmployees;
  final bool tenantHasEmployees;

  const GeofenceCoverage({
    required this.countsByGeofence,
    required this.totalEmployees,
    required this.unassignedEmployees,
    required this.tenantHasEmployees,
  });

  int countFor(String geofenceId) => countsByGeofence[geofenceId] ?? 0;

  static const empty = GeofenceCoverage(
    countsByGeofence: {},
    totalEmployees: 0,
    unassignedEmployees: 0,
    tenantHasEmployees: false,
  );

  @override
  List<Object?> get props => [
        countsByGeofence,
        totalEmployees,
        unassignedEmployees,
        tenantHasEmployees,
      ];
}

/// Raised when assigning an employee who already belongs to another geofence
/// while the tenant allows only one. Carries the conflicting geofence names so
/// the UI can ask the admin to confirm the move rather than failing blankly.
class GeofenceAssignmentConflict implements Exception {
  final List<GeofenceConflictEntry> conflicts;

  const GeofenceAssignmentConflict(this.conflicts);
}

class GeofenceConflictEntry {
  final String employeeId;
  final String? employeeName;
  final String currentGeofenceName;

  const GeofenceConflictEntry({
    required this.employeeId,
    required this.employeeName,
    required this.currentGeofenceName,
  });
}
