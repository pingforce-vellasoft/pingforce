import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import {
  VisitsService,
  Visit,
  VisitEmployee,
} from '../../core/services/visits.service';
import { ConfirmDialogComponent } from '../../core/components/confirm-dialog.component';
import {
  CreateVisitDialogComponent,
  AssignVisitDialogComponent,
} from './dialogs/visit-dialogs.component';

const STATUS_FILTERS = [
  'ALL',
  'PLANNED',
  'ASSIGNED',
  'ACCEPTED',
  'STARTED',
  'PAUSED',
  'COMPLETED',
  'APPROVED',
  'CLOSED',
  'REJECTED',
  'CANCELLED',
  'ABORTED',
] as const;

@Component({
  selector: 'app-visits',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatMenuModule,
    MatSnackBarModule,
    MatDialogModule,
  ],
  template: `
    <div class="header-container">
      <div>
        <h1>Field Visits</h1>
        <p>Plan, assign and review GPS-validated field visits</p>
      </div>
      <button mat-flat-button color="primary" (click)="createVisit()">
        <mat-icon>add_location_alt</mat-icon> Plan Visit
      </button>
    </div>

    <mat-card class="filter-bar">
      <mat-form-field appearance="outline" class="status-filter">
        <mat-label>Status</mat-label>
        <mat-select
          [value]="statusFilter()"
          (selectionChange)="setStatusFilter($event.value)"
        >
          @for (status of statusFilters; track status) {
            <mat-option [value]="status">{{ status }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </mat-card>

    <mat-card class="table-container">
      <table mat-table [dataSource]="visits()">
        <ng-container matColumnDef="visitNumber">
          <th mat-header-cell *matHeaderCellDef>Visit</th>
          <td mat-cell *matCellDef="let visit">
            <strong>{{ visit.visitNumber }}</strong>
            <div class="text-small text-muted">
              {{ visit.visitType }} · {{ visit.purpose }}
            </div>
          </td>
        </ng-container>

        <ng-container matColumnDef="employee">
          <th mat-header-cell *matHeaderCellDef>Assignee</th>
          <td mat-cell *matCellDef="let visit">
            @if (visit.employee) {
              {{ visit.employee.firstName }} {{ visit.employee.lastName }}
              <div class="text-small text-muted">
                {{ visit.employee.employeeCode }}
              </div>
            } @else {
              <span class="text-muted">Unassigned</span>
            }
          </td>
        </ng-container>

        <ng-container matColumnDef="customer">
          <th mat-header-cell *matHeaderCellDef>Customer</th>
          <td mat-cell *matCellDef="let visit">
            {{ visit.customer?.legalName || '—' }}
          </td>
        </ng-container>

        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef>Status</th>
          <td mat-cell *matCellDef="let visit">
            <span class="status-badge" [ngClass]="visit.status.toLowerCase()">
              {{ visit.status }}
            </span>
            @if (visit.gpsValidated) {
              <span class="status-badge gps ml-2">
                <mat-icon inline>gps_fixed</mat-icon> GPS
              </span>
            }
          </td>
        </ng-container>

        <ng-container matColumnDef="planned">
          <th mat-header-cell *matHeaderCellDef>Planned Start</th>
          <td mat-cell *matCellDef="let visit">
            {{ visit.plannedStartAt | date: 'medium' }}
          </td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef class="action-cell">Actions</th>
          <td mat-cell *matCellDef="let visit" class="action-cell">
            <button mat-icon-button [matMenuTriggerFor]="menu">
              <mat-icon>more_vert</mat-icon>
            </button>
            <mat-menu #menu="matMenu">
              @if (canAssign(visit)) {
                <button mat-menu-item (click)="assign(visit)">
                  <mat-icon>person_add</mat-icon> Assign / Reassign
                </button>
              }
              @if (visit.status === 'COMPLETED') {
                <button mat-menu-item (click)="approve(visit)">
                  <mat-icon>task_alt</mat-icon> Approve
                </button>
                <button mat-menu-item (click)="reopen(visit)">
                  <mat-icon>replay</mat-icon> Reopen
                </button>
              }
              @if (visit.status === 'APPROVED') {
                <button mat-menu-item (click)="close(visit)">
                  <mat-icon>lock</mat-icon> Close
                </button>
              }
              @if (canCancel(visit)) {
                <button mat-menu-item (click)="cancel(visit)">
                  <mat-icon>cancel</mat-icon> Cancel
                </button>
              }
            </mat-menu>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
      </table>

      @if (visits().length === 0) {
        <div class="empty-state">No visits found for this filter.</div>
      }
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
      .filter-bar {
        padding: 8px 16px 0 16px;
        margin-bottom: 16px;
      }
      .status-filter {
        width: 220px;
      }
      .table-container {
        overflow: hidden;
        padding: 0;
      }
      table {
        width: 100%;
      }
      .action-cell {
        width: 72px;
        text-align: right;
      }
      .text-small {
        font-size: 12px;
      }
      .text-muted {
        color: #757575;
      }
      .ml-2 {
        margin-left: 8px;
      }
      .empty-state {
        padding: 48px;
        text-align: center;
        color: #757575;
        font-size: 16px;
      }
      .status-badge {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
        background: #e0e0e0;
        color: #424242;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .planned {
        background: #ede7f6;
        color: #5e35b1;
      }
      .assigned {
        background: #e3f2fd;
        color: #1976d2;
      }
      .accepted {
        background: #e0f7fa;
        color: #00838f;
      }
      .started {
        background: #fff3e0;
        color: #f57c00;
      }
      .paused {
        background: #fffde7;
        color: #f9a825;
      }
      .completed {
        background: #e8f5e9;
        color: #388e3c;
      }
      .approved {
        background: #e8f5e9;
        color: #2e7d32;
      }
      .closed {
        background: #e0e0e0;
        color: #616161;
      }
      .rejected,
      .cancelled,
      .aborted {
        background: #ffebee;
        color: #d32f2f;
      }
      .gps {
        background: #e8f5e9;
        color: #2e7d32;
      }
    `,
  ],
})
export class VisitsComponent implements OnInit {
  private visitsService = inject(VisitsService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  readonly statusFilters = STATUS_FILTERS;
  readonly displayedColumns = [
    'visitNumber',
    'employee',
    'customer',
    'status',
    'planned',
    'actions',
  ];

  readonly visits = signal<Visit[]>([]);
  readonly statusFilter = signal<string>('ALL');
  private employees: VisitEmployee[] = [];

  ngOnInit(): void {
    this.loadVisits();
    this.visitsService.getEmployees().subscribe({
      next: (employees) => (this.employees = employees),
      error: (err) => console.error('Failed to load employees', err),
    });
  }

  setStatusFilter(status: string): void {
    this.statusFilter.set(status);
    this.loadVisits();
  }

  loadVisits(): void {
    const status = this.statusFilter();
    this.visitsService.getVisits(status === 'ALL' ? {} : { status }).subscribe({
      next: (visits) => this.visits.set(visits),
      error: (err) => console.error('Failed to load visits', err),
    });
  }

  canAssign(visit: Visit): boolean {
    return ['PLANNED', 'ASSIGNED', 'REJECTED'].includes(visit.status);
  }

  canCancel(visit: Visit): boolean {
    return ['PLANNED', 'ASSIGNED', 'REJECTED', 'ACCEPTED'].includes(
      visit.status,
    );
  }

  createVisit(): void {
    const dialogRef = this.dialog.open(CreateVisitDialogComponent, {
      panelClass: 'premium-dialog',
      data: { employees: this.employees },
    });
    dialogRef.afterClosed().subscribe((payload) => {
      if (!payload) return;
      this.visitsService.createVisit(payload).subscribe({
        next: () => {
          this.snackBar.open('Visit planned', 'Close', { duration: 3000 });
          this.loadVisits();
        },
        error: () =>
          this.snackBar.open('Failed to create visit', 'Close', {
            duration: 3000,
          }),
      });
    });
  }

  assign(visit: Visit): void {
    const dialogRef = this.dialog.open(AssignVisitDialogComponent, {
      panelClass: 'premium-dialog',
      data: { employees: this.employees },
    });
    dialogRef.afterClosed().subscribe((employeeId) => {
      if (!employeeId) return;
      this.visitsService.assign(visit.id, employeeId).subscribe({
        next: () => {
          this.snackBar.open('Visit assigned', 'Close', { duration: 3000 });
          this.loadVisits();
        },
        error: () =>
          this.snackBar.open('Failed to assign visit', 'Close', {
            duration: 3000,
          }),
      });
    });
  }

  approve(visit: Visit): void {
    this.confirmAction(
      'Approve Visit',
      `Approve completed visit ${visit.visitNumber}?`,
      'task_alt',
      'primary',
      () => this.visitsService.approve(visit.id),
      'Visit approved',
    );
  }

  close(visit: Visit): void {
    this.confirmAction(
      'Close Visit',
      `Close visit ${visit.visitNumber}? Closed visits are final.`,
      'lock',
      'primary',
      () => this.visitsService.close(visit.id),
      'Visit closed',
    );
  }

  reopen(visit: Visit): void {
    this.confirmAction(
      'Reopen Visit',
      `Reopen visit ${visit.visitNumber} for rework?`,
      'replay',
      'warn',
      () => this.visitsService.reopen(visit.id),
      'Visit reopened',
    );
  }

  cancel(visit: Visit): void {
    this.confirmAction(
      'Cancel Visit',
      `Cancel visit ${visit.visitNumber}? This cannot be undone.`,
      'cancel',
      'warn',
      () => this.visitsService.cancel(visit.id),
      'Visit cancelled',
    );
  }

  private confirmAction(
    title: string,
    message: string,
    icon: string,
    color: string,
    action: () => ReturnType<VisitsService['approve']>,
    successMessage: string,
  ): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      panelClass: 'premium-dialog',
      data: { title, message, confirmText: title.split(' ')[0], color, icon },
    });
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      action().subscribe({
        next: () => {
          this.snackBar.open(successMessage, 'Close', { duration: 3000 });
          this.loadVisits();
        },
        error: (err) => {
          const message =
            err?.error?.message || 'Action failed — check visit state';
          this.snackBar.open(message, 'Close', { duration: 4000 });
        },
      });
    });
  }
}
