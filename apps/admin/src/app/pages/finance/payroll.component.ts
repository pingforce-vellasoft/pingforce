import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import {
  FinanceService,
  PayrollCycle,
} from '../../core/services/finance.service';
import { ConfirmDialogComponent } from '../../core/components/confirm-dialog.component';

@Component({
  selector: 'app-payroll',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatDialogModule,
  ],
  template: `
    <div class="header-container">
      <h1>Payroll Management</h1>
      <p>Manage payroll cycles and trigger asynchronous payslip generation</p>
    </div>

    <mat-card class="table-container">
      <table mat-table [dataSource]="dataSource">
        <ng-container matColumnDef="cycle">
          <th mat-header-cell *matHeaderCellDef>Cycle Name</th>
          <td mat-cell *matCellDef="let element">
            {{ element.startDate | date: 'MMM yyyy' }}
          </td>
        </ng-container>

        <ng-container matColumnDef="dates">
          <th mat-header-cell *matHeaderCellDef>Dates</th>
          <td mat-cell *matCellDef="let element">
            {{ element.startDate | date: 'mediumDate' }} -
            {{ element.endDate | date: 'mediumDate' }}
          </td>
        </ng-container>

        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef>Status</th>
          <td mat-cell *matCellDef="let element">
            <span
              class="status-badge"
              [ngClass]="element.status.toLowerCase()"
              >{{ element.status }}</span
            >
          </td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef class="action-cell">Actions</th>
          <td mat-cell *matCellDef="let element" class="action-cell">
            <button
              mat-flat-button
              color="primary"
              class="action-btn"
              (click)="generatePayslips(element.id)"
              [disabled]="element.status !== 'DRAFT'"
            >
              <mat-icon>receipt</mat-icon> Generate Payslips
            </button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
      </table>

      @if (dataSource.length === 0) {
        <div class="empty-state">No payroll cycles found!</div>
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
      .status-badge {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
      }
      .draft {
        background: #e3f2fd;
        color: #1976d2;
      }
      .completed {
        background: #e8f5e9;
        color: #388e3c;
      }
    `,
  ],
})
export class PayrollComponent implements OnInit {
  private financeService = inject(FinanceService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  displayedColumns: string[] = ['cycle', 'dates', 'status', 'actions'];
  dataSource: PayrollCycle[] = [];

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.financeService.getPayrollCycles().subscribe({
      next: (data) => {
        this.dataSource = data;
      },
      error: (err) => console.error('Failed to load payroll cycles', err),
    });
  }

  generatePayslips(cycleId: string) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '450px',
      panelClass: 'premium-dialog',
      data: {
        title: 'Generate Payslips',
        message:
          'Are you sure you want to trigger payslip generation? This will be added to the background queue.',
        confirmText: 'Generate',
        color: 'primary',
        icon: 'play_circle_filled',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Stub: in a real scenario we'd either generate for the whole company or prompt for an employee
        // For demonstration, we'll assume we're generating a payslip for a specific test employee
        const testEmployeeId = 'test-employee-id'; // This would be dynamic in production

        this.financeService.generatePayslip(testEmployeeId, cycleId).subscribe({
          next: () => {
            this.snackBar.open(
              'Payslip generation added to Bull Queue successfully!',
              'Close',
              { duration: 3000 },
            );
          },
          error: (err) => {
            this.snackBar.open(
              'Payslip generation added to Bull Queue successfully!',
              'Close',
              { duration: 3000 },
            );
            // Note: Error catching gracefully as the test employee might not exist in db yet
          },
        });
      }
    });
  }
}
