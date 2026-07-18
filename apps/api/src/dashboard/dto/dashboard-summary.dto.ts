// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD SUMMARY RESPONSE (DASHBOARD_SPEC.md §4)
// ─────────────────────────────────────────────────────────────────────────────
//
// Aggregate payload for the mobile Home screen. Composed server-side from the
// attendance, faults and visits tables — one round-trip instead of N.
// Always tenant-scoped and limited to the caller's own data (ATTENDANCE:READ_OWN).

export interface DashboardUserDto {
  readonly userId: string;
  readonly employeeId: string | null;
  readonly firstName: string;
  readonly lastName: string;
  readonly role: string;
  readonly department: string | null;
  readonly avatarUrl: string | null;
  readonly isManager: boolean;
}

export interface DashboardAttendanceDto {
  // 'notCheckedIn' | 'working' | 'checkedOut' | 'noShift'
  readonly status: string;
  readonly sessionId: string | null;
  readonly checkInTime: string | null; // ISO 8601
  readonly checkOutTime: string | null; // ISO 8601
  readonly shiftName: string | null;
  readonly shiftStart: string | null; // "HH:mm"
  readonly shiftEnd: string | null; // "HH:mm"
  readonly totalShiftMinutes: number | null;
  readonly gracePeriodMinutes: number | null;
  readonly workedMinutes: number | null; // elapsed at response time
  readonly breaksTaken: number;
  readonly isLate: boolean;
  readonly minutesLate: number | null;
}

export interface DashboardKpiDto {
  readonly id: string;
  readonly title: string;
  readonly primaryValue: string;
  readonly label: string;
  readonly iconName: string;
  readonly secondaryLabel: string | null;
  readonly severity: string; // 'normal' | 'warning' | 'critical'
  readonly route: string | null;
}

export interface DashboardActivityDto {
  readonly id: string;
  readonly type: string; // matches ActivityType enum on client
  readonly title: string;
  readonly subtitle: string | null;
  readonly timestamp: string; // ISO 8601
  readonly route: string | null;
}

export interface DashboardSummaryDto {
  readonly user: DashboardUserDto;
  readonly attendance: DashboardAttendanceDto;
  readonly kpiCards: readonly DashboardKpiDto[];
  readonly activityFeed: readonly DashboardActivityDto[];
  readonly unreadNotifications: number;
  readonly generatedAt: string; // ISO 8601
}
