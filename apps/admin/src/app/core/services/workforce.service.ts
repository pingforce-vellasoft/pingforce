import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  AttendanceLog,
  LeaveRequest,
  PaginationDto,
} from '@pingforce-monorepo/dto';

@Injectable({
  providedIn: 'root',
})
export class WorkforceService {
  private http = inject(HttpClient);

  getAttendanceLogs(
    page: number = 1,
    limit: number = 10,
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
}
