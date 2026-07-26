import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

import { WorkforceService } from '../../core/services/workforce.service';
import {
  DailyAttendanceRow,
  DailyAttendanceSummary,
} from '../../core/models/daily-attendance.model';
import { ManualCheckoutDialogComponent } from './dialogs/manual-checkout-dialog.component';
import { AttendanceAdjustDialogComponent } from './dialogs/attendance-adjust-dialog.component';
import { AttendanceStatusDialogComponent } from './dialogs/attendance-status-dialog.component';

/**
 * Tenant-wide attendance log, one row per employee-day.
 *
 * Complements the session-level "Attendance Intelligence" view: this is the
 * day-by-day record a reviewer works through, with the exceptions that need
 * action (missing check-out, tracking gaps, mock locations) surfaced per row
 * and the corrective actions available inline.
 */
@Component({
  selector: 'app-attendance-daily-log',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatIconModule,
    MatMenuModule,
    MatButtonModule,
    MatDialogModule,
    MatPaginatorModule,
    MatTooltipModule,
  ],
  template: `
    <div class="page-container">
      <div class="header-section">
        <div>
          <h1 class="page-title">Attendance Log</h1>
          <p class="page-subtitle">Day-by-day record with exception review</p>
        </div>
        <div class="filters">
          <div class="search-box">
            <mat-icon class="search-icon">search</mat-icon>
            <input
              type="text"
              placeholder="Search employees..."
              class="search-input"
              (keyup)="onSearch($event)"
            />
          </div>
          <input
            type="date"
            class="date-input"
            [(ngModel)]="from"
            (change)="reload()"
          />
          <input
            type="date"
            class="date-input"
            [(ngModel)]="to"
            (change)="reload()"
          />
          <button
            class="filter-toggle"
            [class.active]="exceptionsOnly()"
            (click)="toggleExceptions()"
          >
            <mat-icon>report_problem</mat-icon>
            Exceptions only
          </button>
        </div>
      </div>

      <!-- Range summary -->
      <div class="summary-strip" *ngIf="summary() as s">
        <div class="summary-item">
          <span class="value">{{ s.daysCounted }}</span>
          <span class="label">Days</span>
        </div>
        <div class="summary-item">
          <span class="value">{{ s.presentDays }}</span>
          <span class="label">Present</span>
        </div>
        <div class="summary-item">
          <span class="value">{{ s.absentDays }}</span>
          <span class="label">Absent</span>
        </div>
        <div class="summary-item">
          <span class="value">{{ s.lateDays }}</span>
          <span class="label">Late</span>
        </div>
        <div class="summary-item">
          <span class="value">{{ fmt(s.workedMinutes) }}</span>
          <span class="label">Worked</span>
        </div>
        <div class="summary-item">
          <span class="value">{{ fmt(s.overtimeMinutes) }}</span>
          <span class="label">Overtime</span>
        </div>
        <div class="summary-item warn" *ngIf="s.daysWithExceptions > 0">
          <span class="value">{{ s.daysWithExceptions }}</span>
          <span class="label">Need review</span>
        </div>
      </div>

      <div class="table-wrapper">
        <table mat-table [dataSource]="rows()" class="log-table">
          <ng-container matColumnDef="date">
            <th mat-header-cell *matHeaderCellDef>Date</th>
            <td mat-cell *matCellDef="let row">
              <div class="date-cell">
                <span class="date-main">{{
                  row.date | date: 'EEE, d MMM'
                }}</span>
                <span class="date-sub" *ngIf="row.isOngoing">In progress</span>
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="employee">
            <th mat-header-cell *matHeaderCellDef>Employee</th>
            <td mat-cell *matCellDef="let row">
              <div class="emp-cell">
                <span class="emp-name">{{ row.employee.name }}</span>
                <span class="emp-sub">
                  {{ row.employee.employeeCode }}
                  <ng-container *ngIf="row.employee.departmentName">
                    · {{ row.employee.departmentName }}
                  </ng-container>
                </span>
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="checkIn">
            <th mat-header-cell *matHeaderCellDef>In</th>
            <td mat-cell *matCellDef="let row">
              {{ row.checkInTime ? (row.checkInTime | date: 'HH:mm') : '—' }}
              <mat-icon
                *ngIf="row.isLate"
                class="mini-icon late"
                [matTooltip]="'Late by ' + row.minutesLate + ' min'"
                >schedule</mat-icon
              >
            </td>
          </ng-container>

          <ng-container matColumnDef="checkOut">
            <th mat-header-cell *matHeaderCellDef>Out</th>
            <td mat-cell *matCellDef="let row">
              {{
                row.checkOutTime
                  ? (row.checkOutTime | date: 'HH:mm')
                  : row.isOngoing
                    ? '—'
                    : 'missing'
              }}
            </td>
          </ng-container>

          <ng-container matColumnDef="worked">
            <th mat-header-cell *matHeaderCellDef>Worked</th>
            <td mat-cell *matCellDef="let row">{{ fmt(row.workedMinutes) }}</td>
          </ng-container>

          <ng-container matColumnDef="breaks">
            <th mat-header-cell *matHeaderCellDef>Breaks</th>
            <td mat-cell *matCellDef="let row">
              <span *ngIf="row.breaksTaken > 0">
                {{ row.breaksTaken }} · {{ fmt(row.breakMinutes) }}
              </span>
              <span *ngIf="row.breaksTaken === 0" class="muted">—</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="overtime">
            <th mat-header-cell *matHeaderCellDef>OT</th>
            <td mat-cell *matCellDef="let row">
              <span *ngIf="row.overtimeMinutes > 0" class="ot">{{
                fmt(row.overtimeMinutes)
              }}</span>
              <span *ngIf="row.overtimeMinutes === 0" class="muted">—</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let row">
              <span class="status-pill" [class]="statusClass(row)">
                {{ row.isOngoing ? 'Working' : row.status }}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="exceptions">
            <th mat-header-cell *matHeaderCellDef>Review</th>
            <td mat-cell *matCellDef="let row">
              <div class="chips">
                <span
                  *ngFor="let e of row.exceptions"
                  class="chip"
                  [class]="e.severity"
                  [matTooltip]="e.detail"
                >
                  {{ label(e.code) }}
                </span>
                <span *ngIf="row.exceptions.length === 0" class="muted">—</span>
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let row">
              <button mat-icon-button [matMenuTriggerFor]="menu">
                <mat-icon>more_vert</mat-icon>
              </button>
              <mat-menu #menu="matMenu">
                <button
                  mat-menu-item
                  *ngIf="openSession(row)"
                  (click)="manualCheckout(row)"
                >
                  <mat-icon>history_toggle_off</mat-icon>
                  <span>Manual checkout</span>
                </button>
                <button
                  mat-menu-item
                  *ngIf="row.sessions.length > 0"
                  (click)="adjustTimes(row)"
                >
                  <mat-icon>edit_calendar</mat-icon>
                  <span>Adjust punch times</span>
                </button>
                <button mat-menu-item (click)="overrideStatus(row)">
                  <mat-icon>fact_check</mat-icon>
                  <span>Override day status</span>
                </button>
              </mat-menu>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr
            mat-row
            *matRowDef="let row; columns: columns"
            [class.has-exception]="row.exceptions.length > 0"
          ></tr>
        </table>

        <div class="empty" *ngIf="!loading() && rows().length === 0">
          <mat-icon>event_busy</mat-icon>
          <p>No attendance records for this range.</p>
        </div>

        <div class="loading" *ngIf="loading()">Loading…</div>

        <mat-paginator
          [length]="total()"
          [pageSize]="limit"
          [pageSizeOptions]="[15, 30, 60, 100]"
          (page)="onPage($event)"
        ></mat-paginator>
      </div>
    </div>
  `,
  styles: [
    `
      .page-container {
        padding: 24px;
      }
      .header-section {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
        flex-wrap: wrap;
        margin-bottom: 20px;
      }
      .page-title {
        font-size: 1.75rem;
        font-weight: 700;
        margin: 0;
      }
      .page-subtitle {
        color: #9ca3af;
        margin: 4px 0 0 0;
        font-size: 0.875rem;
      }
      .filters {
        display: flex;
        gap: 10px;
        align-items: center;
        flex-wrap: wrap;
      }
      .search-box {
        position: relative;
        display: flex;
        align-items: center;
      }
      .search-icon {
        position: absolute;
        left: 10px;
        color: #6b7280;
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
      .search-input,
      .date-input {
        background: #0b0d14;
        border: 1px solid #1f2937;
        border-radius: 10px;
        padding: 9px 12px;
        color: #e5e7eb;
        font-size: 0.875rem;
        outline: none;
      }
      .search-input {
        padding-left: 34px;
        min-width: 200px;
      }
      .filter-toggle {
        display: flex;
        align-items: center;
        gap: 6px;
        background: #0b0d14;
        border: 1px solid #1f2937;
        border-radius: 10px;
        padding: 9px 14px;
        color: #9ca3af;
        font-size: 0.875rem;
        cursor: pointer;
      }
      .filter-toggle mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
      .filter-toggle.active {
        border-color: rgba(251, 146, 60, 0.5);
        color: #fb923c;
        background: rgba(251, 146, 60, 0.1);
      }

      .summary-strip {
        display: flex;
        gap: 28px;
        flex-wrap: wrap;
        padding: 16px 20px;
        background: #131620;
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 14px;
        margin-bottom: 16px;
      }
      .summary-item {
        display: flex;
        flex-direction: column;
      }
      .summary-item .value {
        font-size: 1.25rem;
        font-weight: 700;
      }
      .summary-item .label {
        font-size: 0.75rem;
        color: #9ca3af;
      }
      .summary-item.warn .value {
        color: #fb923c;
      }

      .table-wrapper {
        background: #131620;
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 14px;
        overflow: auto;
      }
      .log-table {
        width: 100%;
        background: transparent;
      }
      th.mat-mdc-header-cell {
        color: #9ca3af;
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      td.mat-mdc-cell {
        color: #e5e7eb;
        font-size: 0.875rem;
      }
      tr.has-exception td.mat-mdc-cell:first-child {
        box-shadow: inset 3px 0 0 #fb923c;
      }
      .date-cell,
      .emp-cell {
        display: flex;
        flex-direction: column;
      }
      .date-sub,
      .emp-sub {
        font-size: 0.75rem;
        color: #6b7280;
      }
      .emp-name {
        font-weight: 500;
      }
      .muted {
        color: #4b5563;
      }
      .ot {
        color: #34d399;
      }
      .mini-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
        vertical-align: middle;
      }
      .mini-icon.late {
        color: #fbbf24;
      }

      .status-pill {
        padding: 3px 10px;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 500;
      }
      .status-pill.present {
        background: rgba(52, 211, 153, 0.15);
        color: #34d399;
      }
      .status-pill.working {
        background: rgba(59, 130, 246, 0.15);
        color: #60a5fa;
      }
      .status-pill.absent {
        background: rgba(248, 113, 113, 0.15);
        color: #f87171;
      }
      .status-pill.leave {
        background: rgba(167, 139, 250, 0.15);
        color: #a78bfa;
      }
      .status-pill.other {
        background: rgba(156, 163, 175, 0.15);
        color: #9ca3af;
      }

      .chips {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
      }
      .chip {
        padding: 2px 8px;
        border-radius: 999px;
        font-size: 0.6875rem;
        cursor: default;
      }
      .chip.high {
        background: rgba(248, 113, 113, 0.15);
        color: #f87171;
      }
      .chip.medium {
        background: rgba(251, 146, 60, 0.15);
        color: #fb923c;
      }
      .chip.low {
        background: rgba(156, 163, 175, 0.15);
        color: #9ca3af;
      }

      .empty,
      .loading {
        padding: 48px;
        text-align: center;
        color: #6b7280;
      }
      .empty mat-icon {
        font-size: 40px;
        width: 40px;
        height: 40px;
      }
    `,
  ],
})
export class AttendanceDailyLogComponent implements OnInit {
  private workforce = inject(WorkforceService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  readonly columns = [
    'date',
    'employee',
    'checkIn',
    'checkOut',
    'worked',
    'breaks',
    'overtime',
    'status',
    'exceptions',
    'actions',
  ];

  rows = signal<DailyAttendanceRow[]>([]);
  summary = signal<DailyAttendanceSummary | null>(null);
  total = signal(0);
  loading = signal(false);
  exceptionsOnly = signal(false);

  page = 1;
  limit = 30;
  search = '';
  from = '';
  to = '';

  private searchSubject = new Subject<string>();

  ngOnInit(): void {
    // Default to the last 30 days.
    const today = new Date();
    const start = new Date(today.getTime() - 29 * 86400000);
    this.to = today.toISOString().slice(0, 10);
    this.from = start.toISOString().slice(0, 10);

    this.searchSubject
      .pipe(debounceTime(350), distinctUntilChanged())
      .subscribe((term) => {
        this.search = term;
        this.page = 1;
        this.reload();
      });

    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.workforce
      .getDailyAttendanceLogs({
        page: this.page,
        limit: this.limit,
        from: this.from || undefined,
        to: this.to || undefined,
        search: this.search || undefined,
        exceptionsOnly: this.exceptionsOnly(),
      })
      .subscribe({
        next: (res) => {
          this.rows.set(res.data);
          this.summary.set(res.summary);
          this.total.set(res.total);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.snack.open('Could not load the attendance log.', 'Dismiss', {
            duration: 4000,
          });
        },
      });
  }

  onSearch(event: Event): void {
    this.searchSubject.next((event.target as HTMLInputElement).value);
  }

  onPage(e: PageEvent): void {
    this.page = e.pageIndex + 1;
    this.limit = e.pageSize;
    this.reload();
  }

  toggleExceptions(): void {
    this.exceptionsOnly.update((v) => !v);
    this.page = 1;
    this.reload();
  }

  // ── Row helpers ────────────────────────────────────────────────────────────

  /** The still-open session on this day, if any — the manual-checkout target. */
  openSession(row: DailyAttendanceRow) {
    return row.sessions.find((s) => s.punchOut === null) ?? null;
  }

  statusClass(row: DailyAttendanceRow): string {
    if (row.isOngoing) return 'working';
    switch (row.status) {
      case 'PRESENT':
        return 'present';
      case 'ABSENT':
        return 'absent';
      case 'ON_LEAVE':
        return 'leave';
      default:
        return 'other';
    }
  }

  label(code: string): string {
    const map: Record<string, string> = {
      MISSING_CHECK_OUT: 'No check-out',
      BREAK_NOT_ENDED: 'Break open',
      MOCK_LOCATION: 'Mock GPS',
      MANUAL_PUNCH: 'Manual',
      TRACKING_GAP: 'Location gap',
      SHORT_DAY: 'Short day',
      LATE_ARRIVAL: 'Late',
    };
    return map[code] ?? code;
  }

  fmt(minutes: number): string {
    if (!minutes || minutes <= 0) return '—';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  manualCheckout(row: DailyAttendanceRow): void {
    const session = this.openSession(row);
    if (!session) return;

    this.dialog
      .open(ManualCheckoutDialogComponent, {
        data: {
          attendanceSessionId: session.id,
          employeeName: row.employee.name,
        },
      })
      .afterClosed()
      .subscribe((result) => {
        if (!result) return;
        this.workforce
          .manualCheckout(session.id, result.checkoutTime, result.reason)
          .subscribe({
            next: () => {
              this.snack.open('Session checked out.', 'OK', { duration: 3000 });
              this.reload();
            },
            error: (e) => this.showError(e),
          });
      });
  }

  adjustTimes(row: DailyAttendanceRow): void {
    // Adjust the last session of the day — the one a forgotten or mistimed
    // check-out belongs to.
    const session = row.sessions[row.sessions.length - 1];
    if (!session) return;

    this.dialog
      .open(AttendanceAdjustDialogComponent, {
        data: {
          sessionId: session.id,
          employeeName: row.employee.name,
          punchIn: session.punchIn,
          punchOut: session.punchOut,
        },
      })
      .afterClosed()
      .subscribe((result) => {
        if (!result) return;
        this.workforce.adjustSessionTimes(result).subscribe({
          next: () => {
            this.snack.open('Punch times updated.', 'OK', { duration: 3000 });
            this.reload();
          },
          error: (e) => this.showError(e),
        });
      });
  }

  overrideStatus(row: DailyAttendanceRow): void {
    this.dialog
      .open(AttendanceStatusDialogComponent, {
        data: {
          attendanceId: row.attendanceId,
          employeeName: row.employee.name,
          date: row.date,
          currentStatus: row.status,
        },
      })
      .afterClosed()
      .subscribe((result) => {
        if (!result) return;
        this.workforce.overrideDayStatus(result).subscribe({
          next: () => {
            this.snack.open('Day status updated.', 'OK', { duration: 3000 });
            this.reload();
          },
          error: (e) => this.showError(e),
        });
      });
  }

  private showError(e: unknown): void {
    const message =
      (e as { error?: { message?: string } })?.error?.message ??
      'The action could not be completed.';
    this.snack.open(message, 'Dismiss', { duration: 5000 });
  }
}
