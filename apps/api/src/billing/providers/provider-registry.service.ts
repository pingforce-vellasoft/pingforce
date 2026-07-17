import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentProvider } from './payment-provider.interface';
import { RazorpayProvider } from './razorpay.provider';
import { StripeProvider } from './stripe.provider';

export type GatewayName = 'RAZORPAY' | 'STRIPE';

/**
 * Resolves the concrete PaymentProvider for a gateway and exposes which
 * gateways are actually configured, so callers never hard-code an SDK.
 */
@Injectable()
export class ProviderRegistry {
  private readonly providers: Record<GatewayName, PaymentProvider>;

  constructor(razorpay: RazorpayProvider, stripe: StripeProvider) {
    this.providers = { RAZORPAY: razorpay, STRIPE: stripe };
  }

  get(gateway: GatewayName): PaymentProvider {
    const provider = this.providers[gateway];
    if (!provider) {
      throw new BadRequestException(`Unknown payment gateway: ${gateway}`);
    }
    return provider;
  }

  /** The default gateway to use for new checkouts: first configured one. */
  defaultGateway(): GatewayName | null {
    const order: GatewayName[] = ['RAZORPAY', 'STRIPE'];
    return order.find((g) => this.providers[g].isConfigured()) ?? null;
  }

  configuredGateways(): GatewayName[] {
    return (Object.keys(this.providers) as GatewayName[]).filter((g) =>
      this.providers[g].isConfigured(),
    );
  }
}
