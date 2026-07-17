import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IPrismaService } from '@pingforce-monorepo/shared';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface TenantEmailTransport {
  readonly transporter: Transporter;
  readonly fromAddress: string;
}

export interface UpsertEmailConfigInput {
  readonly host: string;
  readonly port?: number;
  readonly secure?: boolean;
  readonly username?: string;
  readonly password?: string;
  readonly fromAddress: string;
  readonly status?: 'ACTIVE' | 'DISABLED';
}

interface CacheEntry {
  readonly transport: TenantEmailTransport | null;
  readonly loadedAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const ALGO = 'aes-256-gcm';

/**
 * Per-tenant SMTP provider config (Email.md §5 — "Providers are configurable
 * per tenant"). SMTP passwords are sealed with AES-256-GCM under
 * EMAIL_CONFIG_ENCRYPTION_KEY (32 bytes, hex or base64 — from OCI Vault in
 * production). Tenants without a config row fall back to the global
 * transport in NotificationsService.
 */
@Injectable()
export class TenantEmailConfigService {
  private readonly logger = new Logger(TenantEmailConfigService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly encryptionKey: Buffer | null;

  constructor(
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
    config: ConfigService,
  ) {
    this.encryptionKey = TenantEmailConfigService.parseKey(
      config.get<string>('EMAIL_CONFIG_ENCRYPTION_KEY'),
    );
    if (!this.encryptionKey) {
      this.logger.warn(
        'EMAIL_CONFIG_ENCRYPTION_KEY not set — per-tenant SMTP passwords cannot be stored',
      );
    }
  }

  private static parseKey(raw: string | undefined): Buffer | null {
    if (!raw) return null;
    const candidates = [
      /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, 'hex') : null,
      Buffer.from(raw, 'base64'),
    ];
    for (const buf of candidates) {
      if (buf && buf.length === 32) return buf;
    }
    return null;
  }

  encrypt(plain: string): string {
    if (!this.encryptionKey) {
      throw new BadRequestException(
        'Email provider passwords cannot be stored: encryption key is not configured on the platform',
      );
    }
    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGO, this.encryptionKey, iv);
    const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    return [
      iv.toString('base64'),
      cipher.getAuthTag().toString('base64'),
      enc.toString('base64'),
    ].join(':');
  }

  decrypt(sealed: string): string {
    if (!this.encryptionKey) {
      throw new Error('EMAIL_CONFIG_ENCRYPTION_KEY is not configured');
    }
    const [iv, tag, data] = sealed.split(':');
    const decipher = createDecipheriv(
      ALGO,
      this.encryptionKey,
      Buffer.from(iv, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(data, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  }

  /** Stored config with the password redacted — safe to return to clients. */
  async getMasked(tenantId: string): Promise<Record<string, unknown> | null> {
    const cfg = await this.prisma.tenantEmailConfig.findUnique({
      where: { tenantId },
    });
    if (!cfg) return null;
    return {
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      username: cfg.username,
      hasPassword: !!cfg.passwordEnc,
      fromAddress: cfg.fromAddress,
      status: cfg.status,
      updatedAt: cfg.updatedAt,
    };
  }

  async upsert(
    tenantId: string,
    input: UpsertEmailConfigInput,
    updatedBy?: string,
  ): Promise<Record<string, unknown>> {
    const passwordEnc =
      input.password !== undefined && input.password !== ''
        ? this.encrypt(input.password)
        : undefined;

    const data = {
      host: input.host,
      port: input.port ?? 587,
      secure: input.secure ?? false,
      username: input.username ?? null,
      fromAddress: input.fromAddress,
      status: input.status ?? 'ACTIVE',
      updatedBy,
      ...(passwordEnc !== undefined ? { passwordEnc } : {}),
    };

    await this.prisma.tenantEmailConfig.upsert({
      where: { tenantId },
      create: { tenantId, ...data, passwordEnc: passwordEnc ?? null },
      update: data,
    });

    this.cache.delete(tenantId);
    return (await this.getMasked(tenantId)) as Record<string, unknown>;
  }

  async remove(tenantId: string): Promise<void> {
    await this.prisma.tenantEmailConfig.deleteMany({ where: { tenantId } });
    this.cache.delete(tenantId);
  }

  /**
   * Resolves the tenant's SMTP transport, or null when the tenant has no
   * ACTIVE config (caller falls back to the global transport). Cached for
   * 5 minutes; upsert/remove invalidate immediately on this instance.
   */
  async getTransport(tenantId: string): Promise<TenantEmailTransport | null> {
    const cached = this.cache.get(tenantId);
    if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) {
      return cached.transport;
    }

    const cfg = await this.prisma.tenantEmailConfig.findUnique({
      where: { tenantId },
    });

    let transport: TenantEmailTransport | null = null;
    if (cfg && cfg.status === 'ACTIVE') {
      try {
        const transporter = nodemailer.createTransport({
          host: cfg.host,
          port: cfg.port,
          secure: cfg.secure,
          auth: cfg.username
            ? {
                user: cfg.username,
                pass: cfg.passwordEnc ? this.decrypt(cfg.passwordEnc) : '',
              }
            : undefined,
        });
        transport = { transporter, fromAddress: cfg.fromAddress };
      } catch (error) {
        this.logger.error(
          `Tenant ${tenantId} email config unusable, falling back to global SMTP: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    this.cache.set(tenantId, { transport, loadedAt: Date.now() });
    return transport;
  }
}
