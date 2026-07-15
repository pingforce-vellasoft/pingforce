import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { PlatformService } from '../../core/services/platform.service';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

@Component({
  selector: 'app-tenant-details',
  standalone: true,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    FormsModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDividerModule,
    MatSlideToggleModule,
  ],
  template: `
    @if (tenant) {
      <div class="page-container">
        <!-- Header Area -->
        <div class="page-header">
          <div class="header-left">
            <button mat-icon-button (click)="goBack()" class="back-btn">
              <mat-icon>arrow_back</mat-icon>
            </button>
            <div
              class="tenant-avatar"
              [style.background-color]="
                tenant.themeColor ? tenant.themeColor + '20' : ''
              "
              [style.color]="tenant.themeColor || '#818cf8'"
            >
              {{ tenant.name.charAt(0).toUpperCase() }}
            </div>
            <div class="header-text">
              <h1 class="page-title">{{ tenant.name }}</h1>
              <div class="subtitle-row">
                <span class="tenant-code">{{ tenant.code }}</span>
                <span
                  class="status-badge"
                  [class]="tenant.status.toLowerCase()"
                  >{{ tenant.status }}</span
                >
              </div>
            </div>
          </div>
          <div class="header-actions">
            @if (!editMode) {
              <button
                mat-button
                class="custom-btn btn-override"
                (click)="enableEditMode()"
              >
                <mat-icon>edit</mat-icon> Override Details
              </button>
            }
            @if (editMode) {
              <button
                mat-button
                class="custom-btn btn-save"
                (click)="saveChanges()"
              >
                <mat-icon>save</mat-icon> Save Changes
              </button>
            }
            @if (editMode) {
              <button
                mat-button
                class="custom-btn btn-cancel"
                (click)="cancelEdit()"
              >
                Cancel
              </button>
            }
          </div>
        </div>
        <div class="content-grid">
          <!-- Contact & Company Card -->
          <mat-card class="detail-card">
            <mat-card-header>
              <mat-icon mat-card-avatar class="card-icon">business</mat-icon>
              <mat-card-title>Company & Contact</mat-card-title>
            </mat-card-header>
            @if (!editMode) {
              <mat-card-content class="card-content">
                <div class="info-row">
                  <span class="label">Legal Name</span
                  ><span class="value">{{ tenant.legalName || 'N/A' }}</span>
                </div>
                <div class="info-row">
                  <span class="label">Industry</span
                  ><span class="value">{{ tenant.industry || 'N/A' }}</span>
                </div>
                <div class="info-row">
                  <span class="label">Email</span
                  ><span class="value">{{ tenant.contactEmail || 'N/A' }}</span>
                </div>
                <div class="info-row">
                  <span class="label">Phone</span
                  ><span class="value">{{ tenant.contactPhone || 'N/A' }}</span>
                </div>
                <div class="info-row">
                  <span class="label">Timezone</span
                  ><span class="value">{{ tenant.timezone || 'UTC' }}</span>
                </div>
                <div class="info-row">
                  <span class="label">Country</span
                  ><span class="value">{{ tenant.country || 'N/A' }}</span>
                </div>
              </mat-card-content>
            }
            @if (editMode) {
              <mat-card-content class="card-content edit-form">
                <div class="custom-field">
                  <label>Legal Name</label
                  ><input type="text" [(ngModel)]="editData.legalName" />
                </div>
                <div class="custom-field">
                  <label>Industry</label
                  ><input type="text" [(ngModel)]="editData.industry" />
                </div>
                <div class="custom-field">
                  <label>Contact Email</label
                  ><input type="email" [(ngModel)]="editData.contactEmail" />
                </div>
                <div class="custom-field">
                  <label>Contact Phone</label
                  ><input type="tel" [(ngModel)]="editData.contactPhone" />
                </div>
                <div class="custom-field">
                  <label>Timezone</label
                  ><input type="text" [(ngModel)]="editData.timezone" />
                </div>
                <div class="custom-field">
                  <label>Country</label
                  ><input type="text" [(ngModel)]="editData.country" />
                </div>
              </mat-card-content>
            }
          </mat-card>
          <!-- Subscription & Billing Card -->
          <mat-card class="detail-card">
            <mat-card-header>
              <mat-icon mat-card-avatar class="card-icon">credit_card</mat-icon>
              <mat-card-title>Subscription & Billing</mat-card-title>
            </mat-card-header>
            @if (!editMode) {
              <mat-card-content class="card-content">
                <div class="info-row">
                  <span class="label">Plan</span
                  ><span class="value badge-plan">{{
                    tenant.subscriptionPlan || 'N/A'
                  }}</span>
                </div>
                <div class="info-row">
                  <span class="label">Status</span
                  ><span class="value">{{
                    tenant.subscriptionStatus || 'N/A'
                  }}</span>
                </div>
                <div class="info-row">
                  <span class="label">Currency</span
                  ><span class="value">{{ tenant.currency }}</span>
                </div>
                <div class="info-row">
                  <span class="label">Tax ID</span
                  ><span class="value">{{ tenant.taxId || 'N/A' }}</span>
                </div>
                <div class="info-row">
                  <span class="label">Billing Email</span
                  ><span class="value">{{ tenant.billingEmail || 'N/A' }}</span>
                </div>
                <div class="info-row">
                  <span class="label">Active Modules</span>
                  <span class="value module-chips">
                    @if (tenant.isAttendanceEnabled) {
                      <span class="chip">Attendance</span>
                    }
                    @if (!tenant.isAttendanceEnabled) {
                      <span class="chip-empty">None</span>
                    }
                  </span>
                </div>
              </mat-card-content>
            }
            @if (editMode) {
              <mat-card-content class="card-content edit-form">
                <div class="custom-field">
                  <label>Plan</label>
                  <select [(ngModel)]="editData.subscriptionPlan">
                    <option value="BASIC">BASIC</option>
                    <option value="PROFESSIONAL">PROFESSIONAL</option>
                    <option value="ENTERPRISE">ENTERPRISE</option>
                  </select>
                </div>
                <div class="custom-field">
                  <label>Status</label>
                  <select [(ngModel)]="editData.subscriptionStatus">
                    <option value="TRIAL">TRIAL</option>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="PAST_DUE">PAST_DUE</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>
                <div class="custom-field">
                  <label>Currency</label
                  ><input type="text" [(ngModel)]="editData.currency" />
                </div>
                <div class="custom-field">
                  <label>Tax ID</label
                  ><input type="text" [(ngModel)]="editData.taxId" />
                </div>
                <div class="custom-field">
                  <label>Attendance Module</label>
                  <div
                    class="custom-toggle-wrapper"
                    (click)="
                      editData.isAttendanceEnabled =
                        !editData.isAttendanceEnabled
                    "
                  >
                    <div
                      class="custom-toggle"
                      [class.active]="editData.isAttendanceEnabled"
                    >
                      <div class="toggle-thumb">
                        @if (editData.isAttendanceEnabled) {
                          <mat-icon>check</mat-icon>
                        }
                      </div>
                    </div>
                    <span class="toggle-label">Enable Attendance</span>
                  </div>
                </div>
              </mat-card-content>
            }
          </mat-card>
          <!-- White-Label Branding Card -->
          <mat-card class="detail-card">
            <mat-card-header>
              <mat-icon mat-card-avatar class="card-icon">palette</mat-icon>
              <mat-card-title>Branding (Override)</mat-card-title>
            </mat-card-header>
            <mat-card-content class="card-content">
              @if (!editMode) {
                <div class="info-row">
                  <span class="label">Theme Color</span>
                  <div class="color-preview-box">
                    <div
                      class="color-swatch"
                      [style.background]="tenant.themeColor || '#6366f1'"
                    ></div>
                    <span>{{ tenant.themeColor || '#6366f1 (Default)' }}</span>
                  </div>
                </div>
              }
              @if (editMode) {
                <div class="edit-form">
                  <div class="custom-field">
                    <label>Theme Color (Hex)</label>
                    <div class="color-input-wrapper">
                      <input
                        type="color"
                        [(ngModel)]="editData.themeColor"
                        class="color-picker"
                      />
                      <input
                        type="text"
                        [(ngModel)]="editData.themeColor"
                        class="color-text"
                      />
                    </div>
                  </div>
                  <p class="hint">Preview of dynamic contrast:</p>
                </div>
              }
              <!-- Dynamic Preview Button -->
              <div class="preview-section">
                <button
                  class="dynamic-btn"
                  [style.background]="
                    (editMode ? editData.themeColor : tenant.themeColor) ||
                    '#6366f1'
                  "
                  [style.color]="
                    getAccessibleTextColor(
                      (editMode ? editData.themeColor : tenant.themeColor) ||
                        '#6366f1'
                    )
                  "
                >
                  Sample Primary Button
                </button>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .page-container {
        padding: 32px 40px;
        max-width: 1400px;
        margin: 0 auto;
      }
      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 32px;
        background: var(--bg-surface);
        padding: 24px;
        border-radius: 16px;
        border: 1px solid var(--border-subtle);
      }
      .header-left {
        display: flex;
        align-items: center;
        gap: 20px;
      }
      .back-btn {
        background: rgba(255, 255, 255, 0.05);
        color: var(--text-primary);
        border: 1px solid var(--border-subtle);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        margin-right: 8px;
        transition: background 0.2s ease;
      }
      .back-btn:hover {
        background: rgba(255, 255, 255, 0.1);
      }
      .tenant-avatar {
        width: 64px;
        height: 64px;
        border-radius: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 28px;
        font-weight: 700;
        background: rgba(99, 102, 241, 0.15);
        color: #818cf8;
      }
      .header-text {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .page-title {
        font-size: 24px;
        font-weight: 700;
        margin: 0;
        color: var(--text-primary);
      }
      .subtitle-row {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .custom-btn {
        border-radius: 8px !important;
        font-weight: 600 !important;
        padding: 0 16px !important;
        height: 40px !important;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }
      .btn-override {
        border: 1px solid var(--border-subtle) !important;
        color: var(--text-primary) !important;
        background: rgba(255, 255, 255, 0.05) !important;
        transition: background 0.2s ease !important;
      }
      .btn-override:hover {
        background: rgba(255, 255, 255, 0.1) !important;
      }
      .btn-save {
        background: #6366f1 !important;
        color: #ffffff !important;
        border: none !important;
      }
      .btn-save:hover {
        background: #4f46e5 !important;
      }
      .btn-cancel {
        color: var(--text-secondary) !important;
      }
      .btn-cancel:hover {
        color: var(--text-primary) !important;
        background: rgba(255, 255, 255, 0.05) !important;
      }

      .tenant-code {
        font-family: monospace;
        background: rgba(255, 255, 255, 0.05);
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 13px;
        color: var(--text-secondary);
        border: 1px solid var(--border-subtle);
      }
      .status-badge {
        font-size: 12px;
        font-weight: 700;
        padding: 4px 10px;
        border-radius: 12px;
        text-transform: uppercase;
      }
      .status-badge.active {
        background: #dcfce7;
        color: #166534;
      }
      .status-badge.suspended {
        background: #fee2e2;
        color: #991b1b;
      }

      .content-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
        gap: 24px;
      }
      .detail-card {
        border-radius: 16px !important;
        background: var(--bg-surface) !important;
        border: 1px solid var(--border-subtle) !important;
        box-shadow: none !important;
        transition: border-color 0.3s ease;
      }
      .detail-card:hover {
        border-color: rgba(99, 102, 241, 0.3) !important;
      }
      .card-icon {
        background: rgba(255, 255, 255, 0.05);
        color: var(--text-primary);
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 12px;
        border: 1px solid var(--border-subtle);
      }
      .card-content {
        padding: 0 16px 16px 16px !important;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .info-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 0;
        border-bottom: 1px solid var(--border-subtle);
      }
      .info-row:last-child {
        border-bottom: none;
      }
      .module-chips {
        display: flex;
        gap: 8px;
      }
      .chip {
        background: rgba(16, 185, 129, 0.1);
        color: #10b981;
        padding: 2px 10px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 700;
        border: 1px solid rgba(16, 185, 129, 0.2);
      }
      .chip-empty {
        color: var(--text-secondary);
        font-size: 13px;
      }
      .label {
        color: var(--text-secondary);
        font-size: 14px;
        font-weight: 500;
      }
      .value {
        color: var(--text-primary);
        font-size: 14px;
        font-weight: 600;
      }
      .badge-plan {
        background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
        color: white;
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 12px;
      }
      .full-width {
        width: 100%;
        margin-bottom: -10px;
      }
      .edit-form {
        padding-top: 16px !important;
      }
      .color-preview-box {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .color-swatch {
        width: 24px;
        height: 24px;
        border-radius: 6px;
        border: 1px solid var(--border-subtle);
      }
      .preview-section {
        margin-top: 16px;
        padding: 24px;
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid var(--border-subtle);
        border-radius: 12px;
        display: flex;
        justify-content: center;
      }
      .dynamic-btn {
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        transition: transform 0.2s;
      }
      .dynamic-btn:hover {
        transform: translateY(-2px);
      }
      .hint {
        font-size: 12px;
        color: var(--text-secondary);
        margin-top: 8px;
      }
      .custom-field {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-bottom: 16px;
      }
      .custom-field label {
        font-size: 13px;
        color: var(--text-secondary);
        font-weight: 500;
      }
      .custom-field input[type='text'],
      .custom-field input[type='email'],
      .custom-field input[type='tel'],
      .custom-field select {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid var(--border-subtle);
        border-radius: 8px;
        padding: 10px 14px;
        color: var(--text-primary);
        font-size: 14px;
        outline: none;
        transition: all 0.2s ease;
        width: 100%;
        box-sizing: border-box;
        font-family: inherit;
      }
      .custom-field select {
        appearance: none;
        background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2364748b%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E');
        background-repeat: no-repeat;
        background-position: right 14px top 50%;
        background-size: 10px auto;
      }
      .custom-field select option {
        background: var(--bg-surface);
        color: var(--text-primary);
      }
      .custom-field input:focus,
      .custom-field select:focus {
        border-color: #818cf8;
        box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.15);
        background: rgba(255, 255, 255, 0.05);
      }
      .color-input-wrapper {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .color-picker {
        appearance: none;
        -webkit-appearance: none;
        width: 40px;
        height: 40px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        background: none;
        padding: 0;
        overflow: hidden;
      }
      .color-picker::-webkit-color-swatch-wrapper {
        padding: 0;
      }
      .color-picker::-webkit-color-swatch {
        border: 1px solid var(--border-subtle);
        border-radius: 8px;
      }
      .color-text {
        flex: 1;
      }
      .custom-toggle-wrapper {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-top: 4px;
        cursor: pointer;
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
      .toggle-label {
        font-size: 14px;
        color: var(--text-primary);
        font-weight: 500;
      }
    `,
  ],
})
export class TenantDetailsComponent implements OnInit {
  tenant: any = null;
  editMode = false;
  editData: any = {};
  tenantId = '';

  constructor(
    private route: ActivatedRoute,
    private platformService: PlatformService,
    private snackBar: MatSnackBar,
    private location: Location,
  ) {}

  ngOnInit() {
    this.tenantId = this.route.snapshot.paramMap.get('id') || '';
    if (this.tenantId) {
      this.loadTenant();
    }
  }

  loadTenant() {
    this.platformService.getTenant(this.tenantId).subscribe({
      next: (res) => {
        this.tenant = res;
      },
      error: () =>
        this.snackBar.open('Failed to load tenant', 'Close', {
          duration: 3000,
        }),
    });
  }

  goBack() {
    this.location.back();
  }

  enableEditMode() {
    this.editData = {
      legalName: this.tenant.legalName,
      industry: this.tenant.industry,
      contactEmail: this.tenant.contactEmail,
      contactPhone: this.tenant.contactPhone,
      timezone: this.tenant.timezone,
      country: this.tenant.country,
      subscriptionPlan: this.tenant.subscriptionPlan,
      subscriptionStatus: this.tenant.subscriptionStatus,
      currency: this.tenant.currency,
      taxId: this.tenant.taxId,
      themeColor: this.tenant.themeColor || '#6366f1',
      isAttendanceEnabled: this.tenant.isAttendanceEnabled,
    };
    this.editMode = true;
  }

  cancelEdit() {
    this.editMode = false;
  }

  saveChanges() {
    this.platformService.updateTenant(this.tenantId, this.editData).subscribe({
      next: () => {
        this.tenant = { ...this.tenant, ...this.editData };
        this.editMode = false;
        this.snackBar.open('Tenant updated successfully', 'Close', {
          duration: 3000,
        });
      },
      error: () =>
        this.snackBar.open('Failed to update tenant', 'Close', {
          duration: 3000,
        }),
    });
  }

  getAccessibleTextColor(hexColor: string): string {
    const fallback = '#6366f1';
    const color = hexColor || fallback;
    // Remove hash if present
    const hex = color.replace('#', '');
    if (hex.length !== 6) return '#ffffff';

    // Convert to RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // W3C Luminance formula
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // If luminance > 0.5 it's a light color, use dark text
    return luminance > 0.5 ? '#1a1a1a' : '#ffffff';
  }
}
