import { Body, Controller, Get, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PlansService } from './plans.service';
import { SubscriptionsService } from './subscriptions.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';

/**
 * Public, unauthenticated billing surface consumed by the marketing website:
 * the pricing catalog and checkout initiation. No tenant scoping — these are
 * platform-level plans.
 */
@Controller('public/billing')
export class PublicBillingController {
  constructor(
    private readonly plans: PlansService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  /** Active plans for the pricing page. */
  @Get('plans')
  async listPlans() {
    return this.plans.listPublic();
  }

  /** Start a subscription checkout; returns a gateway URL or a sales fallback. */
  // Anonymous and each call creates a subscription row: keep it to a
  // human pace per client.
  @Throttle({
    burst: { limit: 10, ttl: 60000 },
    sustained: { limit: 10, ttl: 60000 },
  })
  @Post('checkout')
  async checkout(@Body() dto: CreateCheckoutDto) {
    return this.subscriptions.createCheckout(dto);
  }
}
