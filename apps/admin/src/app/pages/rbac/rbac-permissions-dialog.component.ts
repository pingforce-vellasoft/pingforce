import { Component, Inject, OnInit, inject, ChangeDetectorRef } from '@angular/core';

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { RbacService, Role, Permission } from '../../core/services/rbac.service';
import { FormsModule } from '@angular/forms';
import { MatListModule } from '@angular/material/list';

export interface PermissionsDialogData {
  role: Role;
}

@Component({
  selector: 'app-rbac-permissions-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatListModule,
    MatIconModule,
    FormsModule
],
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <h2 mat-dialog-title>Manage Permissions</h2>
        <p class="dialog-subtitle">Configure access rights for the <strong>{{ data.role.name }}</strong> role.</p>
      </div>
    
      <mat-dialog-content>
        @if (isLoading) {
          <div class="loading-state">
            <mat-icon class="spinner">refresh</mat-icon>
            <p>Loading permissions...</p>
          </div>
        }
    
        @if (!isLoading && allPermissions.length === 0) {
          <div class="empty-state">
            <mat-icon class="empty-icon">security</mat-icon>
            <p>No permissions found in the database.</p>
          </div>
        }
    
        @if (!isLoading && permissionGroups.length > 0) {
          <div class="groups-container">
            @for (group of permissionGroups; track group) {
              <div class="module-group">
                <div class="module-header">
                  <div class="module-title">
                    <mat-icon class="module-icon">layers</mat-icon>
                    <h3>{{ group.module }}</h3>
                  </div>
                  <button mat-button class="toggle-all-btn" (click)="toggleGroup(group)">
                    {{ isGroupFullySelected(group) ? 'Deselect All' : 'Select All' }}
                  </button>
                </div>
                <div class="permissions-list">
                  @for (perm of group.permissions; track perm) {
                    <div class="permission-item" (click)="togglePermission(perm.id, !isPermissionSelected(perm.id))">
                      <div class="perm-details">
                        <span class="action-text">{{ perm.action }}</span>
                        <p class="perm-desc">{{ perm.description }}</p>
                      </div>
                      <div class="perm-action">
                        <div class="premium-switch" [class.active]="isPermissionSelected(perm.id)">
                          <div class="premium-switch-thumb"></div>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        }
      </mat-dialog-content>
    
      <mat-dialog-actions align="end">
        <button mat-button mat-dialog-close>Cancel</button>
        <button mat-flat-button color="primary" class="save-btn" [disabled]="isSaving" (click)="onSave()">
          @if (!isSaving) {
            <mat-icon>save</mat-icon>
          }
          @if (isSaving) {
            <mat-icon class="spinner">refresh</mat-icon>
          }
          {{ isSaving ? 'Saving...' : 'Save Permissions' }}
        </button>
      </mat-dialog-actions>
    </div>
    `,
  styles: [`
    .dialog-container {
      background: var(--bg-surface);
      color: var(--text-primary);
      display: flex;
      flex-direction: column;
      max-height: 80vh;
    }
    .dialog-header {
      padding: 24px 24px 16px 24px;
      border-bottom: 1px solid var(--border-subtle);
    }
    h2[mat-dialog-title] {
      margin: 0;
      padding: 0;
      font-size: 20px;
      font-weight: 600;
      color: var(--text-primary);
    }
    .dialog-subtitle {
      font-size: 14px;
      color: var(--text-secondary);
      margin: 8px 0 0 0;
    }
    .dialog-subtitle strong {
      color: #818cf8;
    }
    mat-dialog-content {
      padding: 0 !important;
      margin: 0;
      overflow-y: auto;
    }
    .loading-state, .empty-state {
      padding: 48px;
      text-align: center;
      color: var(--text-secondary);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }
    .empty-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      opacity: 0.5;
    }
    .groups-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
      padding: 24px;
    }
    .module-group {
      background: rgba(0, 0, 0, 0.15);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      overflow: hidden;
    }
    .module-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      background: rgba(255, 255, 255, 0.03);
      border-bottom: 1px solid var(--border-subtle);
    }
    .module-title {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .module-icon {
      color: #818cf8;
    }
    .module-title h3 {
      margin: 0;
      font-size: 15px;
      font-weight: 600;
      color: var(--text-primary);
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .toggle-all-btn {
      font-size: 12px !important;
      font-weight: 600 !important;
      color: #818cf8 !important;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .permissions-list {
      display: flex;
      flex-direction: column;
    }
    .permission-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      cursor: pointer;
      transition: background 0.2s ease;
    }
    .permission-item:hover {
      background: rgba(255, 255, 255, 0.02);
    }
    .permission-item:last-child {
      border-bottom: none;
    }
    .action-text {
      display: inline-block;
      font-weight: 600;
      font-size: 14px;
      color: var(--text-primary);
      margin-bottom: 4px;
      background: rgba(99, 102, 241, 0.15);
      color: #818cf8;
      border: 1px solid rgba(99, 102, 241, 0.3);
      padding: 2px 8px;
      border-radius: 4px;
      letter-spacing: 0.5px;
    }
    .perm-desc {
      margin: 0;
      font-size: 13px;
      color: var(--text-secondary);
      line-height: 1.4;
    }
    
    /* Premium Switch Styles */
    .premium-switch {
      width: 44px;
      height: 24px;
      border-radius: 30px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.1);
      position: relative;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .premium-switch.active {
      background: #6366f1;
      border-color: #6366f1;
      box-shadow: 0 0 8px rgba(99, 102, 241, 0.4);
    }
    .premium-switch-thumb {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #ffffff;
      position: absolute;
      top: 2px;
      left: 2px;
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .premium-switch.active .premium-switch-thumb {
      transform: translateX(20px);
    }
    
    mat-dialog-actions {
      padding: 16px 24px;
      border-top: 1px solid var(--border-subtle);
      margin: 0;
    }
    .save-btn {
      padding: 0 24px !important;
      border-radius: 8px !important;
      font-weight: 600 !important;
    }
    .spinner {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      100% { transform: rotate(360deg); }
    }
  `]
})
export class RbacPermissionsDialogComponent implements OnInit {
  private rbacService = inject(RbacService);
  private cdr = inject(ChangeDetectorRef);

  allPermissions: Permission[] = [];
  permissionGroups: { module: string, permissions: Permission[] }[] = [];
  selectedPermissionIds = new Set<string>();
  isLoading = true;
  isSaving = false;

  constructor(
    public dialogRef: MatDialogRef<RbacPermissionsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PermissionsDialogData
  ) {}

  ngOnInit() {
    // Initialize selected permissions from the role
    if (this.data.role.permissions) {
      this.data.role.permissions.forEach(rp => {
        if (rp.permissionId) {
          this.selectedPermissionIds.add(rp.permissionId);
        }
      });
    }

    this.rbacService.findAllPermissions().subscribe({
      next: (perms) => {
        this.allPermissions = perms;
        
        // Group permissions by module
        const groups = new Map<string, Permission[]>();
        for (const p of perms) {
          if (!groups.has(p.module)) groups.set(p.module, []);
          groups.get(p.module)!.push(p);
        }
        
        this.permissionGroups = Array.from(groups.entries()).map(([module, permissions]) => ({
          module,
          permissions
        }));

        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load permissions', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  isGroupFullySelected(group: { permissions: Permission[] }): boolean {
    return group.permissions.every(p => this.selectedPermissionIds.has(p.id));
  }

  toggleGroup(group: { permissions: Permission[] }) {
    const fullySelected = this.isGroupFullySelected(group);
    if (fullySelected) {
      group.permissions.forEach(p => this.selectedPermissionIds.delete(p.id));
    } else {
      group.permissions.forEach(p => this.selectedPermissionIds.add(p.id));
    }
  }

  isPermissionSelected(id: string): boolean {
    return this.selectedPermissionIds.has(id);
  }

  togglePermission(id: string, checked: boolean) {
    if (checked) {
      this.selectedPermissionIds.add(id);
    } else {
      this.selectedPermissionIds.delete(id);
    }
  }

  onSave() {
    this.isSaving = true;
    const permissionIds = Array.from(this.selectedPermissionIds);
    
    this.rbacService.updateRolePermissions(this.data.role.id, permissionIds).subscribe({
      next: (updatedRole) => {
        this.dialogRef.close(updatedRole);
      },
      error: (err) => {
        console.error('Save failed', err);
        this.isSaving = false;
      }
    });
  }
}
