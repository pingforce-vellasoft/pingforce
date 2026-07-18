import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AuthService } from '../../core/auth/auth.service';
import { WorkforceService } from '../../core/services/workforce.service';
import { EmployeeCreateDialogComponent } from '../workforce/dialogs/employee-create-dialog.component';
import { CustomerCreateDialogComponent } from '../customers/customer-create-dialog.component';

// Structure mirrors the mobile dashboard (DASHBOARD_SPEC.md): greeting header,
// horizontal KPI row, quick-actions grid, and an activity feed — adapted with
// admin-appropriate content. Data is illustrative until dashboard APIs land,
// matching the mobile screen which is likewise stubbed.

interface KpiTile {
  readonly id: string;
  readonly icon: string;
  readonly value: string;
  readonly label: string;
  readonly trendLabel?: string;
  readonly severity: 'normal' | 'warning' | 'critical';
  readonly route: string;
}

interface QuickAction {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
  readonly highlighted?: boolean;
  readonly action: () => void;
}

interface ActivityItem {
  readonly icon: string;
  readonly tone: 'primary' | 'warning' | 'success' | 'danger';
  readonly title: string;
  readonly subtitle?: string;
  readonly time: string;
}

@Component({
  selector: 'app-dashboard-overview',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
    MatDialogModule,
  ],
  template: `
    <div class="dashboard-overview-container">
      <!-- ── Geofence setup nudge: attendance enabled but no geofence yet ── -->
      @if (showGeofenceNudge()) {
        <div class="setup-banner" role="status">
          <mat-icon class="banner-icon">location_off</mat-icon>
          <div class="banner-text">
            <p class="banner-title">Set up a geofence first</p>
            <p class="banner-sub">
              The attendance module is enabled. Define at least one geofence
              location before you start adding employees, so their check-ins can
              be validated.
            </p>
          </div>
          <div class="banner-actions">
            <button
              mat-flat-button
              class="banner-cta"
              routerLink="/dashboard/settings/geofences"
            >
              <mat-icon>add_location_alt</mat-icon> Configure geofence
            </button>
            <button
              mat-icon-button
              class="banner-close"
              aria-label="Dismiss"
              (click)="dismissGeofenceNudge()"
            >
              <mat-icon>close</mat-icon>
            </button>
          </div>
        </div>
      }

      <!-- ── Header: avatar + greeting + date + bell ─────────────────────── -->
      <header class="dash-header">
        <div class="user-block">
          <div class="avatar">{{ initials() }}</div>
          <div class="greet">
            <h1>
              {{ greeting() }},
              <span class="name">{{ displayName() }}</span>
              {{ greetingEmoji() }}
            </h1>
            <p class="date">{{ today }}</p>
          </div>
        </div>
        <button
          mat-icon-button
          class="bell"
          aria-label="Notifications"
          matBadge="3"
          matBadgeColor="warn"
          matBadgeSize="small"
        >
          <mat-icon>notifications</mat-icon>
        </button>
      </header>

      <!-- ── KPI cards: responsive grid, first tile is the hero ──────────── -->
      <section class="kpi-grid">
        @for (kpi of kpiCards; track kpi.id; let first = $first) {
          <div
            class="kpi-tile glass-card"
            [class.hero]="first"
            [class.warning]="kpi.severity === 'warning'"
            [class.critical]="kpi.severity === 'critical'"
            [routerLink]="kpi.route"
          >
            <div class="kpi-top">
              <span class="kpi-icon-wrap">
                <mat-icon class="kpi-icon">{{ kpi.icon }}</mat-icon>
              </span>
              <mat-icon class="kpi-chevron">arrow_forward_ios</mat-icon>
            </div>
            <div class="kpi-body">
              <div class="kpi-value">{{ kpi.value }}</div>
              <div class="kpi-label">{{ kpi.label }}</div>
              @if (kpi.trendLabel) {
                <div class="kpi-trend">
                  <mat-icon class="trend-dot">{{ trendIcon(kpi) }}</mat-icon>
                  {{ kpi.trendLabel }}
                </div>
              }
            </div>
          </div>
        }
      </section>

      <!-- ── Quick Actions grid ──────────────────────────────────────────── -->
      <section class="section">
        <div class="section-header">
          <h2>Quick Actions</h2>
        </div>
        <div class="qa-grid">
          @for (qa of quickActions; track qa.id) {
            <button
              class="qa-cell"
              [class.highlighted]="qa.highlighted"
              (click)="qa.action()"
            >
              <span class="qa-icon">
                <mat-icon>{{ qa.icon }}</mat-icon>
              </span>
              <span class="qa-label">{{ qa.label }}</span>
            </button>
          }
        </div>
      </section>

      <!-- ── Today's Activity feed ───────────────────────────────────────── -->
      <section class="section">
        <div class="section-header">
          <h2>Today's Activity</h2>
          <button
            mat-button
            color="primary"
            routerLink="/dashboard/workforce/attendance"
          >
            See All
          </button>
        </div>
        <div class="feed glass-card">
          @for (item of activity; track item.title; let last = $last) {
            <div
              class="feed-row"
              [class]="'rail-' + item.tone"
              [class.no-border]="last"
            >
              <span class="feed-icon" [class]="'tone-' + item.tone">
                <mat-icon>{{ item.icon }}</mat-icon>
              </span>
              <div class="feed-text">
                <p class="feed-title">{{ item.title }}</p>
                @if (item.subtitle) {
                  <p class="feed-sub">{{ item.subtitle }}</p>
                }
              </div>
              <span class="feed-time">
                <mat-icon class="clock">schedule</mat-icon>
                {{ item.time }}
              </span>
            </div>
          } @empty {
            <div class="feed-empty">
              <mat-icon>inbox</mat-icon>
              <p>No activity yet today</p>
            </div>
          }
        </div>
      </section>
    </div>
  `,
  styles: [
    `
      .dashboard-overview-container {
        padding: 32px;
        display: flex;
        flex-direction: column;
        gap: 28px;
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

      .glass-card {
        background: rgba(30, 41, 59, 0.4);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.05);
        box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.2);
      }

      /* ── Setup nudge banner ── */
      .setup-banner {
        display: flex;
        align-items: flex-start;
        gap: 16px;
        padding: 16px 20px;
        border-radius: 14px;
        background: rgba(245, 158, 11, 0.1);
        border: 1px solid rgba(245, 158, 11, 0.3);
      }
      .banner-icon {
        color: #fbbf24;
        font-size: 26px;
        width: 26px;
        height: 26px;
        flex-shrink: 0;
        margin-top: 2px;
      }
      .banner-text {
        flex: 1;
      }
      .banner-title {
        margin: 0;
        font-size: 15px;
        font-weight: 700;
        color: #fcd34d;
      }
      .banner-sub {
        margin: 4px 0 0;
        font-size: 13px;
        line-height: 1.5;
        color: #cbd5e1;
      }
      .banner-actions {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;
      }
      .banner-cta {
        background: linear-gradient(135deg, #f59e0b, #d97706) !important;
        color: #1e293b !important;
        font-weight: 600 !important;
        border-radius: 10px !important;
      }
      .banner-close {
        color: #cbd5e1;
      }
      @media (max-width: 720px) {
        .setup-banner {
          flex-direction: column;
        }
        .banner-actions {
          align-self: stretch;
          justify-content: space-between;
        }
      }

      /* ── Header ── */
      .dash-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .user-block {
        display: flex;
        align-items: center;
        gap: 16px;
      }
      .avatar {
        width: 52px;
        height: 52px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 18px;
        color: #c7d2fe;
        background: rgba(99, 102, 241, 0.18);
        border: 1px solid rgba(99, 102, 241, 0.35);
      }
      .greet h1 {
        margin: 0;
        font-size: 22px;
        font-weight: 500;
        color: #e2e8f0;
        letter-spacing: -0.3px;
      }
      .greet h1 .name {
        font-weight: 700;
        color: #f8fafc;
      }
      .greet .date {
        margin: 2px 0 0;
        color: #94a3b8;
        font-size: 13px;
      }
      .bell {
        color: #cbd5e1;
      }

      /* ── KPI grid: responsive, no horizontal scroll ── */
      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
        gap: 16px;
      }
      .kpi-tile {
        position: relative;
        border-radius: 18px;
        padding: 20px;
        display: flex;
        flex-direction: column;
        min-height: 150px;
        cursor: pointer;
        overflow: hidden;
        transition:
          transform 0.25s ease,
          box-shadow 0.25s ease,
          border-color 0.25s ease;
      }
      /* Hero tile spans two columns and reads first. */
      .kpi-tile.hero {
        grid-column: span 2;
        background: linear-gradient(
          135deg,
          rgba(99, 102, 241, 0.22),
          rgba(30, 41, 59, 0.5)
        );
        border-color: rgba(99, 102, 241, 0.3);
      }
      .kpi-tile.hero::after {
        content: '';
        position: absolute;
        right: -40px;
        top: -40px;
        width: 160px;
        height: 160px;
        border-radius: 50%;
        background: radial-gradient(
          circle,
          rgba(129, 140, 248, 0.18),
          transparent 70%
        );
        pointer-events: none;
      }
      .kpi-tile:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 40px 0 rgba(0, 0, 0, 0.3);
        border-color: rgba(255, 255, 255, 0.14);
      }
      .kpi-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .kpi-icon-wrap {
        width: 42px;
        height: 42px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(99, 102, 241, 0.14);
      }
      .kpi-icon {
        color: #818cf8;
        font-size: 22px;
        width: 22px;
        height: 22px;
      }
      .kpi-chevron {
        color: #64748b;
        font-size: 13px;
        width: 13px;
        height: 13px;
        transition: transform 0.2s ease;
      }
      .kpi-tile:hover .kpi-chevron {
        transform: translateX(3px);
        color: #94a3b8;
      }
      .kpi-body {
        margin-top: auto;
        padding-top: 16px;
      }
      .kpi-value {
        font-size: 30px;
        font-weight: 700;
        color: #f8fafc;
        letter-spacing: -1px;
        line-height: 1.1;
      }
      .kpi-tile.hero .kpi-value {
        font-size: 42px;
      }
      .kpi-label {
        margin-top: 3px;
        color: #94a3b8;
        font-size: 13px;
        font-weight: 500;
      }
      .kpi-trend {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        margin-top: 8px;
        font-size: 12px;
        font-weight: 500;
        color: #34d399;
      }
      .trend-dot {
        font-size: 15px;
        width: 15px;
        height: 15px;
      }
      /* Severity recoloring of the whole tile accent. */
      .kpi-tile.warning .kpi-icon-wrap {
        background: rgba(245, 158, 11, 0.15);
      }
      .kpi-tile.warning .kpi-icon,
      .kpi-tile.warning .kpi-trend {
        color: #fbbf24;
      }
      .kpi-tile.critical .kpi-icon-wrap {
        background: rgba(239, 68, 68, 0.15);
      }
      .kpi-tile.critical .kpi-icon,
      .kpi-tile.critical .kpi-trend {
        color: #f87171;
      }

      /* On narrow screens the hero should not eat two skinny columns. */
      @media (max-width: 640px) {
        .kpi-tile.hero {
          grid-column: span 1;
        }
        .kpi-tile.hero .kpi-value {
          font-size: 34px;
        }
      }

      /* ── Sections ── */
      .section {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .section-header h2 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #f1f5f9;
      }

      /* ── Quick actions grid ── */
      .qa-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
        gap: 12px;
      }
      .qa-cell {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 14px 16px;
        border-radius: 14px;
        background: rgba(30, 41, 59, 0.4);
        border: 1px solid rgba(255, 255, 255, 0.06);
        cursor: pointer;
        text-align: left;
        transition:
          transform 0.12s ease,
          background 0.2s ease,
          border-color 0.2s ease;
      }
      .qa-cell:hover {
        border-color: rgba(99, 102, 241, 0.35);
        background: rgba(51, 65, 85, 0.5);
      }
      .qa-cell:active {
        transform: scale(0.97);
      }
      .qa-cell.highlighted {
        background: rgba(99, 102, 241, 0.15);
        border-color: rgba(99, 102, 241, 0.4);
      }
      .qa-icon {
        width: 42px;
        height: 42px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(99, 102, 241, 0.12);
      }
      .qa-icon mat-icon {
        color: #818cf8;
        font-size: 22px;
        width: 22px;
        height: 22px;
      }
      .qa-label {
        color: #e2e8f0;
        font-size: 14px;
        font-weight: 500;
      }
      .qa-cell.highlighted .qa-label {
        font-weight: 700;
        color: #f8fafc;
      }

      /* ── Activity feed ── */
      .feed {
        border-radius: 16px;
        overflow: hidden;
        padding: 6px;
      }
      .feed-row {
        position: relative;
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 14px 18px 14px 20px;
        border-radius: 12px;
        transition: background 0.18s ease;
      }
      .feed-row:hover {
        background: rgba(255, 255, 255, 0.03);
      }
      /* Colored left rail keyed to the item tone. */
      .feed-row::before {
        content: '';
        position: absolute;
        left: 6px;
        top: 14px;
        bottom: 14px;
        width: 3px;
        border-radius: 3px;
        background: currentColor;
        opacity: 0.5;
      }
      .rail-primary::before {
        color: #818cf8;
      }
      .rail-warning::before {
        color: #fbbf24;
      }
      .rail-success::before {
        color: #34d399;
      }
      .rail-danger::before {
        color: #f87171;
      }
      .feed-icon {
        width: 38px;
        height: 38px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .feed-icon mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
      .tone-primary {
        background: rgba(99, 102, 241, 0.15);
        color: #818cf8;
      }
      .tone-warning {
        background: rgba(245, 158, 11, 0.15);
        color: #fbbf24;
      }
      .tone-success {
        background: rgba(16, 185, 129, 0.15);
        color: #34d399;
      }
      .tone-danger {
        background: rgba(239, 68, 68, 0.15);
        color: #f87171;
      }
      .feed-text {
        flex: 1;
        min-width: 0;
      }
      .feed-title {
        margin: 0;
        color: #e2e8f0;
        font-size: 14px;
        font-weight: 500;
        line-height: 1.4;
      }
      .feed-sub {
        margin: 2px 0 0;
        color: #94a3b8;
        font-size: 13px;
      }
      .feed-time {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        flex-shrink: 0;
        color: #64748b;
        font-size: 12px;
        white-space: nowrap;
      }
      .feed-time .clock {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }
      /* Hide the timestamp label on very narrow widths, keep layout clean. */
      @media (max-width: 560px) {
        .feed-time {
          display: none;
        }
      }
      .feed-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding: 40px 20px;
        color: #64748b;
      }
      .feed-empty mat-icon {
        font-size: 34px;
        width: 34px;
        height: 34px;
        opacity: 0.5;
      }
      .feed-empty p {
        margin: 0;
        font-size: 14px;
      }

      @media (max-width: 720px) {
        .dashboard-overview-container {
          padding: 20px;
        }
      }
    `,
  ],
})
export class DashboardOverviewComponent implements OnInit {
  private dialog = inject(MatDialog);
  private auth = inject(AuthService);
  private router = inject(Router);
  private workforce = inject(WorkforceService);

  today = this.formatDate(new Date());

  /** True once the geofence count has loaded and is zero. */
  private hasNoGeofence = signal(false);
  /** User dismissed the nudge for this tenant (persisted in localStorage). */
  private nudgeDismissed = signal(false);

  /**
   * Nudge shows only when the attendance module is enabled for the tenant, no
   * geofence is configured yet, and the user has not dismissed it.
   */
  showGeofenceNudge = computed(
    () =>
      !!this.auth.currentUser()?.isAttendanceEnabled &&
      this.hasNoGeofence() &&
      !this.nudgeDismissed(),
  );

  ngOnInit(): void {
    // Only bother checking geofences when the module is actually enabled.
    if (!this.auth.currentUser()?.isAttendanceEnabled) return;
    this.nudgeDismissed.set(this.readDismissed());
    this.workforce.getGeofences().subscribe({
      next: (list) => this.hasNoGeofence.set((list?.length ?? 0) === 0),
      error: () => this.hasNoGeofence.set(false),
    });
  }

  dismissGeofenceNudge(): void {
    this.nudgeDismissed.set(true);
    localStorage.setItem(this.dismissKey(), '1');
  }

  private dismissKey(): string {
    const tenant = this.auth.currentUser()?.tenantId ?? 'unknown';
    return `pingforce_geofence_nudge_dismissed_${tenant}`;
  }

  private readDismissed(): boolean {
    return localStorage.getItem(this.dismissKey()) === '1';
  }

  displayName = computed(() => {
    const email = this.auth.currentUser()?.email ?? '';
    const local = email.split('@')[0] || 'Admin';
    return local.charAt(0).toUpperCase() + local.slice(1);
  });

  initials = computed(() => {
    const name = this.displayName();
    return name.slice(0, 2).toUpperCase();
  });

  greeting = computed(() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return 'Good Morning';
    if (h >= 12 && h < 17) return 'Good Afternoon';
    if (h >= 17 && h < 21) return 'Good Evening';
    return 'Good Night';
  });

  greetingEmoji = computed(() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return '🌅';
    if (h >= 12 && h < 17) return '☀️';
    if (h >= 17 && h < 21) return '🌆';
    return '🌙';
  });

  readonly kpiCards: KpiTile[] = [
    {
      id: 'workforce',
      icon: 'groups',
      value: '1,248',
      label: 'Total Workforce',
      trendLabel: '+12% this month',
      severity: 'normal',
      route: '/dashboard/workforce/employees',
    },
    {
      id: 'leaves',
      icon: 'event_busy',
      value: '24',
      label: 'Pending Leaves',
      trendLabel: '5 need review',
      severity: 'warning',
      route: '/dashboard/workforce/leaves',
    },
    {
      id: 'attendance',
      icon: 'access_time',
      value: '96%',
      label: 'Attendance Today',
      trendLabel: 'On Track',
      severity: 'normal',
      route: '/dashboard/workforce/attendance',
    },
    {
      id: 'customers',
      icon: 'apartment',
      value: '312',
      label: 'Active Customers',
      trendLabel: '+8 new',
      severity: 'normal',
      route: '/dashboard/customers',
    },
    {
      id: 'visits',
      icon: 'where_to_vote',
      value: '47',
      label: 'Field Visits',
      trendLabel: '3 overdue',
      severity: 'critical',
      route: '/dashboard/workforce/visits',
    },
  ];

  readonly quickActions: QuickAction[] = [
    {
      id: 'new-employee',
      label: 'New Employee',
      icon: 'person_add',
      highlighted: true,
      action: () => this.openEmployee(),
    },
    {
      id: 'new-customer',
      label: 'New Customer',
      icon: 'apartment',
      action: () => this.openCustomer(),
    },
    {
      id: 'attendance',
      label: 'Attendance Logs',
      icon: 'access_time',
      action: () => this.go('/dashboard/workforce/attendance'),
    },
    {
      id: 'leaves',
      label: 'Leave Approvals',
      icon: 'event_available',
      action: () => this.go('/dashboard/workforce/leaves'),
    },
    {
      id: 'visits',
      label: 'Field Visits',
      icon: 'where_to_vote',
      action: () => this.go('/dashboard/workforce/visits'),
    },
    {
      id: 'map',
      label: 'Connection Map',
      icon: 'share_location',
      action: () => this.go('/dashboard/network/map'),
    },
    {
      id: 'reports',
      label: 'Reports & KPIs',
      icon: 'insights',
      action: () => this.go('/dashboard/reports'),
    },
    {
      id: 'roles',
      label: 'Roles & Permissions',
      icon: 'admin_panel_settings',
      action: () => this.go('/dashboard/rbac/roles'),
    },
  ];

  readonly activity: ActivityItem[] = [
    {
      icon: 'person_add',
      tone: 'primary',
      title: 'Sarah Jenkins joined Engineering',
      subtitle: 'New employee onboarded',
      time: '10 minutes ago',
    },
    {
      icon: 'flight_takeoff',
      tone: 'warning',
      title: 'Mike Ross submitted a leave request',
      subtitle: 'Awaiting approval',
      time: '1 hour ago',
    },
    {
      icon: 'check_circle',
      tone: 'success',
      title: 'Jessica Pearson approved payroll cycle',
      time: '3 hours ago',
    },
    {
      icon: 'error_outline',
      tone: 'danger',
      title: 'SLA breached on Ticket #492',
      subtitle: 'Requires immediate attention',
      time: '5 hours ago',
    },
  ];

  openEmployee() {
    this.dialog.open(EmployeeCreateDialogComponent, {
      panelClass: 'premium-dialog-panel',
    });
  }

  openCustomer() {
    this.dialog.open(CustomerCreateDialogComponent, {
      panelClass: 'premium-dialog-panel',
    });
  }

  private go(route: string) {
    this.router.navigateByUrl(route);
  }

  /** Small trend glyph shown before the trend label, keyed off severity. */
  trendIcon(kpi: KpiTile): string {
    if (kpi.severity === 'critical') return 'error_outline';
    if (kpi.severity === 'warning') return 'schedule';
    return 'trending_up';
  }

  private formatDate(d: Date): string {
    const weekdays = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return `${weekdays[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }
}
