import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { IPrismaService } from '@pingforce-monorepo/shared';
import { AuditService } from '../audit/audit.service';

/** PasswordPolicy.md §12 recommended defaults. */
const DEFAULT_LOCKOUT_THRESHOLD = 5;
const DEFAULT_LOCKOUT_MINUTES = 30;
/** PasswordPolicy.md §7: default 10 remembered, maximum 24. */
const DEFAULT_HISTORY_DEPTH = 10;
const MAX_HISTORY_DEPTH = 24;

function readPositiveInt(
  raw: string | undefined,
  fallback: number,
  max?: number,
): number {
  const parsed = Number.parseInt(raw ?? '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return max ? Math.min(parsed, max) : parsed;
}

export interface LockableUser {
  readonly id: string;
  readonly lockedUntil: Date | null;
}

/**
 * Account lockout + password-history enforcement (PasswordPolicy.md §7, §12).
 * Thresholds are env-tunable; tenant-level policy tables are a later step.
 */
@Injectable()
export class PasswordPolicyService {
  readonly lockoutThreshold = readPositiveInt(
    process.env.PASSWORD_LOCKOUT_THRESHOLD,
    DEFAULT_LOCKOUT_THRESHOLD,
  );
  readonly lockoutMinutes = readPositiveInt(
    process.env.PASSWORD_LOCKOUT_MINUTES,
    DEFAULT_LOCKOUT_MINUTES,
  );
  readonly historyDepth = readPositiveInt(
    process.env.PASSWORD_HISTORY_DEPTH,
    DEFAULT_HISTORY_DEPTH,
    MAX_HISTORY_DEPTH,
  );

  constructor(
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
    private readonly auditService: AuditService,
  ) {}

  isLocked(user: LockableUser, now: Date = new Date()): boolean {
    return !!user.lockedUntil && user.lockedUntil > now;
  }

  /** Throws PWD-006 while the lock window is open. */
  assertNotLocked(user: LockableUser): void {
    if (this.isLocked(user)) {
      throw new ForbiddenException(
        'PWD-006: Account locked after repeated failed sign-in attempts. Try again later or contact your administrator.',
      );
    }
  }

  /**
   * Counts a failed password attempt atomically; locks the account once the
   * threshold is reached. Returns true when this attempt triggered the lock.
   */
  async registerFailedAttempt(
    tenantId: string,
    userId: string,
    meta: { ip?: string; userAgent?: string } = {},
  ): Promise<boolean> {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginCount: { increment: 1 } },
      select: { failedLoginCount: true },
    });
    if (updated.failedLoginCount < this.lockoutThreshold) return false;

    const lockedUntil = new Date(Date.now() + this.lockoutMinutes * 60_000);
    await this.prisma.user.update({
      where: { id: userId },
      data: { lockedUntil, failedLoginCount: 0 },
    });
    void this.auditService.log({
      tenantId,
      actorId: userId,
      module: 'AUTH',
      entityName: 'user',
      entityId: userId,
      action: 'ACCOUNT_LOCKED',
      outcome: 'FAILURE',
      severity: 'HIGH',
      newValue: {
        threshold: this.lockoutThreshold,
        lockedUntil: lockedUntil.toISOString(),
      },
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });
    return true;
  }

  /** Clears counters after a successful sign-in (no-op write avoided). */
  async resetFailedAttempts(user: {
    id: string;
    failedLoginCount: number;
    lockedUntil: Date | null;
  }): Promise<void> {
    if (user.failedLoginCount === 0 && !user.lockedUntil) return;
    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null },
    });
  }

  /** Administrator unlock (PasswordPolicy.md §12 "administrator unlock"). */
  async unlock(
    tenantId: string,
    userId: string,
    actorId: string,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
      select: { id: true, lockedUntil: true, failedLoginCount: true },
    });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null },
    });
    void this.auditService.log({
      tenantId,
      actorId,
      module: 'AUTH',
      entityName: 'user',
      entityId: user.id,
      action: 'ACCOUNT_UNLOCKED',
      severity: 'HIGH',
      oldValue: {
        lockedUntil: user.lockedUntil?.toISOString() ?? null,
        failedLoginCount: user.failedLoginCount,
      },
    });
    return { message: 'Account unlocked' };
  }

  /**
   * Rejects a new password matching the current hash or any of the last
   * `historyDepth` hashes (PWD-002).
   */
  async assertNotReused(
    userId: string,
    currentHash: string,
    newPassword: string,
  ): Promise<void> {
    const previous = await this.prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: this.historyDepth,
      select: { passwordHash: true },
    });
    const hashes = [currentHash, ...previous.map((p) => p.passwordHash)];
    for (const hash of hashes) {
      if (await argon2.verify(hash, newPassword)) {
        throw new BadRequestException(
          `PWD-002: Password was used recently. Choose one not among your last ${this.historyDepth} passwords.`,
        );
      }
    }
  }

  /**
   * Operation for the caller's $transaction: archive the outgoing hash so it
   * participates in future reuse checks.
   */
  archiveHash(
    tenantId: string,
    userId: string,
    outgoingHash: string,
    actorId?: string,
  ) {
    return this.prisma.passwordHistory.create({
      data: {
        tenantId,
        userId,
        passwordHash: outgoingHash,
        createdBy: actorId ?? userId,
      },
    });
  }
}
