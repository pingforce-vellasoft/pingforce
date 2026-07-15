import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  ReportsApiService,
  KpiSummary,
  AttendanceReportRow,
  VisitsReport,
  FaultsReport,
  LeadsReport,
} from '../../core/services/reports.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="header-container">
      <div>
        <h1>Reports & Analytics</h1>
        <p>Operational KPIs and module reports (last 30 days)</p>
      </div>
      <button mat-stroked-button (click)="refresh()">
        <mat-icon>refresh</mat-icon> Refresh
      </button>
    </div>

    <!-- KPI cards -->
    @if (kpis(); as kpi) {
      <div class="kpi-grid">
        <mat-card class="kpi-card">
          <div class="kpi-label">Present Today</div>
          <div class="kpi-value">
            {{ kpi.workforce.presentToday }}
            <span class="kpi-sub">/ {{ kpi.workforce.activeEmployees }}</span>
          </div>
          <div class="kpi-foot">
            Attendance {{ kpi.workforce.attendanceRate ?? '—' }}%
          </div>
        </mat-card>
        <mat-card class="kpi-card">
          <div class="kpi-label">Active Visits</div>
          <div class="kpi-value">{{ kpi.visits.active }}</div>
          <div class="kpi-foot">
            {{ kpi.visits.completedToday }} completed today
          </div>
        </mat-card>
        <mat-card class="kpi-card">
          <div class="kpi-label">Open Faults</div>
          <div class="kpi-value">{{ kpi.faults.open }}</div>
          <div class="kpi-foot warn">
            {{ kpi.faults.slaBreached }} SLA breached
          </div>
        </mat-card>
        <mat-card class="kpi-card">
          <div class="kpi-label">New Leads (30d)</div>
          <div class="kpi-value">{{ kpi.leads.newLast30Days }}</div>
          <div class="kpi-foot">
            {{ kpi.leads.convertedLast30Days }} converted ({{
              kpi.leads.conversionRate ?? '—'
            }}%)
          </div>
        </mat-card>
      </div>
    }

    <mat-card class="report-container">
      <mat-tab-group>
        <mat-tab label="Attendance">
          <div class="tab-toolbar">
            <button mat-stroked-button (click)="export('attendance')">
              <mat-icon>download</mat-icon> Export CSV
            </button>
          </div>
          <table mat-table [dataSource]="attendanceRows()">
            <ng-container matColumnDef="employee">
              <th mat-header-cell *matHeaderCellDef>Employee</th>
              <td mat-cell *matCellDef="let row">
                {{ row.firstName }} {{ row.lastName }}
                <div class="text-small text-muted">{{ row.employeeCode }}</div>
              </td>
            </ng-container>
            <ng-container matColumnDef="presentDays">
              <th mat-header-cell *matHeaderCellDef>Present</th>
              <td mat-cell *matCellDef="let row">{{ row.presentDays }}</td>
            </ng-container>
            <ng-container matColumnDef="lateDays">
              <th mat-header-cell *matHeaderCellDef>Late</th>
              <td mat-cell *matCellDef="let row">{{ row.lateDays }}</td>
            </ng-container>
            <ng-container matColumnDef="sessions">
              <th mat-header-cell *matHeaderCellDef>Sessions</th>
              <td mat-cell *matCellDef="let row">{{ row.sessions }}</td>
            </ng-container>
            <ng-container matColumnDef="totalHours">
              <th mat-header-cell *matHeaderCellDef>Hours</th>
              <td mat-cell *matCellDef="let row">{{ row.totalHours }}</td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="attendanceColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: attendanceColumns"></tr>
          </table>
          @if (attendanceRows().length === 0) {
            <div class="empty-state">No attendance data in range.</div>
          }
        </mat-tab>

        <mat-tab label="Visits">
          <div class="tab-toolbar">
            <button mat-stroked-button (click)="export('visits')">
              <mat-icon>download</mat-icon> Export CSV
            </button>
          </div>
          @if (visitsReport(); as report) {
            <div class="summary-grid">
              <div class="summary-item">
                <span class="summary-value">{{ report.total }}</span> total
              </div>
              <div class="summary-item">
                <span class="summary-value">{{ report.completed }}</span>
                completed ({{ report.completionRate ?? '—' }}%)
              </div>
              <div class="summary-item">
                <span class="summary-value">
                  {{ report.gpsComplianceRate ?? '—' }}%
                </span>
                GPS compliance
              </div>
              <div class="summary-item">
                <span class="summary-value">
                  {{ report.avgDurationMinutes ?? '—' }}
                </span>
                avg minutes
              </div>
            </div>
            <div class="status-breakdown">
              @for (entry of statusEntries(report.byStatus); track entry[0]) {
                <span class="status-chip">
                  {{ entry[0] }}: <strong>{{ entry[1] }}</strong>
                </span>
              }
            </div>
          }
        </mat-tab>

        <mat-tab label="Faults">
          <div class="tab-toolbar">
            <button mat-stroked-button (click)="export('faults')">
              <mat-icon>download</mat-icon> Export CSV
            </button>
          </div>
          @if (faultsReport(); as report) {
            <div class="summary-grid">
              <div class="summary-item">
                <span class="summary-value">{{ report.total }}</span> total
              </div>
              <div class="summary-item">
                <span class="summary-value">{{ report.open }}</span> open
              </div>
              <div class="summary-item">
                <span class="summary-value">{{ report.slaBreached }}</span>
                SLA breached ({{ report.slaComplianceRate ?? '—' }}% compliant)
              </div>
              <div class="summary-item">
                <span class="summary-value">
                  {{ report.avgResolutionHours ?? '—' }}
                </span>
                avg resolution hours
              </div>
            </div>
            <div class="status-breakdown">
              @for (entry of statusEntries(report.byStatus); track entry[0]) {
                <span class="status-chip">
                  {{ entry[0] }}: <strong>{{ entry[1] }}</strong>
                </span>
              }
            </div>
          }
        </mat-tab>

        <mat-tab label="Leads">
          <div class="tab-toolbar">
            <button mat-stroked-button (click)="export('leads')">
              <mat-icon>download</mat-icon> Export CSV
            </button>
          </div>
          @if (leadsReport(); as report) {
            <div class="summary-grid">
              <div class="summary-item">
                <span class="summary-value">{{ report.newLeads }}</span> new
              </div>
              <div class="summary-item">
                <span class="summary-value">{{ report.convertedLeads }}</span>
                converted ({{ report.conversionRate ?? '—' }}%)
              </div>
            </div>
            <table mat-table [dataSource]="report.pipeline">
              <ng-container matColumnDef="stage">
                <th mat-header-cell *matHeaderCellDef>Pipeline Stage</th>
                <td mat-cell *matCellDef="let row">{{ row.stage }}</td>
              </ng-container>
              <ng-container matColumnDef="count">
                <th mat-header-cell *matHeaderCellDef>Leads</th>
                <td mat-cell *matCellDef="let row">{{ row.count }}</td>
              </ng-container>
              <ng-container matColumnDef="expectedValue">
                <th mat-header-cell *matHeaderCellDef>Expected Value</th>
                <td mat-cell *matCellDef="let row">
                  {{ row.expectedValue | number: '1.0-2' }}
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="pipelineColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: pipelineColumns"></tr>
            </table>
          }
        </mat-tab>
      </mat-tab-group>
    </mat-card>
  `,
  styles: [
    `
      :host {
        display: block;
        padding: 24px;
      }
      .header-container {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }
      .header-container h1 {
        margin: 0;
        font-size: 24px;
        font-weight: 500;
      }
      .header-container p {
        margin: 4px 0 0 0;
        color: #666;
      }
      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 16px;
        margin-bottom: 16px;
      }
      .kpi-card {
        padding: 16px;
      }
      .kpi-label {
        font-size: 13px;
        color: #757575;
      }
      .kpi-value {
        font-size: 32px;
        font-weight: 600;
        margin: 4px 0;
      }
      .kpi-sub {
        font-size: 16px;
        color: #9e9e9e;
        font-weight: 400;
      }
      .kpi-foot {
        font-size: 12px;
        color: #757575;
      }
      .kpi-foot.warn {
        color: #d32f2f;
      }
      .report-container {
        padding: 0;
      }
      .tab-toolbar {
        display: flex;
        justify-content: flex-end;
        padding: 16px 16px 0 16px;
      }
      table {
        width: 100%;
      }
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 12px;
        padding: 16px;
      }
      .summary-item {
        background: #fafafa;
        border-radius: 8px;
        padding: 12px;
        font-size: 13px;
        color: #616161;
      }
      .summary-value {
        display: block;
        font-size: 24px;
        font-weight: 600;
        color: #212121;
      }
      .status-breakdown {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        padding: 0 16px 16px 16px;
      }
      .status-chip {
        background: #eeeeee;
        border-radius: 12px;
        padding: 4px 12px;
        font-size: 12px;
      }
      .text-small {
        font-size: 12px;
      }
      .text-muted {
        color: #757575;
      }
      .empty-state {
        padding: 48px;
        text-align: center;
        color: #757575;
      }
    `,
  ],
})
export class ReportsComponent implements OnInit {
  private reportsService = inject(ReportsApiService);
  private snackBar = inject(MatSnackBar);

  readonly attendanceColumns = [
    'employee',
    'presentDays',
    'lateDays',
    'sessions',
    'totalHours',
  ];
  readonly pipelineColumns = ['stage', 'count', 'expectedValue'];

  readonly kpis = signal<KpiSummary | null>(null);
  readonly attendanceRows = signal<AttendanceReportRow[]>([]);
  readonly visitsReport = signal<VisitsReport | null>(null);
  readonly faultsReport = signal<FaultsReport | null>(null);
  readonly leadsReport = signal<LeadsReport | null>(null);

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    const filters = {};
    this.reportsService.getKpis().subscribe({
      next: (kpis) => this.kpis.set(kpis),
      error: (err) => console.error('Failed to load KPIs', err),
    });
    this.reportsService.getAttendanceReport(filters).subscribe({
      next: (report) => this.attendanceRows.set(report.rows),
      error: (err) => console.error('Failed to load attendance report', err),
    });
    this.reportsService.getVisitsReport(filters).subscribe({
      next: (report) => this.visitsReport.set(report),
      error: (err) => console.error('Failed to load visits report', err),
    });
    this.reportsService.getFaultsReport(filters).subscribe({
      next: (report) => this.faultsReport.set(report),
      error: (err) => console.error('Failed to load faults report', err),
    });
    this.reportsService.getLeadsReport(filters).subscribe({
      next: (report) => this.leadsReport.set(report),
      error: (err) => console.error('Failed to load leads report', err),
    });
  }

  statusEntries(byStatus: Record<string, number>): [string, number][] {
    return Object.entries(byStatus);
  }

  export(type: string): void {
    this.reportsService.exportCsv(type, {}).subscribe({
      next: (csv) => {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${type}-report.csv`;
        anchor.click();
        URL.revokeObjectURL(url);
      },
      error: () =>
        this.snackBar.open('Export failed', 'Close', { duration: 3000 }),
    });
  }
}
