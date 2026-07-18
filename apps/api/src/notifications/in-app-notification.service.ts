import { Inject, Injectable, Logger } from '@nestjs/common';
import { IPrismaService } from '@pingforce-monorepo/shared';

// ─────────────────────────────────────────────────────────────────────────────
// IN-APP NOTIFICATION SERVICE  (Controller → Service → Prisma)
// ─────────────────────────────────────────────────────────────────────────────
//
// Owns the in-app notification feed shown on the mobile Home bell + centre.
// - create(): called by event handlers when something the user cares about
//   happens. Never throws into the caller — a failed notification must not
//   roll back the domain action that triggered it.
// - list/unreadCount/markRead/markAllRead: self-scoped reads for the recipient.

export type NotificationCategory =
  | 'ATTENDANCE'
  | 'FAULT'
  | 'LEAVE'
  | 'VISIT'
  | 'LEAD'
  | 'SYSTEM';

export interface CreateNotificationInput {
  readonly tenantId: string;
  readonly recipientId: string; // userId
  readonly category: NotificationCategory;
  readonly title: string;
  readonly body?: string;
  readonly deepLinkRoute?: string;
}

@Injectable()
export class InAppNotificationService {
  private readonly logger = new Logger(InAppNotificationService.name);

  constructor(
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
  ) {}

  /** Best-effort create — logs and swallows failures. */
  async create(input: CreateNotificationInput): Promise<void> {
    try {
      await this.prisma.notification.create({
        data: {
          tenantId: input.tenantId,
          recipientId: input.recipientId,
          category: input.category,
          title: input.title,
          body: input.body ?? null,
          deepLinkRoute: input.deepLinkRoute ?? null,
        },
      });
    } catch (err) {
      this.logger.warn(
        `failed to create in-app notification: ${(err as Error).message}`,
      );
    }
  }

  /** Recipient's own notifications, newest first. */
  async list(
    tenantId: string,
    userId: string,
    opts: { unreadOnly?: boolean; skip?: number; take?: number } = {},
  ) {
    return this.prisma.notification.findMany({
      where: {
        tenantId,
        recipientId: userId,
        deletedAt: null,
        ...(opts.unreadOnly ? { isRead: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      skip: opts.skip ?? 0,
      take: Math.min(opts.take ?? 30, 100),
    });
  }

  async unreadCount(tenantId: string, userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { tenantId, recipientId: userId, isRead: false, deletedAt: null },
    });
  }

  /** Mark one notification read — only if it belongs to the caller. */
  async markRead(
    tenantId: string,
    userId: string,
    id: string,
  ): Promise<{ updated: number }> {
    const res = await this.prisma.notification.updateMany({
      where: { id, tenantId, recipientId: userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { updated: res.count };
  }

  async markAllRead(
    tenantId: string,
    userId: string,
  ): Promise<{ updated: number }> {
    const res = await this.prisma.notification.updateMany({
      where: { tenantId, recipientId: userId, isRead: false, deletedAt: null },
      data: { isRead: true, readAt: new Date() },
    });
    return { updated: res.count };
  }
}
