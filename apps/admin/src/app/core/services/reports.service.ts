import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface KpiSummary {
  generatedAt: string;
  workforce: {
    activeEmployees: number;
    presentToday: number;
    attendanceRate: number | null;
  };
  visits: { active: number; completedToday: number };
  faults: { open: number; slaBreached: number };
  leads: {
    newLast30Days: number;
    convertedLast30Days: number;
    conversionRate: number | null;
  };
}

export interface AttendanceReportRow {
  employeeId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  presentDays: number;
  lateDays: number;
  halfDays: number;
  sessions: number;
  totalHours: number;
}

export interface AttendanceReport {
  range: { from: string; to: string };
  rows: AttendanceReportRow[];
}

export interface VisitsReport {
  range: { from: string; to: string };
  total: number;
  byStatus: Record<string, number>;
  completed: number;
  completionRate: number | null;
  gpsComplianceRate: number | null;
  avgDurationMinutes: number | null;
}

export interface FaultsReport {
  range: { from: string; to: string };
  total: number;
  byStatus: Record<string, number>;
  open: number;
  closed: number;
  slaBreached: number;
  slaComplianceRate: number | null;
  avgResolutionHours: number | null;
}

export interface LeadsReport {
  range: { from: string; to: string };
  newLeads: number;
  convertedLeads: number;
  conversionRate: number | null;
  pipeline: {
    stageId: string | null;
    stage: string;
    count: number;
    expectedValue: number;
  }[];
}

export interface ReportFilters {
  from?: string;
  to?: string;
}

/** Reports & analytics API client (3.5 API.md). */
@Injectable({ providedIn: 'root' })
export class ReportsApiService {
  private http = inject(HttpClient);
  private readonly api = '/api/v1/reports';

  getKpis(): Observable<KpiSummary> {
    return this.http.get<KpiSummary>(`${this.api}/kpis`);
  }

  getAttendanceReport(filters: ReportFilters): Observable<AttendanceReport> {
    return this.http.get<AttendanceReport>(`${this.api}/attendance`, {
      params: this.toParams(filters),
    });
  }

  getVisitsReport(filters: ReportFilters): Observable<VisitsReport> {
    return this.http.get<VisitsReport>(`${this.api}/visits`, {
      params: this.toParams(filters),
    });
  }

  getFaultsReport(filters: ReportFilters): Observable<FaultsReport> {
    return this.http.get<FaultsReport>(`${this.api}/faults`, {
      params: this.toParams(filters),
    });
  }

  getLeadsReport(filters: ReportFilters): Observable<LeadsReport> {
    return this.http.get<LeadsReport>(`${this.api}/leads`, {
      params: this.toParams(filters),
    });
  }

  exportCsv(type: string, filters: ReportFilters): Observable<string> {
    return this.http.get(`${this.api}/export`, {
      params: this.toParams(filters).set('type', type),
      responseType: 'text',
    });
  }

  private toParams(filters: ReportFilters): HttpParams {
    let params = new HttpParams();
    if (filters.from) params = params.set('from', filters.from);
    if (filters.to) params = params.set('to', filters.to);
    return params;
  }
}
