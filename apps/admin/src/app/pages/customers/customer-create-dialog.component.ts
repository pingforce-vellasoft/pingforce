import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  CustomerService,
  Customer,
} from '../../core/services/customer.service';

/**
 * Creates a customer and optionally invites a portal contact via the existing
 * token-based customer-portal invite flow (no password — the contact activates
 * through the invite link).
 */
@Component({
  selector: 'app-customer-create-dialog',
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
            <mat-icon class="header-icon">apartment</mat-icon>
          </div>
          <div>
            <h2 class="dialog-title">New Customer</h2>
            <p class="dialog-subtitle">
              Onboard an account and optionally invite a portal contact
            </p>
          </div>
        </div>
      </div>

      <!-- Step 1: customer form -->
      @if (!created()) {
        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="dialog-content">
            <div class="grid-2">
              <div class="input-group">
                <label>Customer Code *</label>
                <input formControlName="customerCode" placeholder="CUST-0001" />
              </div>
              <div class="input-group">
                <label>Type</label>
                <select formControlName="customerType">
                  <option value="">—</option>
                  <option value="BUSINESS">Business</option>
                  <option value="INDIVIDUAL">Individual</option>
                  <option value="GOVERNMENT">Government</option>
                </select>
              </div>
              <div class="input-group">
                <label>Legal Name *</label>
                <input
                  formControlName="legalName"
                  placeholder="Acme Corp Ltd"
                />
              </div>
              <div class="input-group">
                <label>Display Name</label>
                <input formControlName="displayName" placeholder="Acme" />
              </div>
              <div class="input-group">
                <label>Email</label>
                <input
                  formControlName="primaryEmail"
                  type="email"
                  placeholder="ops@acme.com"
                />
              </div>
              <div class="input-group">
                <label>Mobile</label>
                <input formControlName="primaryMobile" placeholder="+1..." />
              </div>
              <div class="input-group">
                <label>Industry</label>
                <input formControlName="industry" placeholder="Telecom" />
              </div>
              <div class="input-group">
                <label>Status</label>
                <select formControlName="status">
                  <option value="ACTIVE">Active</option>
                  <option value="PROSPECT">Prospect</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>
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
              <span>{{ saving() ? 'Creating…' : 'Create Customer' }}</span>
              <mat-icon>arrow_forward</mat-icon>
            </button>
          </div>
        </form>
      }

      <!-- Step 2: created + optional portal invite -->
      @if (created(); as cust) {
        <div class="dialog-content">
          <div class="success-banner">
            <mat-icon>check_circle</mat-icon>
            <span>Customer <strong>{{ cust.legalName }}</strong> created.</span>
          </div>

          <div class="cred-panel">
            <label>Invite a portal contact (optional)</label>
            <form [formGroup]="inviteForm" class="grid-2" style="margin-top:8px">
              <div class="input-group">
                <label>First Name</label>
                <input formControlName="firstName" placeholder="Jane" />
              </div>
              <div class="input-group">
                <label>Last Name</label>
                <input formControlName="lastName" placeholder="Doe" />
              </div>
              <div class="input-group">
                <label>Email</label>
                <input
                  formControlName="email"
                  type="email"
                  placeholder="jane@acme.com"
                />
              </div>
              <div class="input-group">
                <label>Portal Role</label>
                <select formControlName="portalRole">
                  <option value="OWNER">Owner</option>
                  <option value="MEMBER">Member</option>
                  <option value="VIEWER">Viewer</option>
                </select>
              </div>
            </form>
            <p class="hint">
              The contact receives an activation link (valid 7 days). No password
              is set.
            </p>
          </div>
        </div>

        <div class="dialog-actions">
          <button type="button" class="btn-cancel" (click)="close()">
            Done
          </button>
          <button
            type="button"
            [disabled]="inviting() || !canInvite()"
            class="btn-confirm"
            (click)="sendInvite(cust.id)"
          >
            <span>{{ inviting() ? 'Sending…' : 'Send Portal Invite' }}</span>
            <mat-icon>mail</mat-icon>
          </button>
        </div>
      }
    </div>
  `,
  styleUrls: ['../workforce/dialogs/create-dialog.shared.scss'],
})
export class CustomerCreateDialogComponent {
  private fb = inject(FormBuilder);
  private customerService = inject(CustomerService);
  private snack = inject(MatSnackBar);
  private dialogRef = inject(
    MatDialogRef<CustomerCreateDialogComponent>,
  );

  saving = signal(false);
  inviting = signal(false);
  created = signal<Customer | null>(null);

  form = this.fb.group({
    customerCode: ['', Validators.required],
    legalName: ['', Validators.required],
    displayName: [''],
    customerType: [''],
    primaryEmail: ['', Validators.email],
    primaryMobile: [''],
    industry: [''],
    status: ['ACTIVE'],
  });

  inviteForm = this.fb.group({
    firstName: [''],
    lastName: [''],
    email: ['', Validators.email],
    portalRole: ['OWNER'],
  });

  canInvite(): boolean {
    const v = this.inviteForm.getRawValue();
    return !!v.firstName && !!v.email && this.inviteForm.valid;
  }

  onSubmit() {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.customerService
      .create({
        customerCode: v.customerCode!,
        legalName: v.legalName!,
        displayName: v.displayName || undefined,
        customerType: v.customerType || undefined,
        primaryEmail: v.primaryEmail || undefined,
        primaryMobile: v.primaryMobile || undefined,
        industry: v.industry || undefined,
        status: v.status || undefined,
      })
      .subscribe({
        next: (res) => {
          this.saving.set(false);
          this.created.set(res);
          // Prefill invite email from the customer's primary email.
          if (v.primaryEmail) {
            this.inviteForm.patchValue({ email: v.primaryEmail });
          }
        },
        error: (err) => {
          this.saving.set(false);
          this.snack.open(
            err?.error?.message || 'Failed to create customer',
            'Close',
            { duration: 5000 },
          );
        },
      });
  }

  sendInvite(customerId: string) {
    if (!this.canInvite()) return;
    const v = this.inviteForm.getRawValue();
    this.inviting.set(true);
    this.customerService
      .invitePortal(customerId, {
        firstName: v.firstName!,
        lastName: v.lastName || undefined,
        email: v.email!,
        portalRole: v.portalRole || undefined,
      })
      .subscribe({
        next: () => {
          this.inviting.set(false);
          this.snack.open(`Portal invite sent to ${v.email}`, 'Close', {
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

  close() {
    this.dialogRef.close(true);
  }
}
