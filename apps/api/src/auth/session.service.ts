import {
  Injectable,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { IPrismaService } from '@pingforce-monorepo/shared';
import { AuditService } from '../audit/audit.service';

const SESSION_TTL_DAYS = 7; // matches refresh-token lifetime

export interface SessionMeta {
  readonly deviceId?: string;
  readonly platform?: string;
  readonly ip?: string;
  readonly userAgent?: string;
}

/**
 * Persistent session lifecycle (SessionManagement.md).
 * One session per login; refresh tokens are bound to a session; revoking a
 * session revokes its refresh tokens.
 */
@Injectable()
export class SessionService {
  constructor(
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(
    tenantId: string,
    userId: string,
    meta: SessionMeta,
  ): Promise<string> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);

    const session = await this.prisma.session.create({
      data: {
        tenantId,
        userId,
        deviceId: meta.deviceId,
        platform: meta.platform,
        ip: meta.ip,
        userAgent: meta.userAgent,
        expiresAt,
      },
    });

    void this.auditService.log({
      tenantId,
      actorId: userId,
      module: 'AUTH',
      entityName: 'session',
      entityId: session.id,
      action: 'SESSION_CREATED',
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
      deviceId: meta.deviceId,
    });

    return session.id;
  }

  /** Returns true when the session may continue to be used. */
  async isActive(sessionId: string): Promise<boolean> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { revokedAt: true, expiresAt: true },
    });
    return (
      !!session && !session.revokedAt && session.expiresAt > new Date()
    );
  }

  async touch(sessionId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { lastActivityAt: new Date() },
    });
  }

  async listForUser(tenantId: string, userId: string) {
    return this.prisma.session.findMany({
      where: {
        tenantId,
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        deviceId: true,
        platform: true,
        ip: true,
        userAgent: true,
        lastActivityAt: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { lastActivityAt: 'desc' },
    });
  }

  /** Revokes one of the caller's own sessions plus its refresh tokens. */
  async revoke(
    tenantId: string,
    userId: string,
    sessionId: string,
    reason: string,
  ): Promise<void> {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, tenantId, userId },
      select: { id: true },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.session.update({
        where: { id: sessionId },
        data: { revokedAt: now, revokeReason: reason },
      }),
      this.prisma.refreshToken.updateMany({
        where: { sessionId, revokedAt: null },
        data: { revokedAt: now, revokeReason: reason },
      }),
    ]);

    void this.auditService.log({
      tenantId,
      actorId: userId,
      module: 'AUTH',
      entityName: 'session',
      entityId: sessionId,
      action: 'SESSION_REVOKED',
      newValue: { reason },
    });
  }

  /** Revokes every session + refresh token for the user (logout-all, password reset, replay response). */
  async revokeAllForUser(
    tenantId: string,
    userId: string,
    reason: string,
  ): Promise<void> {
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.session.updateMany({
        where: { tenantId, userId, revokedAt: null },
        data: { revokedAt: now, revokeReason: reason },
      }),
      this.prisma.refreshToken.updateMany({
        where: { tenantId, userId, revokedAt: null },
        data: { revokedAt: now, revokeReason: reason },
      }),
    ]);

    void this.auditService.log({
      tenantId,
      actorId: userId,
      module: 'AUTH',
      entityName: 'session',
      entityId: userId,
      action: 'ALL_SESSIONS_REVOKED',
      severity: reason === 'TOKEN_REPLAY' ? 'CRITICAL' : 'MEDIUM',
      newValue: { reason },
    });
  }
}
