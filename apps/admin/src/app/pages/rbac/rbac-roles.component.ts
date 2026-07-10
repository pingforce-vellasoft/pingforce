import { Component, OnInit, inject } from '@angular/core';

import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RbacService, Role } from '../../core/services/rbac.service';
import { RbacPermissionsDialogComponent } from './rbac-permissions-dialog.component';
import { RbacCreateRoleDialogComponent } from './rbac-create-role-dialog.component';
import { ConfirmDialogComponent } from '../../core/components/confirm-dialog.component';

@Component({
  selector: 'app-rbac-roles',
  standalone: true,
  imports: [
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h2 class="page-title">Roles & Permissions</h2>
        <p class="page-subtitle">
          Manage access control roles and configure fine-grained permissions.
        </p>
      </div>

      <div class="actions-bar">
        <button
          mat-flat-button
          color="primary"
          class="create-btn"
          (click)="openCreateRoleDialog()"
        >
          <mat-icon>add</mat-icon> Create Role
        </button>
      </div>

      <div class="table-container">
        <table mat-table [dataSource]="dataSource" class="premium-table">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Name</th>
            <td mat-cell *matCellDef="let element" class="fw-medium">
              {{ element.name }}
            </td>
          </ng-container>

          <ng-container matColumnDef="code">
            <th mat-header-cell *matHeaderCellDef>Code</th>
            <td mat-cell *matCellDef="let element">
              <span class="code-badge">{{ element.code }}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="system">
            <th mat-header-cell *matHeaderCellDef>Type</th>
            <td mat-cell *matCellDef="let element">
              <span
                class="status-badge"
                [class.system]="element.isSystem"
                [class.custom]="!element.isSystem"
              >
                {{ element.isSystem ? 'System' : 'Custom' }}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef class="action-cell">
              Actions
            </th>
            <td mat-cell *matCellDef="let element" class="action-cell">
              <div class="actions-wrapper">
                @if (!element.isSystem) {
                  <button
                    mat-icon-button
                    class="action-btn"
                    (click)="editRole(element)"
                    title="Edit Role"
                  >
                    <mat-icon>edit</mat-icon>
                  </button>
                }
                <button
                  mat-icon-button
                  class="action-btn"
                  (click)="openPermissionsDialog(element)"
                  title="Manage Permissions"
                >
                  <mat-icon>security</mat-icon>
                </button>
                @if (!element.isSystem) {
                  <button
                    mat-icon-button
                    class="action-btn delete-btn"
                    (click)="deleteRole(element)"
                    title="Delete Role"
                  >
                    <mat-icon>delete</mat-icon>
                  </button>
                }
              </div>
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
            <mat-icon>shield</mat-icon>
            <p>No roles found.</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .page-container {
        padding: 32px 40px;
        max-width: 1400px;
        margin: 0 auto;
      }
      .page-header {
        margin-bottom: 24px;
      }
      .page-title {
        font-size: 28px;
        font-weight: 700;
        margin: 0 0 8px 0;
        color: var(--text-primary);
        letter-spacing: -0.5px;
      }
      .page-subtitle {
        font-size: 15px;
        color: var(--text-secondary);
        margin: 0;
      }
      .actions-bar {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 24px;
      }
      .create-btn {
        height: 44px;
        padding: 0 24px !important;
        border-radius: 8px !important;
        font-weight: 600 !important;
        letter-spacing: 0.3px !important;
      }
      .table-container {
        background: var(--bg-surface);
        border-radius: 16px;
        border: 1px solid var(--border-subtle);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        overflow: hidden;
      }
      .premium-table {
        width: 100%;
        background: transparent;
      }
      ::ng-deep .premium-table .mat-mdc-header-cell {
        color: var(--text-secondary);
        font-size: 13px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        border-bottom: 1px solid var(--border-subtle);
        background: rgba(0, 0, 0, 0.2);
        padding: 16px 24px;
      }
      ::ng-deep .premium-table .mat-mdc-cell {
        color: var(--text-primary);
        font-size: 14px;
        border-bottom: 1px solid var(--border-subtle);
        padding: 16px 24px;
      }
      .premium-row {
        transition: background 0.2s ease;
      }
      .premium-row:hover {
        background: rgba(255, 255, 255, 0.02);
      }
      .fw-medium {
        font-weight: 500;
      }
      .code-badge {
        background: rgba(255, 255, 255, 0.1);
        padding: 4px 10px;
        border-radius: 6px;
        font-family: monospace;
        font-size: 13px;
        color: var(--text-secondary);
      }
      .status-badge {
        display: inline-flex;
        align-items: center;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .status-badge.system {
        background: rgba(99, 102, 241, 0.15);
        color: #818cf8;
        border: 1px solid rgba(99, 102, 241, 0.3);
      }
      .status-badge.custom {
        background: rgba(16, 185, 129, 0.15);
        color: #34d399;
        border: 1px solid rgba(16, 185, 129, 0.3);
      }
      .action-cell {
        text-align: right;
        width: 120px;
      }
      .actions-wrapper {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: 4px;
      }
      .action-btn {
        color: var(--text-secondary) !important;
        transition:
          color 0.2s ease,
          background 0.2s ease;
      }
      .action-btn:hover {
        color: #818cf8 !important;
        background: rgba(99, 102, 241, 0.1) !important;
      }
      .delete-btn:hover {
        color: #ef4444 !important;
        background: rgba(239, 68, 68, 0.1) !important;
      }
      .empty-state {
        padding: 64px 24px;
        text-align: center;
        color: var(--text-secondary);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
      }
      .empty-state mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: var(--border-subtle);
      }
    `,
  ],
})
export class RbacRolesComponent implements OnInit {
  private rbacService = inject(RbacService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  displayedColumns: string[] = ['name', 'code', 'system', 'actions'];
  dataSource: Role[] = [];

  ngOnInit() {
    this.loadRoles();
  }

  loadRoles() {
    this.rbacService.findAllRoles().subscribe({
      next: (data) => {
        this.dataSource = data;
      },
      error: (err) => console.error('Failed to load roles', err),
    });
  }

  openCreateRoleDialog() {
    const dialogRef = this.dialog.open(RbacCreateRoleDialogComponent, {
      width: '500px',
      panelClass: 'premium-dialog',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadRoles();
      }
    });
  }

  editRole(role: Role) {
    const dialogRef = this.dialog.open(RbacCreateRoleDialogComponent, {
      width: '500px',
      panelClass: 'premium-dialog',
      data: { role },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadRoles();
      }
    });
  }

  openPermissionsDialog(role: Role) {
    const dialogRef = this.dialog.open(RbacPermissionsDialogComponent, {
      width: '600px',
      panelClass: 'premium-dialog',
      data: { role },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadRoles(); // Reload roles to get updated permissions count/state
      }
    });
  }

  deleteRole(role: Role) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '450px',
      panelClass: 'premium-dialog',
      data: {
        title: 'Delete Role',
        message: `Are you sure you want to delete the role <strong>${role.name}</strong>?<br><br><span style="color: var(--text-secondary)">This action cannot be undone and will permanently remove this role.</span>`,
        confirmText: 'Delete Role',
        cancelText: 'Keep Role',
        color: 'warn',
        icon: 'delete_forever',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.rbacService.deleteRole(role.id).subscribe({
          next: () => {
            this.snackBar.open('Role deleted successfully', 'Close', {
              duration: 3000,
            });
            this.loadRoles();
          },
          error: (err) => {
            console.error('Failed to delete role', err);
            const msg = err.error?.message || 'Failed to delete role';
            this.snackBar.open(msg, 'Close', { duration: 5000 });
          },
        });
      }
    });
  }
}
