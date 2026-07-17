/**
 * Gateway-agnostic contract every payment provider (Razorpay, Stripe, …)
 * implements. The billing services depend on this interface, never on a
 * concrete SDK, so a new gateway is added by writing one adapter.
 *
 * All amounts are in the smallest currency unit (paise / cents).
 */

export interface CreatePlanInput {
  readonly code: string;
  readonly name: string;
  readonly amount: number;
  readonly currency: string;
  readonly interval: 'MONTHLY' | 'YEARLY';
}

export interface CreateSubscriptionInput {
  /** Provider-side plan id (from ensurePlan). */
  readonly gatewayPlanId: string;
  readonly customerEmail: string;
  readonly customerName?: string;
  /** Number of billing cycles to authorize; provider default if omitted. */
  readonly totalCount?: number;
  /** Our internal tenant/subscription references, echoed back on webhooks. */
  readonly notes?: Record<string, string>;
}

export interface CreatedSubscription {
  readonly gatewaySubscriptionId: string;
  /** URL or token the client uses to complete authorization/checkout. */
  readonly checkoutUrl?: string;
  readonly shortUrl?: string;
}

export interface VerifiedWebhook {
  readonly eventId: string;
  readonly eventType: string;
  readonly payload: Record<string, unknown>;
}

export interface PaymentProvider {
  readonly gateway: 'RAZORPAY' | 'STRIPE';

  /** Whether the provider is configured (keys present). */
  isConfigured(): boolean;

  /**
   * Idempotently ensure a provider-side plan exists for our Plan; returns its
   * provider id. Called lazily on first checkout for a plan.
   */
  ensurePlan(input: CreatePlanInput): Promise<string>;

  /** Create a recurring subscription/mandate for a tenant. */
  createSubscription(
    input: CreateSubscriptionInput,
  ): Promise<CreatedSubscription>;

  /** Cancel a subscription at the provider. */
  cancelSubscription(gatewaySubscriptionId: string): Promise<void>;

  /**
   * Verify a webhook's signature against the raw request body and return the
   * parsed event. Throws if the signature is invalid.
   */
  verifyWebhook(rawBody: Buffer, signature: string): VerifiedWebhook;
}

/** DI token for the map of configured providers, keyed by gateway. */
export const PAYMENT_PROVIDERS = 'PAYMENT_PROVIDERS';
