import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

/** Latest known position of a field operator (GET /tracking/live). */
export interface LiveOperator {
  employeeId: string;
  employeeCode: string | null;
  name: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  batteryLevel: number | null;
  capturedAt: string;
}

/** One breadcrumb point on an operator's trail. */
export interface TrailPoint {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  capturedAt: string;
}

export interface OperatorTrail {
  employeeId: string;
  points: TrailPoint[];
  truncated: boolean;
}

/** A place the operator dwelled, from the daily summary. */
export interface TopPlace {
  latitude: number;
  longitude: number;
  minutes: number;
  pings: number;
}

export interface DailySummary {
  day: string;
  minutesInField: number;
  firstFixAt: string;
  lastFixAt: string;
  pointCount: number;
  topPlaces: TopPlace[];
}

/**
 * Live field-operator tracking (TRACKING:VIEW_LIVE). All HTTP lives here — the
 * map component only reads signals. Base URL, JWT and X-Tenant-Id are applied
 * by the app interceptors, so URLs stay relative.
 */
@Injectable({ providedIn: 'root' })
export class TrackingService {
  private http = inject(HttpClient);
  private readonly api = '/api/v1/tracking';

  getLive(): Observable<{ data: LiveOperator[] }> {
    return this.http.get<{ data: LiveOperator[] }>(`${this.api}/live`);
  }

  getTrail(
    employeeId: string,
    from?: string,
    to?: string,
  ): Observable<OperatorTrail> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<OperatorTrail>(`${this.api}/${employeeId}/trail`, {
      params,
    });
  }

  getDailySummaries(
    employeeId: string,
    limit?: number,
  ): Observable<{ employeeId: string; days: DailySummary[] }> {
    let params = new HttpParams();
    if (limit != null) params = params.set('limit', String(limit));
    return this.http.get<{ employeeId: string; days: DailySummary[] }>(
      `${this.api}/${employeeId}/summary`,
      { params },
    );
  }
}
