import { Component, OnInit, inject, Inject } from '@angular/core';

import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  MatDialog,
  MatDialogModule,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { PlatformService } from '../../core/services/platform.service';
import { NgClass } from '@angular/common';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatMenuModule } from '@angular/material/menu';

@Component({
  selector: 'app-provisioning-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, FormsModule, MatIconModule],
  template: `
    <div class="premium-dialog">
      <div class="dialog-header">
        <h2 mat-dialog-title>Provision Modules</h2>
        <p class="dialog-subtitle">{{ data.tenant.name }}</p>
      </div>
      <mat-dialog-content class="dialog-content">
        <div
          class="module-card"
          [class.active]="data.tenant.isAttendanceEnabled"
          (click)="
            data.tenant.isAttendanceEnabled = !data.tenant.isAttendanceEnabled
          "
        >
          <div class="module-info">
            <mat-icon class="module-icon">location_on</mat-icon>
            <div class="module-text">
              <span class="module-title">GPS & Biometric Attendance</span>
              <span class="module-desc"
                >Enable location-based check-ins and facial recognition</span
              >
            </div>
          </div>
          <div
            class="custom-toggle"
            [class.active]="data.tenant.isAttendanceEnabled"
          >
            <div class="toggle-thumb">
              @if (data.tenant.isAttendanceEnabled) {
                <mat-icon>check</mat-icon>
              }
            </div>
          </div>
        </div>

        @if (data.tenant.isAttendanceEnabled) {
          <div class="form-container">
            <div class="custom-field mt-16">
              <label>Max Field Staff</label>
              <input
                type="number"
                [(ngModel)]="data.tenant.maxFieldStaff"
                placeholder="Unlimited if empty"
              />
              <span class="hint">Leave empty for unlimited field staff</span>
            </div>
          </div>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end" class="dialog-actions">
        <button mat-button mat-dialog-close class="custom-btn btn-cancel">
          Cancel
        </button>
        <button
          mat-button
          color="primary"
          [mat-dialog-close]="data.tenant"
          class="custom-btn btn-save"
        >
          Save Changes
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      .premium-dialog {
        background: var(--bg-surface);
        color: var(--text-primary);
      }
      .dialog-header {
        padding: 24px 24px 0 24px;
      }
      .dialog-header h2 {
        margin: 0;
        font-size: 20px;
        font-weight: 700;
        color: var(--text-primary);
        padding: 0;
      }
      .dialog-subtitle {
        margin: 4px 0 0 0;
        color: var(--text-secondary);
        font-size: 14px;
      }
      .dialog-content {
        padding: 24px !important;
        overflow-y: hidden !important;
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
      .custom-field {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .mt-16 {
        margin-top: 16px;
      }
      .custom-field label {
        font-size: 13px;
        color: var(--text-secondary);
        font-weight: 500;
      }
      .custom-field input {
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
      .custom-field input:focus {
        border-color: #818cf8;
        box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.15);
        background: rgba(255, 255, 255, 0.05);
      }
      .hint {
        font-size: 12px;
        color: var(--text-secondary);
        margin-top: 4px;
      }
      .dialog-actions {
        padding: 0 24px 24px 24px !important;
        margin-bottom: 0 !important;
        gap: 12px;
      }
      .custom-btn {
        border-radius: 8px !important;
        font-weight: 600 !important;
        padding: 0 20px !important;
        height: 40px !important;
        display: inline-flex;
        align-items: center;
        justify-content: center;
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

      /* Toggle */
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
    `,
  ],
})
export class ProvisioningDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}
}

@Component({
  selector: 'app-confirm-action-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="confirm-dialog-container">
      <div class="warning-icon-wrapper" [class.danger]="data.isDanger">
        <mat-icon>{{ data.icon || 'warning' }}</mat-icon>
      </div>
      <h2 mat-dialog-title>{{ data.title }}</h2>
      <mat-dialog-content>
        <p class="dialog-message">
          <span [innerHTML]="data.message"></span>
        </p>
        @if (data.subMessage) {
          <p class="dialog-sub-message">
            {{ data.subMessage }}
          </p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end" class="dialog-actions">
        <button mat-button mat-dialog-close class="cancel-btn">Cancel</button>
        <button
          mat-flat-button
          [color]="data.isDanger ? 'warn' : 'primary'"
          [mat-dialog-close]="true"
          class="confirm-btn"
          [class.danger-btn]="data.isDanger"
        >
          {{ data.confirmText }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      .confirm-dialog-container {
        padding: 16px;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
      }
      .warning-icon-wrapper {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: rgba(99, 102, 241, 0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 16px;
        margin-top: 8px;
      }
      .warning-icon-wrapper.danger {
        background: rgba(239, 68, 68, 0.1);
      }
      .warning-icon-wrapper mat-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
        color: #6366f1;
      }
      .warning-icon-wrapper.danger mat-icon {
        color: #ef4444;
      }
      .mat-mdc-dialog-title {
        font-size: 22px !important;
        font-weight: 700 !important;
        margin: 0 0 12px 0 !important;
        padding: 0 !important;
        color: var(--text-primary) !important;
      }
      .dialog-message {
        font-size: 15px;
        color: var(--text-primary);
        margin-bottom: 8px;
      }
      .dialog-sub-message {
        font-size: 14px;
        color: var(--text-secondary);
        line-height: 1.5;
        margin-bottom: 0;
      }
      .mat-mdc-dialog-content {
        padding: 0 16px 24px 16px !important;
        max-height: none !important;
      }
      .dialog-actions {
        width: 100%;
        padding: 0 16px 8px 16px !important;
        justify-content: center !important;
        gap: 12px;
      }
      .cancel-btn {
        border-radius: 8px !important;
      }
      .confirm-btn {
        border-radius: 8px !important;
      }
      .danger-btn {
        background: linear-gradient(
          135deg,
          #ef4444 0%,
          #b91c1c 100%
        ) !important;
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3) !important;
      }
    `,
  ],
})
export class ConfirmActionDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: {
      title: string;
      message: string;
      subMessage?: string;
      confirmText: string;
      isDanger: boolean;
      icon?: string;
    },
  ) {}
}

@Component({
  selector: 'app-platform-tenants',
  standalone: true,
  imports: [
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    MatSlideToggleModule,
    FormsModule,
    RouterModule,
    MatMenuModule,
    NgClass,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="header-content">
          <h2 class="page-title">Tenant Management</h2>
          <p class="page-subtitle">
            Manage platform tenants, their subscriptions, and module
            provisioning.
          </p>
        </div>
        <div class="header-actions">
          <button
            mat-raised-button
            color="primary"
            class="action-btn"
            routerLink="/dashboard/platform/tenants/create"
          >
            <mat-icon>add</mat-icon>
            Create Tenant
          </button>
        </div>
      </div>

      <div class="stats-grid">
        <mat-card class="stat-card">
          <div class="stat-icon-wrapper primary-bg">
            <mat-icon>business</mat-icon>
          </div>
          <div class="stat-content">
            <span class="stat-label">Total Tenants</span>
            <span class="stat-value">{{ tenants.length }}</span>
          </div>
        </mat-card>

        <mat-card class="stat-card">
          <div class="stat-icon-wrapper info-bg">
            <mat-icon>extension</mat-icon>
          </div>
          <div class="stat-content">
            <span class="stat-label">Modules Available</span>
            <span class="stat-value">1</span>
          </div>
        </mat-card>

        <mat-card class="stat-card">
          <div class="stat-icon-wrapper success-bg">
            <mat-icon>card_membership</mat-icon>
          </div>
          <div class="stat-content">
            <span class="stat-label">Active Subscriptions</span>
            <span class="stat-value">{{ activeSubscriptionsCount() }}</span>
          </div>
        </mat-card>

        <mat-card class="stat-card">
          <div class="stat-icon-wrapper warning-bg">
            <mat-icon>update</mat-icon>
          </div>
          <div class="stat-content">
            <span class="stat-label">Upcoming Renewals</span>
            <span class="stat-value">{{ upcomingRenewalsCount() }}</span>
          </div>
        </mat-card>
      </div>

      <mat-card class="table-card">
        <mat-card-content class="no-padding">
          <table mat-table [dataSource]="tenants" class="full-width-table">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Tenant Details</th>
              <td mat-cell *matCellDef="let tenant">
                <div class="tenant-name-cell">
                  <div class="tenant-avatar">
                    {{ tenant.name.charAt(0).toUpperCase() }}
                  </div>
                  <div class="tenant-details">
                    <a
                      [routerLink]="['/dashboard/platform/tenants', tenant.id]"
                      class="tenant-name-link"
                    >
                      <span class="tenant-name">{{ tenant.name }}</span>
                    </a>
                    <span class="tenant-code">{{ tenant.code }}</span>
                  </div>
                </div>
              </td>
            </ng-container>

            <ng-container matColumnDef="contact">
              <th mat-header-cell *matHeaderCellDef>Contact Info</th>
              <td mat-cell *matCellDef="let tenant">
                <div class="cell-stack">
                  <span class="cell-primary">{{
                    tenant.contactEmail || 'N/A'
                  }}</span>
                  <span class="cell-secondary">{{
                    tenant.contactPhone || 'N/A'
                  }}</span>
                </div>
              </td>
            </ng-container>

            <ng-container matColumnDef="location">
              <th mat-header-cell *matHeaderCellDef>Location</th>
              <td mat-cell *matCellDef="let tenant">
                <span class="cell-primary">{{ tenant.country || 'N/A' }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="subscription">
              <th mat-header-cell *matHeaderCellDef>Subscription</th>
              <td mat-cell *matCellDef="let tenant">
                <div class="cell-stack">
                  <span class="cell-primary">{{
                    tenant.subscriptionPlan || 'N/A'
                  }}</span>
                  <span
                    class="status-badge"
                    [ngClass]="
                      tenant.subscriptionStatus?.toLowerCase() || 'unknown'
                    "
                    >{{ tenant.subscriptionStatus || 'N/A' }}</span
                  >
                </div>
              </td>
            </ng-container>

            <ng-container matColumnDef="activeModules">
              <th mat-header-cell *matHeaderCellDef>Active Modules</th>
              <td mat-cell *matCellDef="let tenant">
                <div class="module-chips">
                  @if (tenant.isAttendanceEnabled) {
                    <span class="chip">Attendance</span>
                  }
                  @if (!tenant.isAttendanceEnabled) {
                    <span class="chip-empty">None Active</span>
                  }
                </div>
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let tenant">
                <button
                  mat-icon-button
                  color="primary"
                  [matMenuTriggerFor]="menu"
                >
                  <mat-icon>settings</mat-icon>
                </button>
                <mat-menu
                  #menu="matMenu"
                  class="premium-menu"
                  yPosition="below"
                  xPosition="before"
                >
                  <button mat-menu-item (click)="openProvisioning(tenant)">
                    <div class="menu-item-content">
                      <mat-icon>extension</mat-icon>
                      <span>Manage Modules</span>
                    </div>
                  </button>
                  <button
                    mat-menu-item
                    [routerLink]="['/dashboard/platform/tenants', tenant.id]"
                  >
                    <div class="menu-item-content">
                      <mat-icon>edit</mat-icon>
                      <span>Edit Details</span>
                    </div>
                  </button>
                  <button mat-menu-item (click)="toggleTenantStatus(tenant)">
                    <div class="menu-item-content">
                      <mat-icon
                        [color]="
                          tenant.subscriptionStatus === 'SUSPENDED'
                            ? 'primary'
                            : 'warn'
                        "
                      >
                        {{
                          tenant.subscriptionStatus === 'SUSPENDED'
                            ? 'check_circle'
                            : 'block'
                        }}
                      </mat-icon>
                      <span>{{
                        tenant.subscriptionStatus === 'SUSPENDED'
                          ? 'Enable Tenant'
                          : 'Disable Tenant'
                      }}</span>
                    </div>
                  </button>
                  <button mat-menu-item (click)="deleteTenant(tenant)">
                    <div class="menu-item-content">
                      <mat-icon color="warn">delete</mat-icon>
                      <span style="color: #f87171;">Delete Tenant</span>
                    </div>
                  </button>
                </mat-menu>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
          </table>
        </mat-card-content>
      </mat-card>
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
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 32px;
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
      .action-btn {
        border-radius: 8px !important;
        padding: 0 24px !important;
        height: 44px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 24px;
        margin-bottom: 32px;
      }
      .stat-card {
        display: flex;
        flex-direction: row;
        align-items: center;
        padding: 24px !important;
        gap: 20px;
      }
      .stat-icon-wrapper {
        width: 56px;
        height: 56px;
        border-radius: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .stat-icon-wrapper mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
      }
      .primary-bg {
        background: rgba(99, 102, 241, 0.15);
        color: #818cf8;
      }
      .info-bg {
        background: rgba(56, 189, 248, 0.15);
        color: #38bdf8;
      }
      .success-bg {
        background: rgba(16, 185, 129, 0.15);
        color: #10b981;
      }
      .warning-bg {
        background: rgba(245, 158, 11, 0.15);
        color: #f59e0b;
      }
      .stat-content {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .stat-label {
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--text-secondary);
        font-weight: 600;
        margin-bottom: 4px;
      }
      .stat-value {
        font-size: 28px;
        font-weight: 700;
        color: var(--text-primary);
        line-height: 1;
      }
      .table-card {
        overflow: hidden;
        padding: 0 !important;
      }
      .no-padding {
        padding: 0 !important;
      }
      .full-width-table {
        width: 100%;
      }
      .tenant-name-cell {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 12px 0;
      }
      .tenant-avatar {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        background: rgba(99, 102, 241, 0.15);
        color: #818cf8;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 18px;
        border: 1px solid rgba(99, 102, 241, 0.2);
      }
      .tenant-details {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .tenant-name-link {
        text-decoration: none;
      }
      .tenant-name-link:hover .tenant-name {
        color: #6366f1;
        text-decoration: underline;
      }
      .tenant-name {
        font-weight: 600;
        font-size: 15px;
        color: var(--text-primary);
        transition: color 0.2s ease;
      }
      .tenant-code {
        font-size: 13px;
        color: var(--text-secondary);
        font-family: monospace;
        background: rgba(255, 255, 255, 0.05);
        padding: 2px 6px;
        border-radius: 4px;
        width: fit-content;
      }

      .cell-stack {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .cell-primary {
        font-size: 14px;
        color: var(--text-primary);
      }
      .cell-secondary {
        font-size: 12px;
        color: var(--text-secondary);
      }

      .status-badge {
        font-size: 11px;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 12px;
        width: fit-content;
        text-transform: uppercase;
        margin-top: 2px;
      }
      .status-badge.active {
        background: rgba(16, 185, 129, 0.1);
        color: #10b981;
        border: 1px solid rgba(16, 185, 129, 0.2);
      }
      .status-badge.trial {
        background: rgba(245, 158, 11, 0.1);
        color: #f59e0b;
        border: 1px solid rgba(245, 158, 11, 0.2);
      }
      .status-badge.past_due {
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;
        border: 1px solid rgba(239, 68, 68, 0.2);
      }
      .status-badge.cancelled {
        background: rgba(100, 116, 139, 0.1);
        color: #94a3b8;
        border: 1px solid rgba(100, 116, 139, 0.2);
      }
      .status-badge.unknown {
        background: rgba(100, 116, 139, 0.1);
        color: #94a3b8;
      }

      .module-chips {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .chip {
        background: rgba(16, 185, 129, 0.1);
        color: #10b981;
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 700;
        border: 1px solid rgba(16, 185, 129, 0.2);
      }
      .chip-empty {
        color: var(--text-secondary);
        font-size: 13px;
        font-style: italic;
      }

      /* Custom Premium Toggle Switch */
      .custom-toggle {
        display: inline-flex;
        align-items: center;
        gap: 12px;
        cursor: pointer;
        padding: 6px 16px 6px 6px;
        border-radius: 24px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.05);
        transition: all 0.3s ease;
        user-select: none;
        width: fit-content;
      }
      .custom-toggle:hover {
        background: rgba(255, 255, 255, 0.06);
      }
      .toggle-track {
        width: 44px;
        height: 24px;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.1);
        position: relative;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
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
      .toggle-thumb mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
        color: #64748b;
        font-weight: bold;
      }
      .toggle-label {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-secondary);
        transition: color 0.3s ease;
      }

      /* Active State */
      .custom-toggle.active {
        background: rgba(16, 185, 129, 0.05);
        border-color: rgba(16, 185, 129, 0.2);
      }
      .custom-toggle.active .toggle-track {
        background: #10b981;
        box-shadow: 0 0 12px rgba(16, 185, 129, 0.3);
      }
      .custom-toggle.active .toggle-thumb {
        transform: translateX(20px);
      }
      .custom-toggle.active .toggle-thumb mat-icon {
        color: #10b981;
      }
      .custom-toggle.active .toggle-label.active-text {
        color: #10b981;
      }

      /* Menu Styles */
      ::ng-deep .premium-menu.mat-mdc-menu-panel {
        background: var(--bg-surface) !important;
        border: 1px solid var(--border-subtle) !important;
        border-radius: 12px !important;
        padding: 8px 0 !important;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5) !important;
        min-width: 220px !important;
        margin-top: -30px !important;
        margin-right: 16px !important;
      }
      ::ng-deep .premium-menu .mat-mdc-menu-item {
        padding: 0 16px !important;
        min-height: 48px !important;
      }
      .menu-item-content {
        display: flex !important;
        align-items: center !important;
        gap: 16px !important;
        width: 100%;
        font-weight: 500;
        color: var(--text-primary);
      }
      .menu-item-content .mat-icon {
        margin-right: 0 !important;
        margin-top: 0 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }
      ::ng-deep .premium-menu .mat-mdc-menu-item:hover {
        background: rgba(255, 255, 255, 0.05) !important;
      }
    `,
  ],
})
export class TenantsComponent implements OnInit {
  private platformService = inject(PlatformService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  displayedColumns: string[] = [
    'name',
    'contact',
    'location',
    'subscription',
    'activeModules',
    'actions',
  ];
  tenants: any[] = [];

  ngOnInit() {
    this.loadTenants();
  }

  activeSubscriptionsCount(): number {
    return this.tenants.filter((t) => t.subscriptionStatus === 'ACTIVE').length;
  }

  upcomingRenewalsCount(): number {
    const today = new Date();
    const nextMonth = new Date();
    nextMonth.setDate(today.getDate() + 30);

    return this.tenants.filter((t) => {
      if (!t.subscriptionEnd) return false;
      const endDate = new Date(t.subscriptionEnd);
      return endDate >= today && endDate <= nextMonth;
    }).length;
  }

  loadTenants() {
    this.platformService.getTenants().subscribe({
      next: (data) => (this.tenants = data),
      error: () =>
        this.snackBar.open('Failed to load tenants', 'Close', {
          duration: 3000,
        }),
    });
  }

  toggleAttendance(tenant: any, isEnabled: boolean) {
    if (!isEnabled) {
      // User wants to disable, show confirmation dialog
      const dialogRef = this.dialog.open(ConfirmActionDialogComponent, {
        width: '450px',
        data: {
          title: 'Disable Attendance Module?',
          message: `You are about to disable the GPS & Biometric Attendance module for <strong>${tenant.name}</strong>.`,
          subMessage:
            'Field staff will no longer be able to punch in/out. This action will not delete historical data, but active tracking will be suspended immediately.',
          confirmText: 'Yes, Disable',
          isDanger: true,
          icon: 'warning',
        },
      });

      dialogRef.afterClosed().subscribe((confirmed) => {
        if (confirmed) {
          this.executeToggle(tenant, false);
        }
      });
    } else {
      // Enabling is safe, do it immediately
      this.executeToggle(tenant, true);
    }
  }

  private executeToggle(tenant: any, isEnabled: boolean) {
    tenant.isAttendanceEnabled = isEnabled;
    this.platformService
      .updateTenantProvisioning(tenant.id, {
        isAttendanceEnabled: isEnabled,
        maxFieldStaff: tenant.maxFieldStaff,
      })
      .subscribe({
        next: () => {
          this.snackBar.open(
            `Attendance module ${isEnabled ? 'enabled' : 'disabled'} for ${tenant.name}`,
            'Close',
            { duration: 3000 },
          );
        },
        error: () => {
          tenant.isAttendanceEnabled = !isEnabled; // Revert
          this.snackBar.open('Failed to update tenant', 'Close', {
            duration: 3000,
          });
        },
      });
  }

  openProvisioning(tenant: any) {
    const dialogRef = this.dialog.open(ProvisioningDialogComponent, {
      width: '500px',
      data: { tenant },
      panelClass: 'dark-dialog',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadTenants();
      }
    });
  }

  toggleTenantStatus(tenant: any) {
    const isSuspending = tenant.subscriptionStatus !== 'SUSPENDED';

    if (isSuspending) {
      const dialogRef = this.dialog.open(ConfirmActionDialogComponent, {
        width: '450px',
        data: {
          title: 'Suspend Tenant?',
          message: `You are about to suspend the account for <strong>${tenant.name}</strong>.`,
          subMessage:
            'Their users will immediately lose access to the platform. No data will be deleted.',
          confirmText: 'Yes, Suspend',
          isDanger: true,
          icon: 'block',
        },
      });

      dialogRef.afterClosed().subscribe((confirmed) => {
        if (confirmed) {
          this.executeTenantStatusToggle(tenant, 'SUSPENDED');
        }
      });
    } else {
      // Enabling
      this.executeTenantStatusToggle(tenant, 'ACTIVE');
    }
  }

  private executeTenantStatusToggle(tenant: any, newStatus: string) {
    this.platformService
      .updateTenant(tenant.id, {
        subscriptionStatus: newStatus,
        status: newStatus,
      })
      .subscribe({
        next: () => {
          this.snackBar.open(
            `Tenant ${newStatus === 'ACTIVE' ? 'enabled' : 'disabled'} successfully`,
            'Close',
            { duration: 3000 },
          );
          this.loadTenants();
        },
        error: () =>
          this.snackBar.open('Failed to update tenant status', 'Close', {
            duration: 3000,
          }),
      });
  }

  deleteTenant(tenant: any) {
    const dialogRef = this.dialog.open(ConfirmActionDialogComponent, {
      width: '450px',
      data: {
        title: 'Delete Tenant?',
        message: `Are you absolutely sure you want to delete <strong>${tenant.name}</strong>?`,
        subMessage:
          'This action will soft-delete the tenant and they will be removed from your active roster. This cannot be undone from the UI.',
        confirmText: 'Yes, Delete',
        isDanger: true,
        icon: 'delete_forever',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.platformService.deleteTenant(tenant.id).subscribe({
          next: () => {
            this.snackBar.open('Tenant deleted successfully', 'Close', {
              duration: 3000,
            });
            this.loadTenants();
          },
          error: () =>
            this.snackBar.open('Failed to delete tenant', 'Close', {
              duration: 3000,
            }),
        });
      }
    });
  }
}
