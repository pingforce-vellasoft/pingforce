import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';

import { ConfirmDialogComponent } from '../../core/components/confirm-dialog.component';
import {
  DeviceChangeRequest,
  DeviceChangeStatus,
  DevicesService,
} from '../../core/services/devices.service';
import { RejectReasonDialogComponent } from './reject-reason-dialog.component';

const REASON_LABELS: Record<string, string> = {
  LOST: 'Lost phone',
  STOLEN: 'Stolen phone',
  DAMAGED: 'Damaged phone',
  UPGRADED: 'Changed phone',
  OTHER: 'Other',
};

/**
 * Device change approval queue (DeviceManagement.md §15).
 *
 * Approving rebinds the employee to the new handset and cuts their live
 * sessions, so it is a deliberate two-step action, never an inline toggle.
 */
@Component({
  selector: 'app-device-change-requests',
  standalone: true,
  imports: [
    DatePipe,
    MatCardModule,
    MatButtonModule,
    MatTableModule,
    MatTabsModule,
    MatChipsModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div style="padding: 24px;">
      <h2>Device change requests</h2>
      <p>
        Approve a request only after confirming the employee is who they say
        they are. Approving rebinds their attendance to the new phone and signs
        them out everywhere.
      </p>

      <mat-tab-group (selectedIndexChange)="onTabChange($event)">
        @for (tab of tabs; track tab.status) {
          <mat-tab [label]="tab.label"></mat-tab>
        }
      </mat-tab-group>

      <mat-card style="margin-top: 16px;">
        @if (isLoading()) {
          <div style="padding: 48px; text-align: center;">
            <mat-spinner diameter="32" style="margin: 0 auto;"></mat-spinner>
          </div>
        } @else if (requests().length === 0) {
          <div style="padding: 48px; text-align: center; color: #757575;">
            No {{ activeStatus().toLowerCase() }} requests.
          </div>
        } @else {
          <table mat-table [dataSource]="requests()">
            <ng-container matColumnDef="employee">
              <th mat-header-cell *matHeaderCellDef>Employee</th>
              <td mat-cell *matCellDef="let row">
                <div>
                  {{ row.employee?.firstName }} {{ row.employee?.lastName }}
                </div>
                <div style="font-size: 12px; color: #757575;">
                  {{ row.employee?.employeeCode }}
                </div>
              </td>
            </ng-container>

            <ng-container matColumnDef="reason">
              <th mat-header-cell *matHeaderCellDef>Reason</th>
              <td mat-cell *matCellDef="let row">
                <div>{{ reasonLabel(row.reason) }}</div>
                @if (row.notes) {
                  <div style="font-size: 12px; color: #757575;">
                    {{ row.notes }}
                  </div>
                }
              </td>
            </ng-container>

            <ng-container matColumnDef="newDevice">
              <th mat-header-cell *matHeaderCellDef>New device</th>
              <td mat-cell *matCellDef="let row">
                <div>{{ row.newDeviceName || row.newDeviceId }}</div>
                <div style="font-size: 12px; color: #757575;">
                  {{ row.newOsVersion }}
                  @if (row.newAppVersion) {
                    · app {{ row.newAppVersion }}
                  }
                </div>
              </td>
            </ng-container>

            <ng-container matColumnDef="history">
              <th mat-header-cell *matHeaderCellDef>Prior requests</th>
              <td mat-cell *matCellDef="let row">
                <!--
                  A repeat pattern is the signal that matters here: an employee
                  changing device repeatedly is what a shared handset looks like.
                -->
                @if (row.priorRequestCount > 1) {
                  <span style="color: #b26a00; font-weight: 600;">
                    {{ row.priorRequestCount }}
                  </span>
                } @else {
                  <span>{{ row.priorRequestCount }}</span>
                }
              </td>
            </ng-container>

            <ng-container matColumnDef="raised">
              <th mat-header-cell *matHeaderCellDef>Raised</th>
              <td mat-cell *matCellDef="let row">
                {{ row.createdAt | date: 'dd MMM, HH:mm' }}
              </td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let row">
                {{ row.status }}
                @if (row.rejectionReason) {
                  <div style="font-size: 12px; color: #757575;">
                    {{ row.rejectionReason }}
                  </div>
                }
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let row">
                @if (row.status === 'PENDING') {
                  <button
                    mat-button
                    color="primary"
                    [disabled]="busyId() === row.id"
                    (click)="approve(row)"
                  >
                    Approve
                  </button>
                  <button
                    mat-button
                    color="warn"
                    [disabled]="busyId() === row.id"
                    (click)="reject(row)"
                  >
                    Reject
                  </button>
                }
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columns()"></tr>
            <tr mat-row *matRowDef="let row; columns: columns()"></tr>
          </table>
        }
      </mat-card>
    </div>
  `,
})
export class DeviceChangeRequestsComponent implements OnInit {
  private readonly devicesService = inject(DevicesService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  readonly tabs: { label: string; status: DeviceChangeStatus }[] = [
    { label: 'Pending', status: 'PENDING' },
    { label: 'Approved', status: 'APPROVED' },
    { label: 'Rejected', status: 'REJECTED' },
  ];

  readonly requests = signal<DeviceChangeRequest[]>([]);
  readonly isLoading = signal(false);
  readonly busyId = signal<string | null>(null);
  readonly activeStatus = signal<DeviceChangeStatus>('PENDING');

  ngOnInit(): void {
    this.load();
  }

  columns(): string[] {
    const base = [
      'employee',
      'reason',
      'newDevice',
      'history',
      'raised',
      'status',
    ];
    return this.activeStatus() === 'PENDING' ? [...base, 'actions'] : base;
  }

  reasonLabel(reason: string): string {
    return REASON_LABELS[reason] ?? reason;
  }

  onTabChange(index: number): void {
    this.activeStatus.set(this.tabs[index].status);
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.devicesService.listChangeRequests(this.activeStatus()).subscribe({
      next: (page) => {
        this.requests.set(page.rows);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.snackBar.open('Could not load device requests', 'Close', {
          duration: 4000,
        });
      },
    });
  }

  approve(request: DeviceChangeRequest): void {
    const name =
      `${request.employee?.firstName ?? ''} ${request.employee?.lastName ?? ''}`.trim();

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '480px',
      panelClass: 'premium-dialog',
      data: {
        title: 'Approve device change',
        message: 'Attendance for ',
        emphasis: name || 'this employee',
        messageSuffix:
          ' will move to the new phone, and their current sessions will be signed out.',
        subMessage:
          'Confirm you have verified their identity before approving.',
        confirmText: 'Approve',
        color: 'primary',
        icon: 'phonelink_setup',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.busyId.set(request.id);
      this.devicesService.approveChangeRequest(request.id).subscribe({
        next: () => {
          this.busyId.set(null);
          this.snackBar.open('Device change approved', 'Close', {
            duration: 3000,
          });
          this.load();
        },
        error: (err: { error?: { message?: string } }) => {
          this.busyId.set(null);
          this.snackBar.open(
            err?.error?.message ?? 'Could not approve the request',
            'Close',
            { duration: 4000 },
          );
        },
      });
    });
  }

  reject(request: DeviceChangeRequest): void {
    const dialogRef = this.dialog.open(RejectReasonDialogComponent, {
      width: '480px',
      panelClass: 'premium-dialog',
    });

    dialogRef.afterClosed().subscribe((reason: string | undefined) => {
      if (!reason) return;
      this.busyId.set(request.id);
      this.devicesService.rejectChangeRequest(request.id, reason).subscribe({
        next: () => {
          this.busyId.set(null);
          this.snackBar.open('Device change rejected', 'Close', {
            duration: 3000,
          });
          this.load();
        },
        error: (err: { error?: { message?: string } }) => {
          this.busyId.set(null);
          this.snackBar.open(
            err?.error?.message ?? 'Could not reject the request',
            'Close',
            { duration: 4000 },
          );
        },
      });
    });
  }
}
