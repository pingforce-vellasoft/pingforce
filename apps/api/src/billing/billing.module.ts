import { Module } from '@nestjs/common';
import { PlansService } from './plans.service';
import { SubscriptionsService } from './subscriptions.service';
import { WebhooksService } from './webhooks.service';
import { BillingAnalyticsService } from './billing-analytics.service';
import { BillingController } from './billing.controller';
import { PublicBillingController } from './public-billing.controller';
import { WebhooksController } from './webhooks.controller';
import { ProviderRegistry } from './providers/provider-registry.service';
import { RazorpayProvider } from './providers/razorpay.provider';
import { StripeProvider } from './providers/stripe.provider';

/**
 * Billing & Subscriptions. Public controller serves the website pricing +
 * checkout; BillingController is Super-Admin management; WebhooksController
 * ingests gateway callbacks. Payment SDKs stay behind the ProviderRegistry so
 * the services remain gateway-agnostic.
 */
@Module({
  controllers: [
    PublicBillingController,
    BillingController,
    WebhooksController,
  ],
  providers: [
    PlansService,
    SubscriptionsService,
    WebhooksService,
    BillingAnalyticsService,
    ProviderRegistry,
    RazorpayProvider,
    StripeProvider,
  ],
  exports: [PlansService, SubscriptionsService],
})
export class BillingModule {}
