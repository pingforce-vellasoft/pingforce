import { Component, inject, OnInit } from '@angular/core';

import { RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatMenuModule } from '@angular/material/menu';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlatformService } from '../../core/services/platform.service';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatListModule,
    MatSelectModule,
    MatFormFieldModule,
    MatMenuModule,
  ],
  template: `
    <div class="dashboard-container">
      <mat-toolbar color="primary" class="header">
        <button mat-icon-button (click)="sidenav.toggle()">
          <mat-icon>menu</mat-icon>
        </button>
        <span>PingForce Admin Dashboard</span>

        @if (
          authService.currentUser()?.roleCode !== 'SUPER_ADMIN' &&
          authService.currentUser()?.workspaceId
        ) {
          <span
            class="workspace-chip"
            [title]="'Workspace ID: ' + authService.currentUser()?.workspaceId"
          >
            <mat-icon>domain</mat-icon>
            {{ authService.currentUser()?.workspaceName }}
            <span class="workspace-id"
              >#{{ authService.currentUser()?.workspaceId }}</span
            >
          </span>
        }

        <span class="spacer"></span>

        @if (authService.currentUser()?.roleCode === 'SUPER_ADMIN') {
          <button
            mat-button
            [matMenuTriggerFor]="tenantMenu"
            class="tenant-menu-btn"
          >
            <mat-icon>domain</mat-icon>
            {{ getActiveTenantName() }}
            <mat-icon iconPositionEnd>arrow_drop_down</mat-icon>
          </button>

          <mat-menu #tenantMenu="matMenu" class="tenant-switcher-menu">
            <button mat-menu-item (click)="onTenantChange(null)">
              <mat-icon>public</mat-icon>
              <span>-- Global (SYSTEM) --</span>
            </button>
            <mat-divider></mat-divider>
            @for (tenant of tenants; track tenant.id) {
              <button mat-menu-item (click)="onTenantChange(tenant.id)">
                <mat-icon>corporate_fare</mat-icon>
                <span>{{ tenant.name }}</span>
              </button>
            }
          </mat-menu>
        }

        <button mat-icon-button (click)="logout()">
          <mat-icon>logout</mat-icon>
        </button>
      </mat-toolbar>

      <mat-sidenav-container class="sidenav-container">
        <mat-sidenav #sidenav mode="side" opened class="sidenav">
          <mat-nav-list>
            <a
              mat-list-item
              routerLink="/dashboard"
              routerLinkActive="active-link"
              [routerLinkActiveOptions]="{ exact: true }"
            >
              <mat-icon matListItemIcon>dashboard</mat-icon>
              <span matListItemTitle>Overview</span>
            </a>

            @if (authService.currentUser()?.roleCode === 'SUPER_ADMIN') {
              <mat-divider></mat-divider>
              <div mat-subheader>Platform Management</div>
              <a
                mat-list-item
                routerLink="/dashboard/platform/tenants"
                routerLinkActive="active-link"
              >
                <mat-icon matListItemIcon>corporate_fare</mat-icon>
                <span matListItemTitle>Tenants</span>
              </a>
              <a
                mat-list-item
                routerLink="/dashboard/platform/subscriptions"
                routerLinkActive="active-link"
              >
                <mat-icon matListItemIcon>subscriptions</mat-icon>
                <span matListItemTitle>Subscriptions</span>
              </a>

              <mat-divider></mat-divider>
              <div mat-subheader>System Config</div>
              <a
                mat-list-item
                routerLink="/dashboard/platform/settings"
                routerLinkActive="active-link"
              >
                <mat-icon matListItemIcon>settings_system_daydream</mat-icon>
                <span matListItemTitle>Platform Settings</span>
              </a>
              <a
                mat-list-item
                routerLink="/dashboard/rbac/roles"
                routerLinkActive="active-link"
              >
                <mat-icon matListItemIcon>admin_panel_settings</mat-icon>
                <span matListItemTitle>Roles & Permissions</span>
              </a>
            }

            @if (authService.currentUser()?.roleCode === 'ADMIN_MANAGER') {
              <!-- HIDDEN AS PER REQUEST
              <mat-divider></mat-divider>
              <div mat-subheader>CRM & Support</div>
              <a mat-list-item routerLink="/dashboard/crm/leads" routerLinkActive="active-link">
                <mat-icon matListItemIcon>leaderboard</mat-icon>
                <span matListItemTitle>Lead Pipeline</span>
              </a>
              <a mat-list-item routerLink="/dashboard/crm/tickets" routerLinkActive="active-link">
                <mat-icon matListItemIcon>support_agent</mat-icon>
                <span matListItemTitle>Support Tickets</span>
              </a>
              -->

              <mat-divider></mat-divider>
              <div mat-subheader>People</div>
              <a
                mat-list-item
                routerLink="/dashboard/workforce/employees"
                routerLinkActive="active-link"
              >
                <mat-icon matListItemIcon>badge</mat-icon>
                <span matListItemTitle>Employees</span>
              </a>
              <a
                mat-list-item
                routerLink="/dashboard/customers"
                routerLinkActive="active-link"
              >
                <mat-icon matListItemIcon>groups</mat-icon>
                <span matListItemTitle>Customers</span>
              </a>

              <mat-divider></mat-divider>
              <div mat-subheader>Workforce</div>
              <a
                mat-list-item
                routerLink="/dashboard/workforce/attendance"
                routerLinkActive="active-link"
              >
                <mat-icon matListItemIcon>access_time</mat-icon>
                <span matListItemTitle>Attendance Logs</span>
              </a>
              <a
                mat-list-item
                routerLink="/dashboard/workforce/leaves"
                routerLinkActive="active-link"
              >
                <mat-icon matListItemIcon>event_available</mat-icon>
                <span matListItemTitle>Leave Approvals</span>
              </a>
              <a
                mat-list-item
                routerLink="/dashboard/workforce/visits"
                routerLinkActive="active-link"
              >
                <mat-icon matListItemIcon>where_to_vote</mat-icon>
                <span matListItemTitle>Field Visits</span>
              </a>

              <mat-divider></mat-divider>
              <div mat-subheader>Network</div>
              <a
                mat-list-item
                routerLink="/dashboard/network/map"
                routerLinkActive="active-link"
              >
                <mat-icon matListItemIcon>share_location</mat-icon>
                <span matListItemTitle>Connection Map</span>
              </a>
              <a
                mat-list-item
                routerLink="/dashboard/tracking/live"
                routerLinkActive="active-link"
              >
                <mat-icon matListItemIcon>my_location</mat-icon>
                <span matListItemTitle>Live Tracking</span>
              </a>

              <mat-divider></mat-divider>
              <div mat-subheader>Analytics</div>
              <a
                mat-list-item
                routerLink="/dashboard/reports"
                routerLinkActive="active-link"
              >
                <mat-icon matListItemIcon>insights</mat-icon>
                <span matListItemTitle>Reports & KPIs</span>
              </a>

              <!-- HIDDEN AS PER REQUEST
              <mat-divider></mat-divider>
              <div mat-subheader>Finance</div>
              <a mat-list-item routerLink="/dashboard/finance/payroll" routerLinkActive="active-link">
                <mat-icon matListItemIcon>payments</mat-icon>
                <span matListItemTitle>Payroll Cycles</span>
              </a>
              <a mat-list-item routerLink="/dashboard/finance/claims" routerLinkActive="active-link">
                <mat-icon matListItemIcon>receipt_long</mat-icon>
                <span matListItemTitle>Expense Claims</span>
              </a>
              -->

              <mat-divider></mat-divider>
              <div mat-subheader>Settings</div>
              @if (authService.currentUser()?.isAttendanceEnabled) {
                <a
                  mat-list-item
                  routerLink="/dashboard/settings/geofences"
                  routerLinkActive="active-link"
                >
                  <mat-icon matListItemIcon>location_on</mat-icon>
                  <span matListItemTitle>Geofences</span>
                </a>
              }
              <a
                mat-list-item
                routerLink="/dashboard/rbac/roles"
                routerLinkActive="active-link"
              >
                <mat-icon matListItemIcon>admin_panel_settings</mat-icon>
                <span matListItemTitle>Roles & Permissions</span>
              </a>
            }
          </mat-nav-list>
        </mat-sidenav>

        <mat-sidenav-content class="content">
          <router-outlet></router-outlet>
        </mat-sidenav-content>
      </mat-sidenav-container>
    </div>
  `,
  styles: [
    `
      .dashboard-container {
        display: flex;
        flex-direction: column;
        height: 100vh;
        background-color: transparent;
      }
      .header {
        background: var(--bg-surface) !important;
        backdrop-filter: var(--backdrop-blur);
        -webkit-backdrop-filter: var(--backdrop-blur);
        border-bottom: 1px solid var(--border-subtle);
        color: var(--text-primary);
        box-shadow: var(--shadow-sm);
        z-index: 10;
        position: relative;
      }
      .header span {
        font-family: var(--font-display);
        font-weight: 600;
        letter-spacing: 0.5px;
        margin-left: 8px;
      }
      .sidenav-container {
        flex: 1;
        background-color: transparent;
      }
      .sidenav {
        width: 260px;
        background: transparent !important;
        border-right: 1px solid var(--border-subtle) !important;
        padding: 16px 0;
        overflow-x: hidden;
      }

      /* Nav List Customization */
      ::ng-deep .mat-drawer-inner-container {
        overflow-x: hidden !important;
      }
      mat-nav-list {
        padding-top: 0;
        overflow-x: hidden;
      }
      [mat-subheader] {
        color: rgba(255, 255, 255, 0.5);
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        font-weight: 700;
        margin-top: 24px;
        margin-bottom: 8px;
      }
      .mat-mdc-list-item {
        margin: 4px 16px;
        border-radius: 12px;
        transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        color: var(--text-secondary);
      }
      .mat-mdc-list-item:hover {
        background: rgba(255, 255, 255, 0.08);
        color: var(--text-primary);
        transform: translateX(4px);
      }

      /* Active Link Styling */
      .active-link {
        background: rgba(99, 102, 241, 0.15) !important;
        color: #818cf8 !important;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
      }
      .active-link:hover {
        transform: none;
      }
      .active-link mat-icon {
        color: var(--primary-accent) !important;
      }

      .tenant-menu-btn {
        border-radius: 24px;
        padding: 0 16px;
        margin-right: 16px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        transition: all 0.2s;
      }
      .tenant-menu-btn:hover {
        background: rgba(255, 255, 255, 0.2);
      }
      .workspace-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin-left: 16px !important;
        padding: 2px 12px;
        border-radius: 16px;
        background: rgba(99, 102, 241, 0.12);
        border: 1px solid rgba(99, 102, 241, 0.3);
        font-size: 13px !important;
        font-weight: 500 !important;
        color: var(--text-primary);
      }
      .workspace-chip mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
      .workspace-id {
        opacity: 0.7;
        font-family: monospace;
        margin-left: 2px;
      }
      .spacer {
        flex: 1 1 auto;
      }
      .content {
        padding: 32px;
        background-color: transparent;
        overflow-y: auto;
        scrollbar-gutter: stable;
      }
    `,
  ],
})
export class DashboardComponent implements OnInit {
  authService = inject(AuthService);
  private platformService = inject(PlatformService);

  tenants: any[] = [];

  ngOnInit() {
    if (this.authService.currentUser()?.roleCode === 'SUPER_ADMIN') {
      this.platformService.getTenants().subscribe({
        next: (res) => {
          this.tenants = res;
        },
        error: (err) =>
          console.error('Failed to load tenants for impersonation', err),
      });
    }
  }

  onTenantChange(tenantId: string | null) {
    this.authService.setImpersonatedTenant(tenantId);
    // Reload the page to reset state across all components
    window.location.reload();
  }

  getActiveTenantName(): string {
    const activeId = this.authService.impersonatedTenantId();
    if (!activeId) return 'Global (SYSTEM)';
    const tenant = this.tenants.find((t) => t.id === activeId);
    return tenant ? tenant.name : 'Unknown Tenant';
  }

  logout() {
    this.authService.logout();
  }
}
