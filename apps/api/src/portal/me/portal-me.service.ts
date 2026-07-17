import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IPrismaService } from '@pingforce-monorepo/shared';
import { PortalUpdateProfileDto } from '../auth/dto/portal-auth.dto';

/**
 * Customer-facing account/profile/connections reads (3.8_CustomerPortal
 * BR-2). Every query is scoped to tenantId + customerId taken from the JWT —
 * never from request input (BR-9.2).
 */
@Injectable()
export class PortalMeService {
  constructor(
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
  ) {}

  async getMe(tenantId: string, portalUserId: string) {
    const me = await this.prisma.customerPortalUser.findFirst({
      where: { id: portalUserId, tenantId, deletedAt: null },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        portalRole: true,
        isPrimary: true,
        lastLoginAt: true,
        tenant: { select: { code: true, name: true, logoUrl: true } },
      },
    });
    if (!me) throw new NotFoundException('Account not found');
    return me;
  }

  async updateProfile(
    tenantId: string,
    portalUserId: string,
    dto: PortalUpdateProfileDto,
  ) {
    await this.getMe(tenantId, portalUserId);
    return this.prisma.customerPortalUser.update({
      where: { id: portalUserId },
      data: {
        ...(dto.firstName ? { firstName: dto.firstName } : {}),
        ...(dto.lastName !== undefined ? { lastName: dto.lastName } : {}),
        updatedBy: portalUserId,
      },
      select: { id: true, firstName: true, lastName: true },
    });
  }

  async getAccount(tenantId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId, deletedAt: null },
      select: {
        customerCode: true,
        legalName: true,
        displayName: true,
        status: true,
        primaryEmail: true,
        primaryMobile: true,
        accountManager: {
          select: {
            profile: { select: { firstName: true } },
            phone: true,
          },
        },
      },
    });
    if (!customer) throw new NotFoundException('Account not found');

    return {
      customerCode: customer.customerCode,
      name: customer.displayName ?? customer.legalName,
      status: customer.status,
      email: customer.primaryEmail,
      mobile: customer.primaryMobile,
      // First name + phone only — staff PII stays minimal (BR-9.5)
      accountManager: customer.accountManager
        ? {
            firstName: customer.accountManager.profile?.firstName ?? null,
            phone: customer.accountManager.phone,
          }
        : null,
    };
  }

  /**
   * The customer's connections from the Connection Map module (BR-2.4).
   * Customer-safe projection: no topology, no parent/child links, no
   * employee assignment (BR-9.5).
   */
  async getConnections(tenantId: string, customerId: string) {
    return this.prisma.networkConnection.findMany({
      where: { tenantId, customerId, deletedAt: null },
      select: {
        id: true,
        connectionCode: true,
        status: true,
        connectionType: true,
        installationDate: true,
        latitude: true,
        longitude: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
