import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-employee-details',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatDividerModule,
    MatProgressBarModule,
  ],
  template: `
    <div class="page-container">
      <div class="header-actions">
        <button mat-icon-button class="back-btn" (click)="goBack()">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <div class="header-titles">
          <h1>Employee Intelligence</h1>
          <p>Comprehensive overview and history</p>
        </div>
      </div>

      <div class="grid-layout">
        <!-- Left Sidebar: Profile Overview & Contact -->
        <div class="sidebar-column">
          <!-- Profile Card -->
          <div class="glass-panel profile-card">
            <div class="avatar-large">{{ getInitials(employeeId) }}</div>
            <h2>{{ getMockEmployee().name }}</h2>
            <p class="role-text">
              {{ getMockEmployee().designation }} &bull;
              {{ getMockEmployee().department }}
            </p>

            <div class="status-pill active">
              <div class="pulse-dot"></div>
              {{ getMockEmployee().status }}
            </div>

            <div class="metric-row">
              <div class="metric-box">
                <span class="metric-value">98%</span>
                <span class="metric-label">Attendance</span>
              </div>
              <div class="metric-box">
                <span
                  class="metric-value shortfall"
                  [class.no-shortfall]="getMockEmployee().shortfalls === 0"
                  >{{ getMockEmployee().shortfalls }}</span
                >
                <span class="metric-label">Shortfalls</span>
              </div>
            </div>
          </div>

          <!-- Contact Info -->
          <div class="glass-panel details-panel" style="margin-top: 24px;">
            <h3>
              <mat-icon class="panel-icon">contact_mail</mat-icon> Contact
              Information
            </h3>
            <div class="info-list">
              <div class="info-item">
                <mat-icon>email</mat-icon>
                <div class="info-text">
                  <span class="label">Email Address</span>
                  <span class="value">{{ getMockEmployee().email }}</span>
                </div>
              </div>
              <div class="info-item">
                <mat-icon>phone</mat-icon>
                <div class="info-text">
                  <span class="label">Phone Number</span>
                  <span class="value">{{ getMockEmployee().phone }}</span>
                </div>
              </div>
              <div class="info-item">
                <mat-icon>location_on</mat-icon>
                <div class="info-text">
                  <span class="label">Work Location</span>
                  <span class="value">{{ getMockEmployee().location }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Details Column -->
        <div class="details-column">
          <!-- Employment Details -->
          <div class="glass-panel details-panel">
            <h3>
              <mat-icon class="panel-icon">badge</mat-icon> Employment Details
            </h3>
            <div class="employment-grid">
              <div class="emp-stat">
                <span class="label">Employee ID</span>
                <span class="value">{{ getMockEmployee().empId }}</span>
              </div>
              <div class="emp-stat">
                <span class="label">Employment Type</span>
                <span class="value">{{ getMockEmployee().type }}</span>
              </div>
              <div class="emp-stat">
                <span class="label">Joining Date</span>
                <span class="value">{{ getMockEmployee().joiningDate }}</span>
              </div>
              <div class="emp-stat">
                <span class="label">Reporting Manager</span>
                <span class="value">{{ getMockEmployee().manager }}</span>
              </div>
            </div>
          </div>

          <!-- Leave Balances -->
          <div class="glass-panel details-panel" style="margin-top: 24px;">
            <h3>
              <mat-icon class="panel-icon">event_available</mat-icon> Leave
              Balances ({{ getMockEmployee().totalLeaves }} Total)
            </h3>
            <div class="leave-grid">
              <div
                class="leave-card"
                *ngFor="let leave of getMockEmployee().leaveBreakdown"
              >
                <div class="leave-header">
                  <span class="leave-type">{{ leave.type }}</span>
                  <span class="leave-count"
                    >{{ leave.available }} / {{ leave.total }}</span
                  >
                </div>
                <mat-progress-bar
                  mode="determinate"
                  [value]="(leave.available / leave.total) * 100"
                  [color]="leave.color"
                ></mat-progress-bar>
                <span class="leave-desc">Days Remaining</span>
              </div>
            </div>
          </div>

          <!-- Activity Timeline Placeholder -->
          <div class="glass-panel details-panel" style="margin-top: 24px;">
            <h3>
              <mat-icon class="panel-icon">timeline</mat-icon> Activity Timeline
            </h3>
            <div class="empty-state">
              <mat-icon class="empty-icon">pending_actions</mat-icon>
              <h4>No recent activity</h4>
              <p>
                Activity timeline module will be integrated in the next phase.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .page-container {
        padding: 32px;
        max-width: 1400px;
        margin: 0 auto;
      }

      .header-actions {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 32px;
      }

      .back-btn {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #f8fafc;
        width: 48px;
        height: 48px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }

      .back-btn:hover {
        background: rgba(99, 102, 241, 0.1);
        border-color: rgba(99, 102, 241, 0.3);
        color: #8b5cf6;
      }

      .header-titles h1 {
        margin: 0;
        font-size: 28px;
        font-weight: 700;
        background: linear-gradient(135deg, #f8fafc 0%, #cbd5e1 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      .header-titles p {
        margin: 4px 0 0;
        color: #94a3b8;
        font-size: 14px;
      }

      .grid-layout {
        display: grid;
        grid-template-columns: 380px 1fr;
        gap: 32px;
      }

      .sidebar-column {
        display: flex;
        flex-direction: column;
      }

      .glass-panel {
        background: rgba(30, 41, 59, 0.7);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 24px;
        padding: 32px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
      }

      .profile-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
      }

      .avatar-large {
        width: 120px;
        height: 120px;
        border-radius: 50%;
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 48px;
        font-weight: 700;
        font-family: 'Outfit', sans-serif;
        margin-bottom: 24px;
        box-shadow: 0 10px 25px rgba(99, 102, 241, 0.4);
        border: 4px solid rgba(30, 41, 59, 0.8);
      }

      .profile-card h2 {
        margin: 0;
        font-size: 24px;
        font-weight: 700;
        color: #f8fafc;
      }

      .role-text {
        color: #94a3b8;
        margin: 8px 0 24px;
        font-size: 14px;
      }

      .status-pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px 16px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 600;
        background: rgba(34, 197, 94, 0.1);
        color: #22c55e;
        border: 1px solid rgba(34, 197, 94, 0.2);
      }

      .pulse-dot {
        width: 8px;
        height: 8px;
        background: #22c55e;
        border-radius: 50%;
        box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
        animation: pulse 2s infinite;
      }

      @keyframes pulse {
        0% {
          transform: scale(0.95);
          box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
        }
        70% {
          transform: scale(1);
          box-shadow: 0 0 0 6px rgba(34, 197, 94, 0);
        }
        100% {
          transform: scale(0.95);
          box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
        }
      }

      .metric-row {
        display: flex;
        width: 100%;
        gap: 16px;
        margin-top: 32px;
        padding-top: 32px;
        border-top: 1px solid rgba(255, 255, 255, 0.05);
      }

      .metric-box {
        flex: 1;
        background: rgba(15, 23, 42, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 16px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .metric-value {
        font-size: 24px;
        font-weight: 700;
        color: #f8fafc;
      }

      .metric-value.shortfall {
        color: #ef4444;
      }

      .metric-value.no-shortfall {
        color: #22c55e;
      }

      .metric-label {
        font-size: 12px;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-weight: 600;
      }

      .details-panel h3 {
        display: flex;
        align-items: center;
        gap: 12px;
        margin: 0 0 24px;
        font-size: 18px;
        color: #f8fafc;
      }

      .panel-icon {
        color: #8b5cf6;
      }

      .info-list {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .info-item {
        display: flex;
        align-items: flex-start;
        gap: 16px;
      }

      .info-item mat-icon {
        color: #6366f1;
        background: rgba(99, 102, 241, 0.1);
        padding: 8px;
        border-radius: 10px;
        width: 24px;
        height: 24px;
        font-size: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .info-text {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .info-text .label {
        font-size: 12px;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .info-text .value {
        font-size: 14px;
        color: #f8fafc;
        font-weight: 500;
      }

      .employment-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 24px;
        background: rgba(15, 23, 42, 0.3);
        padding: 24px;
        border-radius: 16px;
        border: 1px solid rgba(255, 255, 255, 0.02);
      }

      .emp-stat {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .emp-stat .label {
        font-size: 12px;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .emp-stat .value {
        font-size: 15px;
        color: #f8fafc;
        font-weight: 500;
      }

      .leave-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 20px;
      }

      .leave-card {
        background: rgba(15, 23, 42, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 16px;
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .leave-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .leave-type {
        font-size: 14px;
        font-weight: 600;
        color: #f8fafc;
      }

      .leave-count {
        font-size: 16px;
        font-weight: 700;
        color: #cbd5e1;
      }

      .leave-desc {
        font-size: 12px;
        color: #94a3b8;
        text-align: right;
      }

      /* Override material progress bar */
      ::ng-deep .mat-mdc-progress-bar {
        border-radius: 4px;
        height: 8px !important;
      }
      ::ng-deep .mat-mdc-progress-bar .mdc-linear-progress__buffer-bar {
        background-color: rgba(255, 255, 255, 0.05) !important;
      }
      ::ng-deep
        .mat-mdc-progress-bar[color='primary']
        .mdc-linear-progress__bar-inner {
        border-color: #6366f1 !important;
      }
      ::ng-deep
        .mat-mdc-progress-bar[color='accent']
        .mdc-linear-progress__bar-inner {
        border-color: #22c55e !important;
      }
      ::ng-deep
        .mat-mdc-progress-bar[color='warn']
        .mdc-linear-progress__bar-inner {
        border-color: #eab308 !important;
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 48px 24px;
        background: rgba(15, 23, 42, 0.3);
        border: 1px dashed rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        text-align: center;
      }

      .empty-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: #475569;
        margin-bottom: 16px;
      }

      .empty-state h4 {
        margin: 0;
        color: #cbd5e1;
        font-weight: 500;
        font-size: 16px;
      }
      .empty-state p {
        color: #64748b;
        margin-top: 8px;
        font-size: 14px;
      }
    `,
  ],
})
export class EmployeeDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private location = inject(Location);

  employeeId: string = '';

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      this.employeeId = params.get('id') || '';
    });
  }

  goBack() {
    this.location.back();
  }

  getInitials(id: string): string {
    const mock = this.getMockEmployee();
    const parts = mock.name.split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return 'EN';
  }

  getMockEmployee() {
    // Generate some stable mock data based on ID
    if (this.employeeId === 'emp-1') {
      return {
        name: 'Sarah Connor',
        designation: 'Senior Technician',
        department: 'Field Operations',
        status: 'Active',
        shortfalls: 0,
        email: 'sarah.connor@pingforce.com',
        phone: '+1 (555) 123-4567',
        location: 'HQ Building - Floor 3',
        empId: 'EMP-0042',
        type: 'Permanent Full-time',
        joiningDate: 'Oct 12, 2023',
        manager: 'Kyle Reese',
        totalLeaves: 12,
        leaveBreakdown: [
          { type: 'Annual Leave', available: 8, total: 14, color: 'primary' },
          { type: 'Sick Leave', available: 4, total: 10, color: 'accent' },
          { type: 'Casual Leave', available: 0, total: 3, color: 'warn' },
        ],
      };
    }

    return {
      name: 'John Wick',
      designation: 'Security Specialist',
      department: 'Security',
      status: 'Active',
      shortfalls: 2,
      email: 'john.wick@pingforce.com',
      phone: '+1 (555) 987-6543',
      location: 'Continental Hub',
      empId: 'EMP-0007',
      type: 'Contract',
      joiningDate: 'Jan 01, 2024',
      manager: 'Winston Scott',
      totalLeaves: 4,
      leaveBreakdown: [
        { type: 'Annual Leave', available: 2, total: 14, color: 'primary' },
        { type: 'Sick Leave', available: 1, total: 10, color: 'accent' },
        { type: 'Casual Leave', available: 1, total: 3, color: 'warn' },
      ],
    };
  }
}
