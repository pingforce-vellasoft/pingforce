import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import {
  EmployeeService,
  Employee,
} from '../../core/services/employee.service';
import { EmployeeCreateDialogComponent } from './dialogs/employee-create-dialog.component';
import { ConfirmDialogComponent } from '../../core/components/confirm-dialog.component';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
  ],
  template: `
    <div class="page">
      <div class="header">
        <h1>Employees</h1>
        <button mat-flat-button color="primary" (click)="openCreate()">
          <mat-icon>add</mat-icon> New Employee
        </button>
      </div>

      <div class="table-wrap mat-elevation-z2">
        <table mat-table [dataSource]="employees()">
          <ng-container matColumnDef="code">
            <th mat-header-cell *matHeaderCellDef>Code</th>
            <td mat-cell *matCellDef="let e">{{ e.employeeCode }}</td>
          </ng-container>
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Name</th>
            <td mat-cell *matCellDef="let e">
              {{ e.firstName }} {{ e.lastName }}
            </td>
          </ng-container>
          <ng-container matColumnDef="email">
            <th mat-header-cell *matHeaderCellDef>Email</th>
            <td mat-cell *matCellDef="let e">{{ e.primaryEmail || '—' }}</td>
          </ng-container>
          <ng-container matColumnDef="login">
            <th mat-header-cell *matHeaderCellDef>Login</th>
            <td mat-cell *matCellDef="let e">
              {{ e.userId ? 'Yes' : 'No' }}
            </td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef class="right">Actions</th>
            <td mat-cell *matCellDef="let e" class="right">
              <button mat-icon-button title="View details" (click)="view(e)">
                <mat-icon>visibility</mat-icon>
              </button>
              <button mat-icon-button title="Edit" (click)="edit(e)">
                <mat-icon>edit</mat-icon>
              </button>
              @if (e.userId) {
                <button
                  mat-icon-button
                  color="primary"
                  title="Send invite"
                  (click)="invite(e)"
                >
                  <mat-icon>mail</mat-icon>
                </button>
              }
              <button
                mat-icon-button
                title="Delete"
                (click)="remove(e)"
                class="danger"
              >
                <mat-icon>delete</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols"></tr>
        </table>

        @if (employees().length === 0) {
          <div class="empty">No employees yet.</div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .page {
        padding: 24px;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
      }
      .header h1 {
        margin: 0;
        font-size: 24px;
        font-weight: 600;
      }
      .table-wrap {
        border-radius: 8px;
        overflow: hidden;
      }
      table {
        width: 100%;
      }
      .right {
        text-align: right;
      }
      .empty {
        padding: 48px;
        text-align: center;
        color: var(--text-secondary);
      }
      .danger:hover {
        color: var(--status-danger);
      }
    `,
  ],
})
export class EmployeesComponent implements OnInit {
  private employeeService = inject(EmployeeService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  private router = inject(Router);

  employees = signal<Employee[]>([]);
  cols = ['code', 'name', 'email', 'login', 'actions'];

  ngOnInit() {
    this.load();
  }

  load() {
    this.employeeService.findAll().subscribe({
      next: (data) => this.employees.set(data),
      error: () => this.employees.set([]),
    });
  }

  openCreate() {
    const ref = this.dialog.open(EmployeeCreateDialogComponent, {
      panelClass: 'premium-dialog-panel',
    });
    ref.afterClosed().subscribe((changed) => {
      if (changed) this.load();
    });
  }

  view(e: Employee) {
    this.router.navigate(['/workforce/employee', e.id]);
  }

  edit(e: Employee) {
    const ref = this.dialog.open(EmployeeCreateDialogComponent, {
      panelClass: 'premium-dialog-panel',
      data: { employee: e },
    });
    ref.afterClosed().subscribe((changed) => {
      if (changed) this.load();
    });
  }

  remove(e: Employee) {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete Employee',
        message: `Delete <strong>${e.firstName} ${e.lastName}</strong>? This can be restored by an administrator.`,
        confirmText: 'Delete',
        color: 'warn',
        icon: 'delete',
      },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.employeeService.remove(e.id).subscribe({
        next: () => {
          this.snack.open('Employee deleted', 'Close', { duration: 3000 });
          this.load();
        },
        error: (err) =>
          this.snack.open(
            err?.error?.message || 'Failed to delete employee',
            'Close',
            { duration: 5000 },
          ),
      });
    });
  }

  invite(e: Employee) {
    this.employeeService.invite(e.id).subscribe({
      next: (res) =>
        this.snack.open(`Invite sent to ${res.email}`, 'Close', {
          duration: 4000,
        }),
      error: (err) =>
        this.snack.open(
          err?.error?.message || 'Failed to send invite',
          'Close',
          { duration: 5000 },
        ),
    });
  }
}
