import { BadRequestException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { TenantEmailConfigService } from './tenant-email-config.service';

/**
 * Per-tenant email provider config (Email.md §5):
 * - SMTP passwords round-trip through AES-256-GCM under the platform key,
 * - storing a password without a key is refused (no plaintext fallback),
 * - transport resolution honours ACTIVE status and falls back to null,
 * - upsert invalidates the cached transport.
 */

type Ctor = ConstructorParameters<typeof TenantEmailConfigService>;

function makeService(opts: {
  key?: string;
  config?: Record<string, unknown> | null;
}) {
  const prisma = {
    tenantEmailConfig: {
      findUnique: jest.fn().mockResolvedValue(opts.config ?? null),
      upsert: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({}),
    },
  };
  const config = {
    get: jest.fn((name: string) =>
      name === 'EMAIL_CONFIG_ENCRYPTION_KEY' ? opts.key : undefined,
    ),
  };
  const service = new TenantEmailConfigService(
    prisma as unknown as Ctor[0],
    config as unknown as Ctor[1],
  );
  return { service, prisma };
}

const HEX_KEY = randomBytes(32).toString('hex');

describe('TenantEmailConfigService', () => {
  it('round-trips a password through AES-256-GCM', () => {
    const { service } = makeService({ key: HEX_KEY });
    const sealed = service.encrypt('smtp-secret');
    expect(sealed).not.toContain('smtp-secret');
    expect(sealed.split(':')).toHaveLength(3);
    expect(service.decrypt(sealed)).toBe('smtp-secret');
  });

  it('accepts a base64-encoded 32-byte key', () => {
    const { service } = makeService({
      key: randomBytes(32).toString('base64'),
    });
    expect(service.decrypt(service.encrypt('x'))).toBe('x');
  });

  it('refuses to store a password when no encryption key is configured', () => {
    const { service } = makeService({ key: undefined });
    expect(() => service.encrypt('secret')).toThrow(BadRequestException);
  });

  it('rejects upsert with password when key missing, allows passwordless', async () => {
    const { service, prisma } = makeService({ key: undefined });

    await expect(
      service.upsert('t1', {
        host: 'smtp.x.io',
        fromAddress: 'no-reply@x.io',
        password: 'secret',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.tenantEmailConfig.upsert).not.toHaveBeenCalled();

    prisma.tenantEmailConfig.findUnique.mockResolvedValue({
      host: 'smtp.x.io',
      port: 587,
      secure: false,
      username: null,
      passwordEnc: null,
      fromAddress: 'no-reply@x.io',
      status: 'ACTIVE',
      updatedAt: new Date(),
    });
    const masked = await service.upsert('t1', {
      host: 'smtp.x.io',
      fromAddress: 'no-reply@x.io',
    });
    expect(prisma.tenantEmailConfig.upsert).toHaveBeenCalled();
    expect(masked).toEqual(expect.objectContaining({ hasPassword: false }));
  });

  it('never returns the password from getMasked', async () => {
    const { service } = makeService({
      key: HEX_KEY,
      config: {
        host: 'smtp.x.io',
        port: 465,
        secure: true,
        username: 'mailer',
        passwordEnc: 'iv:tag:data',
        fromAddress: 'no-reply@x.io',
        status: 'ACTIVE',
        updatedAt: new Date(),
      },
    });
    const masked = (await service.getMasked('t1')) as Record<string, unknown>;
    expect(masked.hasPassword).toBe(true);
    expect(JSON.stringify(masked)).not.toContain('iv:tag:data');
  });

  it('returns null transport when tenant has no config (global fallback)', async () => {
    const { service } = makeService({ key: HEX_KEY, config: null });
    expect(await service.getTransport('t1')).toBeNull();
  });

  it('returns null transport for DISABLED configs', async () => {
    const { service } = makeService({
      key: HEX_KEY,
      config: {
        host: 'smtp.x.io',
        port: 587,
        secure: false,
        username: null,
        passwordEnc: null,
        fromAddress: 'no-reply@x.io',
        status: 'DISABLED',
      },
    });
    expect(await service.getTransport('t1')).toBeNull();
  });

  it('builds a transport for ACTIVE configs and caches it', async () => {
    const { service, prisma } = makeService({
      key: HEX_KEY,
      config: {
        host: 'smtp.x.io',
        port: 587,
        secure: false,
        username: null,
        passwordEnc: null,
        fromAddress: 'branded@tenant.io',
        status: 'ACTIVE',
      },
    });

    const first = await service.getTransport('t1');
    expect(first?.fromAddress).toBe('branded@tenant.io');

    await service.getTransport('t1');
    expect(prisma.tenantEmailConfig.findUnique).toHaveBeenCalledTimes(1);
  });

  it('invalidates the cache on upsert', async () => {
    const cfg = {
      host: 'smtp.x.io',
      port: 587,
      secure: false,
      username: null,
      passwordEnc: null,
      fromAddress: 'a@x.io',
      status: 'ACTIVE',
      updatedAt: new Date(),
    };
    const { service, prisma } = makeService({ key: HEX_KEY, config: cfg });

    await service.getTransport('t1');
    await service.upsert('t1', { host: 'smtp2.x.io', fromAddress: 'b@x.io' });
    await service.getTransport('t1');

    // 1 initial load + 1 getMasked inside upsert + 1 reload after invalidation
    expect(prisma.tenantEmailConfig.findUnique).toHaveBeenCalledTimes(3);
  });
});
