import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SiteContentService } from '../../site.data';
import { ApiPlan, BillingService } from '../../core/billing.service';

/** View-model row unifying API plans and the static fallback. */
interface PlanVm {
  code: string;
  name: string;
  tagline: string;
  priceLabel: string;
  period: string;
  highlighted: boolean;
  isCustom: boolean;
  features: readonly string[];
}

@Component({
  selector: 'pf-pricing',
  imports: [FormsModule],
  templateUrl: './pricing.component.html',
  styleUrl: './pricing.component.scss',
})
export class PricingComponent implements OnInit {
  private readonly content = inject(SiteContentService);
  private readonly billing = inject(BillingService);

  protected readonly plans = signal<PlanVm[]>([]);
  protected readonly customPlan = this.toStaticCustomVm();

  /** Checkout dialog state. */
  protected readonly checkoutPlan = signal<PlanVm | null>(null);
  protected readonly submitting = signal(false);
  protected readonly notice = signal<string | null>(null);
  protected email = '';
  protected orgName = '';

  ngOnInit(): void {
    // Prefer live plans from the API; fall back to bundled static content so
    // the page still renders if the API is unreachable.
    this.plans.set(this.staticPlanVms());
    this.billing.getPlans().subscribe({
      next: (apiPlans) => {
        if (apiPlans.length > 0) {
          this.plans.set(apiPlans.map((p) => this.toApiVm(p)));
        }
      },
      error: () => {
        /* keep static fallback */
      },
    });
  }

  protected openCheckout(plan: PlanVm): void {
    if (plan.isCustom) {
      window.location.href = `mailto:hello@pingforce.in?subject=PingForce ${plan.name} plan`;
      return;
    }
    this.notice.set(null);
    this.email = '';
    this.orgName = '';
    this.checkoutPlan.set(plan);
  }

  protected closeCheckout(): void {
    this.checkoutPlan.set(null);
    this.submitting.set(false);
  }

  protected submitCheckout(): void {
    const plan = this.checkoutPlan();
    if (!plan || !this.email) return;
    this.submitting.set(true);
    this.billing
      .checkout({
        planCode: plan.code,
        customerEmail: this.email,
        organizationName: this.orgName || undefined,
      })
      .subscribe({
        next: (res) => {
          this.submitting.set(false);
          if (res.mode === 'checkout' && res.checkoutUrl) {
            window.location.href = res.checkoutUrl;
            return;
          }
          // Contact-sales fallback (custom plan, or no gateway configured yet).
          this.notice.set(
            res.message ??
              'Our team will reach out to complete your subscription.',
          );
        },
        error: () => {
          this.submitting.set(false);
          this.notice.set(
            'Something went wrong starting checkout. Please email hello@pingforce.in.',
          );
        },
      });
  }

  // ── mappers ───────────────────────────────────────────────────────────────
  private toApiVm(p: ApiPlan): PlanVm {
    return {
      code: p.code,
      name: p.name,
      tagline: p.tagline ?? '',
      priceLabel: p.isCustom ? "Let's talk" : this.rupees(p.amount),
      period: p.isCustom
        ? 'custom pricing'
        : p.interval === 'YEARLY'
          ? 'per year'
          : 'per month',
      highlighted: p.highlighted,
      isCustom: p.isCustom,
      features: p.features,
    };
  }

  private staticPlanVms(): PlanVm[] {
    return this.content.plans.map((p, i) => ({
      code: ['starter', 'growth', 'enterprise'][i] ?? p.name.toLowerCase(),
      name: p.name,
      tagline: p.tagline,
      priceLabel: p.price,
      period: p.period,
      highlighted: p.highlighted,
      isCustom: false,
      features: p.features,
    }));
  }

  private toStaticCustomVm(): PlanVm {
    const c = this.content.customPlan;
    return {
      code: 'custom',
      name: c.name,
      tagline: c.tagline,
      priceLabel: c.price,
      period: c.period,
      highlighted: false,
      isCustom: true,
      features: c.features,
    };
  }

  private rupees(paise: number): string {
    return `₹${(paise / 100).toLocaleString('en-IN', {
      maximumFractionDigits: 0,
    })}`;
  }
}
