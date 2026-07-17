import {
  Injectable,
  Inject,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomInt } from 'crypto';
import { IPrismaService } from '@pingforce-monorepo/shared';
import { AuditService } from '../../audit/audit.service';

export type PortalOtpPurpose =
  | 'LOGIN'
  | 'ACTIVATION'
  | 'PASSWORD_RESET'
  | 'CONTACT_CHANGE';

const OTP_LENGTH = 6;
const OTP_TTL_MINUTES = 10;
const MAX_VERIFY_ATTEMPTS = 5;
const MAX_ACTIVE_RESENDS = 3;
const RESEND_COOLDOWN_SECONDS = 60;

function hashOtp(otp: string): string {
  return createHash('sha256').update(otp).digest('hex');
}

/**
 * OTP subsystem for customer portal identities (3.8_CustomerPortal).
 * Mirrors the staff OtpService (OTP.md rules: CSPRNG, hash-only storage,
 * single-use, expiring, attempt-limited, audited) against the
 * customer_portal_otps table, since OtpCode is FK-bound to staff Users.
 */
@Injectable()
export class PortalOtpService {
  constructor(
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
    private readonly auditService: AuditService,
  ) {}

  /** Generates and persists an OTP. Returns plaintext for delivery only. */
  async issue(
    tenantId: string,
    portalUserId: string,
    purpose: PortalOtpPurpose,
    channel: 'EMAIL' | 'SMS',
    requestMeta?: { ip?: string; requestId?: string },
  ): Promise<string> {
    const now = new Date();

    const activeOtps = await this.prisma.customerPortalOtp.findMany({
      where: {
        portalUserId,
        purpose,
        usedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (activeOtps.length > 0) {
      const newest = activeOtps[0];
      const secondsSinceLast =
        (now.getTime() - newest.createdAt.getTime()) / 1000;
      if (secondsSinceLast < RESEND_COOLDOWN_SECONDS) {
        throw new BadRequestException(
          'OTP-005: Please wait before requesting another code',
        );
      }
      if (activeOtps.length >= MAX_ACTIVE_RESENDS) {
        throw new BadRequestException(
          'OTP-005: Resend limit exceeded. Try again later.',
        );
      }
    }

    const otp = randomInt(0, 10 ** OTP_LENGTH)
      .toString()
      .padStart(OTP_LENGTH, '0');

    const expiresAt = new Date(now.getTime() + OTP_TTL_MINUTES * 60 * 1000);

    await this.prisma.customerPortalOtp.create({
      data: {
        tenantId,
        portalUserId,
        otp: hashOtp(otp),
        purpose,
        channel,
        expiresAt,
      },
    });

    void this.auditService.log({
      tenantId,
      actorId: portalUserId,
      module: 'PORTAL_AUTH',
      entityName: 'portal_otp',
      entityId: portalUserId,
      action: 'OTP_REQUESTED',
      newValue: { purpose },
      requestId: requestMeta?.requestId,
      ipAddress: requestMeta?.ip,
    });

    return otp;
  }

  /** Verifies and consumes an OTP atomically. Throws on any failure. */
  async verify(
    tenantId: string,
    portalUserId: string,
    purpose: PortalOtpPurpose,
    otp: string,
    requestMeta?: { ip?: string; requestId?: string },
  ): Promise<void> {
    const now = new Date();

    const record = await this.prisma.customerPortalOtp.findFirst({
      where: {
        portalUserId,
        purpose,
        usedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
    });

    const fail = async (code: string, message: string) => {
      void this.auditService.log({
        tenantId,
        actorId: portalUserId,
        module: 'PORTAL_AUTH',
        entityName: 'portal_otp',
        entityId: portalUserId,
        action: 'OTP_VERIFICATION_FAILED',
        outcome: 'FAILURE',
        severity: 'MEDIUM',
        newValue: { purpose, code },
        requestId: requestMeta?.requestId,
        ipAddress: requestMeta?.ip,
      });
      throw new UnauthorizedException(`${code}: ${message}`);
    };

    if (!record) {
      await fail('OTP-002', 'Code is invalid or has expired');
      return;
    }

    if (record.failedAttempts >= MAX_VERIFY_ATTEMPTS) {
      await fail('OTP-004', 'Too many attempts. Request a new code.');
      return;
    }

    if (hashOtp(otp) !== record.otp) {
      await this.prisma.customerPortalOtp.update({
        where: { id: record.id },
        data: { failedAttempts: { increment: 1 } },
      });
      await fail('OTP-001', 'Invalid code');
      return;
    }

    const consumed = await this.prisma.customerPortalOtp.updateMany({
      where: { id: record.id, usedAt: null },
      data: { usedAt: now },
    });

    if (consumed.count === 0) {
      await fail('OTP-003', 'Code has already been used');
      return;
    }

    void this.auditService.log({
      tenantId,
      actorId: portalUserId,
      module: 'PORTAL_AUTH',
      entityName: 'portal_otp',
      entityId: portalUserId,
      action: 'OTP_VERIFIED',
      newValue: { purpose },
      requestId: requestMeta?.requestId,
      ipAddress: requestMeta?.ip,
    });
  }
}
