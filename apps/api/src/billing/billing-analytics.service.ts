import { Inject, Injectable } from '@nestjs/common';
import { IPrismaService } from '@pingforce-monorepo/shared';

export interface BillingSummary {
  /** Monthly recurring revenue in smallest currency unit (paise). */
  readonly mrr: number;
  readonly activeSubscriptions: number;
  readonly trialSubscriptions: number;
  readonly pastDueSubscriptions: number;
  readonly cancelledSubscriptions: number;
  /** Cancelled ÷ (active + cancelled) as a 0–1 ratio. */
  readonly churnRate: number;
  /** Captured revenue over the last 30 days (paise). */
  readonly revenueLast30d: number;
}

export interface PlanMixRow {
  readonly planCode: string;
  readonly planName: string;
  readonly count: number;
  readonly mrr: number;
}

export interface RevenuePoint {
  readonly month: string; // YYYY-MM
  readonly amount: number;
}

/**
 * Read-only billing analytics for the Super-Admin dashboard. All figures are
 * platform-wide (no tenant scoping — this is the platform owner's view).
 */
@Injectable()
export class BillingAnalyticsService {
  constructor(
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
  ) {}

  async summary(): Promise<BillingSummary> {
    const [active, trial, pastDue, cancelled] = await Promise.all([
      this.countByStatus('ACTIVE'),
      this.countByStatus('AUTHENTICATED'),
      this.countByStatus('PAST_DUE'),
      this.countByStatus('CANCELLED'),
    ]);

    const mrrAgg = await this.prisma.tenantSubscription.aggregate({
      where: { status: 'ACTIVE', deletedAt: null },
      _sum: { amount: true },
    });

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const revAgg = await this.prisma.paymentTransaction.aggregate({
      where: { status: 'CAPTURED', paidAt: { gte: since } },
      _sum: { amount: true },
    });

    const denom = active + cancelled;
    return {
      mrr: mrrAgg._sum.amount ?? 0,
      activeSubscriptions: active,
      trialSubscriptions: trial,
      pastDueSubscriptions: pastDue,
      cancelledSubscriptions: cancelled,
      churnRate: denom === 0 ? 0 : cancelled / denom,
      revenueLast30d: revAgg._sum.amount ?? 0,
    };
  }

  async planMix(): Promise<PlanMixRow[]> {
    const grouped = await this.prisma.tenantSubscription.groupBy({
      by: ['planId'],
      where: { status: 'ACTIVE', deletedAt: null },
      _count: { _all: true },
      _sum: { amount: true },
    });
    if (grouped.length === 0) return [];

    const plans = await this.prisma.plan.findMany({
      where: { id: { in: grouped.map((g) => g.planId) } },
      select: { id: true, code: true, name: true },
    });
    const planById = new Map(plans.map((p) => [p.id, p]));

    return grouped
      .map((g) => {
        const plan = planById.get(g.planId);
        return {
          planCode: plan?.code ?? 'unknown',
          planName: plan?.name ?? 'Unknown',
          count: g._count._all,
          mrr: g._sum.amount ?? 0,
        };
      })
      .sort((a, b) => b.mrr - a.mrr);
  }

  /** Captured revenue grouped by calendar month for the last `months` months. */
  async revenueTrend(months = 6): Promise<RevenuePoint[]> {
    const since = new Date();
    since.setMonth(since.getMonth() - (months - 1));
    since.setDate(1);
    since.setHours(0, 0, 0, 0);

    const txns = await this.prisma.paymentTransaction.findMany({
      where: { status: 'CAPTURED', paidAt: { gte: since } },
      select: { amount: true, paidAt: true },
    });

    const buckets = new Map<string, number>();
    for (let i = 0; i < months; i++) {
      const d = new Date(since);
      d.setMonth(since.getMonth() + i);
      buckets.set(this.monthKey(d), 0);
    }
    for (const t of txns) {
      if (!t.paidAt) continue;
      const key = this.monthKey(t.paidAt);
      if (buckets.has(key)) {
        buckets.set(key, (buckets.get(key) ?? 0) + t.amount);
      }
    }
    return [...buckets.entries()].map(([month, amount]) => ({ month, amount }));
  }

  private countByStatus(status: string): Promise<number> {
    return this.prisma.tenantSubscription.count({
      where: { status: status as never, deletedAt: null },
    });
  }

  private monthKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
}
