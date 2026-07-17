import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { NgClass, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { PlatformService } from '../../core/services/platform.service';

interface BillingSummary {
  mrr: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  pastDueSubscriptions: number;
  cancelledSubscriptions: number;
  churnRate: number;
  revenueLast30d: number;
}

interface PlanMixRow {
  planCode: string;
  planName: string;
  count: number;
  mrr: number;
}

/**
 * Super-Admin billing & subscriptions: platform revenue analytics plus a live
 * subscription roster. Smart component — all data via PlatformService. Amounts
 * arrive in paise and are rendered as rupees.
 */
@Component({
  selector: 'app-platform-billing',
  standalone: true,
  imports: [
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressBarModule,
    NgClass,
    DatePipe,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2 class="page-title">Billing & Subscriptions</h2>
          <p class="page-subtitle">
            Platform revenue, plan mix and every tenant subscription in one
            view.
          </p>
        </div>
      </div>

      <!-- ── KPI cards ── -->
      <div class="stats-grid">
        <mat-card class="stat-card">
          <div class="stat-icon-wrapper success-bg">
            <mat-icon>payments</mat-icon>
          </div>
          <div class="stat-content">
            <span class="stat-label">Monthly Recurring Revenue</span>
            <span class="stat-value">{{ rupees(summary().mrr) }}</span>
          </div>
        </mat-card>

        <mat-card class="stat-card">
          <div class="stat-icon-wrapper primary-bg">
            <mat-icon>autorenew</mat-icon>
          </div>
          <div class="stat-content">
            <span class="stat-label">Active Subscriptions</span>
            <span class="stat-value">{{ summary().activeSubscriptions }}</span>
          </div>
        </mat-card>

        <mat-card class="stat-card">
          <div class="stat-icon-wrapper info-bg">
            <mat-icon>trending_up</mat-icon>
          </div>
          <div class="stat-content">
            <span class="stat-label">Revenue (30 days)</span>
            <span class="stat-value">{{
              rupees(summary().revenueLast30d)
            }}</span>
          </div>
        </mat-card>

        <mat-card class="stat-card">
          <div class="stat-icon-wrapper warning-bg">
            <mat-icon>trending_down</mat-icon>
          </div>
          <div class="stat-content">
            <span class="stat-label">Churn Rate</span>
            <span class="stat-value">{{ churnPct() }}%</span>
          </div>
        </mat-card>
      </div>

      <!-- ── Plan mix ── -->
      <mat-card class="panel">
        <h3 class="panel-title">Active plan mix</h3>
        @if (planMix().length === 0) {
          <p class="empty">No active subscriptions yet.</p>
        } @else {
          <div class="mix-list">
            @for (row of planMix(); track row.planCode) {
              <div class="mix-row">
                <div class="mix-head">
                  <span class="mix-name">{{ row.planName }}</span>
                  <span class="mix-meta"
                    >{{ row.count }} tenants · {{ rupees(row.mrr) }}/mo</span
                  >
                </div>
                <mat-progress-bar
                  mode="determinate"
                  [value]="mixShare(row)"
                ></mat-progress-bar>
              </div>
            }
          </div>
        }
      </mat-card>

      <!-- ── Subscriptions table ── -->
      <mat-card class="table-card">
        <h3 class="panel-title in-table">Subscriptions</h3>
        <table
          mat-table
          [dataSource]="subscriptions()"
          class="full-width-table"
        >
          <ng-container matColumnDef="tenant">
            <th mat-header-cell *matHeaderCellDef>Tenant</th>
            <td mat-cell *matCellDef="let s">
              <div class="cell-stack">
                <span class="cell-primary">{{ s.tenant?.name || '—' }}</span>
                <span class="cell-secondary">{{ s.tenant?.code }}</span>
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="plan">
            <th mat-header-cell *matHeaderCellDef>Plan</th>
            <td mat-cell *matCellDef="let s">{{ s.plan?.name || s.planId }}</td>
          </ng-container>

          <ng-container matColumnDef="amount">
            <th mat-header-cell *matHeaderCellDef>Amount</th>
            <td mat-cell *matCellDef="let s">{{ rupees(s.amount) }}</td>
          </ng-container>

          <ng-container matColumnDef="gateway">
            <th mat-header-cell *matHeaderCellDef>Gateway</th>
            <td mat-cell *matCellDef="let s">{{ s.gateway }}</td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let s">
              <span class="status-badge" [ngClass]="s.status.toLowerCase()">{{
                s.status
              }}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="renewsAt">
            <th mat-header-cell *matHeaderCellDef>Renews</th>
            <td mat-cell *matCellDef="let s">
              {{ s.currentPeriodEnd ? (s.currentPeriodEnd | date) : '—' }}
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let s">
              @if (s.status === 'ACTIVE' || s.status === 'PAST_DUE') {
                <button
                  mat-button
                  color="warn"
                  (click)="cancel(s)"
                  [disabled]="cancelling() === s.id"
                >
                  Cancel
                </button>
              }
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns"></tr>
        </table>
        @if (subscriptions().length === 0) {
          <p class="empty in-table">No subscriptions to show.</p>
        }
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
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
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
      }
      .stat-value {
        font-size: 26px;
        font-weight: 700;
        color: var(--text-primary);
        line-height: 1.1;
      }
      .panel {
        padding: 24px !important;
        margin-bottom: 32px;
      }
      .panel-title {
        font-size: 18px;
        font-weight: 700;
        color: var(--text-primary);
        margin: 0 0 20px 0;
      }
      .panel-title.in-table {
        padding: 24px 24px 0 24px;
      }
      .mix-list {
        display: flex;
        flex-direction: column;
        gap: 18px;
      }
      .mix-head {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
      }
      .mix-name {
        font-weight: 600;
        color: var(--text-primary);
      }
      .mix-meta {
        font-size: 13px;
        color: var(--text-secondary);
      }
      .table-card {
        overflow: hidden;
        padding: 0 !important;
      }
      .full-width-table {
        width: 100%;
      }
      .cell-stack {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .cell-primary {
        font-size: 14px;
        color: var(--text-primary);
      }
      .cell-secondary {
        font-size: 12px;
        color: var(--text-secondary);
        font-family: monospace;
      }
      .status-badge {
        font-size: 11px;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 12px;
        text-transform: uppercase;
      }
      .status-badge.active {
        background: rgba(16, 185, 129, 0.1);
        color: #10b981;
      }
      .status-badge.created,
      .status-badge.authenticated {
        background: rgba(245, 158, 11, 0.1);
        color: #f59e0b;
      }
      .status-badge.past_due {
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;
      }
      .status-badge.cancelled,
      .status-badge.expired,
      .status-badge.paused {
        background: rgba(100, 116, 139, 0.1);
        color: #94a3b8;
      }
      .empty {
        color: var(--text-secondary);
        font-style: italic;
      }
      .empty.in-table {
        padding: 0 24px 24px 24px;
      }
    `,
  ],
})
export class BillingComponent implements OnInit {
  private platform = inject(PlatformService);
  private snackBar = inject(MatSnackBar);

  readonly summary = signal<BillingSummary>({
    mrr: 0,
    activeSubscriptions: 0,
    trialSubscriptions: 0,
    pastDueSubscriptions: 0,
    cancelledSubscriptions: 0,
    churnRate: 0,
    revenueLast30d: 0,
  });
  readonly planMix = signal<PlanMixRow[]>([]);
  readonly subscriptions = signal<any[]>([]);
  readonly cancelling = signal<string | null>(null);

  readonly churnPct = computed(
    () => Math.round(this.summary().churnRate * 1000) / 10,
  );

  readonly columns = [
    'tenant',
    'plan',
    'amount',
    'gateway',
    'status',
    'renewsAt',
    'actions',
  ];

  ngOnInit(): void {
    this.load();
  }

  /** Paise → "₹1,234" for display. */
  rupees(paise: number): string {
    const value = (paise ?? 0) / 100;
    return `₹${value.toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  }

  mixShare(row: PlanMixRow): number {
    const total = this.planMix().reduce((s, r) => s + r.mrr, 0);
    return total === 0 ? 0 : Math.round((row.mrr / total) * 100);
  }

  private load(): void {
    this.platform.getBillingSummary().subscribe({
      next: (s) => this.summary.set(s),
      error: () => this.notifyLoadError(),
    });
    this.platform.getPlanMix().subscribe({
      next: (m) => this.planMix.set(m),
      error: () => this.notifyLoadError(),
    });
    this.platform.getSubscriptions().subscribe({
      next: (subs) => this.subscriptions.set(subs),
      error: () => this.notifyLoadError(),
    });
  }

  cancel(sub: any): void {
    this.cancelling.set(sub.id);
    this.platform.cancelSubscription(sub.id).subscribe({
      next: () => {
        this.snackBar.open('Subscription cancelled', 'Close', {
          duration: 3000,
        });
        this.cancelling.set(null);
        this.load();
      },
      error: () => {
        this.cancelling.set(null);
        this.snackBar.open('Failed to cancel subscription', 'Close', {
          duration: 3000,
        });
      },
    });
  }

  private notifyLoadError(): void {
    this.snackBar.open('Failed to load billing data', 'Close', {
      duration: 3000,
    });
  }
}
