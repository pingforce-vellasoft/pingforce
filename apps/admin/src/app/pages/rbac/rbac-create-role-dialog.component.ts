import {
  Component,
  inject,
  OnInit,
  ChangeDetectorRef,
  Optional,
  Inject,
} from '@angular/core';

import {
  MatDialogRef,
  MatDialogModule,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RbacService, Permission } from '../../core/services/rbac.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-rbac-create-role-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    ReactiveFormsModule,
  ],
  template: `
    <div class="dialog-container">
      <h2 mat-dialog-title>
        {{ isEditMode ? 'Edit Role' : 'Create New Role' }}
      </h2>
      <mat-dialog-content>
        @if (!isEditMode) {
          <p class="dialog-subtitle">
            Define a new role to group specific platform permissions.
          </p>
        }
        @if (isEditMode) {
          <p class="dialog-subtitle">Update the basic details of this role.</p>
        }

        <form [formGroup]="form" class="role-form">
          <div class="form-group">
            <label>Role Name <span class="required">*</span></label>
            <input
              type="text"
              formControlName="name"
              class="premium-input"
              placeholder="e.g. Support Manager"
            />
          </div>

          <div class="form-group">
            <label>Role Code <span class="required">*</span></label>
            <input
              type="text"
              formControlName="code"
              class="premium-input"
              placeholder="e.g. SUPPORT_MANAGER"
            />
            <span class="hint-text"
              >Unique identifier for this role (uppercase, underscores).</span
            >
          </div>

          <div class="form-group">
            <label>Description</label>
            <textarea
              formControlName="description"
              class="premium-input"
              rows="3"
              placeholder="Briefly describe the purpose of this role..."
            ></textarea>
          </div>
        </form>

        @if (!isEditMode) {
          <div class="permissions-section-header">
            <h3>Initial Permissions</h3>
            <p>Select the baseline permissions for this new role.</p>
          </div>
        }

        @if (!isEditMode && isLoadingPermissions) {
          <div class="loading-state">
            <mat-icon class="spinner">refresh</mat-icon>
            <p>Loading permissions...</p>
          </div>
        }

        @if (
          !isEditMode && !isLoadingPermissions && allPermissions.length === 0
        ) {
          <div class="empty-state">
            <mat-icon class="empty-icon">security</mat-icon>
            <p>No permissions found in the database.</p>
          </div>
        }

        @if (
          !isEditMode && !isLoadingPermissions && permissionGroups.length > 0
        ) {
          <div class="groups-container">
            @for (group of permissionGroups; track group) {
              <div class="module-group">
                <div class="module-header">
                  <div class="module-title">
                    <mat-icon class="module-icon">layers</mat-icon>
                    <h3>{{ group.module }}</h3>
                  </div>
                  <button
                    mat-button
                    class="toggle-all-btn"
                    (click)="toggleGroup(group)"
                  >
                    {{
                      isGroupFullySelected(group)
                        ? 'Deselect All'
                        : 'Select All'
                    }}
                  </button>
                </div>
                <div class="permissions-list">
                  @for (perm of group.permissions; track perm) {
                    <div
                      class="permission-item"
                      (click)="
                        togglePermission(
                          perm.id,
                          !isPermissionSelected(perm.id)
                        )
                      "
                    >
                      <div class="perm-details">
                        <span class="action-text">{{ perm.action }}</span>
                        <p class="perm-desc">{{ perm.description }}</p>
                      </div>
                      <div class="perm-action">
                        <div
                          class="premium-switch"
                          [class.active]="isPermissionSelected(perm.id)"
                        >
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
        <button
          mat-flat-button
          color="primary"
          class="save-btn"
          [disabled]="form.invalid || isSaving"
          (click)="save()"
        >
          @if (!isSaving) {
            {{ isEditMode ? 'Save Changes' : 'Create Role' }}
          }
          @if (isSaving) {
            {{ isEditMode ? 'Saving...' : 'Creating...' }}
          }
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      .dialog-container {
        background: var(--bg-surface);
        color: var(--text-primary);
      }
      h2[mat-dialog-title] {
        margin: 0;
        padding: 24px 24px 8px 24px;
        font-size: 20px;
        font-weight: 600;
        color: var(--text-primary);
      }
      .dialog-subtitle {
        font-size: 14px;
        color: var(--text-secondary);
        margin-bottom: 24px;
      }
      .role-form {
        display: flex;
        flex-direction: column;
        gap: 20px;
        margin-top: 16px;
      }
      .form-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .form-group label {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-primary);
        letter-spacing: 0.3px;
      }
      .required {
        color: #ef4444;
      }
      .hint-text {
        font-size: 12px;
        color: var(--text-secondary);
        margin-top: 2px;
      }
      .premium-input {
        background: rgba(0, 0, 0, 0.2);
        border: 1px solid var(--border-subtle);
        border-radius: 8px;
        padding: 12px 16px;
        color: var(--text-primary);
        font-size: 14px;
        transition: all 0.2s ease;
        font-family: inherit;
      }
      .premium-input:focus {
        outline: none;
        border-color: #6366f1;
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
        background: rgba(0, 0, 0, 0.3);
      }
      .premium-input::placeholder {
        color: var(--text-tertiary);
      }
      textarea.premium-input {
        resize: vertical;
        min-height: 80px;
      }
      mat-dialog-content {
        min-width: 400px;
        padding: 0 24px;
      }
      mat-dialog-actions {
        padding: 16px 24px 24px 24px;
        margin-bottom: 0;
      }
      .save-btn {
        padding: 0 24px !important;
        border-radius: 8px !important;
        font-weight: 600 !important;
      }
      .permissions-section-header {
        margin-top: 32px;
        margin-bottom: 16px;
        padding-top: 24px;
        border-top: 1px solid var(--border-subtle);
      }
      .permissions-section-header h3 {
        font-size: 16px;
        font-weight: 600;
        color: var(--text-primary);
        margin: 0 0 4px 0;
      }
      .permissions-section-header p {
        font-size: 13px;
        color: var(--text-secondary);
        margin: 0;
      }
      .loading-state,
      .empty-state {
        padding: 32px;
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
        margin-top: 16px;
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
      .spinner {
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        100% {
          transform: rotate(360deg);
        }
      }
    `,
  ],
})
export class RbacCreateRoleDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private rbacService = inject(RbacService);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);
  public dialogRef = inject(MatDialogRef<RbacCreateRoleDialogComponent>);
  public data = inject(MAT_DIALOG_DATA, { optional: true });

  isSaving = false;
  isLoadingPermissions = true;
  isEditMode = false;
  allPermissions: Permission[] = [];
  permissionGroups: { module: string; permissions: Permission[] }[] = [];
  selectedPermissionIds = new Set<string>();

  form = this.fb.group({
    name: ['', Validators.required],
    code: ['', [Validators.required, Validators.pattern(/^[A-Z_]+$/)]],
    description: [''],
  });

  ngOnInit() {
    if (this.data && this.data.role) {
      this.isEditMode = true;
      this.form.patchValue({
        name: this.data.role.name,
        code: this.data.role.code,
        description: this.data.role.description,
      });
      this.form.get('code')?.disable(); // Code cannot be changed once created
    }

    if (!this.isEditMode) {
      this.rbacService.findAllPermissions().subscribe({
        next: (perms) => {
          this.allPermissions = perms;

          const groups = new Map<string, Permission[]>();
          for (const p of perms) {
            if (!groups.has(p.module)) groups.set(p.module, []);
            groups.get(p.module)!.push(p);
          }

          this.permissionGroups = Array.from(groups.entries()).map(
            ([module, permissions]) => ({
              module,
              permissions,
            }),
          );

          this.isLoadingPermissions = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to load permissions', err);
          this.isLoadingPermissions = false;
          this.cdr.detectChanges();
        },
      });
    }
  }

  isGroupFullySelected(group: { permissions: Permission[] }): boolean {
    return group.permissions.every((p) => this.selectedPermissionIds.has(p.id));
  }

  toggleGroup(group: { permissions: Permission[] }) {
    const fullySelected = this.isGroupFullySelected(group);
    if (fullySelected) {
      group.permissions.forEach((p) => this.selectedPermissionIds.delete(p.id));
    } else {
      group.permissions.forEach((p) => this.selectedPermissionIds.add(p.id));
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

  save() {
    if (this.form.invalid) return;
    this.isSaving = true;

    if (this.isEditMode) {
      this.rbacService
        .updateRole(this.data.role.id, {
          name: this.form.value.name!,
          description: this.form.value.description || '',
        })
        .subscribe({
          next: (role) => {
            this.snackBar.open('Role updated successfully', 'Close', {
              duration: 3000,
            });
            this.dialogRef.close(role);
          },
          error: (err) => {
            this.isSaving = false;
            console.error('Failed to update role', err);
            this.snackBar.open('Failed to update role', 'Close', {
              duration: 3000,
            });
            this.cdr.detectChanges();
          },
        });
    } else {
      const permissionIds = Array.from(this.selectedPermissionIds);

      this.rbacService
        .createRole({
          name: this.form.value.name!,
          code: this.form.value.code!,
          description: this.form.value.description || '',
          permissionIds: permissionIds.length > 0 ? permissionIds : undefined,
        })
        .subscribe({
          next: (role) => {
            this.snackBar.open('Role created successfully', 'Close', {
              duration: 3000,
            });
            this.dialogRef.close(role);
          },
          error: (err) => {
            this.isSaving = false;
            console.error('Failed to create role', err);
            this.snackBar.open('Failed to create role', 'Close', {
              duration: 3000,
            });
            this.cdr.detectChanges();
          },
        });
    }
  }
}
