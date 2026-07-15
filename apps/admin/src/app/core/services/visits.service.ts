import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface VisitEmployee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
}

export interface VisitCustomer {
  id: string;
  customerCode: string;
  legalName: string;
}

export interface Visit {
  id: string;
  visitNumber: string;
  visitType: string;
  status: string;
  priority: string;
  purpose: string;
  description?: string;
  employee?: VisitEmployee | null;
  customer?: VisitCustomer | null;
  plannedStartAt: string;
  plannedEndAt?: string | null;
  actualStartAt?: string | null;
  actualEndAt?: string | null;
  gpsValidated: boolean;
  outcome?: string | null;
}

export interface VisitListFilters {
  status?: string;
  employeeId?: string;
  customerId?: string;
  from?: string;
  to?: string;
}

export interface CreateVisitPayload {
  purpose: string;
  description?: string;
  visitType?: string;
  priority?: string;
  customerId?: string;
  employeeId?: string;
  plannedStartAt: string;
  plannedEndAt?: string;
}

/** Visit management API client (3.2 ADMIN_PORTAL.md). */
@Injectable({ providedIn: 'root' })
export class VisitsService {
  private http = inject(HttpClient);
  private readonly api = '/api/v1/visits';

  getVisits(filters: VisitListFilters = {}, take = 50): Observable<Visit[]> {
    let params = new HttpParams().set('take', take);
    for (const [key, value] of Object.entries(filters)) {
      if (value) params = params.set(key, value);
    }
    return this.http.get<Visit[]>(this.api, { params });
  }

  getVisit(id: string): Observable<Visit> {
    return this.http.get<Visit>(`${this.api}/${id}`);
  }

  createVisit(payload: CreateVisitPayload): Observable<Visit> {
    return this.http.post<Visit>(this.api, payload);
  }

  assign(id: string, employeeId: string, notes?: string): Observable<Visit> {
    return this.http.post<Visit>(`${this.api}/${id}/assign`, {
      employeeId,
      notes,
    });
  }

  cancel(id: string, notes?: string): Observable<Visit> {
    return this.http.post<Visit>(`${this.api}/${id}/cancel`, { notes });
  }

  approve(id: string, notes?: string): Observable<Visit> {
    return this.http.post<Visit>(`${this.api}/${id}/approve`, { notes });
  }

  close(id: string, notes?: string): Observable<Visit> {
    return this.http.post<Visit>(`${this.api}/${id}/close`, { notes });
  }

  reopen(id: string, notes?: string): Observable<Visit> {
    return this.http.post<Visit>(`${this.api}/${id}/reopen`, { notes });
  }

  getEmployees(): Observable<VisitEmployee[]> {
    return this.http.get<VisitEmployee[]>('/api/v1/employees');
  }
}
