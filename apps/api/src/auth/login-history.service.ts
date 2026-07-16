import { Inject, Injectable, Logger } from '@nestjs/common';
import { IPrismaService } from '@pingforce-monorepo/shared';

export type LoginOutcome =
  | 'SUCCESS'
  | 'UNKNOWN_ACCOUNT'
  | 'INVALID_PASSWORD'
  | 'ACCOUNT_INACTIVE'
  | 'PORTAL_RESTRICTED'
  | 'TOKEN_REPLAY';

export type AuthMethod = 'PASSWORD' | 'REFRESH_TOKEN' | 'GOOGLE';

export interface LoginHistoryEntry {
  readonly tenantId: string;
  readonly userId?: string;
  readonly username: string;
  readonly authMethod?: AuthMethod;
  readonly outcome: LoginOutcome;
  readonly sessionId?: string;
  readonly deviceId?: string;
  readonly ipAddress?: string;
  readonly userAgent?: string;
}

export interface LoginHistoryPage {
  readonly items: readonly unknown[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

const MAX_PAGE_SIZE = 100;

/**
 * Immutable login/authentication activity trail (LoginHistory.md §5).
 * Records are written fire-and-forget so a history-write failure can never
 * block an authentication flow. Tenant users only — SYSTEM (super-admin)
 * accounts have no Tenant row for the FK.
 */
@Injectable()
export class LoginHistoryService {
  private readonly logger = new Logger(LoginHistoryService.name);

  constructor(
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
  ) {}

  record(entry: LoginHistoryEntry): void {
    void this.prisma.loginHistory
      .create({
        data: {
          tenantId: entry.tenantId,
          userId: entry.userId,
          username: entry.username,
          authMethod: entry.authMethod ?? 'PASSWORD',
          outcome: entry.outcome,
          sessionId: entry.sessionId,
          deviceId: entry.deviceId,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
        },
      })
      .catch((error: unknown) => {
        this.logger.error(
          `Failed to record login history: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      });
  }

  /** Stamps logoutAt on the SUCCESS record(s) bound to a session (§5 logout_timestamp). */
  markLogout(sessionId: string): void {
    void this.prisma.loginHistory
      .updateMany({
        where: { sessionId, outcome: 'SUCCESS', logoutAt: null },
        data: { logoutAt: new Date() },
      })
      .catch((error: unknown) => {
        this.logger.error(
          `Failed to mark logout in login history: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      });
  }

  /** Stamps logoutAt on every open SUCCESS record of a user (logout-all, replay response). */
  markLogoutAll(tenantId: string, userId: string): void {
    void this.prisma.loginHistory
      .updateMany({
        where: { tenantId, userId, outcome: 'SUCCESS', logoutAt: null },
        data: { logoutAt: new Date() },
      })
      .catch((error: unknown) => {
        this.logger.error(
          `Failed to mark logout-all in login history: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      });
  }

  /** Self-service "my logins" (LoginHistory.md §14), newest first. */
  async listForUser(
    tenantId: string,
    userId: string,
    page = 1,
    pageSize = 20,
  ): Promise<LoginHistoryPage> {
    const safePage = Math.max(1, page);
    const safeSize = Math.min(Math.max(1, pageSize), MAX_PAGE_SIZE);

    const where = { tenantId, userId };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.loginHistory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * safeSize,
        take: safeSize,
        select: {
          id: true,
          authMethod: true,
          outcome: true,
          deviceId: true,
          ipAddress: true,
          userAgent: true,
          createdAt: true,
          logoutAt: true,
        },
      }),
      this.prisma.loginHistory.count({ where }),
    ]);

    return { items, total, page: safePage, pageSize: safeSize };
  }
}
