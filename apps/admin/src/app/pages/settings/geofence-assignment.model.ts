/**
 * Employee ↔ geofence assignment contracts (mirrors
 * apps/api/src/attendance/dto/geofence-assignment.dto.ts).
 *
 * Attendance is scoped to the geofences an employee is assigned to; an
 * employee with no assignment cannot punch anywhere, which is why the
 * unassigned counts below are surfaced prominently rather than buried.
 */

export interface GeofenceRef {
  readonly id: string;
  readonly name: string;
}

export interface AssignedEmployee {
  readonly id: string;
  readonly assignmentId: string;
  readonly employeeCode: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly displayName: string | null;
  readonly photograph: string | null;
  readonly employmentStatus: string;
  readonly assignedAt: string;
  /** Null marks a row created by the backfill migration, not by an admin. */
  readonly assignedBy: string | null;
}

export interface AssignedEmployeesResponse {
  readonly geofence: GeofenceRef;
  readonly total: number;
  readonly employees: readonly AssignedEmployee[];
}

export interface AssignableEmployee {
  readonly id: string;
  readonly employeeCode: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly displayName: string | null;
  readonly photograph: string | null;
  /** Geofences other than the one being edited. */
  readonly currentGeofences: readonly GeofenceRef[];
  /** True when adding this employee means moving them off another geofence. */
  readonly requiresReassign: boolean;
}

export interface AssignableEmployeesResponse {
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly allowMultipleGeofencesPerEmployee: boolean;
  /**
   * False means the tenant has no employees at all — distinct from a search
   * that simply matched nothing, and the trigger for the "create employees
   * first" empty state.
   */
  readonly tenantHasEmployees: boolean;
  readonly employees: readonly AssignableEmployee[];
}

export interface AssignConflict {
  readonly employeeId: string;
  readonly employeeName: string | null;
  readonly currentGeofenceId: string;
  readonly currentGeofenceName: string;
}

export interface AssignResult {
  readonly geofenceId: string;
  readonly assigned: number;
  readonly skipped: number;
  readonly reassigned: number;
}

export interface UnassignResult {
  readonly geofenceId: string;
  readonly removed: number;
  /** These employees can no longer punch anywhere until reassigned. */
  readonly leftWithoutGeofence: readonly string[];
}

export interface GeofenceCoverage {
  readonly countsByGeofence: Readonly<Record<string, number>>;
  readonly totalEmployees: number;
  readonly unassignedEmployees: number;
  readonly tenantHasEmployees: boolean;
}

export interface GeofenceAssignmentPolicy {
  readonly allowMultipleGeofencesPerEmployee: boolean;
  /** Present on update: employees holding more than one assignment already. */
  readonly employeesOverLimit?: number;
}
