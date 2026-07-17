import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { IPrismaService } from '@pingforce-monorepo/shared';
import { AuditService } from '../../audit/audit.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { PortalOtpService } from './portal-otp.service';
import {
  ActivateInviteDto,
  PortalLoginDto,
  PortalOtpLoginDto,
  PortalOtpRequestDto,
} from './dto/portal-auth.dto';

const REFRESH_TTL_DAYS = 7;

interface RequestMeta {
  ip?: string;
  requestId?: string;
  userAgent?: string;
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * Authentication for customer portal identities (3.8_CustomerPortal BR-1).
 * Invite-based onboarding: the invite token resolves the tenant server-side,
 * so customers never enter a tenant id. Issues JWTs carrying
 * userType: 'CUSTOMER' (validated by JwtStrategy) and opaque, rotating
 * refresh tokens with replay detection — same rules as staff auth.
 */
@Injectable()
export class PortalAuthService {
  private readonly logger = new Logger(PortalAuthService.name);

  constructor(
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
    private readonly jwtService: JwtService,
    private readonly otpService: PortalOtpService,
    private readonly auditService: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  // ---------------------------------------------------------------------
  // Invite verification & activation (BR-1.1 … BR-1.4)
  // ---------------------------------------------------------------------

  /**
   * Step 1 of activation: resolves the invite token, provisions the portal
   * user in INVITED status when needed, sends an activation OTP to the
   * invited contact and returns tenant context (code + branding) that the
   * client persists after successful activation (BR-1.3).
   */
  async verifyInvite(token: string, meta: RequestMeta = {}) {
    const invite = await this.findPendingInvite(token);

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: invite.tenantId },
      include: { tenantSettings: true },
    });
    if (!tenant || tenant.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invite is no longer valid');
    }
    if (!tenant.tenantSettings?.customerPortalEnabled) {
      throw new UnauthorizedException(
        'The customer portal is not enabled for this provider',
      );
    }

    // Provision (or reuse) the portal user in INVITED state so the
    // activation OTP has an identity to attach to.
    let portalUser = await this.prisma.customerPortalUser.findFirst({
      where: {
        tenantId: invite.tenantId,
        customerId: invite.customerId,
        deletedAt: null,
        OR: [
          ...(invite.email ? [{ email: invite.email }] : []),
          ...(invite.phone ? [{ phone: invite.phone }] : []),
        ],
      },
    });

    if (portalUser && portalUser.status === 'ACTIVE') {
      throw new BadRequestException(
        'This contact already has an active portal account. Please log in.',
      );
    }

    if (!portalUser) {
      portalUser = await this.prisma.customerPortalUser.create({
        data: {
          tenantId: invite.tenantId,
          customerId: invite.customerId,
          email: invite.email,
          phone: invite.phone,
          firstName: invite.firstName,
          lastName: invite.lastName,
          portalRole: invite.portalRole,
          status: 'INVITED',
          createdBy: invite.invitedById,
        },
      });
    }

    const otp = await this.otpService.issue(
      invite.tenantId,
      portalUser.id,
      'ACTIVATION',
      invite.email ? 'EMAIL' : 'SMS',
      meta,
    );
    await this.deliverOtp(invite.tenantId, invite.email, invite.phone, otp);

    return {
      tenantCode: tenant.code,
      tenantName: tenant.name,
      branding: {
        logoUrl: tenant.tenantSettings?.logoUrl ?? tenant.logoUrl,
        primaryColor: tenant.tenantSettings?.primaryColor ?? null,
        theme: tenant.tenantSettings?.theme ?? 'LIGHT',
      },
      maskedEmail: invite.email ? maskEmail(invite.email) : null,
      maskedPhone: invite.phone ? maskPhone(invite.phone) : null,
    };
  }

  /**
   * Step 2 of activation: consumes the activation OTP, optionally sets a
   * password (omitted = OTP-only login), activates the account, marks the
   * invite accepted and returns tokens (BR-1.4).
   */
  async activate(dto: ActivateInviteDto, meta: RequestMeta = {}) {
    const invite = await this.findPendingInvite(dto.token);

    const portalUser = await this.prisma.customerPortalUser.findFirst({
      where: {
        tenantId: invite.tenantId,
        customerId: invite.customerId,
        deletedAt: null,
        OR: [
          ...(invite.email ? [{ email: invite.email }] : []),
          ...(invite.phone ? [{ phone: invite.phone }] : []),
        ],
      },
    });
    if (!portalUser) {
      throw new BadRequestException(
        'Invite has not been verified yet. Open the invite link first.',
      );
    }

    await this.otpService.verify(
      invite.tenantId,
      portalUser.id,
      'ACTIVATION',
      dto.otp,
      meta,
    );

    const passwordHash = dto.password ? await argon2.hash(dto.password) : null;

    const [activatedUser] = await this.prisma.$transaction([
      this.prisma.customerPortalUser.update({
        where: { id: portalUser.id },
        data: {
          status: 'ACTIVE',
          passwordHash,
          lastLoginAt: new Date(),
        },
      }),
      this.prisma.customerPortalInvite.update({
        where: { id: invite.id },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
          portalUserId: portalUser.id,
        },
      }),
    ]);

    void this.auditService.log({
      tenantId: invite.tenantId,
      actorId: portalUser.id,
      module: 'PORTAL_AUTH',
      entityName: 'customer_portal_user',
      entityId: portalUser.id,
      action: 'PORTAL_ACCOUNT_ACTIVATED',
      requestId: meta.requestId,
      ipAddress: meta.ip,
    });

    return this.generateTokens(activatedUser);
  }

  // ---------------------------------------------------------------------
  // Login (BR-1.5, BR-1.8)
  // ---------------------------------------------------------------------

  async login(dto: PortalLoginDto, meta: RequestMeta = {}) {
    const portalUser = await this.resolveActiveUser(
      dto.tenantCode,
      dto.email,
      dto.phone,
    );

    if (!portalUser.passwordHash) {
      throw new UnauthorizedException(
        'This account uses code-based login. Request a login code instead.',
      );
    }

    const valid = await argon2.verify(portalUser.passwordHash, dto.password);
    if (!valid) {
      void this.auditService.log({
        tenantId: portalUser.tenantId,
        actorId: portalUser.id,
        module: 'PORTAL_AUTH',
        entityName: 'customer_portal_user',
        entityId: portalUser.id,
        action: 'LOGIN_FAILED',
        outcome: 'FAILURE',
        severity: 'MEDIUM',
        requestId: meta.requestId,
        ipAddress: meta.ip,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.touchLogin(portalUser.id);
    return this.generateTokens(portalUser);
  }

  async requestLoginOtp(dto: PortalOtpRequestDto, meta: RequestMeta = {}) {
    // Deliberately generic response on unknown accounts — no enumeration.
    try {
      const portalUser = await this.resolveActiveUser(
        dto.tenantCode,
        dto.email,
        dto.phone,
      );
      const otp = await this.otpService.issue(
        portalUser.tenantId,
        portalUser.id,
        'LOGIN',
        portalUser.email ? 'EMAIL' : 'SMS',
        meta,
      );
      await this.deliverOtp(
        portalUser.tenantId,
        portalUser.email,
        portalUser.phone,
        otp,
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error; // OTP throttle errors are safe and useful to surface
      }
      this.logger.warn('Portal OTP request for unknown/inactive account');
    }
    return { message: 'If the account exists, a login code has been sent.' };
  }

  async loginWithOtp(dto: PortalOtpLoginDto, meta: RequestMeta = {}) {
    const portalUser = await this.resolveActiveUser(
      dto.tenantCode,
      dto.email,
      dto.phone,
    );

    await this.otpService.verify(
      portalUser.tenantId,
      portalUser.id,
      'LOGIN',
      dto.otp,
      meta,
    );

    await this.touchLogin(portalUser.id);
    return this.generateTokens(portalUser);
  }

  // ---------------------------------------------------------------------
  // Refresh & logout — rotation + replay detection (RefreshToken.md rules)
  // ---------------------------------------------------------------------

  async refresh(token: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(token) },
    });

    if (!stored || !stored.portalUserId) {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    if (stored.revokedAt) {
      // Replay: kill every session for this portal user.
      await this.prisma.$transaction([
        this.prisma.customerPortalUser.update({
          where: { id: stored.portalUserId },
          data: { tokenVersion: { increment: 1 } },
        }),
        this.prisma.refreshToken.updateMany({
          where: { portalUserId: stored.portalUserId, revokedAt: null },
          data: { revokedAt: new Date(), revokeReason: 'TOKEN_REPLAY' },
        }),
      ]);
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    const portalUser = await this.prisma.customerPortalUser.findFirst({
      where: { id: stored.portalUserId, deletedAt: null },
      include: { tenant: true },
    });
    if (
      !portalUser ||
      portalUser.status !== 'ACTIVE' ||
      portalUser.tenant.status !== 'ACTIVE'
    ) {
      throw new UnauthorizedException('Account is inactive or suspended');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: {
        revokedAt: new Date(),
        revokeReason: 'ROTATED',
        lastUsedAt: new Date(),
      },
    });

    return this.generateTokens(portalUser);
  }

  async logout(portalUserId: string, tenantId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { portalUserId, tenantId, revokedAt: null },
      data: { revokedAt: new Date(), revokeReason: 'LOGOUT' },
    });
    return { message: 'Logged out' };
  }

  // ---------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------

  private async findPendingInvite(token: string) {
    const invite = await this.prisma.customerPortalInvite.findUnique({
      where: { tokenHash: sha256(token) },
    });

    if (!invite || invite.deletedAt || invite.status !== 'PENDING') {
      throw new UnauthorizedException('Invite is invalid or has been revoked');
    }
    if (invite.expiresAt < new Date()) {
      await this.prisma.customerPortalInvite.update({
        where: { id: invite.id },
        data: { status: 'EXPIRED' },
      });
      throw new UnauthorizedException('Invite has expired');
    }
    return invite;
  }

  private async resolveActiveUser(
    tenantCode: string,
    email?: string,
    phone?: string,
  ) {
    if (!email && !phone) {
      throw new BadRequestException('Provide an email or phone number');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { code: tenantCode },
      include: { tenantSettings: true },
    });
    if (!tenant || tenant.status !== 'ACTIVE') {
      throw new NotFoundException('Provider not found');
    }
    if (!tenant.tenantSettings?.customerPortalEnabled) {
      throw new UnauthorizedException(
        'The customer portal is not enabled for this provider',
      );
    }

    const portalUser = await this.prisma.customerPortalUser.findFirst({
      where: {
        tenantId: tenant.id,
        deletedAt: null,
        ...(email ? { email } : {}),
        ...(phone ? { phone } : {}),
      },
    });

    if (!portalUser || portalUser.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid credentials');
    }
    return portalUser;
  }

  private async touchLogin(portalUserId: string): Promise<void> {
    await this.prisma.customerPortalUser.update({
      where: { id: portalUserId },
      data: { lastLoginAt: new Date() },
    });
  }

  private async generateTokens(portalUser: {
    id: string;
    tenantId: string;
    customerId: string;
    tokenVersion: number;
    email: string | null;
    phone: string | null;
    firstName: string;
    lastName: string | null;
    portalRole: string;
  }) {
    const payload = {
      sub: portalUser.id,
      tenantId: portalUser.tenantId,
      tokenVersion: portalUser.tokenVersion,
      userType: 'CUSTOMER',
      role: 'PORTAL_CUSTOMER',
      customerId: portalUser.customerId,
    };
    const accessToken = this.jwtService.sign(payload);

    const refreshToken = randomBytes(48).toString('base64url');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TTL_DAYS);

    await this.prisma.refreshToken.create({
      data: {
        portalUserId: portalUser.id,
        tenantId: portalUser.tenantId,
        tokenHash: sha256(refreshToken),
        expiresAt,
      },
    });

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: portalUser.tenantId },
      select: { code: true },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: portalUser.id,
        customerId: portalUser.customerId,
        email: portalUser.email,
        phone: portalUser.phone,
        name: portalUser.lastName
          ? `${portalUser.firstName} ${portalUser.lastName}`
          : portalUser.firstName,
        portalRole: portalUser.portalRole,
        tenantCode: tenant?.code,
        userType: 'CUSTOMER',
      },
    };
  }

  /**
   * Delivers an OTP over the available channel. Email uses the tenant (or
   * global) transport; phone delivery is logged as simulated until an
   * SMS/WhatsApp channel for portal identities is wired (BR-6 follow-up).
   */
  private async deliverOtp(
    tenantId: string,
    email: string | null,
    phone: string | null,
    otp: string,
  ): Promise<void> {
    if (email) {
      await this.notifications.sendRawEmail(
        email,
        'Your verification code',
        `<p>Your verification code is <b>${otp}</b>. It expires in 10 minutes.</p>`,
        tenantId,
      );
      return;
    }
    if (phone) {
      this.logger.log(`[SMS:simulated] OTP delivery to ${maskPhone(phone)}`);
    }
  }
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  const visible = local.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(local.length - 2, 1))}@${domain}`;
}

function maskPhone(phone: string): string {
  return phone.length <= 4
    ? '*'.repeat(phone.length)
    : `${'*'.repeat(phone.length - 4)}${phone.slice(-4)}`;
}
