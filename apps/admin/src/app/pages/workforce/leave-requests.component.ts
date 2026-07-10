import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { WorkforceService } from '../../core/services/workforce.service';
import { LeaveRequest } from '@pingforce-monorepo/dto';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../../core/components/confirm-dialog.component';

@Component({
  selector: 'app-leave-requests',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
  ],
  template: `
    <div class="header-container">
      <h1>Pending Leave Requests</h1>
      <p>Approve or reject employee leave applications</p>
    </div>

    <mat-card class="table-container">
      <table mat-table [dataSource]="dataSource">
        <ng-container matColumnDef="employee">
          <th mat-header-cell *matHeaderCellDef>Employee</th>
          <td mat-cell *matCellDef="let element">
            {{ element.employee?.user?.firstName }}
            {{ element.employee?.user?.lastName }}
          </td>
        </ng-container>

        <ng-container matColumnDef="leaveType">
          <th mat-header-cell *matHeaderCellDef>Leave Type</th>
          <td mat-cell *matCellDef="let element">
            {{ element.leaveType?.name || 'Standard Leave' }}
          </td>
        </ng-container>

        <ng-container matColumnDef="dates">
          <th mat-header-cell *matHeaderCellDef>Dates</th>
          <td mat-cell *matCellDef="let element">
            {{ element.startDate | date: 'mediumDate' }} -
            {{ element.endDate | date: 'mediumDate' }}
          </td>
        </ng-container>

        <ng-container matColumnDef="reason">
          <th mat-header-cell *matHeaderCellDef>Reason</th>
          <td mat-cell *matCellDef="let element">{{ element.reason }}</td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef class="action-cell">Actions</th>
          <td mat-cell *matCellDef="let element" class="action-cell">
            <button
              mat-flat-button
              color="primary"
              class="action-btn"
              (click)="approve(element.id)"
            >
              <mat-icon>check</mat-icon> Approve
            </button>
            <button
              mat-stroked-button
              color="warn"
              class="action-btn"
              (click)="reject(element.id)"
            >
              <mat-icon>close</mat-icon> Reject
            </button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
      </table>

      @if (dataSource.length === 0) {
        <div class="empty-state">No pending leave requests!</div>
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
        margin-bottom: 24px;
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
      .table-container {
        overflow: hidden;
        padding: 0;
      }
      table {
        width: 100%;
      }
      .action-cell {
        width: 250px;
        text-align: right;
      }
      .action-btn {
        margin-left: 8px;
      }
      .empty-state {
        padding: 48px;
        text-align: center;
        color: #757575;
        font-size: 16px;
      }
    `,
  ],
})
export class LeaveRequestsComponent implements OnInit {
  private workforceService = inject(WorkforceService);
  private dialog = inject(MatDialog);

  displayedColumns: string[] = [
    'employee',
    'leaveType',
    'dates',
    'reason',
    'actions',
  ];
  dataSource: LeaveRequest[] = [];

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.workforceService.getPendingLeaves().subscribe({
      next: (data) => {
        this.dataSource = data;
      },
      error: (err) => console.error('Failed to load pending leaves', err),
    });
  }

  approve(id: string) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '450px',
      panelClass: 'premium-dialog',
      data: {
        title: 'Approve Leave',
        message: 'Are you sure you want to approve this leave request?',
        confirmText: 'Approve',
        color: 'primary',
        icon: 'check_circle',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.workforceService.approveLeave(id).subscribe({
          next: () => this.loadData(),
          error: (err) => console.error('Approval failed', err),
        });
      }
    });
  }

  reject(id: string) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '450px',
      panelClass: 'premium-dialog',
      data: {
        title: 'Reject Leave',
        message: 'Are you sure you want to reject this leave request?',
        confirmText: 'Reject',
        color: 'warn',
        icon: 'cancel',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.workforceService.rejectLeave(id).subscribe({
          next: () => this.loadData(),
          error: (err) => console.error('Rejection failed', err),
        });
      }
    });
  }
}
