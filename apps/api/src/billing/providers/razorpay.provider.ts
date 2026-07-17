import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import Razorpay from 'razorpay';
import {
  CreatePlanInput,
  CreateSubscriptionInput,
  CreatedSubscription,
  PaymentProvider,
  VerifiedWebhook,
} from './payment-provider.interface';

/**
 * Live Razorpay adapter. Reads keys from config:
 *   RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET
 * When keys are absent the provider reports unconfigured and the billing
 * services fall back gracefully (checkout returns a contact-sales response).
 */
@Injectable()
export class RazorpayProvider implements PaymentProvider {
  readonly gateway = 'RAZORPAY' as const;
  private readonly logger = new Logger(RazorpayProvider.name);
  private readonly keyId?: string;
  private readonly keySecret?: string;
  private readonly webhookSecret?: string;
  private client?: Razorpay;

  constructor(config: ConfigService) {
    this.keyId = config.get<string>('RAZORPAY_KEY_ID');
    this.keySecret = config.get<string>('RAZORPAY_KEY_SECRET');
    this.webhookSecret = config.get<string>('RAZORPAY_WEBHOOK_SECRET');
    if (this.keyId && this.keySecret) {
      this.client = new Razorpay({
        key_id: this.keyId,
        key_secret: this.keySecret,
      });
    } else {
      this.logger.warn(
        'Razorpay keys not configured — checkout will route to sales.',
      );
    }
  }

  isConfigured(): boolean {
    return !!this.client;
  }

  private require(): Razorpay {
    if (!this.client) {
      throw new Error('Razorpay is not configured');
    }
    return this.client;
  }

  async ensurePlan(input: CreatePlanInput): Promise<string> {
    const plan = await this.require().plans.create({
      period: input.interval === 'YEARLY' ? 'yearly' : 'monthly',
      interval: 1,
      item: {
        name: input.name,
        amount: input.amount,
        currency: input.currency,
      },
    });
    return plan.id;
  }

  async createSubscription(
    input: CreateSubscriptionInput,
  ): Promise<CreatedSubscription> {
    const sub = await this.require().subscriptions.create({
      plan_id: input.gatewayPlanId,
      total_count: input.totalCount ?? 12,
      customer_notify: 1,
      notes: input.notes,
    });
    return {
      gatewaySubscriptionId: sub.id,
      shortUrl: sub.short_url,
      checkoutUrl: sub.short_url,
    };
  }

  async cancelSubscription(gatewaySubscriptionId: string): Promise<void> {
    await this.require().subscriptions.cancel(gatewaySubscriptionId);
  }

  verifyWebhook(rawBody: Buffer, signature: string): VerifiedWebhook {
    if (!this.webhookSecret) {
      throw new Error('Razorpay webhook secret not configured');
    }
    const expected = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex');
    const valid =
      signature.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    if (!valid) {
      throw new Error('Invalid Razorpay webhook signature');
    }
    const parsed = JSON.parse(rawBody.toString('utf8')) as Record<
      string,
      unknown
    >;
    // Razorpay does not send a stable event id header on all plans; derive a
    // deterministic id from account/created_at/event so idempotency still holds.
    const eventType = String(parsed['event'] ?? 'unknown');
    const createdAt = String(parsed['created_at'] ?? Date.now());
    const account = String(parsed['account_id'] ?? '');
    const eventId = crypto
      .createHash('sha256')
      .update(`${account}:${eventType}:${createdAt}:${signature}`)
      .digest('hex');
    return { eventId, eventType, payload: parsed };
  }
}
