import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { IPrismaService } from '@pingforce-monorepo/shared';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { ProviderRegistry, GatewayName } from './providers/provider-registry.service';

export interface CheckoutResult {
  readonly mode: 'checkout' | 'contact_sales';
  readonly subscriptionId?: string;
  readonly gateway?: GatewayName;
  readonly checkoutUrl?: string;
  readonly message?: string;
}

/**
 * Orchestrates subscription checkout across gateways and exposes Super-Admin
 * tracking queries. Business logic lives here; the gateway SDK stays behind
 * the ProviderRegistry.
 */
@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
    private readonly registry: ProviderRegistry,
  ) {}

  /**
   * Start a checkout for the selected plan. Custom/contact-sales plans and any
   * request made while no gateway is configured resolve to a contact-sales
   * response rather than failing, so the website never dead-ends.
   */
  async createCheckout(dto: CreateCheckoutDto): Promise<CheckoutResult> {
    const plan = await this.prisma.plan.findFirst({
      where: { code: dto.planCode, isActive: true, deletedAt: null },
    });
    if (!plan) {
      throw new NotFoundException(`Plan not found: ${dto.planCode}`);
    }

    if (plan.isCustom || plan.amount === 0) {
      return {
        mode: 'contact_sales',
        message: 'This plan is priced individually. Our team will reach out.',
      };
    }

    const gatewayName =
      (dto.gateway as GatewayName | undefined) ?? this.registry.defaultGateway();
    if (!gatewayName) {
      return {
        mode: 'contact_sales',
        message:
          'Online checkout is not available yet. Our team will help you subscribe.',
      };
    }

    const provider = this.registry.get(gatewayName);
    if (!provider.isConfigured()) {
      return {
        mode: 'contact_sales',
        message:
          'Online checkout is not available yet. Our team will help you subscribe.',
      };
    }

    // Lazily create the gateway-side plan and cache its id on our Plan.
    const gatewayPlanId = await this.ensureGatewayPlan(plan.id, gatewayName);

    const created = await provider.createSubscription({
      gatewayPlanId,
      customerEmail: dto.customerEmail,
      customerName: dto.customerName,
      notes: {
        planCode: plan.code,
        organizationName: dto.organizationName ?? '',
        tenantId: dto.tenantId ?? '',
      },
    });

    const subscription = await this.prisma.tenantSubscription.create({
      data: {
        // Website-originated checkouts may not have a tenant yet; a placeholder
        // tenant is linked at activation. Super-admin flows pass tenantId.
        tenantId: dto.tenantId ?? (await this.resolveOrHoldTenant(dto)),
        planId: plan.id,
        gateway: gatewayName,
        status: 'CREATED',
        gatewaySubscriptionId: created.gatewaySubscriptionId,
        amount: plan.amount,
        currency: plan.currency,
      },
    });

    return {
      mode: 'checkout',
      subscriptionId: subscription.id,
      gateway: gatewayName,
      checkoutUrl: created.checkoutUrl,
    };
  }

  /**
   * Website checkouts without a tenant are held against a well-known
   * "unassigned" tenant row so the FK holds; Super Admin links the real tenant
   * on activation. Falls back to throwing only if that row is missing.
   */
  private async resolveOrHoldTenant(dto: CreateCheckoutDto): Promise<string> {
    const holding = await this.prisma.tenant.findFirst({
      where: { code: 'UNASSIGNED' },
      select: { id: true },
    });
    if (holding) return holding.id;
    throw new BadRequestException(
      'No tenant context for checkout. Seed the UNASSIGNED holding tenant or pass tenantId.',
    );
  }

  private async ensureGatewayPlan(
    planId: string,
    gateway: GatewayName,
  ): Promise<string> {
    const plan = await this.prisma.plan.findUniqueOrThrow({ where: { id: planId } });
    const cached =
      gateway === 'RAZORPAY' ? plan.razorpayPlanId : plan.stripePriceId;
    if (cached) return cached;

    const provider = this.registry.get(gateway);
    const gatewayPlanId = await provider.ensurePlan({
      code: plan.code,
      name: plan.name,
      amount: plan.amount,
      currency: plan.currency,
      interval: plan.interval,
    });

    await this.prisma.plan.update({
      where: { id: planId },
      data:
        gateway === 'RAZORPAY'
          ? { razorpayPlanId: gatewayPlanId }
          : { stripePriceId: gatewayPlanId },
    });
    return gatewayPlanId;
  }

  // ── Super-Admin tracking ────────────────────────────────────────────────
  async list(params: { status?: string; tenantId?: string }) {
    return this.prisma.tenantSubscription.findMany({
      where: {
        deletedAt: null,
        ...(params.status ? { status: params.status as never } : {}),
        ...(params.tenantId ? { tenantId: params.tenantId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        plan: { select: { code: true, name: true } },
        tenant: { select: { name: true, code: true } },
      },
    });
  }

  async findOne(id: string) {
    const sub = await this.prisma.tenantSubscription.findFirst({
      where: { id, deletedAt: null },
      include: {
        plan: true,
        tenant: { select: { name: true, code: true } },
        transactions: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!sub) throw new NotFoundException(`Subscription not found: ${id}`);
    return sub;
  }

  async cancel(id: string, userId?: string) {
    const sub = await this.findOne(id);
    if (sub.gatewaySubscriptionId) {
      try {
        await this.registry
          .get(sub.gateway as GatewayName)
          .cancelSubscription(sub.gatewaySubscriptionId);
      } catch (err) {
        this.logger.error(
          `Gateway cancel failed for ${id}: ${(err as Error).message}`,
        );
      }
    }
    return this.prisma.tenantSubscription.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        updatedBy: userId ?? null,
      },
    });
  }
}
