import { Component } from '@angular/core';

import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatMenuModule } from '@angular/material/menu';

@Component({
  selector: 'app-dashboard-overview',
  standalone: true,
  imports: [
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatDividerModule,
    MatProgressBarModule,
    MatMenuModule,
  ],
  template: `
    <div class="dashboard-overview-container">
      <!-- Welcome Header -->
      <div class="welcome-banner glass-panel">
        <div class="welcome-text">
          <h1>Welcome back, Admin! 👋</h1>
          <p>Here's what's happening across your workforce today.</p>
        </div>
        <div class="welcome-actions">
          <button
            mat-flat-button
            color="primary"
            class="glow-button"
            routerLink="/dashboard/master-data/company"
          >
            <mat-icon>add</mat-icon> New Employee
          </button>
        </div>
      </div>

      <!-- KPI Cards -->
      <div class="kpi-grid">
        <mat-card
          class="kpi-card glass-card hover-lift"
          routerLink="/dashboard/workforce/attendance"
        >
          <div class="kpi-icon-box primary-glow">
            <mat-icon>groups</mat-icon>
          </div>
          <div class="kpi-content">
            <p class="kpi-label">Total Workforce</p>
            <h2 class="kpi-value">1,248</h2>
            <p class="kpi-trend positive">
              <mat-icon>trending_up</mat-icon> +12% this month
            </p>
          </div>
        </mat-card>

        <mat-card
          class="kpi-card glass-card hover-lift"
          routerLink="/dashboard/workforce/leaves"
        >
          <div class="kpi-icon-box warning-glow">
            <mat-icon>event_busy</mat-icon>
          </div>
          <div class="kpi-content">
            <p class="kpi-label">Pending Leaves</p>
            <h2 class="kpi-value">24</h2>
            <p class="kpi-trend neutral">
              <mat-icon>pending_actions</mat-icon> 5 require urgent review
            </p>
          </div>
        </mat-card>

        <mat-card
          class="kpi-card glass-card hover-lift"
          routerLink="/dashboard/crm/leads"
        >
          <div class="kpi-icon-box success-glow">
            <mat-icon>monetization_on</mat-icon>
          </div>
          <div class="kpi-content">
            <p class="kpi-label">Active Leads</p>
            <h2 class="kpi-value">842</h2>
            <p class="kpi-trend positive">
              <mat-icon>trending_up</mat-icon> +5% conversion rate
            </p>
          </div>
        </mat-card>

        <mat-card
          class="kpi-card glass-card hover-lift"
          routerLink="/dashboard/crm/tickets"
        >
          <div class="kpi-icon-box danger-glow">
            <mat-icon>support_agent</mat-icon>
          </div>
          <div class="kpi-content">
            <p class="kpi-label">Open Tickets</p>
            <h2 class="kpi-value">18</h2>
            <p class="kpi-trend negative">
              <mat-icon>trending_down</mat-icon> -3 SLA breached
            </p>
          </div>
        </mat-card>
      </div>

      <!-- Main Content Area: Charts & Activity -->
      <div class="content-grid">
        <!-- Left Column: Department Overview -->
        <mat-card class="chart-card glass-card">
          <mat-card-header>
            <mat-card-title>Department Distribution</mat-card-title>
            <button mat-icon-button [matMenuTriggerFor]="deptMenu">
              <mat-icon>more_vert</mat-icon>
            </button>
            <mat-menu #deptMenu="matMenu">
              <button
                mat-menu-item
                routerLink="/dashboard/master-data/department"
              >
                <mat-icon>domain</mat-icon>
                <span>View Departments</span>
              </button>
              <button mat-menu-item>
                <mat-icon>file_download</mat-icon>
                <span>Export Report</span>
              </button>
              <button mat-menu-item>
                <mat-icon>sync</mat-icon>
                <span>Refresh Data</span>
              </button>
            </mat-menu>
          </mat-card-header>
          <mat-card-content>
            <div class="department-list">
              <div class="dept-item">
                <div class="dept-info">
                  <span class="dept-name">Engineering</span>
                  <span class="dept-count">450</span>
                </div>
                <mat-progress-bar
                  mode="determinate"
                  value="75"
                  color="primary"
                ></mat-progress-bar>
              </div>
              <div class="dept-item">
                <div class="dept-info">
                  <span class="dept-name">Sales & Marketing</span>
                  <span class="dept-count">320</span>
                </div>
                <mat-progress-bar
                  mode="determinate"
                  value="55"
                  class="progress-success"
                ></mat-progress-bar>
              </div>
              <div class="dept-item">
                <div class="dept-info">
                  <span class="dept-name">Customer Support</span>
                  <span class="dept-count">280</span>
                </div>
                <mat-progress-bar
                  mode="determinate"
                  value="45"
                  class="progress-warning"
                ></mat-progress-bar>
              </div>
              <div class="dept-item">
                <div class="dept-info">
                  <span class="dept-name">Human Resources</span>
                  <span class="dept-count">198</span>
                </div>
                <mat-progress-bar
                  mode="determinate"
                  value="30"
                  class="progress-danger"
                ></mat-progress-bar>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Right Column: Recent Activity Feed -->
        <mat-card class="activity-card glass-card">
          <mat-card-header>
            <mat-card-title>Recent Activity</mat-card-title>
            <button
              mat-button
              color="primary"
              routerLink="/dashboard/workforce/attendance"
            >
              View All
            </button>
          </mat-card-header>
          <mat-card-content>
            <div class="activity-feed">
              <div class="activity-item">
                <div class="activity-icon bg-primary">
                  <mat-icon>person_add</mat-icon>
                </div>
                <div class="activity-details">
                  <p><strong>Sarah Jenkins</strong> joined Engineering</p>
                  <span class="time">10 minutes ago</span>
                </div>
              </div>

              <div class="activity-item">
                <div class="activity-icon bg-warning">
                  <mat-icon>flight_takeoff</mat-icon>
                </div>
                <div class="activity-details">
                  <p><strong>Mike Ross</strong> submitted a leave request</p>
                  <span class="time">1 hour ago</span>
                </div>
              </div>

              <div class="activity-item">
                <div class="activity-icon bg-success">
                  <mat-icon>check_circle</mat-icon>
                </div>
                <div class="activity-details">
                  <p><strong>Jessica Pearson</strong> approved payroll cycle</p>
                  <span class="time">3 hours ago</span>
                </div>
              </div>

              <div class="activity-item">
                <div class="activity-icon bg-danger">
                  <mat-icon>error_outline</mat-icon>
                </div>
                <div class="activity-details">
                  <p>
                    <strong>System Alert</strong> SLA breached on Ticket #492
                  </p>
                  <span class="time">5 hours ago</span>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [
    `
      .dashboard-overview-container {
        padding: 32px;
        display: flex;
        flex-direction: column;
        gap: 32px;
        animation: fadeIn 0.5s ease-out;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* Glassmorphism Utilities */
      .glass-panel,
      .glass-card {
        background: rgba(30, 41, 59, 0.4);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.05);
        box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.2);
      }

      /* Welcome Banner */
      .welcome-banner {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 32px;
        border-radius: 20px;
        background: linear-gradient(
          135deg,
          rgba(99, 102, 241, 0.15) 0%,
          rgba(30, 41, 59, 0.4) 100%
        );
        border: 1px solid rgba(99, 102, 241, 0.2);
      }
      .welcome-text h1 {
        margin: 0;
        font-size: 28px;
        font-weight: 600;
        color: #fff;
        letter-spacing: -0.5px;
      }
      .welcome-text p {
        margin: 8px 0 0 0;
        color: #94a3b8;
        font-size: 16px;
      }
      .glow-button {
        box-shadow: 0 4px 14px 0 rgba(99, 102, 241, 0.39);
        border-radius: 8px;
        padding: 0 24px;
        height: 44px;
      }

      /* KPI Grid */
      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 24px;
      }
      .kpi-card {
        padding: 24px;
        border-radius: 16px;
        display: flex;
        flex-direction: row !important;
        align-items: center;
        gap: 20px;
        transition:
          transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
          box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        cursor: pointer;
        will-change: transform, box-shadow;
      }
      .hover-lift:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 40px 0 rgba(0, 0, 0, 0.3);
        border-color: rgba(255, 255, 255, 0.1);
      }

      .kpi-icon-box {
        width: 56px;
        height: 56px;
        border-radius: 14px;
        display: flex;
        justify-content: center;
        align-items: center;
      }
      .kpi-icon-box mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
      }
      .primary-glow {
        background: rgba(99, 102, 241, 0.15);
        color: #818cf8;
        border: 1px solid rgba(99, 102, 241, 0.3);
      }
      .warning-glow {
        background: rgba(245, 158, 11, 0.15);
        color: #fbbf24;
        border: 1px solid rgba(245, 158, 11, 0.3);
      }
      .success-glow {
        background: rgba(16, 185, 129, 0.15);
        color: #34d399;
        border: 1px solid rgba(16, 185, 129, 0.3);
      }
      .danger-glow {
        background: rgba(239, 68, 68, 0.15);
        color: #f87171;
        border: 1px solid rgba(239, 68, 68, 0.3);
      }

      .kpi-content {
        flex: 1;
      }
      .kpi-label {
        margin: 0;
        color: #94a3b8;
        font-size: 14px;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .kpi-value {
        margin: 4px 0;
        font-size: 32px;
        font-weight: 700;
        color: #f8fafc;
        letter-spacing: -1px;
      }
      .kpi-trend {
        margin: 0;
        font-size: 13px;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .kpi-trend mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
      .positive {
        color: #34d399;
      }
      .negative {
        color: #f87171;
      }
      .neutral {
        color: #fbbf24;
      }

      /* Content Grid */
      .content-grid {
        display: grid;
        grid-template-columns: 3fr 2fr;
        gap: 24px;
      }
      .chart-card,
      .activity-card {
        border-radius: 16px;
      }
      mat-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 24px 24px 16px 24px;
      }
      mat-card-title {
        font-size: 18px;
        font-weight: 600;
        color: #f8fafc;
      }

      /* Department List */
      .department-list {
        padding: 0 24px 24px 24px;
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      .dept-item {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .dept-info {
        display: flex;
        justify-content: space-between;
        font-size: 14px;
      }
      .dept-name {
        color: #cbd5e1;
        font-weight: 500;
      }
      .dept-count {
        color: #94a3b8;
      }

      ::ng-deep .progress-success .mdc-linear-progress__bar-inner {
        border-color: #34d399 !important;
      }
      ::ng-deep .progress-warning .mdc-linear-progress__bar-inner {
        border-color: #fbbf24 !important;
      }
      ::ng-deep .progress-danger .mdc-linear-progress__bar-inner {
        border-color: #f87171 !important;
      }
      ::ng-deep .mdc-linear-progress__buffer {
        background-color: rgba(255, 255, 255, 0.05) !important;
      }

      /* Activity Feed */
      .activity-feed {
        padding: 0 24px 24px 24px;
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      .activity-item {
        display: flex;
        align-items: flex-start;
        gap: 16px;
      }
      .activity-icon {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        justify-content: center;
        align-items: center;
        color: #fff;
      }
      .activity-icon mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
      .bg-primary {
        background: #6366f1;
      }
      .bg-warning {
        background: #f59e0b;
      }
      .bg-success {
        background: #10b981;
      }
      .bg-danger {
        background: #ef4444;
      }

      .activity-details p {
        margin: 0 0 4px 0;
        color: #cbd5e1;
        font-size: 14px;
        line-height: 1.4;
      }
      .activity-details strong {
        color: #f8fafc;
        font-weight: 600;
      }
      .activity-details .time {
        color: #64748b;
        font-size: 12px;
      }
    `,
  ],
})
export class DashboardOverviewComponent {}
