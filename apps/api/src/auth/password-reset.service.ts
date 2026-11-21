import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { IPrismaService } from '@pingforce-monorepo/shared';
import { OtpService } from './otp.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { SessionService } from './session.service';
import { PasswordPolicyService } from './password-policy.service';

const GENERIC_RESPONSE = {
  message: 'If the account exists, a verification code has been sent.',
};

/**
 * Forgot-password flow (OTP.md + SessionManagement.md).
 * Responses never reveal whether an account exists (no user enumeration).
 */
@Injectable()
export class PasswordResetService {
  constructor(
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
    private readonly otpService: OtpService,
    private readonly notifications: NotificationsService,
    private readonly auditService: AuditService,
    private readonly sessionService: SessionService,
    private readonly passwordPolicy: PasswordPolicyService,
  ) {}

  async requestReset(
    email: string,
    tenantCode: string,
    requestMeta?: { ip?: string; requestId?: string },
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { code: tenantCode },
    });
    if (!tenant || tenant.status !== 'ACTIVE') return GENERIC_RESPONSE;

    const user = await this.prisma.user.findFirst({
      where: { tenantId: tenant.id, email, status: 'ACTIVE', deletedAt: null },
      select: { id: true, email: true },
    });
    if (!user?.email) return GENERIC_RESPONSE;

    const otp = await this.otpService.issue(
      tenant.id,
      user.id,
      'PASSWORD_RESET',
      requestMeta,
    );

    await this.notifications.sendRawEmail(
      user.email,
      'Your PingForce password reset code',
      `<p>Your verification code is <b>${otp}</b>.</p>
       <p>It expires in 10 minutes. If you did not request this, ignore this email.</p>`,
      // Through the tenant's own email provider when it has one (Email.md §5).
      tenant.id,
    );

    return GENERIC_RESPONSE;
  }

  async confirmReset(
    email: string,
    tenantCode: string,
    otp: string,
    newPassword: string,
    requestMeta?: { ip?: string; requestId?: string },
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { code: tenantCode },
    });
    if (!tenant) {
      throw new UnauthorizedException('Invalid code');
    }

    const user = await this.prisma.user.findFirst({
      where: { tenantId: tenant.id, email, status: 'ACTIVE', deletedAt: null },
      select: { id: true, passwordHash: true },
    });
    if (!user) {
      // Same error as an invalid OTP — no enumeration
      throw new UnauthorizedException('Invalid code');
    }

    await this.otpService.verify(
      tenant.id,
      user.id,
      'PASSWORD_RESET',
      otp,
      requestMeta,
    );

    // PWD-002 reuse check (PasswordPolicy.md §7). Runs after OTP verify so
    // the history check can't be probed without a valid code.
    await this.passwordPolicy.assertNotReused(
      user.id,
      user.passwordHash,
      newPassword,
    );

    const passwordHash = await argon2.hash(newPassword);

    // New password + global session invalidation (tokenVersion bump revokes
    // every outstanding access/refresh token). A verified email OTP also
    // clears any lockout — the owner proved control of the account.
    await this.prisma.$transaction([
      this.passwordPolicy.archiveHash(tenant.id, user.id, user.passwordHash),
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          tokenVersion: { increment: 1 },
          passwordChangedAt: new Date(),
          failedLoginCount: 0,
          lockedUntil: null,
        },
      }),
    ]);

    await this.sessionService.revokeAllForUser(
      tenant.id,
      user.id,
      'PASSWORD_RESET',
    );

    void this.auditService.log({
      tenantId: tenant.id,
      actorId: user.id,
      module: 'AUTH',
      entityName: 'user',
      entityId: user.id,
      action: 'PASSWORD_RESET',
      severity: 'HIGH',
      requestId: requestMeta?.requestId,
      ipAddress: requestMeta?.ip,
    });

    return { message: 'Password has been reset. Please sign in again.' };
  }
}
