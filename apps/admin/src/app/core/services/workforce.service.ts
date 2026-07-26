import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  AttendanceLog,
  LeaveRequest,
  PaginationDto,
} from '@pingforce-monorepo/dto';
import { DailyAttendanceResponse } from '../models/daily-attendance.model';

@Injectable({
  providedIn: 'root',
})
export class WorkforceService {
  private http = inject(HttpClient);

  getAttendanceLogs(
    page = 1,
    limit = 10,
    search?: string,
    sortBy?: string,
    sortDir?: string,
  ) {
    let url = `/api/v1/attendance/logs?page=${page}&limit=${limit}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (sortBy) url += `&sortBy=${encodeURIComponent(sortBy)}`;
    if (sortDir) url += `&sortDir=${encodeURIComponent(sortDir)}`;
    return this.http.get<{ data: any[]; total: number }>(url);
  }

  /**
   * Day-grouped attendance log — one row per employee-day rather than per
   * session, with worked/break totals and the exceptions needing review.
   */
  getDailyAttendanceLogs(params: {
    page?: number;
    limit?: number;
    from?: string;
    to?: string;
    employeeId?: string;
    search?: string;
    status?: string;
    exceptionsOnly?: boolean;
  }) {
    const query = new URLSearchParams();
    query.set('page', String(params.page ?? 1));
    query.set('limit', String(params.limit ?? 30));
    if (params.from) query.set('from', params.from);
    if (params.to) query.set('to', params.to);
    if (params.employeeId) query.set('employeeId', params.employeeId);
    if (params.search) query.set('search', params.search);
    if (params.status) query.set('status', params.status);
    if (params.exceptionsOnly) query.set('exceptionsOnly', 'true');

    return this.http.get<DailyAttendanceResponse>(
      `/api/v1/attendance/daily-logs?${query.toString()}`,
    );
  }

  /** Rewrites punch times on a session; recomputes the day's worked minutes. */
  adjustSessionTimes(payload: {
    sessionId: string;
    punchIn?: string;
    punchOut?: string;
    reason: string;
  }) {
    return this.http.post('/api/v1/attendance/admin/adjust-session', payload);
  }

  /** Sets the day-level status irrespective of recorded punches. */
  overrideDayStatus(payload: {
    attendanceId: string;
    status: string;
    reason: string;
  }) {
    return this.http.post('/api/v1/attendance/admin/override-status', payload);
  }

  // ── Device tracking exemptions ─────────────────────────────────────────────

  getTrackingExemptions(status?: string) {
    const q = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.http.get<any[]>(`/api/v1/attendance/tracking-exemptions${q}`);
  }

  requestTrackingExemption(payload: {
    employeeId: string;
    deviceId: string;
    reason: string;
    notes?: string;
  }) {
    return this.http.post('/api/v1/attendance/tracking-exemptions', payload);
  }

  reviewTrackingExemption(
    id: string,
    payload: { status: string; reviewNotes?: string; expiresAt?: string },
  ) {
    return this.http.post(
      `/api/v1/attendance/tracking-exemptions/${id}/review`,
      payload,
    );
  }

  getPendingLeaves() {
    return this.http.get<LeaveRequest[]>(`/api/v1/leaves/pending`);
  }

  approveLeave(leaveId: string) {
    return this.http.post(`/api/v1/leaves/${leaveId}/approve`, {});
  }

  rejectLeave(leaveId: string) {
    return this.http.post(`/api/v1/leaves/${leaveId}/reject`, {});
  }

  manualCheckout(
    attendanceSessionId: string,
    checkoutTime: string,
    reason: string,
  ) {
    return this.http.post(`/api/v1/attendance/manual-checkout`, {
      attendanceSessionId,
      checkoutTime,
      reason,
    });
  }

  // ── Geofences ──────────────────────────────────────────────────────────────

  getGeofences() {
    return this.http.get<any[]>('/api/v1/attendance/geofence');
  }

  createGeofence(payload: unknown) {
    return this.http.post('/api/v1/attendance/geofence', payload);
  }

  deleteGeofence(id: string) {
    return this.http.delete(`/api/v1/attendance/geofence/${id}`);
  }

  // Device binding moved to DevicesService (/api/v1/devices) when binding
  // became an onboarding step with an admin-approved change queue.
}
