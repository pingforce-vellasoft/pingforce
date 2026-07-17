import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreatePlanInput,
  CreateSubscriptionInput,
  CreatedSubscription,
  PaymentProvider,
  VerifiedWebhook,
} from './payment-provider.interface';

/**
 * Stripe adapter — STUB. The gateway abstraction is proven with Razorpay; this
 * adapter exists so Stripe can be enabled without touching billing services.
 * Wiring the Stripe SDK calls is intentionally deferred (see BR: Both/abstract).
 *
 * Keys, when present: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET.
 */
@Injectable()
export class StripeProvider implements PaymentProvider {
  readonly gateway = 'STRIPE' as const;
  private readonly logger = new Logger(StripeProvider.name);
  private readonly secretKey?: string;

  constructor(config: ConfigService) {
    this.secretKey = config.get<string>('STRIPE_SECRET_KEY');
    if (!this.secretKey) {
      this.logger.log('Stripe not configured (stub adapter).');
    }
  }

  isConfigured(): boolean {
    // Stub: report unconfigured until the SDK calls below are implemented.
    return false;
  }

  ensurePlan(_input: CreatePlanInput): Promise<string> {
    throw new NotImplementedException('Stripe provider is not yet implemented');
  }

  createSubscription(
    _input: CreateSubscriptionInput,
  ): Promise<CreatedSubscription> {
    throw new NotImplementedException('Stripe provider is not yet implemented');
  }

  cancelSubscription(_gatewaySubscriptionId: string): Promise<void> {
    throw new NotImplementedException('Stripe provider is not yet implemented');
  }

  verifyWebhook(_rawBody: Buffer, _signature: string): VerifiedWebhook {
    throw new NotImplementedException('Stripe provider is not yet implemented');
  }
}
