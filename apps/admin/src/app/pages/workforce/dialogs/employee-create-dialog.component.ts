import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  EmployeeService,
  CreateEmployeeResult,
} from '../../../core/services/employee.service';
import { RbacService, Role } from '../../../core/services/rbac.service';

/**
 * Creates an employee and, when a role is chosen, provisions a login account
 * with a temporary password shown once. The admin can then email the invite
 * (workspace id + credentials) to the employee.
 */
@Component({
  selector: 'app-employee-create-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    ReactiveFormsModule,
    MatIconModule,
  ],
  template: `
    <div class="premium-dialog">
      <div class="glow-effect glow-purple"></div>
      <div class="glow-effect glow-blue"></div>

      <div class="dialog-header">
        <div class="header-content">
          <div class="icon-container">
            <mat-icon class="header-icon">person_add</mat-icon>
          </div>
          <div>
            <h2 class="dialog-title">New Employee</h2>
            <p class="dialog-subtitle">
              Add a team member and optionally give them portal access
            </p>
          </div>
        </div>
      </div>

      <!-- Step 1: form -->
      @if (!created()) {
        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="dialog-content">
            <div class="grid-2">
              <div class="input-group">
                <label>Employee Code *</label>
                <input formControlName="employeeCode" placeholder="EMP-0001" />
              </div>
              <div class="input-group">
                <label>Employment Type</label>
                <select formControlName="employmentType">
                  <option value="">—</option>
                  <option value="Permanent Full-time">
                    Permanent Full-time
                  </option>
                  <option value="Contract">Contract</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Intern">Intern</option>
                </select>
              </div>
              <div class="input-group">
                <label>First Name *</label>
                <input formControlName="firstName" placeholder="Sarah" />
              </div>
              <div class="input-group">
                <label>Last Name *</label>
                <input formControlName="lastName" placeholder="Connor" />
              </div>
              <div class="input-group">
                <label>Email</label>
                <input
                  formControlName="primaryEmail"
                  type="email"
                  placeholder="sarah@company.com"
                />
              </div>
              <div class="input-group">
                <label>Mobile</label>
                <input formControlName="primaryMobile" placeholder="+1..." />
              </div>
              <div class="input-group">
                <label>Joining Date</label>
                <input formControlName="joiningDate" type="date" />
              </div>
              <div class="input-group">
                <label>Role (grants login access)</label>
                <select formControlName="roleId">
                  <option value="">No login account</option>
                  @for (role of roles(); track role.id) {
                    <option [value]="role.id">{{ role.name }}</option>
                  }
                </select>
              </div>
            </div>

            @if (form.get('roleId')?.value && !form.get('primaryEmail')?.value) {
              <p class="hint warn">
                <mat-icon>info</mat-icon> An email is required to create a login
                account.
              </p>
            }
          </div>

          <div class="dialog-actions">
            <button type="button" mat-dialog-close class="btn-cancel">
              Cancel
            </button>
            <button
              type="submit"
              [disabled]="form.invalid || saving()"
              class="btn-confirm"
            >
              <span>{{ saving() ? 'Creating…' : 'Create Employee' }}</span>
              <mat-icon>arrow_forward</mat-icon>
            </button>
          </div>
        </form>
      }

      <!-- Step 2: result / temp password -->
      @if (created(); as emp) {
        <div class="dialog-content">
          <div class="success-banner">
            <mat-icon>check_circle</mat-icon>
            <span>Employee <strong>{{ emp.firstName }} {{ emp.lastName }}</strong>
              created.</span>
          </div>

          @if (emp.tempPassword) {
            <div class="cred-panel">
              <label>Temporary Password (shown once)</label>
              <div class="cred-row">
                <code>{{ emp.tempPassword }}</code>
                <button
                  type="button"
                  class="btn-copy"
                  (click)="copy(emp.tempPassword!)"
                >
                  <mat-icon>content_copy</mat-icon>
                </button>
              </div>
              <p class="hint">
                Save this now — it cannot be retrieved later. Or email the
                invite below.
              </p>
            </div>
          } @else {
            <p class="hint">
              No login account was created (no role selected).
            </p>
          }
        </div>

        <div class="dialog-actions">
          <button type="button" class="btn-cancel" (click)="close()">
            Done
          </button>
          @if (emp.tempPassword) {
            <button
              type="button"
              [disabled]="inviting()"
              class="btn-confirm"
              (click)="sendInvite(emp.id)"
            >
              <span>{{ inviting() ? 'Sending…' : 'Send Invite Email' }}</span>
              <mat-icon>mail</mat-icon>
            </button>
          }
        </div>
      }
    </div>
  `,
  styleUrls: ['./create-dialog.shared.scss'],
})
export class EmployeeCreateDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private employeeService = inject(EmployeeService);
  private rbacService = inject(RbacService);
  private snack = inject(MatSnackBar);
  private dialogRef = inject(
    MatDialogRef<EmployeeCreateDialogComponent>,
  );

  roles = signal<Role[]>([]);
  saving = signal(false);
  inviting = signal(false);
  created = signal<CreateEmployeeResult | null>(null);

  form = this.fb.group({
    employeeCode: ['', Validators.required],
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    primaryEmail: ['', Validators.email],
    primaryMobile: [''],
    joiningDate: [''],
    employmentType: [''],
    roleId: [''],
  });

  ngOnInit() {
    this.rbacService.findAllRoles().subscribe({
      next: (roles) => this.roles.set(roles),
      error: () => this.roles.set([]),
    });
  }

  onSubmit() {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    if (v.roleId && !v.primaryEmail) {
      this.snack.open('Email is required to create a login account', 'Close', {
        duration: 4000,
      });
      return;
    }
    this.saving.set(true);
    this.employeeService
      .create({
        employeeCode: v.employeeCode!,
        firstName: v.firstName!,
        lastName: v.lastName!,
        primaryEmail: v.primaryEmail || undefined,
        primaryMobile: v.primaryMobile || undefined,
        joiningDate: v.joiningDate || undefined,
        employmentType: v.employmentType || undefined,
        roleId: v.roleId || undefined,
      })
      .subscribe({
        next: (res) => {
          this.saving.set(false);
          this.created.set(res);
        },
        error: (err) => {
          this.saving.set(false);
          this.snack.open(
            err?.error?.message || 'Failed to create employee',
            'Close',
            { duration: 5000 },
          );
        },
      });
  }

  sendInvite(id: string) {
    this.inviting.set(true);
    this.employeeService.invite(id).subscribe({
      next: (res) => {
        this.inviting.set(false);
        this.snack.open(`Invite sent to ${res.email}`, 'Close', {
          duration: 4000,
        });
      },
      error: (err) => {
        this.inviting.set(false);
        this.snack.open(
          err?.error?.message || 'Failed to send invite',
          'Close',
          { duration: 5000 },
        );
      },
    });
  }

  copy(text: string) {
    navigator.clipboard?.writeText(text);
    this.snack.open('Copied to clipboard', 'Close', { duration: 2000 });
  }

  close() {
    this.dialogRef.close(true);
  }
}
