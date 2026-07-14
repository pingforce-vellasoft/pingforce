import {
  Injectable,
  Inject,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomInt } from 'crypto';
import { IPrismaService } from '@pingforce-monorepo/shared';
import { AuditService } from '../audit/audit.service';

export type OtpPurpose = 'PASSWORD_RESET' | 'LOGIN' | 'EMAIL_VERIFICATION';

const OTP_LENGTH = 6;
const OTP_TTL_MINUTES = 10; // OTP.md §7 — email OTP validity
const MAX_VERIFY_ATTEMPTS = 5; // OTP.md §8
const MAX_ACTIVE_RESENDS = 3; // OTP.md §8
const RESEND_COOLDOWN_SECONDS = 60; // OTP.md §8

function hashOtp(otp: string): string {
  return createHash('sha256').update(otp).digest('hex');
}

/**
 * One-Time Password subsystem (OTP.md).
 * OTPs are generated with a CSPRNG, stored only as SHA-256 hashes,
 * single-use, expiring, attempt-limited and fully audited.
 */
@Injectable()
export class OtpService {
  constructor(
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Generates and persists an OTP for the user. Returns the plaintext OTP for
   * delivery — callers must never log or store it.
   */
  async issue(
    tenantId: string | null,
    userId: string,
    purpose: OtpPurpose,
    requestMeta?: { ip?: string; requestId?: string },
  ): Promise<string> {
    const now = new Date();

    // Resend policy: cool-down + max active resends within the validity window
    const activeOtps = await this.prisma.otpCode.findMany({
      where: {
        userId,
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

    // Cryptographically secure, fixed-length numeric OTP
    const otp = randomInt(0, 10 ** OTP_LENGTH)
      .toString()
      .padStart(OTP_LENGTH, '0');

    const expiresAt = new Date(now.getTime() + OTP_TTL_MINUTES * 60 * 1000);

    await this.prisma.otpCode.create({
      data: {
        tenantId,
        userId,
        otp: hashOtp(otp),
        purpose,
        channel: 'EMAIL',
        expiresAt,
      },
    });

    if (tenantId) {
      void this.auditService.log({
        tenantId,
        actorId: userId,
        module: 'AUTH',
        entityName: 'otp',
        entityId: userId,
        action: 'OTP_REQUESTED',
        newValue: { purpose },
        requestId: requestMeta?.requestId,
        ipAddress: requestMeta?.ip,
      });
    }

    return otp;
  }

  /**
   * Verifies and consumes an OTP. Throws on any failure; consumption is
   * atomic — a verified OTP can never be used again (OTP.md BR-OTP-002/003).
   */
  async verify(
    tenantId: string | null,
    userId: string,
    purpose: OtpPurpose,
    otp: string,
    requestMeta?: { ip?: string; requestId?: string },
  ): Promise<void> {
    const now = new Date();

    const record = await this.prisma.otpCode.findFirst({
      where: {
        userId,
        purpose,
        usedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
    });

    const fail = async (code: string, message: string) => {
      if (tenantId) {
        void this.auditService.log({
          tenantId,
          actorId: userId,
          module: 'AUTH',
          entityName: 'otp',
          entityId: userId,
          action: 'OTP_VERIFICATION_FAILED',
          outcome: 'FAILURE',
          severity: 'MEDIUM',
          newValue: { purpose, code },
          requestId: requestMeta?.requestId,
          ipAddress: requestMeta?.ip,
        });
      }
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
      await this.prisma.otpCode.update({
        where: { id: record.id },
        data: { failedAttempts: { increment: 1 } },
      });
      await fail('OTP-001', 'Invalid code');
      return;
    }

    // Consume atomically — only succeeds if still unconsumed
    const consumed = await this.prisma.otpCode.updateMany({
      where: { id: record.id, usedAt: null },
      data: { usedAt: now },
    });

    if (consumed.count === 0) {
      await fail('OTP-003', 'Code has already been used');
      return;
    }

    if (tenantId) {
      void this.auditService.log({
        tenantId,
        actorId: userId,
        module: 'AUTH',
        entityName: 'otp',
        entityId: userId,
        action: 'OTP_VERIFIED',
        newValue: { purpose },
        requestId: requestMeta?.requestId,
        ipAddress: requestMeta?.ip,
      });
    }
  }
}
