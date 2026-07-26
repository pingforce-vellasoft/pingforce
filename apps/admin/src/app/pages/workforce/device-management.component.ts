import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';

import { ConfirmDialogComponent } from '../../core/components/confirm-dialog.component';
import {
  DevicesService,
  EmployeeDevice,
} from '../../core/services/devices.service';

/**
 * Tenant device inventory (DeviceManagement.md §11).
 *
 * Read plus force-revoke. Revoking clears the employee's binding entirely, so
 * they are sent back through device registration on their next app open —
 * there is no admin path that binds a device on an employee's behalf, by
 * design: only the handset itself can present its key.
 */
@Component({
  selector: 'app-device-management',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
  ],
  template: `
    <div style="padding: 24px;">
      <h2>Registered devices</h2>
      <p>
        Each employee marks attendance from one registered phone. Revoking a
        device signs the employee out and requires them to register again.
      </p>

      <mat-card>
        <div style="padding: 16px;">
          <mat-form-field appearance="outline" style="width: 320px;">
            <mat-label>Search employee or device</mat-label>
            <input
              matInput
              [ngModel]="search()"
              (ngModelChange)="onSearch($event)"
              placeholder="Name, code or device"
            />
          </mat-form-field>
        </div>

        @if (isLoading()) {
          <div style="padding: 48px; text-align: center;">
            <mat-spinner diameter="32" style="margin: 0 auto;"></mat-spinner>
          </div>
        } @else if (devices().length === 0) {
          <div style="padding: 48px; text-align: center; color: #757575;">
            No registered devices found.
          </div>
        } @else {
          <table mat-table [dataSource]="devices()">
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

            <ng-container matColumnDef="device">
              <th mat-header-cell *matHeaderCellDef>Device</th>
              <td mat-cell *matCellDef="let row">
                <div>{{ row.deviceName || row.model || 'Unknown device' }}</div>
                <div style="font-size: 12px; color: #757575;">
                  {{ row.manufacturer }}
                  @if (row.osVersion) {
                    · {{ row.osVersion }}
                  }
                  @if (row.appVersion) {
                    · app {{ row.appVersion }}
                  }
                </div>
              </td>
            </ng-container>

            <ng-container matColumnDef="boundAt">
              <th mat-header-cell *matHeaderCellDef>Registered</th>
              <td mat-cell *matCellDef="let row">
                {{ row.boundAt | date: 'dd MMM yyyy' }}
              </td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let row">
                <span [style.color]="row.isTrusted ? 'green' : 'red'">
                  {{ row.isTrusted ? 'Active' : 'Revoked' }}
                </span>
                @if (!row.isTrusted && row.revokedReason) {
                  <div style="font-size: 12px; color: #757575;">
                    {{ revokedLabel(row.revokedReason) }}
                  </div>
                }
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let row">
                <button
                  mat-button
                  color="warn"
                  [disabled]="!row.isTrusted || busyId() === row.id"
                  (click)="revoke(row)"
                >
                  Revoke
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns"></tr>
          </table>

          <mat-paginator
            [length]="total()"
            [pageSize]="pageSize()"
            [pageIndex]="pageIndex()"
            [pageSizeOptions]="[25, 50, 100]"
            (page)="onPage($event)"
          ></mat-paginator>
        }
      </mat-card>
    </div>
  `,
})
export class DeviceManagementComponent implements OnInit {
  private readonly devicesService = inject(DevicesService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  readonly columns = ['employee', 'device', 'boundAt', 'status', 'actions'];

  readonly devices = signal<EmployeeDevice[]>([]);
  readonly total = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(25);
  readonly search = signal('');
  readonly isLoading = signal(false);
  readonly busyId = signal<string | null>(null);

  private searchTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.load();
  }

  revokedLabel(reason: string): string {
    switch (reason) {
      case 'REPLACED':
        return 'Replaced by an approved change';
      case 'ADMIN_REVOKED':
        return 'Revoked by an administrator';
      case 'EMPLOYEE_EXIT':
        return 'Employee exited';
      default:
        return reason;
    }
  }

  onSearch(value: string): void {
    this.search.set(value);
    // Debounced: the search hits the tenant device inventory, and a request per
    // keystroke would be one query per character.
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.pageIndex.set(0);
      this.load();
    }, 300);
  }

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.devicesService
      .listDevices(
        this.search().trim() || undefined,
        this.pageIndex() * this.pageSize(),
        this.pageSize(),
      )
      .subscribe({
        next: (page) => {
          this.devices.set(page.rows);
          this.total.set(page.total);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.snackBar.open('Could not load devices', 'Close', {
            duration: 4000,
          });
        },
      });
  }

  revoke(device: EmployeeDevice): void {
    const name =
      `${device.employee?.firstName ?? ''} ${device.employee?.lastName ?? ''}`.trim();

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '480px',
      panelClass: 'premium-dialog',
      data: {
        title: 'Revoke device',
        message: 'This signs out ',
        emphasis: name || 'this employee',
        messageSuffix:
          ' and stops attendance from this phone until they register again.',
        subMessage: 'They will be asked to register a device on next sign-in.',
        confirmText: 'Revoke',
        color: 'warn',
        icon: 'phonelink_erase',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.busyId.set(device.id);
      this.devicesService.revokeDevice(device.id).subscribe({
        next: () => {
          this.busyId.set(null);
          this.snackBar.open('Device revoked', 'Close', { duration: 3000 });
          this.load();
        },
        error: (err: { error?: { message?: string } }) => {
          this.busyId.set(null);
          this.snackBar.open(
            err?.error?.message ?? 'Could not revoke the device',
            'Close',
            { duration: 4000 },
          );
        },
      });
    });
  }
}
