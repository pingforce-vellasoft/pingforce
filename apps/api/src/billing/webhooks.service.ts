import { Inject, Injectable, Logger } from '@nestjs/common';
import { IPrismaService } from '@pingforce-monorepo/shared';
import { ProviderRegistry, GatewayName } from './providers/provider-registry.service';

/**
 * Consumes verified gateway webhooks and drives subscription/transaction state.
 * Idempotent: each event is recorded by its unique eventId; a duplicate
 * delivery is acknowledged without reprocessing.
 */
@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
    private readonly registry: ProviderRegistry,
  ) {}

  async handle(
    gateway: GatewayName,
    rawBody: Buffer,
    signature: string,
  ): Promise<{ received: boolean; duplicate?: boolean }> {
    const provider = this.registry.get(gateway);
    const event = provider.verifyWebhook(rawBody, signature);

    // Idempotency guard: unique eventId. If insert conflicts, we've seen it.
    const existing = await this.prisma.webhookEvent.findUnique({
      where: { eventId: event.eventId },
    });
    if (existing) {
      return { received: true, duplicate: true };
    }

    const record = await this.prisma.webhookEvent.create({
      data: {
        gateway,
        eventId: event.eventId,
        eventType: event.eventType,
        payload: event.payload as never,
      },
    });

    try {
      await this.applyEvent(gateway, event.eventType, event.payload);
      await this.prisma.webhookEvent.update({
        where: { id: record.id },
        data: { processed: true },
      });
    } catch (err) {
      const message = (err as Error).message;
      this.logger.error(`Webhook ${event.eventType} failed: ${message}`);
      await this.prisma.webhookEvent.update({
        where: { id: record.id },
        data: { error: message },
      });
    }

    return { received: true };
  }

  /** Route Razorpay subscription/payment events to state transitions. */
  private async applyEvent(
    gateway: GatewayName,
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const entities = (payload['payload'] as Record<string, unknown>) ?? {};
    const subEntity = this.extract(entities, 'subscription');
    const payEntity = this.extract(entities, 'payment');

    switch (eventType) {
      case 'subscription.activated':
      case 'subscription.charged':
        await this.markActive(subEntity);
        if (payEntity) await this.recordPayment(gateway, subEntity, payEntity, 'CAPTURED');
        break;
      case 'subscription.pending':
      case 'subscription.halted':
        await this.setStatus(subEntity, 'PAST_DUE');
        break;
      case 'subscription.cancelled':
        await this.setStatus(subEntity, 'CANCELLED');
        break;
      case 'subscription.completed':
        await this.setStatus(subEntity, 'EXPIRED');
        break;
      case 'payment.failed':
        if (payEntity) await this.recordPayment(gateway, subEntity, payEntity, 'FAILED');
        break;
      default:
        this.logger.debug(`Unhandled webhook event: ${eventType}`);
    }
  }

  private extract(
    entities: Record<string, unknown>,
    key: string,
  ): Record<string, unknown> | null {
    const wrapper = entities[key] as Record<string, unknown> | undefined;
    if (!wrapper) return null;
    return (wrapper['entity'] as Record<string, unknown>) ?? wrapper;
  }

  private async findSubscription(
    subEntity: Record<string, unknown> | null,
  ): Promise<{ id: string; tenantId: string } | null> {
    const gatewaySubscriptionId = subEntity?.['id'] as string | undefined;
    if (!gatewaySubscriptionId) return null;
    return this.prisma.tenantSubscription.findUnique({
      where: { gatewaySubscriptionId },
      select: { id: true, tenantId: true },
    });
  }

  private async markActive(subEntity: Record<string, unknown> | null) {
    const sub = await this.findSubscription(subEntity);
    if (!sub) return;
    const start = this.toDate(subEntity?.['current_start']);
    const end = this.toDate(subEntity?.['current_end']);
    await this.prisma.tenantSubscription.update({
      where: { id: sub.id },
      data: {
        status: 'ACTIVE',
        currentPeriodStart: start,
        currentPeriodEnd: end,
      },
    });
    // Mirror onto the tenant's denormalized subscription fields.
    await this.prisma.tenant.update({
      where: { id: sub.tenantId },
      data: {
        subscriptionStatus: 'ACTIVE',
        subscriptionStart: start ?? undefined,
        subscriptionEnd: end ?? undefined,
      },
    });
  }

  private async setStatus(
    subEntity: Record<string, unknown> | null,
    status: string,
  ) {
    const sub = await this.findSubscription(subEntity);
    if (!sub) return;
    await this.prisma.tenantSubscription.update({
      where: { id: sub.id },
      data: { status: status as never },
    });
  }

  private async recordPayment(
    gateway: GatewayName,
    subEntity: Record<string, unknown> | null,
    payEntity: Record<string, unknown>,
    status: 'CAPTURED' | 'FAILED',
  ) {
    const sub = await this.findSubscription(subEntity);
    const gatewayPaymentId = payEntity['id'] as string | undefined;
    if (!gatewayPaymentId) return;

    const existing = await this.prisma.paymentTransaction.findUnique({
      where: { gatewayPaymentId },
    });
    if (existing) return;

    await this.prisma.paymentTransaction.create({
      data: {
        tenantId: sub?.tenantId ?? (await this.holdingTenantId()),
        subscriptionId: sub?.id ?? null,
        gateway,
        status,
        gatewayPaymentId,
        amount: Number(payEntity['amount'] ?? 0),
        currency: String(payEntity['currency'] ?? 'INR'),
        failureReason:
          status === 'FAILED'
            ? String(payEntity['error_description'] ?? 'Payment failed')
            : null,
        paidAt: status === 'CAPTURED' ? new Date() : null,
      },
    });
  }

  private async holdingTenantId(): Promise<string> {
    const holding = await this.prisma.tenant.findFirst({
      where: { code: 'UNASSIGNED' },
      select: { id: true },
    });
    if (!holding) {
      throw new Error('UNASSIGNED holding tenant missing');
    }
    return holding.id;
  }

  private toDate(value: unknown): Date | null {
    if (typeof value !== 'number') return null;
    // Razorpay sends unix seconds.
    return new Date(value * 1000);
  }
}
