import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute } from '@angular/router';
import { EmployeeDetailsService } from './employee-details.service';

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
  providers: [EmployeeDetailsService],
  template: `
    <div class="page-container">
      <div class="header-actions">
        <button mat-icon-button class="back-btn" (click)="goBack()">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <div class="header-titles">
          <h1>Employee Details</h1>
          <p>Profile, employment and leave entitlements</p>
        </div>
      </div>

      @if (page.loading()) {
        <mat-progress-bar mode="indeterminate"></mat-progress-bar>
      }
      @if (page.error()) {
        <p class="banner error" role="alert">{{ page.error() }}</p>
      }
      @if (page.message()) {
        <p class="banner ok" role="status">{{ page.message() }}</p>
      }

      @if (page.employee(); as e) {
        <div class="grid-layout">
          <div class="sidebar-column">
            <div class="glass-panel profile-card">
              <div class="avatar-large">
                {{ initials(e.firstName, e.lastName) }}
              </div>
              <h2>{{ e.firstName }} {{ e.lastName }}</h2>
              <p class="role-text">
                {{ e.designation?.name || 'No designation' }} &bull;
                {{ e.department?.name || 'No department' }}
              </p>
              <div class="status-pill active">
                <div class="pulse-dot"></div>
                {{ e.employmentStatus || 'ACTIVE' }}
              </div>
            </div>

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
                    <span class="value">{{ e.primaryEmail || '—' }}</span>
                  </div>
                </div>
                <div class="info-item">
                  <mat-icon>phone</mat-icon>
                  <div class="info-text">
                    <span class="label">Phone Number</span>
                    <span class="value">{{ e.primaryMobile || '—' }}</span>
                  </div>
                </div>
                <div class="info-item">
                  <mat-icon>location_on</mat-icon>
                  <div class="info-text">
                    <span class="label">Branch</span>
                    <span class="value">{{ e.branch?.name || '—' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="details-column">
            <div class="glass-panel details-panel">
              <h3>
                <mat-icon class="panel-icon">badge</mat-icon> Employment Details
              </h3>
              <div class="employment-grid">
                <div class="emp-stat">
                  <span class="label">Employee ID</span>
                  <span class="value">{{ e.employeeCode }}</span>
                </div>
                <div class="emp-stat">
                  <span class="label">Employment Type</span>
                  <span class="value">{{ e.employmentType || '—' }}</span>
                </div>
                <div class="emp-stat">
                  <span class="label">Joining Date</span>
                  <span class="value">{{
                    e.joiningDate ? (e.joiningDate | date: 'mediumDate') : '—'
                  }}</span>
                </div>
                <div class="emp-stat">
                  <span class="label">Reporting Manager</span>
                  <span class="value">{{
                    e.reportingManager
                      ? e.reportingManager.firstName +
                        ' ' +
                        e.reportingManager.lastName
                      : '—'
                  }}</span>
                </div>
              </div>
            </div>

            <div class="glass-panel details-panel" style="margin-top: 24px;">
              <h3>
                <mat-icon class="panel-icon">event_available</mat-icon> Leave
                Balances ({{ page.totalAvailable() }} available)
                <span class="year-switch">
                  <button
                    mat-icon-button
                    aria-label="Previous year"
                    (click)="page.changeYear(e.id, page.year() - 1)"
                  >
                    <mat-icon>chevron_left</mat-icon>
                  </button>
                  {{ page.year() }}
                  <button
                    mat-icon-button
                    aria-label="Next year"
                    (click)="page.changeYear(e.id, page.year() + 1)"
                  >
                    <mat-icon>chevron_right</mat-icon>
                  </button>
                </span>
              </h3>
              @if (page.entitlements().length === 0) {
                <p class="leave-desc">
                  No leave types yet. Add them under Master Data first.
                </p>
              }
              <div class="leave-grid">
                @for (row of page.entitlements(); track row.type.id) {
                  <div class="leave-card">
                    <div class="leave-header">
                      <span class="leave-type">{{ row.type.name }}</span>
                      <span class="leave-count"
                        >{{ row.balance?.availableDays ?? 0 }} /
                        {{ row.balance?.totalDays ?? 0 }}</span
                      >
                    </div>
                    <mat-progress-bar
                      mode="determinate"
                      [value]="percent(row.balance)"
                    ></mat-progress-bar>
                    <span class="leave-desc">
                      {{ row.balance?.usedDays ?? 0 }} used &bull;
                      {{ row.balance?.reservedDays ?? 0 }} pending
                    </span>
                    <label class="entitle">
                      Entitlement (days)
                      <input
                        #days
                        type="number"
                        min="0"
                        max="366"
                        step="0.5"
                        [value]="row.balance?.totalDays ?? 0"
                        [attr.aria-label]="row.type.name + ' entitlement'"
                      />
                      <button
                        mat-stroked-button
                        type="button"
                        [disabled]="page.saving() !== null"
                        (click)="save(e.id, row.type.id, days.value)"
                      >
                        {{ page.saving() === row.type.id ? 'Saving…' : 'Save' }}
                      </button>
                    </label>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      }
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
      .banner {
        padding: 12px 16px;
        border-radius: 12px;
        margin: 0 0 16px;
      }
      .banner.error {
        background: rgba(239, 68, 68, 0.12);
        color: #fca5a5;
      }
      .banner.ok {
        background: rgba(34, 197, 94, 0.12);
        color: #86efac;
      }
      .year-switch {
        margin-left: auto;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 14px;
        color: #cbd5e1;
      }
      .entitle {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        color: #94a3b8;
      }
      .entitle input {
        width: 72px;
        padding: 6px 8px;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.15);
        background: rgba(15, 23, 42, 0.6);
        color: #f8fafc;
      }
      @media (max-width: 960px) {
        .grid-layout {
          grid-template-columns: 1fr;
        }
        .leave-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class EmployeeDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  readonly page = inject(EmployeeDetailsService);

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) this.page.load(id);
    });
  }

  save(employeeId: string, leaveTypeId: string, value: string): void {
    // An empty box is not "0 days": let the range check reject it.
    const days = value.trim() === '' ? Number.NaN : Number(value);
    this.page.setEntitlement(employeeId, leaveTypeId, days);
  }

  goBack(): void {
    this.location.back();
  }

  initials(first: string, last: string): string {
    return ((first?.[0] ?? '') + (last?.[0] ?? '')).toUpperCase() || '?';
  }

  percent(
    balance: { availableDays: number; totalDays: number } | null,
  ): number {
    return balance && balance.totalDays > 0
      ? (balance.availableDays / balance.totalDays) * 100
      : 0;
  }
}
