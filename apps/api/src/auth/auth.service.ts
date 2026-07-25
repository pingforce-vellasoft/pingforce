/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, @typescript-eslint/no-non-null-assertion */
import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { createHash, randomBytes } from 'crypto';
import { LoginDto } from '@pingforce-monorepo/dto';
import { IAuthService, IPrismaService } from '@pingforce-monorepo/shared';
import { RegisterTenantDto } from './dto/register-tenant.dto';
import { RegisterEmployeeDto } from './dto/register-employee.dto';
import { OnboardingTenantDto } from './dto/onboarding-tenant.dto';
import { OnboardingEmployeeDto } from './dto/onboarding-employee.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { OAuth2Client } from 'google-auth-library';
import { syncSystemRolePermissions } from '../rbac/permission-catalog';
import { seedDefaultNotificationTemplates } from '../notifications/default-templates';
import { SessionService, SessionMeta } from './session.service';
import { AuditService } from '../audit/audit.service';
import { LoginHistoryService } from './login-history.service';
import { OtpService } from './otp.service';
import { NotificationsService } from '../notifications/notifications.service';
import { generateStrongPassword } from '../common/utils/password-generator';

const googleClient = new OAuth2Client();

@Injectable()
export class AuthService implements IAuthService {
  constructor(
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
    private readonly jwtService: JwtService,
    private readonly sessionService: SessionService,
    private readonly auditService: AuditService,
    private readonly loginHistory: LoginHistoryService,
    private readonly otpService: OtpService,
    private readonly notifications: NotificationsService,
  ) {}

  async login(loginDto: LoginDto, meta: SessionMeta = {}) {
    if (!loginDto.tenantCode || loginDto.tenantCode.trim() === '') {
      // Super Admin Login
      const superAdmin = await this.prisma.superAdmin.findUnique({
        where: { email: loginDto.email },
      });
      if (!superAdmin) {
        throw new UnauthorizedException('Invalid super admin credentials');
      }
      const isPasswordValid = await argon2.verify(
        superAdmin.passwordHash,
        loginDto.password,
      );
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid super admin credentials');
      }
      if (superAdmin.status !== 'ACTIVE') {
        throw new UnauthorizedException('Super admin account is suspended');
      }

      const portalType = (loginDto as any).portalType;
      if (portalType === 'MOBILE_APP') {
        throw new UnauthorizedException(
          'Super admins can only login via the admin portal',
        );
      }

      return this.generateTokens(
        superAdmin.id,
        'SYSTEM',
        superAdmin.tokenVersion,
        'SUPER_ADMIN',
      );
    }

    // Tenant User Login
    const tenant = await this.prisma.tenant.findUnique({
      where: { code: loginDto.tenantCode },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        tenantId: tenant.id,
        deletedAt: null,
        ...(loginDto.email ? { email: loginDto.email } : {}),
        ...(loginDto.phone ? { phone: loginDto.phone } : {}),
      },
      include: {
        role: true,
      },
    });

    if (!user) {
      void this.auditService.log({
        tenantId: tenant.id,
        module: 'AUTH',
        entityName: 'user',
        entityId: loginDto.email ?? loginDto.phone ?? '-',
        action: 'LOGIN_FAILED',
        outcome: 'FAILURE',
        severity: 'MEDIUM',
        newValue: { reason: 'UNKNOWN_ACCOUNT' },
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
      });
      this.loginHistory.record({
        tenantId: tenant.id,
        username: loginDto.email ?? loginDto.phone ?? '-',
        outcome: 'UNKNOWN_ACCOUNT',
        deviceId: meta.deviceId,
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await argon2.verify(
      user.passwordHash,
      loginDto.password,
    );
    if (!isPasswordValid) {
      void this.auditService.log({
        tenantId: tenant.id,
        actorId: user.id,
        module: 'AUTH',
        entityName: 'user',
        entityId: user.id,
        action: 'LOGIN_FAILED',
        outcome: 'FAILURE',
        severity: 'MEDIUM',
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
      });
      this.loginHistory.record({
        tenantId: tenant.id,
        userId: user.id,
        username: loginDto.email ?? loginDto.phone ?? '-',
        outcome: 'INVALID_PASSWORD',
        deviceId: meta.deviceId,
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'ACTIVE' || tenant.status !== 'ACTIVE') {
      void this.auditService.log({
        tenantId: tenant.id,
        actorId: user.id,
        module: 'AUTH',
        entityName: 'user',
        entityId: user.id,
        action: 'LOGIN_FAILED',
        outcome: 'FAILURE',
        severity: 'MEDIUM',
        newValue: { reason: 'ACCOUNT_INACTIVE' },
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
      });
      this.loginHistory.record({
        tenantId: tenant.id,
        userId: user.id,
        username: loginDto.email ?? loginDto.phone ?? '-',
        outcome: 'ACCOUNT_INACTIVE',
        deviceId: meta.deviceId,
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
      });
      throw new UnauthorizedException('Account is inactive or suspended');
    }

    // Role-based platform access control
    const roleCode =
      user.role?.code ||
      (user.clientCode === 'SYS_ADMIN' ? 'SUPER_ADMIN' : 'UNKNOWN');
    const portalType = (loginDto as any).portalType; // using any to bypass strict type if DTO didn't rebuild yet

    const recordPortalRestricted = () =>
      this.loginHistory.record({
        tenantId: tenant.id,
        userId: user.id,
        username: loginDto.email ?? loginDto.phone ?? '-',
        outcome: 'PORTAL_RESTRICTED',
        deviceId: meta.deviceId,
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
      });

    if (portalType === 'ADMIN_PORTAL') {
      if (roleCode === 'EMPLOYEE_FIELD_STAFF' || roleCode === 'CUSTOMER') {
        recordPortalRestricted();
        throw new UnauthorizedException(
          'This account is restricted to the mobile app only',
        );
      }
    } else if (portalType === 'MOBILE_APP') {
      if (roleCode === 'SUPER_ADMIN') {
        recordPortalRestricted();
        throw new UnauthorizedException(
          'Super admins can only login via the admin portal',
        );
      }
    }

    // Persistent session — refresh tokens are bound to it (SessionManagement.md)
    const sessionId = await this.sessionService.create(tenant.id, user.id, {
      ...meta,
      platform:
        meta.platform ?? (portalType === 'MOBILE_APP' ? 'MOBILE' : 'WEB'),
    });

    void this.auditService.log({
      tenantId: tenant.id,
      actorId: user.id,
      module: 'AUTH',
      entityName: 'user',
      entityId: user.id,
      action: 'LOGIN',
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });

    this.loginHistory.record({
      tenantId: tenant.id,
      userId: user.id,
      username: loginDto.email ?? loginDto.phone ?? '-',
      outcome: 'SUCCESS',
      sessionId,
      deviceId: meta.deviceId,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });

    return this.generateTokens(
      user.id,
      tenant.id,
      user.tokenVersion,
      roleCode,
      sessionId,
    );
  }

  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async generateTokens(
    userId: string,
    tenantId: string,
    tokenVersion: number,
    roleCode: string,
    sessionId?: string,
  ) {
    const payload = {
      sub: userId,
      tenantId,
      tokenVersion,
      role: roleCode,
      sid: sessionId,
    };
    const accessToken = this.jwtService.sign(payload);

    // Opaque refresh token (RefreshToken.md §3): cryptographically random,
    // never a JWT, stored only as a SHA-256 hash. Super-admin tokens are
    // persisted too, so SYSTEM sessions are revocable.
    const refreshToken = randomBytes(48).toString('base64url');

    const expiresIn = new Date();
    expiresIn.setDate(expiresIn.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        ...(tenantId === 'SYSTEM'
          ? { superAdminId: userId }
          : { userId, sessionId }),
        tenantId,
        tokenHash: this.hashRefreshToken(refreshToken),
        expiresAt: expiresIn,
      },
    });

    let userDetails = null;
    if (tenantId === 'SYSTEM') {
      const admin = await this.prisma.superAdmin.findUnique({
        where: { id: userId },
      });
      if (admin) {
        userDetails = {
          id: admin.id,
          email: admin.email,
          name: admin.name || 'Super Admin',
          role: 'SUPER_ADMIN',
          tenantId: 'SYSTEM',
          tenantCode: 'SYSTEM',
          tenantName: 'Platform',
          isOnboarded: true,
        };
      }
    } else {
      const u = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { tenant: true, role: true, profile: true },
      });
      if (u) {
        userDetails = {
          id: u.id,
          email: u.email,
          name: u.profile?.firstName
            ? `${u.profile.firstName} ${u.profile.lastName}`
            : 'User',
          role: u.role?.code || 'UNKNOWN',
          tenantId: u.tenantId,
          tenantCode: u.tenant.code,
          tenantName: u.tenant.name,
          isOnboarded: !!u.profile,
          mustChangePassword: u.mustChangePassword,
          isAttendanceEnabled: u.tenant.isAttendanceEnabled,
        };
      }
    }

    return {
      accessToken,
      access_token: accessToken, // for compatibility
      refreshToken,
      refresh_token: refreshToken, // for compatibility
      user: userDetails,
    };
  }

  async refreshToken(token: string) {
    // Opaque token lookup — no JWT parsing (RefreshToken.md §3)
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hashRefreshToken(token) },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    // Replay detection (RefreshToken.md §8): a rotated/revoked token being
    // presented again means it was stolen or replayed. Kill every session.
    if (storedToken.revokedAt) {
      if (storedToken.userId) {
        await this.prisma.user.update({
          where: { id: storedToken.userId },
          data: { tokenVersion: { increment: 1 } },
        });
        await this.sessionService.revokeAllForUser(
          storedToken.tenantId,
          storedToken.userId,
          'TOKEN_REPLAY',
        );
        // Routine rotations are not recorded (too noisy — session
        // lastActivityAt already tracks them); replay is security-relevant.
        this.loginHistory.record({
          tenantId: storedToken.tenantId,
          userId: storedToken.userId,
          username: storedToken.userId,
          authMethod: 'REFRESH_TOKEN',
          outcome: 'TOKEN_REPLAY',
          sessionId: storedToken.sessionId ?? undefined,
        });
      } else if (storedToken.superAdminId) {
        await this.prisma.superAdmin.update({
          where: { id: storedToken.superAdminId },
          data: { tokenVersion: { increment: 1 } },
        });
        await this.prisma.refreshToken.updateMany({
          where: { superAdminId: storedToken.superAdminId, revokedAt: null },
          data: { revokedAt: new Date(), revokeReason: 'TOKEN_REPLAY' },
        });
      }
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    // Rotation: mark the old token revoked (kept for replay detection)
    const rotate = () =>
      this.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: {
          revokedAt: new Date(),
          revokeReason: 'ROTATED',
          lastUsedAt: new Date(),
        },
      });

    // Super admin (SYSTEM) path
    if (storedToken.superAdminId) {
      const superAdmin = await this.prisma.superAdmin.findUnique({
        where: { id: storedToken.superAdminId },
      });
      if (!superAdmin || superAdmin.status !== 'ACTIVE') {
        throw new UnauthorizedException(
          'Token invalid or super admin suspended',
        );
      }

      await rotate();
      return this.generateTokens(
        superAdmin.id,
        'SYSTEM',
        superAdmin.tokenVersion,
        'SUPER_ADMIN',
      );
    }

    // Tenant user path
    if (
      storedToken.sessionId &&
      !(await this.sessionService.isActive(storedToken.sessionId))
    ) {
      throw new UnauthorizedException('Session has been revoked or expired');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: storedToken.userId ?? '' },
      include: { role: true, tenant: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.status !== 'ACTIVE' || user.tenant.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is inactive or suspended');
    }

    await rotate();

    if (storedToken.sessionId) {
      await this.sessionService.touch(storedToken.sessionId);
    }

    const roleCode = user.role?.code || 'UNKNOWN';
    return this.generateTokens(
      user.id,
      user.tenantId,
      user.tokenVersion,
      roleCode,
      storedToken.sessionId ?? undefined,
    );
  }

  /** Logout-all: invalidates every access token (tokenVersion) and revokes all sessions/refresh tokens. */
  async logoutAll(tenantId: string, userId: string): Promise<void> {
    if (tenantId === 'SYSTEM') {
      await this.prisma.superAdmin.update({
        where: { id: userId },
        data: { tokenVersion: { increment: 1 } },
      });
      await this.prisma.refreshToken.updateMany({
        where: { superAdminId: userId, revokedAt: null },
        data: { revokedAt: new Date(), revokeReason: 'LOGOUT_ALL' },
      });
      return;
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });
    await this.sessionService.revokeAllForUser(tenantId, userId, 'LOGOUT_ALL');
  }

  /**
   * Self-service password change for an authenticated tenant user. Verifies the
   * current password, sets the new one, clears the mustChangePassword flag, and
   * bumps tokenVersion so every other outstanding session is invalidated. Not
   * available to super admins (SYSTEM) — they have no User row.
   */
  async changePassword(
    tenantId: string,
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    if (tenantId === 'SYSTEM') {
      throw new BadRequestException(
        'Password change is not available for platform accounts here',
      );
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const currentValid = await argon2.verify(
      user.passwordHash,
      currentPassword,
    );
    if (!currentValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const sameAsOld = await argon2.verify(user.passwordHash, newPassword);
    if (sameAsOld) {
      throw new BadRequestException(
        'New password must be different from the current password',
      );
    }

    const newHash = await argon2.hash(newPassword);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
        // Invalidate all other sessions/tokens issued before the change.
        tokenVersion: { increment: 1 },
      },
    });
    await this.sessionService.revokeAllForUser(
      tenantId,
      user.id,
      'PASSWORD_CHANGE',
    );

    void this.auditService.log({
      tenantId,
      actorId: user.id,
      module: 'AUTH',
      entityName: 'user',
      entityId: user.id,
      action: 'PASSWORD_CHANGED',
    });

    return { message: 'Password changed successfully. Please sign in again.' };
  }

  private generateTenantCode(tenantName: string): string {
    const prefix = tenantName
      .replace(/[^a-zA-Z]/g, '')
      .substring(0, 3)
      .toUpperCase()
      .padEnd(3, 'X');
    const randomNum = Math.floor(100 + Math.random() * 900);
    return `${prefix}${randomNum}`;
  }

  async googleAuth(dto: GoogleAuthDto) {
    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: dto.idToken,
        audience: process.env.GOOGLE_CLIENT_ID as string,
      });
      payload = ticket.getPayload();
    } catch (e) {
      throw new UnauthorizedException('Invalid Google Identity Token');
    }

    if (!payload || !payload.email) {
      throw new UnauthorizedException(
        'Google token did not contain an email address',
      );
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { code: dto.tenantCode },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        tenantId: tenant.id,
        email: payload.email,
        deletedAt: null,
      },
      include: {
        role: true,
      },
    });

    if (!user) {
      // Google sign-in is authentication only — it must never provision
      // accounts. A tenant code is guessable, so auto-registration would let
      // anyone with a Google account join any tenant. Users must be invited
      // or registered by their tenant admin first.
      this.loginHistory.record({
        tenantId: tenant.id,
        username: payload.email,
        authMethod: 'GOOGLE',
        outcome: 'UNKNOWN_ACCOUNT',
      });
      throw new UnauthorizedException(
        'No account exists for this email in the selected workspace. Contact your administrator for an invitation.',
      );
    }

    if (user!.status !== 'ACTIVE' || tenant.status !== 'ACTIVE') {
      this.loginHistory.record({
        tenantId: tenant.id,
        userId: user!.id,
        username: payload.email,
        authMethod: 'GOOGLE',
        outcome: 'ACCOUNT_INACTIVE',
      });
      throw new UnauthorizedException('Account is inactive or suspended');
    }

    this.loginHistory.record({
      tenantId: tenant.id,
      userId: user!.id,
      username: payload.email,
      authMethod: 'GOOGLE',
      outcome: 'SUCCESS',
    });

    const roleCode = user!.role?.code || 'UNKNOWN';
    return this.generateTokens(
      user!.id,
      tenant.id,
      user!.tokenVersion,
      roleCode,
    );
  }

  /**
   * Website self-signup. The tenant is created in PROVISIONING and CANNOT log in
   * until the admin verifies their email (verifyEmail flips it to ACTIVE) —
   * login already rejects non-ACTIVE tenants. No tokens are returned here.
   *
   * Signup is gated behind a subscription chosen on the pricing page: a valid
   * `subscriptionId` (paid checkout or free trial) is required unless the
   * SELF_SIGNUP_OPEN env flag is set (open registration for dev/manual use).
   */
  async registerTenant(dto: RegisterTenantDto) {
    const fallbackTenantName = dto.tenantName || 'My Workspace';
    const selfSignupOpen = process.env.SELF_SIGNUP_OPEN === 'true';

    // Resolve and validate the pre-created subscription, if this signup is
    // gated behind one. It must not already belong to a real (non-holding) tenant.
    let subscription: {
      id: string;
      planId: string;
      tenantId: string;
      status: string;
      trialEnd: Date | null;
    } | null = null;
    if (dto.subscriptionId) {
      const sub = await this.prisma.tenantSubscription.findFirst({
        where: { id: dto.subscriptionId, deletedAt: null },
        include: { tenant: { select: { code: true } } },
      });
      if (!sub) {
        throw new BadRequestException('Subscription not found.');
      }
      if (sub.tenant.code !== 'UNASSIGNED') {
        throw new BadRequestException(
          'This subscription is already linked to a workspace.',
        );
      }
      subscription = {
        id: sub.id,
        planId: sub.planId,
        tenantId: sub.tenantId,
        status: sub.status,
        trialEnd: sub.trialEnd,
      };
    } else if (!selfSignupOpen) {
      throw new BadRequestException(
        'Choose a plan before creating your workspace.',
      );
    }

    if (dto.tenantName) {
      const existingTenant = await this.prisma.tenant.findFirst({
        where: { name: dto.tenantName, deletedAt: null },
      });
      if (existingTenant) {
        throw new BadRequestException(
          'A tenant with this name already exists.',
        );
      }
    }

    // Tenant-admin signup creates a brand-new tenant, so the email must be free
    // across the platform. Soft-deleted rows still count — the unique constraint
    // @@unique([tenantId, email]) covers them, so ignoring deletedAt here would
    // only turn a clean 400 into a P2002 further down.
    const existingUser = await this.prisma.user.findFirst({
      where: { email: dto.adminEmail },
      select: { id: true },
    });
    if (existingUser) {
      throw new BadRequestException(
        'An account with this email already exists.',
      );
    }

    let tenantCode = this.generateTenantCode(fallbackTenantName);
    let isCodeUnique = false;
    while (!isCodeUnique) {
      const existingCode = await this.prisma.tenant.findUnique({
        where: { code: tenantCode },
      });
      if (!existingCode) {
        isCodeUnique = true;
      } else {
        tenantCode = this.generateTenantCode(fallbackTenantName);
      }
    }

    const passwordHash = await argon2.hash(dto.adminPassword);

    // Denormalized subscription fields mirrored onto the tenant, so the plan is
    // visible without a join (matches how the billing webhook mirrors them).
    const plan = subscription
      ? await this.prisma.plan.findUnique({
          where: { id: subscription.planId },
          select: { maxFieldStaff: true },
        })
      : null;
    const isTrial = subscription?.status === 'TRIALING';

    // Run in a transaction
    const result = await this.prisma.$transaction(async (prisma) => {
      const tenant = await prisma.tenant.create({
        data: {
          name: fallbackTenantName,
          code: tenantCode,
          domain: dto.domain,
          // Not ACTIVE yet — email verification activates the tenant.
          status: 'PROVISIONING',
          maxFieldStaff: plan?.maxFieldStaff ?? undefined,
          subscriptionStatus: isTrial ? 'TRIAL' : 'ACTIVE',
          subscriptionEnd: subscription?.trialEnd ?? undefined,
        },
      });

      let adminRole = await prisma.role.findFirst({
        where: { tenantId: tenant.id, code: 'ADMIN_MANAGER' },
      });

      if (!adminRole) {
        adminRole = await prisma.role.create({
          data: {
            tenantId: tenant.id,
            name: 'Admin / Manager',
            code: 'ADMIN_MANAGER',
            description: 'Management access',
            isSystem: true,
          },
        });
      }

      await syncSystemRolePermissions(prisma, adminRole.id, 'ADMIN_MANAGER');

      // Default notification templates — without these every business email
      // (visits/leads/faults) is silently skipped by NotificationsService.
      await seedDefaultNotificationTemplates(prisma, tenant.id);

      const profileData =
        dto.adminFirstName && dto.adminLastName
          ? {
              create: {
                firstName: dto.adminFirstName,
                lastName: dto.adminLastName,
              },
            }
          : undefined;

      const adminUser = await prisma.user.create({
        data: {
          tenantId: tenant.id,
          roleId: adminRole.id,
          email: dto.adminEmail,
          passwordHash: passwordHash,
          profile: profileData,
          phone: dto.adminPhone,
          status: 'ACTIVE',
          clientCode: 'TENANT_ADMIN',
        },
      });

      // Re-link the website subscription from the UNASSIGNED holding tenant to
      // the real one now that it exists.
      if (subscription) {
        await prisma.tenantSubscription.update({
          where: { id: subscription.id },
          data: { tenantId: tenant.id },
        });
      }

      return { tenant, adminUser };
    });

    // Fire the email-verification code (background — never fail signup on SMTP).
    if (result.adminUser.email) {
      await this.sendEmailVerification(
        result.tenant.id,
        result.adminUser.id,
        result.adminUser.email,
      );
    }

    return {
      message:
        'Workspace created. Check your email for a verification code to activate it.',
      tenantCode: result.tenant.code,
      email: result.adminUser.email,
      // No tokens: the tenant is PROVISIONING until the email is verified.
      verificationRequired: true,
    };
  }

  /**
   * Issues an EMAIL_VERIFICATION OTP and emails it. Best-effort: a failure is
   * logged, not thrown, so provisioning is never rolled back by a mail outage —
   * the admin can request a fresh code.
   */
  private async sendEmailVerification(
    tenantId: string,
    userId: string,
    email: string,
  ): Promise<void> {
    try {
      const otp = await this.otpService.issue(
        tenantId,
        userId,
        'EMAIL_VERIFICATION',
      );
      await this.notifications.sendRawEmail(
        email,
        'Verify your PingForce email',
        `<p>Welcome to PingForce!</p>
         <p>Your email verification code is <b>${otp}</b>.</p>
         <p>It expires in 10 minutes. Enter it to activate your workspace.</p>`,
        tenantId,
      );
    } catch {
      // Swallowed intentionally — see doc comment.
    }
  }

  /**
   * Confirms a self-signup admin's email with the OTP, activates the tenant
   * (PROVISIONING → ACTIVE, so login is now permitted) and sends the welcome
   * email carrying the auto-generated workspace ID.
   */
  async verifyEmail(dto: {
    tenantCode: string;
    email: string;
    otp: string;
  }): Promise<{ message: string; tenantCode: string }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { code: dto.tenantCode },
    });
    if (!tenant) {
      throw new BadRequestException('Invalid verification request.');
    }
    if (tenant.status === 'ACTIVE') {
      return { message: 'Email already verified.', tenantCode: tenant.code };
    }

    const user = await this.prisma.user.findFirst({
      where: { tenantId: tenant.id, email: dto.email, deletedAt: null },
      select: { id: true },
    });
    if (!user) {
      throw new BadRequestException('Invalid verification request.');
    }

    await this.otpService.verify(
      tenant.id,
      user.id,
      'EMAIL_VERIFICATION',
      dto.otp,
    );

    await this.prisma.tenant.update({
      where: { id: tenant.id },
      data: { status: 'ACTIVE' },
    });

    void this.auditService.log({
      tenantId: tenant.id,
      actorId: user.id,
      module: 'AUTH',
      entityName: 'tenant',
      entityId: tenant.id,
      action: 'TENANT_ACTIVATED',
      severity: 'MEDIUM',
    });

    // Welcome email with the workspace ID — best-effort, never blocks activation.
    void this.sendWelcomeEmail(tenant.id, dto.email, tenant.name, tenant.code);

    return {
      message:
        'Email verified. Your workspace is now active — you can sign in.',
      tenantCode: tenant.code,
    };
  }

  private async sendWelcomeEmail(
    tenantId: string,
    email: string,
    workspaceName: string,
    workspaceCode: string,
  ): Promise<void> {
    const webUrl = process.env.ADMIN_WEB_URL ?? 'https://admin.pingforce.in';
    try {
      await this.notifications.sendRawEmail(
        email,
        `Welcome to PingForce — ${workspaceName} is ready`,
        `<p>Your PingForce workspace is active.</p>
         <ul>
           <li><strong>Workspace ID:</strong> ${workspaceCode}</li>
           <li><strong>Sign-in email:</strong> ${email}</li>
         </ul>
         <p>Keep your Workspace ID handy — you'll need it to sign in on the
            web portal and the mobile app.</p>
         <p><a href="${webUrl}">Open the admin portal</a></p>`,
        tenantId,
      );
    } catch {
      // Best-effort.
    }
  }

  async registerEmployee(dto: RegisterEmployeeDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { code: dto.tenantCode },
    });

    if (!tenant) {
      throw new BadRequestException('Invalid tenant code provided.');
    }

    if (tenant.status !== 'ACTIVE') {
      throw new BadRequestException('This tenant account is inactive.');
    }

    // Soft-deleted rows are intentionally included: the DB uniques
    // ([tenantId, email] / [tenantId, phone]) apply to them too, so an email or
    // phone released only by a soft delete is still taken.
    const existingUser = await this.prisma.user.findFirst({
      where: {
        tenantId: tenant.id,
        OR: [
          { email: dto.email },
          ...(dto.phone ? [{ phone: dto.phone }] : []),
        ],
      },
      select: { email: true },
    });

    if (existingUser) {
      throw new BadRequestException(
        existingUser.email === dto.email
          ? 'An employee with this email already exists in this tenant.'
          : 'An employee with this phone number already exists in this tenant.',
      );
    }

    const passwordHash = await argon2.hash(dto.password);

    let employeeRole = await this.prisma.role.findFirst({
      where: { tenantId: tenant.id, code: 'EMPLOYEE_FIELD_STAFF' },
    });

    if (!employeeRole) {
      employeeRole = await this.prisma.role.create({
        data: {
          tenantId: tenant.id,
          name: 'Employee / Field Staff',
          code: 'EMPLOYEE_FIELD_STAFF',
          description: 'Standard employee (Mobile App Only)',
          isSystem: true,
        },
      });
    }

    await syncSystemRolePermissions(
      this.prisma,
      employeeRole.id,
      'EMPLOYEE_FIELD_STAFF',
    );

    const employee = await this.prisma.user.create({
      data: {
        tenantId: tenant.id,
        roleId: employeeRole.id,
        email: dto.email,
        passwordHash: passwordHash,
        profile: {
          create: {
            firstName: dto.firstName,
            lastName: dto.lastName,
          },
        },
        phone: dto.phone,
        status: 'ACTIVE',
        clientCode: `EMP_${Date.now()}`,
      },
    });

    return {
      message: 'Employee registered successfully. You can now log in.',
      userId: employee.id,
    };
  }

  async onboardTenant(
    userId: string,
    tenantId: string,
    dto: OnboardingTenantDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, tenantId },
      include: { profile: true },
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.profile)
      throw new BadRequestException('User is already onboarded');

    let logoUrl = null;
    if (dto.logoBase64) {
      try {
        const fs = require('fs');
        const path = require('path');
        const crypto = require('crypto');

        const uploadsDir = path.join(process.cwd(), 'uploads', 'logos');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const base64Data = dto.logoBase64.replace(
          /^data:image\/\w+;base64,/,
          '',
        );
        const filename = `${tenantId}-${crypto.randomBytes(4).toString('hex')}.png`;
        const filepath = path.join(uploadsDir, filename);

        fs.writeFileSync(filepath, base64Data, 'base64');
        logoUrl = `/api/v1/uploads/logos/${filename}`;
      } catch (err) {
        console.error('Failed to save logo:', err);
      }
    }

    await this.prisma.$transaction(async (prisma) => {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          name: dto.tenantName,
          industry: dto.industry,
          legalName: dto.legalName,
          address: dto.address,
          city: dto.city,
          state: dto.state,
          country: dto.country,
          postalCode: dto.postalCode,
          billingEmail: dto.billingEmail,
          themeColor: dto.themeColor,
          ...(logoUrl && { logoUrl }),
        },
      });

      await prisma.user.update({
        where: { id: userId },
        data: {
          phone: dto.phone,
          profile: {
            create: {
              firstName: dto.firstName,
              lastName: dto.lastName,
            },
          },
        },
      });
    });

    return { message: 'Tenant onboarding completed successfully' };
  }

  async onboardEmployee(
    userId: string,
    tenantId: string,
    dto: OnboardingEmployeeDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, tenantId },
      include: { profile: true },
    });

    if (!user) throw new NotFoundException('User not found');

    // Here we can validate if the dto.tenantCode matches the invite code or the tenant they belong to.
    // If they were created in a temporary tenant (e.g. from generic signup), we would move them to the target tenant here.
    // For now, assuming they signed up via invite link and just need to fill profile.

    // Idempotent: an admin-provisioned employee already has a profile (see
    // EmployeeService.create), so re-running onboarding must not fail — otherwise
    // the mobile profile-setup gate traps them (can't complete, can't skip). Upsert
    // the profile and update the phone instead of throwing "already onboarded".
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        phone: dto.phone,
        profile: {
          upsert: {
            create: {
              firstName: dto.firstName,
              lastName: dto.lastName,
            },
            update: {
              firstName: dto.firstName,
              lastName: dto.lastName,
            },
          },
        },
      },
    });

    return { message: 'Employee onboarding completed successfully' };
  }
}
