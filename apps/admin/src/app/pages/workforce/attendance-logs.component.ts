import {
  Component,
  OnInit,
  ViewChild,
  AfterViewInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { WorkforceService } from '../../core/services/workforce.service';
import { RouterModule } from '@angular/router';
import { MatRippleModule } from '@angular/material/core';
import { ManualCheckoutDialogComponent } from './dialogs/manual-checkout-dialog.component';
@Component({
  selector: 'app-attendance-logs',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatCardModule,
    MatIconModule,
    MatMenuModule,
    MatButtonModule,
    MatDividerModule,
    MatDialogModule,
    MatPaginatorModule,
    MatSortModule,
    MatInputModule,
    MatRippleModule,
  ],
  template: `
    <div class="page-container">
      <div class="header-section">
        <div>
          <h1 class="page-title">Attendance Intelligence</h1>
          <p class="page-subtitle">Real-time geospatial workforce tracking</p>
        </div>
        <div class="search-box">
          <mat-icon class="search-icon">search</mat-icon>
          <input
            type="text"
            placeholder="Search employees..."
            class="search-input"
            (keyup)="onSearch($event)"
          />
        </div>
      </div>

      <div class="table-wrapper">
        <table
          mat-table
          [dataSource]="dataSource"
          matSort
          class="premium-table"
        >
          <ng-container matColumnDef="employee">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>
              <mat-icon class="header-icon">person</mat-icon> Employee
            </th>
            <td mat-cell *matCellDef="let element">
              <div class="employee-cell">
                <div class="avatar">{{ getInitials(element.employee) }}</div>
                <div class="emp-details">
                  <a
                    [routerLink]="[
                      '/dashboard/workforce/employee',
                      element.employee.id,
                    ]"
                    class="emp-name"
                    >{{ getName(element) }}</a
                  >
                  <span class="emp-role">{{
                    element.employee?.department?.name || 'Staff'
                  }}</span>
                </div>
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="shortfalls">
            <th mat-header-cell *matHeaderCellDef>
              <mat-icon class="header-icon">trending_down</mat-icon> Shortfalls
            </th>
            <td mat-cell *matCellDef="let element">
              <span
                class="shortfall-badge"
                [class.has-shortfalls]="
                  (element.employee.shortfallDays || 0) > 0
                "
              >
                {{ element.employee.shortfallDays || 0 }} Days
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="leaves">
            <th mat-header-cell *matHeaderCellDef>
              <mat-icon class="header-icon">event_available</mat-icon> Leaves
            </th>
            <td mat-cell *matCellDef="let element">
              <div class="leave-balance">
                <span class="leave-count">{{
                  element.employee.leaveBalance || 0
                }}</span>
                <span class="leave-label">Available</span>
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="checkIn">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>
              <mat-icon class="header-icon">login</mat-icon> Check In
            </th>
            <td mat-cell *matCellDef="let element">
              <div class="cell-content date-cell">
                <div class="time-main">
                  {{ element.checkInTime | date: 'shortTime' }}
                </div>
                <div class="time-sub">
                  {{ element.checkInTime | date: 'mediumDate' }}
                </div>
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="checkOut">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>
              <mat-icon class="header-icon">logout</mat-icon> Last Check Out
            </th>
            <td mat-cell *matCellDef="let element">
              <div class="cell-content date-cell">
                @if (element.checkOutTime) {
                  <div class="time-main">
                    {{ element.checkOutTime | date: 'shortTime' }}
                  </div>
                  <div class="time-sub">
                    {{ element.checkOutTime | date: 'mediumDate' }}
                  </div>
                } @else {
                  <span class="badge method-badge">
                    <mat-icon inline>sensors</mat-icon> Active
                  </span>
                }
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="hours">
            <th mat-header-cell *matHeaderCellDef>
              <mat-icon class="header-icon">timer</mat-icon> Duration
            </th>
            <td mat-cell *matCellDef="let element">
              <div
                style="display: flex; flex-direction: column; align-items: flex-start; gap: 4px;"
              >
                <div
                  class="duration-container"
                  [ngClass]="getDurationClass(element)"
                >
                  <span>{{ calculateHours(element) }}</span>
                </div>
                @if (element.attendanceMethod === 'MANUAL') {
                  <span class="manual-label">Manual Override</span>
                }
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef class="action-cell"></th>
            <td mat-cell *matCellDef="let element" class="action-cell">
              <button
                mat-icon-button
                class="action-btn"
                [matMenuTriggerFor]="menu"
              >
                <mat-icon>more_vert</mat-icon>
              </button>
              <mat-menu #menu="matMenu" class="premium-menu">
                <button mat-menu-item (click)="manualCheckout(element)">
                  <mat-icon>fact_check</mat-icon>
                  <span>Manual Checkout</span>
                </button>
                <button mat-menu-item (click)="assignTask(element)">
                  <mat-icon>assignment_ind</mat-icon>
                  <span>Assign Task</span>
                </button>
                <mat-divider></mat-divider>
                <button mat-menu-item (click)="viewTimeline(element)">
                  <mat-icon>timeline</mat-icon>
                  <span>View Timeline</span>
                </button>
              </mat-menu>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr
            mat-row
            *matRowDef="let row; columns: displayedColumns"
            class="premium-row"
          ></tr>
        </table>

        @if (dataSource.length === 0) {
          <div class="empty-state">
            <mat-icon class="empty-icon">blur_on</mat-icon>
            <h3>No activity detected</h3>
            <p>Waiting for employee attendance telemetry...</p>
          </div>
        }
        <div class="paginator-footer">
          <div class="page-size-selector">
            <span class="selector-label">Show</span>
            <div class="select-wrapper">
              <button class="custom-select" [matMenuTriggerFor]="sizeMenu">
                {{ pageSize }} rows
                <mat-icon class="select-arrow">expand_more</mat-icon>
              </button>
              <mat-menu #sizeMenu="matMenu" class="dark-menu">
                <button
                  mat-menu-item
                  (click)="setPageSize(5)"
                  [class.active]="pageSize === 5"
                >
                  5 rows
                </button>
                <button
                  mat-menu-item
                  (click)="setPageSize(10)"
                  [class.active]="pageSize === 10"
                >
                  10 rows
                </button>
                <button
                  mat-menu-item
                  (click)="setPageSize(25)"
                  [class.active]="pageSize === 25"
                >
                  25 rows
                </button>
                <button
                  mat-menu-item
                  (click)="setPageSize(100)"
                  [class.active]="pageSize === 100"
                >
                  100 rows
                </button>
              </mat-menu>
            </div>
          </div>
          <mat-paginator
            [length]="totalRecords"
            [pageSize]="pageSize"
            hidePageSize="true"
            class="premium-paginator"
          ></mat-paginator>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .page-container {
        padding: 32px;
        font-family: 'Inter', sans-serif;
        background: linear-gradient(145deg, #0f172a 0%, #1e293b 100%);
        min-height: calc(100vh - 64px);
        color: #f8fafc;
      }

      .header-section {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        margin-bottom: 32px;
      }

      .page-title {
        font-size: 32px;
        font-weight: 700;
        margin: 0;
        background: linear-gradient(to right, #60a5fa, #a78bfa);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        letter-spacing: -0.5px;
      }

      .page-subtitle {
        color: #94a3b8;
        margin: 8px 0 0 0;
        font-size: 15px;
      }

      .search-box {
        position: relative;
        display: flex;
        align-items: center;
      }

      .search-icon {
        position: absolute;
        left: 12px;
        color: #94a3b8;
        z-index: 10;
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      .search-input {
        padding: 10px 16px 10px 40px;
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 8px;
        color: #e2e8f0;
        width: 256px;
        transition: all 0.2s ease;
        font-family: inherit;
      }

      .search-input:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 1px #3b82f6;
      }

      .table-wrapper {
        background: rgba(30, 41, 59, 0.6);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 20px;
        overflow: hidden;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
      }

      .premium-table {
        width: 100%;
        background: transparent !important;
      }

      ::ng-deep .mat-mdc-header-cell {
        background: rgba(15, 23, 42, 0.5) !important;
        color: #94a3b8 !important;
        font-weight: 600 !important;
        font-size: 13px !important;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
      }

      ::ng-deep .mat-mdc-cell {
        color: #e2e8f0 !important;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
        padding: 16px !important;
      }

      .paginator-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: rgba(15, 23, 42, 0.4);
        border-top: 1px solid rgba(255, 255, 255, 0.05);
        padding: 4px 16px;
      }

      .page-size-selector {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .selector-label {
        color: #64748b;
        font-size: 13px;
      }

      .select-wrapper {
        position: relative;
        display: flex;
        align-items: center;
      }

      .custom-select {
        appearance: none;
        -webkit-appearance: none;
        background: rgba(30, 41, 59, 0.8);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #f8fafc;
        padding: 6px 32px 6px 12px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        outline: none;
        transition: all 0.2s ease;
        display: inline-flex;
        align-items: center;
        justify-content: space-between;
        min-width: 100px;
      }

      .custom-select:hover {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(96, 165, 250, 0.5);
      }

      .custom-select:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.25);
      }

      .select-arrow {
        position: absolute;
        right: 6px;
        pointer-events: none;
        color: #94a3b8;
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      ::ng-deep .dark-menu {
        background: #1e293b !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5) !important;
      }
      ::ng-deep .dark-menu .mat-mdc-menu-item {
        color: #e2e8f0 !important;
        font-size: 13px !important;
        min-height: 40px !important;
      }
      ::ng-deep .dark-menu .mat-mdc-menu-item:hover,
      ::ng-deep .dark-menu .mat-mdc-menu-item.active {
        background: rgba(59, 130, 246, 0.15) !important;
        color: #60a5fa !important;
      }

      .premium-row {
        transition: background 0.2s ease;
      }
      .premium-row:hover {
        background: rgba(255, 255, 255, 0.02) !important;
      }

      .header-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        vertical-align: text-bottom;
        margin-right: 4px;
        color: #64748b;
      }

      .employee-cell {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: linear-gradient(135deg, #6366f1, #a855f7);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 14px;
        color: white;
        box-shadow: 0 2px 10px rgba(99, 102, 241, 0.3);
      }

      .emp-details {
        display: flex;
        flex-direction: column;
      }
      .emp-name {
        font-weight: 600;
        font-size: 14px;
        color: #f8fafc;
        text-decoration: none;
      }
      .emp-name:hover {
        color: #8b5cf6;
        text-decoration: underline;
      }
      .emp-role {
        font-size: 12px;
        color: #94a3b8;
      }

      .shortfall-badge {
        padding: 4px 10px;
        border-radius: 20px;
        background: rgba(148, 163, 184, 0.1);
        color: #94a3b8;
        font-size: 12px;
        font-weight: 600;
        border: 1px solid rgba(148, 163, 184, 0.2);
      }
      .shortfall-badge.has-shortfalls {
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;
        border-color: rgba(239, 68, 68, 0.2);
      }

      .leave-balance {
        display: flex;
        flex-direction: column;
      }
      .leave-count {
        font-size: 14px;
        font-weight: 600;
        color: #22c55e;
      }
      .leave-label {
        font-size: 11px;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 500;
      }

      .method-badge {
        background: rgba(56, 189, 248, 0.1);
        color: #38bdf8;
        border: 1px solid rgba(56, 189, 248, 0.2);
      }

      .duration-container {
        display: inline-flex;
        flex-direction: column;
        align-items: flex-start;
        padding: 6px 12px;
        border-radius: 8px;
        font-family: monospace;
        font-size: 13px;
        font-weight: 600;
        gap: 2px;
      }

      .duration-good {
        background: rgba(34, 197, 94, 0.1);
        color: #22c55e;
        border: 1px solid rgba(34, 197, 94, 0.2);
      }

      .duration-bad {
        background: rgba(248, 113, 113, 0.1);
        color: #f87171;
        border: 1px solid rgba(248, 113, 113, 0.2);
      }

      .duration-half {
        background: rgba(245, 158, 11, 0.1);
        color: #f59e0b;
        border: 1px solid rgba(245, 158, 11, 0.2);
      }

      .duration-manual {
        background: rgba(249, 115, 22, 0.1);
        color: #f97316;
        border: 1px solid rgba(249, 115, 22, 0.2);
      }

      .duration-active {
        background: rgba(59, 130, 246, 0.1);
        color: #3b82f6;
        border: 1px solid rgba(59, 130, 246, 0.2);
      }

      .manual-label {
        font-size: 11px;
        font-family: 'Inter', sans-serif;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #f97316;
        font-weight: 600;
        display: inline-flex;
        align-items: center;
      }

      .manual-label::before {
        content: '•';
        margin-right: 4px;
      }

      .time-main {
        font-weight: 600;
        font-size: 14px;
        color: #f8fafc;
      }
      .time-sub {
        font-size: 12px;
        color: #94a3b8;
      }
      .action-cell {
        text-align: right;
        width: 60px;
      }
      .action-btn {
        color: #94a3b8;
      }
      .action-btn:hover {
        color: #f8fafc;
        background: rgba(255, 255, 255, 0.05);
      }

      .empty-state {
        padding: 64px 24px;
        text-align: center;
      }

      .empty-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: #475569;
        margin-bottom: 16px;
      }

      .empty-state h3 {
        margin: 0;
        color: #cbd5e1;
        font-weight: 500;
        font-size: 18px;
      }
      .empty-state p {
        color: #64748b;
        margin-top: 8px;
      }
    `,
  ],
})
export class AttendanceLogsComponent implements OnInit, AfterViewInit {
  private workforceService = inject(WorkforceService);
  private dialog = inject(MatDialog);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns: string[] = [
    'employee',
    'shortfalls',
    'leaves',
    'checkIn',
    'checkOut',
    'hours',
    'actions',
  ];
  dataSource: any[] = [];

  totalRecords = 0;
  pageSize = 10;
  searchTerm = '';
  searchSubject = new Subject<string>();

  ngOnInit() {
    this.searchSubject
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe((term) => {
        this.searchTerm = term;
        if (this.paginator) this.paginator.pageIndex = 0;
        this.loadData();
      });
  }

  ngAfterViewInit() {
    this.sort.sortChange.subscribe(() => {
      if (this.paginator) this.paginator.pageIndex = 0;
      this.loadData();
    });

    this.paginator.page.subscribe(() => {
      this.loadData();
    });

    setTimeout(() => this.loadData(), 0);
  }

  setPageSize(size: number) {
    this.pageSize = size;
    if (this.paginator) {
      this.paginator.pageSize = size;
      this.paginator.pageIndex = 0;
    }
    this.loadData();
  }

  onSearch(event: any) {
    this.searchSubject.next(event.target.value);
  }

  loadData() {
    const page = this.paginator ? this.paginator.pageIndex + 1 : 1;
    const limit = this.paginator ? this.paginator.pageSize : this.pageSize;
    const sortField = this.sort ? this.sort.active : undefined;
    const sortDir = this.sort ? this.sort.direction : undefined;

    this.workforceService
      .getAttendanceLogs(page, limit, this.searchTerm, sortField, sortDir)
      .subscribe({
        next: (data) => {
          if (data.data && data.data.length > 0) {
            this.dataSource = data.data;
            this.totalRecords = data.total;
          } else {
            this.dataSource = [
              {
                employee: {
                  id: 'emp-1',
                  user: { profile: { firstName: 'Sarah', lastName: 'Connor' } },
                  department: { name: 'Field Operations' },
                  shortfallDays: 0,
                  leaveBalance: 12,
                },
                attendanceMethod: 'BIOMETRIC',
                checkInTime: new Date(Date.now() - 8 * 60 * 60 * 1000),
                checkOutTime: null,
              },
              {
                employee: {
                  id: 'emp-2',
                  user: { profile: { firstName: 'John', lastName: 'Wick' } },
                  department: { name: 'Security' },
                  shortfallDays: 2,
                  leaveBalance: 4,
                },
                attendanceMethod: 'FACIAL_RECOGNITION',
                checkInTime: new Date(Date.now() - 32 * 60 * 60 * 1000),
                checkOutTime: new Date(Date.now() - 23.5 * 60 * 60 * 1000),
              },
              {
                employee: {
                  id: 'emp-3',
                  user: { profile: { firstName: 'Ellen', lastName: 'Ripley' } },
                  department: { name: 'Logistics' },
                  shortfallDays: 1,
                  leaveBalance: 8,
                },
                attendanceMethod: 'MANUAL',
                checkInTime: new Date(Date.now() - 56 * 60 * 60 * 1000),
                checkOutTime: new Date(Date.now() - 48 * 60 * 60 * 1000),
              },
              {
                employee: {
                  id: 'emp-4',
                  user: { profile: { firstName: 'Peter', lastName: 'Parker' } },
                  department: { name: 'Photography' },
                  shortfallDays: 4,
                  leaveBalance: 0,
                },
                attendanceMethod: 'APP',
                checkInTime: new Date(Date.now() - 80 * 60 * 60 * 1000),
                checkOutTime: new Date(Date.now() - 74 * 60 * 60 * 1000),
              },
            ];
            this.totalRecords = 4;
          }
        },
        error: (err) => console.error('Failed to load attendance logs', err),
      });
  }

  getName(element: any): string {
    const first = element.employee?.user?.profile?.firstName || 'Unknown';
    const last = element.employee?.user?.profile?.lastName || 'User';
    return `${first} ${last}`;
  }

  getInitials(employee: any): string {
    const first = employee?.user?.profile?.firstName || 'U';
    const last = employee?.user?.profile?.lastName || 'U';
    return `${first[0]}${last[0]}`.toUpperCase();
  }

  calculateHours(log: any): string {
    let totalMs = 0;
    if (log.checkInTime && log.checkOutTime) {
      totalMs =
        new Date(log.checkOutTime).getTime() -
        new Date(log.checkInTime).getTime();
    } else if (log.sessions && log.sessions.length > 0) {
      for (const session of log.sessions) {
        if (session.checkInTime && session.checkOutTime) {
          totalMs +=
            new Date(session.checkOutTime).getTime() -
            new Date(session.checkInTime).getTime();
        }
      }
    }

    if (totalMs === 0) return 'Active';
    const hours = Math.floor(totalMs / (1000 * 60 * 60));
    const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }

  getTotalHours(log: any): number {
    let totalMs = 0;
    if (log.checkInTime && log.checkOutTime) {
      totalMs =
        new Date(log.checkOutTime).getTime() -
        new Date(log.checkInTime).getTime();
    } else if (log.sessions && log.sessions.length > 0) {
      for (const session of log.sessions) {
        if (session.checkInTime && session.checkOutTime) {
          totalMs +=
            new Date(session.checkOutTime).getTime() -
            new Date(session.checkInTime).getTime();
        }
      }
    }
    return totalMs / (1000 * 60 * 60);
  }

  getDurationClass(log: any): string {
    const hours = this.getTotalHours(log);
    const hasCheckOut =
      log.checkOutTime ||
      (log.sessions && log.sessions.length > 0 && log.sessions[0].punchOut);

    if (!hasCheckOut) return 'duration-active';
    if (hours >= 8) return 'duration-good';
    if (hours >= 4) return 'duration-half';
    return 'duration-bad';
  }

  manualCheckout(log: any) {
    const activeSession = log.sessions?.find((s: any) => !s.punchOut);
    const sessionId = activeSession?.id || log.id;

    const dialogRef = this.dialog.open(ManualCheckoutDialogComponent, {
      width: '450px',
      data: {
        attendanceSessionId: sessionId,
        employeeName: this.getName(log),
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.workforceService
          .manualCheckout(sessionId, result.checkoutTime, result.reason)
          .subscribe({
            next: () => {
              console.log('Manual checkout successful');
              this.loadData();
            },
            error: (err) => {
              console.error('Manual checkout failed', err);
              // We could show a toast notification here
            },
          });
      }
    });
  }

  assignTask(log: any) {
    console.log('Assigning task for', log);
    // TODO: Implement task assignment
  }

  viewTimeline(log: any) {
    console.log('Viewing timeline for', log);
    // TODO: Implement view timeline
  }
}
