import { Component, inject, OnInit } from '@angular/core';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../../core/components/confirm-dialog.component';

@Component({
  selector: 'app-device-management',
  standalone: true,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatTableModule,
    MatSnackBarModule,
    MatDialogModule,
  ],
  template: `
    <div style="padding: 24px;">
      <h2>Device Management</h2>
      <p>Manage and revoke trusted biometric attendance devices</p>

      <mat-card>
        <table mat-table [dataSource]="devices">
          <ng-container matColumnDef="employee">
            <th mat-header-cell *matHeaderCellDef>Employee</th>
            <td mat-cell *matCellDef="let element">
              {{ element.employee?.user?.profile?.firstName }}
              {{ element.employee?.user?.profile?.lastName }}
            </td>
          </ng-container>
          <ng-container matColumnDef="deviceId">
            <th mat-header-cell *matHeaderCellDef>Device ID</th>
            <td mat-cell *matCellDef="let element">{{ element.deviceId }}</td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let element">
              <span [style.color]="element.isTrusted ? 'green' : 'red'">
                {{ element.isTrusted ? 'Trusted' : 'Revoked' }}
              </span>
            </td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Actions</th>
            <td mat-cell *matCellDef="let element">
              <button
                mat-button
                color="warn"
                (click)="revokeDevice(element)"
                [disabled]="!element.isTrusted"
              >
                Revoke Device
              </button>
            </td>
          </ng-container>
          <tr
            mat-header-row
            *matHeaderRowDef="['employee', 'deviceId', 'status', 'actions']"
          ></tr>
          <tr
            mat-row
            *matRowDef="
              let row;
              columns: ['employee', 'deviceId', 'status', 'actions']
            "
          ></tr>
        </table>

        @if (devices.length === 0) {
          <div style="padding: 48px; text-align: center; color: #757575;">
            No registered devices found.
          </div>
        }
      </mat-card>
    </div>
  `,
})
export class DeviceManagementComponent implements OnInit {
  private http = inject(HttpClient);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  devices: any[] = [];

  ngOnInit() {
    this.loadDevices();
  }

  loadDevices() {
    this.http.get<any[]>('/api/v1/attendance/device').subscribe({
      next: (data) => (this.devices = data),
      error: (err) => console.error(err),
    });
  }

  revokeDevice(device: any) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '450px',
      panelClass: 'premium-dialog',
      data: {
        title: 'Revoke Device',
        message:
          'Are you sure you want to revoke this device? The employee will need to register a new device.',
        confirmText: 'Revoke',
        color: 'warn',
        icon: 'phonelink_erase',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.http
          .post('/api/v1/attendance/device/revoke', {
            employeeId: device.employeeId,
            deviceId: device.deviceId,
          })
          .subscribe({
            next: () => {
              this.snackBar.open('Device revoked successfully', 'Close', {
                duration: 3000,
              });
              this.loadDevices();
            },
            error: (err) => {
              this.snackBar.open('Failed to revoke device', 'Close', {
                duration: 3000,
              });
            },
          });
      }
    });
  }
}
