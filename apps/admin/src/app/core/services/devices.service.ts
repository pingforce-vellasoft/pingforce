import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

/** Employee summary embedded in device and request rows. */
export interface DeviceEmployee {
  readonly id: string;
  readonly employeeCode: string;
  readonly firstName: string;
  readonly lastName: string;
}

export interface EmployeeDevice {
  readonly id: string;
  readonly employeeId: string;
  readonly deviceId: string;
  readonly isTrusted: boolean;
  readonly deviceName: string | null;
  readonly platform: string | null;
  readonly osVersion: string | null;
  readonly appVersion: string | null;
  readonly model: string | null;
  readonly manufacturer: string | null;
  readonly boundAt: string;
  readonly revokedAt: string | null;
  readonly revokedReason: string | null;
  readonly employee?: DeviceEmployee;
}

export type DeviceChangeStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface DeviceChangeRequest {
  readonly id: string;
  readonly employeeId: string;
  readonly currentDeviceId: string | null;
  readonly newDeviceId: string;
  readonly newDeviceName: string | null;
  readonly newPlatform: string | null;
  readonly newOsVersion: string | null;
  readonly newAppVersion: string | null;
  readonly newModel: string | null;
  readonly newManufacturer: string | null;
  readonly reason: string;
  readonly notes: string | null;
  readonly status: DeviceChangeStatus;
  readonly reviewedBy: string | null;
  readonly reviewedAt: string | null;
  readonly rejectionReason: string | null;
  readonly expiresAt: string | null;
  readonly createdAt: string;
  /** How many requests this employee has raised — a repeat pattern is signal. */
  readonly priorRequestCount: number;
  readonly employee?: DeviceEmployee;
}

export interface Paged<T> {
  readonly rows: T[];
  readonly total: number;
}

/**
 * Device binding administration (DeviceManagement.md §15).
 *
 * All calls live here rather than in components — approving a change rebinds an
 * employee and cuts their sessions, which is business logic, not view logic.
 */
@Injectable({ providedIn: 'root' })
export class DevicesService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/devices';

  listDevices(
    search?: string,
    skip = 0,
    take = 50,
  ): Observable<Paged<EmployeeDevice>> {
    let params = new HttpParams()
      .set('skip', String(skip))
      .set('take', String(take));
    if (search) params = params.set('search', search);
    return this.http.get<Paged<EmployeeDevice>>(this.base, { params });
  }

  listChangeRequests(
    status?: DeviceChangeStatus,
    skip = 0,
    take = 50,
  ): Observable<Paged<DeviceChangeRequest>> {
    let params = new HttpParams()
      .set('skip', String(skip))
      .set('take', String(take));
    if (status) params = params.set('status', status);
    return this.http.get<Paged<DeviceChangeRequest>>(
      `${this.base}/change-requests`,
      { params },
    );
  }

  approveChangeRequest(id: string): Observable<DeviceChangeRequest> {
    return this.http.post<DeviceChangeRequest>(
      `${this.base}/change-requests/${id}/approve`,
      {},
    );
  }

  rejectChangeRequest(
    id: string,
    rejectionReason: string,
  ): Observable<DeviceChangeRequest> {
    return this.http.post<DeviceChangeRequest>(
      `${this.base}/change-requests/${id}/reject`,
      { rejectionReason },
    );
  }

  revokeDevice(id: string, reason?: string): Observable<EmployeeDevice> {
    return this.http.post<EmployeeDevice>(`${this.base}/${id}/revoke`, {
      reason,
    });
  }
}
