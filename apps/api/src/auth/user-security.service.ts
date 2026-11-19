import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IPrismaService } from '@pingforce-monorepo/shared';
import { SessionService } from './session.service';
import { PasswordPolicyService } from './password-policy.service';

export interface UserSecurityStatus {
  readonly userId: string;
  readonly locked: boolean;
  readonly lockedUntil: Date | null;
  readonly failedLoginCount: number;
  readonly passwordChangedAt: Date | null;
  readonly mustChangePassword: boolean;
}

/**
 * Administrator-side session + lockout management for users of the caller's
 * tenant (SessionManagement.md §2 forced logout, PasswordPolicy.md §12).
 * Every method verifies the target user belongs to `tenantId` first.
 */
@Injectable()
export class UserSecurityService {
  constructor(
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
    private readonly sessionService: SessionService,
    private readonly passwordPolicy: PasswordPolicyService,
  ) {}

  private async requireTenantUser(tenantId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
      select: {
        id: true,
        lockedUntil: true,
        failedLoginCount: true,
        passwordChangedAt: true,
        mustChangePassword: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async getStatus(
    tenantId: string,
    userId: string,
  ): Promise<UserSecurityStatus> {
    const user = await this.requireTenantUser(tenantId, userId);
    return {
      userId: user.id,
      locked: this.passwordPolicy.isLocked(user),
      lockedUntil: user.lockedUntil,
      failedLoginCount: user.failedLoginCount,
      passwordChangedAt: user.passwordChangedAt,
      mustChangePassword: user.mustChangePassword,
    };
  }

  async listSessions(tenantId: string, userId: string) {
    await this.requireTenantUser(tenantId, userId);
    return this.sessionService.listForUser(tenantId, userId);
  }

  async revokeSession(
    tenantId: string,
    userId: string,
    sessionId: string,
    actorId: string,
  ): Promise<{ message: string }> {
    await this.requireTenantUser(tenantId, userId);
    await this.sessionService.revoke(
      tenantId,
      userId,
      sessionId,
      'ADMIN_REVOKED',
      actorId,
    );
    return { message: 'Session revoked' };
  }

  /**
   * Forced logout everywhere: revokes all sessions/refresh tokens and bumps
   * tokenVersion so outstanding access tokens die immediately too.
   */
  async revokeAllSessions(
    tenantId: string,
    userId: string,
    actorId: string,
  ): Promise<{ message: string }> {
    await this.requireTenantUser(tenantId, userId);
    await this.prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });
    await this.sessionService.revokeAllForUser(
      tenantId,
      userId,
      'ADMIN_FORCED_LOGOUT',
      actorId,
    );
    return { message: 'All sessions revoked' };
  }

  async unlock(
    tenantId: string,
    userId: string,
    actorId: string,
  ): Promise<{ message: string }> {
    return this.passwordPolicy.unlock(tenantId, userId, actorId);
  }
}
