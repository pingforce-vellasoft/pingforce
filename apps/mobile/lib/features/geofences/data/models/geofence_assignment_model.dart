import '../../domain/entities/geofence_assignment.dart';

/// JSON mappers for the geofence-assignment API
/// (`apps/api/src/attendance/dto/geofence-assignment.dto.ts`).
class GeofenceRefModel extends GeofenceRef {
  const GeofenceRefModel({required super.id, required super.name});

  factory GeofenceRefModel.fromJson(Map<String, dynamic> json) =>
      GeofenceRefModel(
        id: json['id'] as String? ?? '',
        name: json['name'] as String? ?? '',
      );
}

class AssignedEmployeeModel extends AssignedEmployee {
  const AssignedEmployeeModel({
    required super.id,
    required super.assignmentId,
    required super.employeeCode,
    required super.firstName,
    required super.lastName,
    super.displayName,
    super.assignedBy,
  });

  factory AssignedEmployeeModel.fromJson(Map<String, dynamic> json) =>
      AssignedEmployeeModel(
        id: json['id'] as String? ?? '',
        assignmentId: json['assignmentId'] as String? ?? '',
        employeeCode: json['employeeCode'] as String? ?? '',
        firstName: json['firstName'] as String? ?? '',
        lastName: json['lastName'] as String? ?? '',
        displayName: json['displayName'] as String?,
        assignedBy: json['assignedBy'] as String?,
      );
}

class AssignableEmployeeModel extends AssignableEmployee {
  const AssignableEmployeeModel({
    required super.id,
    required super.employeeCode,
    required super.firstName,
    required super.lastName,
    super.displayName,
    super.currentGeofences,
    super.requiresReassign,
  });

  factory AssignableEmployeeModel.fromJson(Map<String, dynamic> json) =>
      AssignableEmployeeModel(
        id: json['id'] as String? ?? '',
        employeeCode: json['employeeCode'] as String? ?? '',
        firstName: json['firstName'] as String? ?? '',
        lastName: json['lastName'] as String? ?? '',
        displayName: json['displayName'] as String?,
        currentGeofences: ((json['currentGeofences'] as List<dynamic>?) ??
                const [])
            .map((e) => GeofenceRefModel.fromJson(e as Map<String, dynamic>))
            .toList(),
        requiresReassign: json['requiresReassign'] as bool? ?? false,
      );
}

class AssignableEmployeesPageModel extends AssignableEmployeesPage {
  const AssignableEmployeesPageModel({
    required super.employees,
    required super.allowMultipleGeofencesPerEmployee,
    required super.tenantHasEmployees,
    required super.total,
  });

  factory AssignableEmployeesPageModel.fromJson(Map<String, dynamic> json) =>
      AssignableEmployeesPageModel(
        employees: ((json['employees'] as List<dynamic>?) ?? const [])
            .map((e) =>
                AssignableEmployeeModel.fromJson(e as Map<String, dynamic>))
            .toList(),
        allowMultipleGeofencesPerEmployee:
            json['allowMultipleGeofencesPerEmployee'] as bool? ?? false,
        tenantHasEmployees: json['tenantHasEmployees'] as bool? ?? false,
        total: json['total'] as int? ?? 0,
      );
}

class AssignResultModel extends AssignResult {
  const AssignResultModel({
    required super.assigned,
    required super.skipped,
    required super.reassigned,
  });

  factory AssignResultModel.fromJson(Map<String, dynamic> json) =>
      AssignResultModel(
        assigned: json['assigned'] as int? ?? 0,
        skipped: json['skipped'] as int? ?? 0,
        reassigned: json['reassigned'] as int? ?? 0,
      );
}

class UnassignResultModel extends UnassignResult {
  const UnassignResultModel({
    required super.removed,
    required super.leftWithoutGeofence,
  });

  factory UnassignResultModel.fromJson(Map<String, dynamic> json) =>
      UnassignResultModel(
        removed: json['removed'] as int? ?? 0,
        leftWithoutGeofence:
            ((json['leftWithoutGeofence'] as List<dynamic>?) ?? const [])
                .map((e) => e.toString())
                .toList(),
      );
}

class GeofenceCoverageModel extends GeofenceCoverage {
  const GeofenceCoverageModel({
    required super.countsByGeofence,
    required super.totalEmployees,
    required super.unassignedEmployees,
    required super.tenantHasEmployees,
  });

  factory GeofenceCoverageModel.fromJson(Map<String, dynamic> json) {
    final raw = (json['countsByGeofence'] as Map<String, dynamic>?) ?? const {};
    return GeofenceCoverageModel(
      countsByGeofence: raw.map(
        (key, value) => MapEntry(key, (value as num?)?.toInt() ?? 0),
      ),
      totalEmployees: json['totalEmployees'] as int? ?? 0,
      unassignedEmployees: json['unassignedEmployees'] as int? ?? 0,
      tenantHasEmployees: json['tenantHasEmployees'] as bool? ?? false,
    );
  }
}
