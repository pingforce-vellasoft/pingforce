import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { IPrismaService } from '@pingforce-monorepo/shared';
import { AuditService } from '../../audit/audit.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { InviteContactDto, UpdatePortalUserDto } from '../auth/dto/portal-auth.dto';

const INVITE_TTL_DAYS = 7;

/**
 * Staff-side management of customer portal users and invites
 * (3.8_CustomerPortal BR-1.1/1.2/1.6/1.7). All operations are scoped to
 * tenantId + customerId; invite tokens are single-use, expiring and stored
 * hashed only.
 */
@Injectable()
export class PortalInvitesService {
  private readonly logger = new Logger(PortalInvitesService.name);

  constructor(
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
    private readonly auditService: AuditService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  async invite(
    tenantId: string,
    customerId: string,
    invitedById: string,
    dto: InviteContactDto,
  ) {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('Provide an email or phone number');
    }

    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId, deletedAt: null },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Contact ceiling (BR-1.6): active portal users + pending invites
    const settings = await this.prisma.tenantSetting.findUnique({
      where: { tenantId },
      select: { portalMaxContacts: true },
    });
    const maxContacts = settings?.portalMaxContacts ?? 5;

    const [activeUsers, pendingInvites] = await this.prisma.$transaction([
      this.prisma.customerPortalUser.count({
        where: { tenantId, customerId, deletedAt: null, status: { not: 'SUSPENDED' } },
      }),
      this.prisma.customerPortalInvite.count({
        where: {
          tenantId,
          customerId,
          deletedAt: null,
          status: 'PENDING',
          expiresAt: { gt: new Date() },
        },
      }),
    ]);
    if (activeUsers + pendingInvites >= maxContacts) {
      throw new BadRequestException(
        `This account has reached its portal contact limit (${maxContacts})`,
      );
    }

    const existing = await this.prisma.customerPortalUser.findFirst({
      where: {
        tenantId,
        deletedAt: null,
        OR: [
          ...(dto.email ? [{ email: dto.email }] : []),
          ...(dto.phone ? [{ phone: dto.phone }] : []),
        ],
      },
    });
    if (existing) {
      throw new BadRequestException(
        'A portal account already exists for this email/phone',
      );
    }

    // Opaque single-use token, stored hashed (BR-1.2)
    const token = randomBytes(32).toString('base64url');

    const invite = await this.prisma.customerPortalInvite.create({
      data: {
        tenantId,
        customerId,
        email: dto.email,
        phone: dto.phone,
        firstName: dto.firstName,
        lastName: dto.lastName,
        portalRole: dto.portalRole ?? 'MEMBER',
        tokenHash: createHash('sha256').update(token).digest('hex'),
        expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000),
        invitedById,
        createdBy: invitedById,
      },
    });

    await this.deliverInvite(tenantId, dto, token);

    void this.auditService.log({
      tenantId,
      actorId: invitedById,
      module: 'PORTAL_USERS',
      entityName: 'customer_portal_invite',
      entityId: invite.id,
      action: 'PORTAL_INVITE_SENT',
      newValue: { customerId, email: dto.email, phone: dto.phone },
    });

    // Token returned once so staff can show a QR during on-site onboarding
    // (BR-1.1); it is never retrievable again.
    return { id: invite.id, expiresAt: invite.expiresAt, inviteToken: token };
  }

  async listForCustomer(tenantId: string, customerId: string) {
    const [users, invites] = await this.prisma.$transaction([
      this.prisma.customerPortalUser.findMany({
        where: { tenantId, customerId, deletedAt: null },
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          status: true,
          isPrimary: true,
          portalRole: true,
          lastLoginAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.customerPortalInvite.findMany({
        where: { tenantId, customerId, deletedAt: null, status: 'PENDING' },
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          portalRole: true,
          expiresAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { users, invites };
  }

  async revokeInvite(tenantId: string, inviteId: string, actorId: string) {
    const invite = await this.prisma.customerPortalInvite.findFirst({
      where: { id: inviteId, tenantId, deletedAt: null, status: 'PENDING' },
    });
    if (!invite) {
      throw new NotFoundException('Pending invite not found');
    }

    await this.prisma.customerPortalInvite.update({
      where: { id: invite.id },
      data: { status: 'REVOKED', updatedBy: actorId },
    });

    void this.auditService.log({
      tenantId,
      actorId,
      module: 'PORTAL_USERS',
      entityName: 'customer_portal_invite',
      entityId: invite.id,
      action: 'PORTAL_INVITE_REVOKED',
    });

    return { message: 'Invite revoked' };
  }

  /**
   * Suspend/reactivate or change role (BR-1.7). Suspension bumps
   * tokenVersion so outstanding access tokens die within the JWT TTL and
   * revokes refresh tokens immediately.
   */
  async updatePortalUser(
    tenantId: string,
    portalUserId: string,
    actorId: string,
    dto: UpdatePortalUserDto,
  ) {
    const portalUser = await this.prisma.customerPortalUser.findFirst({
      where: { id: portalUserId, tenantId, deletedAt: null },
    });
    if (!portalUser) {
      throw new NotFoundException('Portal user not found');
    }

    const suspending =
      dto.status === 'SUSPENDED' && portalUser.status !== 'SUSPENDED';

    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.customerPortalUser.update({
        where: { id: portalUser.id },
        data: {
          ...(dto.status ? { status: dto.status } : {}),
          ...(dto.portalRole ? { portalRole: dto.portalRole } : {}),
          ...(suspending ? { tokenVersion: { increment: 1 } } : {}),
          updatedBy: actorId,
        },
      });
      if (suspending) {
        await tx.refreshToken.updateMany({
          where: { portalUserId: portalUser.id, revokedAt: null },
          data: { revokedAt: new Date(), revokeReason: 'LOGOUT_ALL' },
        });
      }
      return u;
    });

    void this.auditService.log({
      tenantId,
      actorId,
      module: 'PORTAL_USERS',
      entityName: 'customer_portal_user',
      entityId: portalUser.id,
      action: 'PORTAL_USER_UPDATED',
      oldValue: { status: portalUser.status, portalRole: portalUser.portalRole },
      newValue: { status: updated.status, portalRole: updated.portalRole },
    });

    return {
      id: updated.id,
      status: updated.status,
      portalRole: updated.portalRole,
    };
  }

  /** Soft delete (BR-9.7): keeps audit trail, frees the email/phone slot. */
  async removePortalUser(tenantId: string, portalUserId: string, actorId: string) {
    const portalUser = await this.prisma.customerPortalUser.findFirst({
      where: { id: portalUserId, tenantId, deletedAt: null },
    });
    if (!portalUser) {
      throw new NotFoundException('Portal user not found');
    }

    await this.prisma.$transaction([
      this.prisma.customerPortalUser.update({
        where: { id: portalUser.id },
        data: {
          deletedAt: new Date(),
          status: 'SUSPENDED',
          tokenVersion: { increment: 1 },
          updatedBy: actorId,
        },
      }),
      this.prisma.refreshToken.updateMany({
        where: { portalUserId: portalUser.id, revokedAt: null },
        data: { revokedAt: new Date(), revokeReason: 'LOGOUT_ALL' },
      }),
    ]);

    void this.auditService.log({
      tenantId,
      actorId,
      module: 'PORTAL_USERS',
      entityName: 'customer_portal_user',
      entityId: portalUser.id,
      action: 'PORTAL_USER_REMOVED',
    });

    return { message: 'Portal user removed' };
  }

  private async deliverInvite(
    tenantId: string,
    dto: InviteContactDto,
    token: string,
  ): Promise<void> {
    const baseUrl = this.config.get<string>(
      'PORTAL_WEB_URL',
      'https://portal.pingforce.in',
    );
    const link = `${baseUrl}/invite?token=${token}`;

    if (dto.email) {
      await this.notifications.sendRawEmail(
        dto.email,
        'You are invited to your service portal',
        `<p>Hello ${dto.firstName},</p>
         <p>You have been invited to your service provider's customer portal.
         Use the link below to activate your account. The link expires in ${INVITE_TTL_DAYS} days.</p>
         <p><a href="${link}">${link}</a></p>`,
        tenantId,
      );
      return;
    }
    if (dto.phone) {
      this.logger.log(
        `[SMS:simulated] Portal invite delivery to ${dto.phone.slice(-4).padStart(dto.phone.length, '*')}`,
      );
    }
  }
}
