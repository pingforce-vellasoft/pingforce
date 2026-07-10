import { Component, inject } from '@angular/core';

import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-create-tenant',
  standalone: true,
  imports: [
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    FormsModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="header-left">
          <button
            mat-icon-button
            class="back-btn"
            routerLink="/dashboard/platform/tenants"
          >
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div>
            <h1 class="page-title">Create New Tenant</h1>
            <p class="page-subtitle">
              Onboard a new company to the PingForce platform
            </p>
          </div>
        </div>
      </div>

      <div class="content-grid">
        <mat-card class="form-card">
          <mat-card-content class="card-content">
            <div class="form-section">
              <h3 class="section-title">Required Information</h3>
              <div class="form-row">
                <div class="custom-field">
                  <label>Legal Name *</label>
                  <input
                    type="text"
                    [(ngModel)]="formData.name"
                    placeholder="e.g. Acme Corporation"
                  />
                </div>
                <div class="custom-field">
                  <label>Contact Phone *</label>
                  <input
                    type="text"
                    [(ngModel)]="formData.contactPhone"
                    placeholder="+1 555-0123"
                  />
                </div>
              </div>
              <div class="form-row mt-16">
                <div class="custom-field">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    [(ngModel)]="formData.contactEmail"
                    placeholder="admin@acme.com"
                  />
                </div>
                <div class="custom-field">
                  <label>Admin Password *</label>
                  <input
                    type="password"
                    [(ngModel)]="formData.adminPassword"
                    placeholder="Minimum 8 characters"
                  />
                </div>
              </div>
            </div>

            <div class="form-section">
              <h3 class="section-title">Optional Details</h3>
              <div class="form-row">
                <div class="custom-field">
                  <label>Industry</label>
                  <input
                    type="text"
                    [(ngModel)]="formData.industry"
                    placeholder="e.g. Technology"
                  />
                </div>
                <div class="custom-field">
                  <label>Country</label>
                  <input
                    type="text"
                    [(ngModel)]="formData.country"
                    placeholder="e.g. United States"
                  />
                </div>
              </div>
            </div>

            <div class="form-section">
              <h3 class="section-title">Module Provisioning</h3>
              <div
                class="module-card"
                [class.active]="formData.isAttendanceEnabled"
                (click)="
                  formData.isAttendanceEnabled = !formData.isAttendanceEnabled
                "
              >
                <div class="module-info">
                  <mat-icon class="module-icon">location_on</mat-icon>
                  <div class="module-text">
                    <span class="module-title">GPS & Biometric Attendance</span>
                    <span class="module-desc"
                      >Enable location-based check-ins and facial
                      recognition</span
                    >
                  </div>
                </div>
                <div
                  class="custom-toggle"
                  [class.active]="formData.isAttendanceEnabled"
                >
                  <div class="toggle-thumb">
                    @if (formData.isAttendanceEnabled) {
                      <mat-icon>check</mat-icon>
                    }
                  </div>
                </div>
              </div>

              @if (formData.isAttendanceEnabled) {
                <div class="form-row mt-24">
                  <div class="custom-field">
                    <label>Max Field Staff</label>
                    <input
                      type="number"
                      [(ngModel)]="formData.maxFieldStaff"
                      placeholder="Unlimited if empty"
                    />
                    <span class="hint"
                      >Leave empty for unlimited field staff</span
                    >
                  </div>
                </div>
              }
            </div>

            <div class="form-actions">
              <button
                mat-button
                class="custom-btn btn-cancel"
                routerLink="/dashboard/platform/tenants"
              >
                Cancel
              </button>
              <button
                mat-button
                class="custom-btn btn-save"
                (click)="createTenant()"
                [disabled]="isSubmitting || !isValid"
              >
                @if (isSubmitting) {
                  <mat-icon>hourglass_empty</mat-icon>
                }
                {{ isSubmitting ? 'Creating...' : 'Create Tenant' }}
              </button>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [
    `
      .page-container {
        padding: 32px 40px;
        max-width: 1000px;
        margin: 0 auto;
      }
      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 32px;
      }
      .header-left {
        display: flex;
        gap: 16px;
        align-items: flex-start;
      }
      .back-btn {
        margin-top: 2px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 50%;
        width: 40px;
        height: 40px;
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
      .form-card {
        background: var(--bg-surface);
        border: 1px solid var(--border-subtle);
        border-radius: 16px;
      }
      .card-content {
        padding: 32px !important;
      }
      .form-section {
        margin-bottom: 32px;
      }
      .section-title {
        font-size: 16px;
        font-weight: 600;
        color: var(--text-primary);
        margin: 0 0 16px 0;
        padding-bottom: 12px;
        border-bottom: 1px solid var(--border-subtle);
      }
      .section-subtitle {
        font-size: 13px;
        color: var(--text-secondary);
        margin-top: -12px;
        margin-bottom: 16px;
      }
      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 24px;
        margin-bottom: 16px;
      }
      .custom-field {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .custom-field label {
        font-size: 13px;
        font-weight: 500;
        color: var(--text-secondary);
      }
      .custom-field input {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid var(--border-subtle);
        border-radius: 8px;
        padding: 12px 16px;
        color: var(--text-primary);
        font-size: 14px;
        outline: none;
        transition: all 0.2s ease;
        width: 100%;
        box-sizing: border-box;
        font-family: inherit;
      }
      .custom-field input:focus {
        border-color: #818cf8;
        box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.15);
        background: rgba(255, 255, 255, 0.05);
      }
      .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 16px;
        margin-top: 40px;
      }
      .custom-btn {
        border-radius: 8px !important;
        font-weight: 600 !important;
        padding: 0 24px !important;
        height: 44px !important;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }
      .btn-save {
        background: #6366f1 !important;
        color: #ffffff !important;
        border: none !important;
      }
      .btn-save:hover:not(:disabled) {
        background: #4f46e5 !important;
      }
      .btn-save:disabled {
        background: rgba(99, 102, 241, 0.5) !important;
        cursor: not-allowed;
      }
      .btn-cancel {
        color: var(--text-secondary) !important;
        border: 1px solid var(--border-subtle) !important;
      }
      .btn-cancel:hover {
        color: var(--text-primary) !important;
        background: rgba(255, 255, 255, 0.05) !important;
      }

      .module-card {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid var(--border-subtle);
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .module-card:hover {
        background: rgba(255, 255, 255, 0.06);
      }
      .module-card.active {
        background: rgba(99, 102, 241, 0.1);
        border-color: rgba(99, 102, 241, 0.3);
      }
      .module-info {
        display: flex;
        align-items: center;
        gap: 16px;
      }
      .module-icon {
        color: #818cf8;
        background: rgba(129, 140, 248, 0.15);
        width: 40px;
        height: 40px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .module-text {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .module-title {
        font-weight: 600;
        font-size: 15px;
        color: var(--text-primary);
      }
      .module-desc {
        font-size: 13px;
        color: var(--text-secondary);
      }

      .custom-toggle {
        width: 44px;
        height: 24px;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.1);
        position: relative;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        flex-shrink: 0;
      }
      .custom-toggle.active {
        background: #10b981;
        box-shadow: 0 0 12px rgba(16, 185, 129, 0.3);
      }
      .toggle-thumb {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #fff;
        position: absolute;
        top: 2px;
        left: 2px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .custom-toggle.active .toggle-thumb {
        transform: translateX(20px);
      }
      .toggle-thumb mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
        color: #10b981;
        font-weight: bold;
      }
      .mt-16 {
        margin-top: 16px;
      }
      .mt-24 {
        margin-top: 24px;
      }
    `,
  ],
})
export class CreateTenantComponent {
  private http = inject(HttpClient);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  formData = {
    name: '',
    code: '',
    contactEmail: '',
    contactPhone: '',
    industry: '',
    country: '',
    adminPassword: '',
    isAttendanceEnabled: false,
    maxFieldStaff: null as number | null,
  };

  isSubmitting = false;

  get isValid(): boolean {
    return !!(
      this.formData.name &&
      this.formData.contactEmail &&
      this.formData.contactPhone &&
      this.formData.adminPassword &&
      this.formData.adminPassword.length >= 8
    );
  }

  createTenant() {
    if (!this.isValid) {
      this.snackBar.open('Please fill out all required fields', 'Close', {
        duration: 3000,
      });
      return;
    }

    this.isSubmitting = true;

    const payload = {
      ...this.formData,
      adminEmail: this.formData.contactEmail,
    };

    this.http.post('/api/v1/tenants', payload).subscribe({
      next: (res: any) => {
        this.snackBar.open(
          `Tenant created! Workspace ID: ${res.code}`,
          'Close',
          { duration: 8000 },
        );
        this.router.navigate(['/dashboard/platform/tenants']);
      },
      error: (err) => {
        console.error(err);
        this.snackBar.open('Failed to create tenant', 'Close', {
          duration: 3000,
        });
        this.isSubmitting = false;
      },
    });
  }
}
