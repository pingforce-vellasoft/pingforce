import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IPrismaService } from '@pingforce-monorepo/shared';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import {
  getMessaging,
  Messaging,
  SendResponse,
} from 'firebase-admin/messaging';
import { readFileSync } from 'fs';

export interface PushMessage {
  readonly title: string;
  readonly body: string;
  readonly data?: Record<string, string>;
}

/**
 * FCM delivery via the Firebase Admin SDK (Master Plan Phase 2).
 *
 * Env-gated: configure ONE of
 * - FIREBASE_SERVICE_ACCOUNT_PATH — path to the service-account JSON file
 *   (mounted from OCI Vault in production)
 * - FIREBASE_SERVICE_ACCOUNT_JSON — the JSON itself, base64-encoded
 *
 * Without credentials the service logs sends instead of delivering, so the
 * rest of the notification pipeline keeps working in dev.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly messaging: Messaging | null = null;

  constructor(
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
    private readonly config: ConfigService,
  ) {
    const credentialJson = this.loadCredentialJson();
    if (!credentialJson) {
      this.logger.warn(
        'Firebase credentials not set — push notifications will be logged, not delivered',
      );
      return;
    }

    try {
      const existing = getApps();
      const app =
        existing.length > 0
          ? existing[0]
          : initializeApp({
              credential: cert(JSON.parse(credentialJson)),
            });
      this.messaging = getMessaging(app);
      this.logger.log('Firebase Admin SDK initialized — FCM enabled');
    } catch (error) {
      this.logger.error(
        `Firebase Admin SDK init failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  get isConfigured(): boolean {
    return this.messaging !== null;
  }

  private loadCredentialJson(): string | null {
    const path = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT_PATH');
    if (path) {
      try {
        return readFileSync(path, 'utf8');
      } catch (error) {
        this.logger.error(
          `Cannot read FIREBASE_SERVICE_ACCOUNT_PATH (${path}): ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        return null;
      }
    }
    const inline = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT_JSON');
    if (inline) {
      return Buffer.from(inline, 'base64').toString('utf8');
    }
    return null;
  }

  /**
   * Sends a push to every registered device of a user. Stale FCM tokens
   * (uninstalled app, rotated token) are pruned on delivery failure.
   * Returns the number of devices reached.
   */
  async sendToUser(userId: string, message: PushMessage): Promise<number> {
    const tokens = await this.prisma.deviceToken.findMany({
      where: { userId },
      select: { id: true, fcmToken: true },
    });
    if (tokens.length === 0) return 0;

    if (!this.messaging) {
      this.logger.log(
        `[PUSH:simulated] To user ${userId} (${tokens.length} devices): ${message.title}`,
      );
      return tokens.length;
    }

    const response = await this.messaging.sendEachForMulticast({
      tokens: tokens.map((t) => t.fcmToken),
      notification: { title: message.title, body: message.body },
      data: message.data,
      android: { priority: 'high' },
    });

    const staleTokenIds: string[] = [];
    response.responses.forEach((res: SendResponse, idx: number) => {
      if (res.success) return;
      const code = res.error?.code ?? '';
      if (
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token' ||
        code === 'messaging/invalid-argument'
      ) {
        staleTokenIds.push(tokens[idx].id);
      } else {
        this.logger.warn(`FCM send failed for user ${userId}: ${code}`);
      }
    });

    if (staleTokenIds.length > 0) {
      await this.prisma.deviceToken.deleteMany({
        where: { id: { in: staleTokenIds } },
      });
      this.logger.log(
        `Pruned ${staleTokenIds.length} stale FCM tokens for user ${userId}`,
      );
    }

    return response.successCount;
  }
}
