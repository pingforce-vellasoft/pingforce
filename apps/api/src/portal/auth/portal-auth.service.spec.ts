import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PortalAuthService } from './portal-auth.service';

/**
 * Portal auth invariants (3.8_CustomerPortal BR-1, BR-9):
 * - invite tokens: unknown/revoked/expired are rejected; expiry is persisted
 * - refresh rotation: replay of a rotated token kills every portal session
 * - login: tenant without the portal module enabled is rejected
 */

const FUTURE = new Date(Date.now() + 7 * 24 * 3600 * 1000);
const PAST = new Date(Date.now() - 1000);

const activePortalUser = {
  id: 'pu1',
  tenantId: 't1',
  customerId: 'c1',
  status: 'ACTIVE',
  deletedAt: null,
  tokenVersion: 1,
  email: 'cust@x.io',
  phone: null,
  firstName: 'Asha',
  lastName: null,
  portalRole: 'OWNER',
  passwordHash: 'hash',
  tenant: { id: 't1', code: 'ACME', status: 'ACTIVE' },
};

function makeService(overrides: {
  storedRefresh?: unknown;
  invite?: unknown;
  tenant?: unknown;
  portalUser?: unknown;
} = {}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prisma: any = {
    refreshToken: {
      findUnique: jest.fn().mockResolvedValue(overrides.storedRefresh ?? null),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({}),
    },
    customerPortalUser: {
      findFirst: jest
        .fn()
        .mockResolvedValue(overrides.portalUser ?? activePortalUser),
      findUnique: jest.fn().mockResolvedValue(overrides.portalUser ?? null),
      update: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue(activePortalUser),
    },
    customerPortalInvite: {
      findUnique: jest.fn().mockResolvedValue(overrides.invite ?? null),
      update: jest.fn().mockResolvedValue({}),
    },
    tenant: {
      findUnique: jest.fn().mockResolvedValue(
        overrides.tenant ?? {
          id: 't1',
          code: 'ACME',
          name: 'Acme ISP',
          status: 'ACTIVE',
          logoUrl: null,
          tenantSettings: {
            customerPortalEnabled: true,
            logoUrl: null,
            primaryColor: null,
            theme: 'LIGHT',
          },
        },
      ),
    },
    $transaction: jest.fn(async (arg: unknown): Promise<unknown> => {
      if (typeof arg === 'function') {
        return (arg as (tx: unknown) => unknown)(prisma);
      }
      return Promise.all(arg as Promise<unknown>[]);
    }),
  };

  const jwtService = { sign: jest.fn().mockReturnValue('signed-jwt') };
  const otpService = {
    issue: jest.fn().mockResolvedValue('123456'),
    verify: jest.fn().mockResolvedValue(undefined),
  };
  const auditService = { log: jest.fn().mockResolvedValue(undefined) };
  const notifications = { sendRawEmail: jest.fn().mockResolvedValue(true) };

  const service = new PortalAuthService(
    prisma as unknown as ConstructorParameters<typeof PortalAuthService>[0],
    jwtService as unknown as ConstructorParameters<typeof PortalAuthService>[1],
    otpService as unknown as ConstructorParameters<typeof PortalAuthService>[2],
    auditService as unknown as ConstructorParameters<typeof PortalAuthService>[3],
    notifications as unknown as ConstructorParameters<
      typeof PortalAuthService
    >[4],
  );

  return { service, prisma, otpService };
}

describe('PortalAuthService — invites', () => {
  it('rejects an unknown invite token', async () => {
    const { service } = makeService();
    await expect(service.verifyInvite('nope')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects and persists expiry of an expired invite', async () => {
    const invite = {
      id: 'i1',
      tenantId: 't1',
      customerId: 'c1',
      status: 'PENDING',
      deletedAt: null,
      expiresAt: PAST,
      email: 'cust@x.io',
      phone: null,
    };
    const { service, prisma } = makeService({ invite });

    await expect(service.verifyInvite('token')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(prisma.customerPortalInvite.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'EXPIRED' } }),
    );
  });

  it('rejects a revoked invite', async () => {
    const invite = {
      id: 'i1',
      tenantId: 't1',
      customerId: 'c1',
      status: 'REVOKED',
      deletedAt: null,
      expiresAt: FUTURE,
    };
    const { service } = makeService({ invite });
    await expect(service.verifyInvite('token')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects verification when the contact already has an active account', async () => {
    const invite = {
      id: 'i1',
      tenantId: 't1',
      customerId: 'c1',
      status: 'PENDING',
      deletedAt: null,
      expiresAt: FUTURE,
      email: 'cust@x.io',
      phone: null,
      firstName: 'Asha',
      lastName: null,
      portalRole: 'MEMBER',
      invitedById: 'staff1',
    };
    const { service } = makeService({ invite });
    await expect(service.verifyInvite('token')).rejects.toThrow(
      BadRequestException,
    );
  });
});

describe('PortalAuthService — refresh rotation & replay', () => {
  it('replayed (revoked) token kills all sessions and bumps tokenVersion', async () => {
    const stored = {
      id: 'rt1',
      portalUserId: 'pu1',
      tenantId: 't1',
      revokedAt: new Date(),
      expiresAt: FUTURE,
    };
    const { service, prisma } = makeService({ storedRefresh: stored });

    await expect(service.refresh('stolen')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(prisma.customerPortalUser.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'pu1' },
        data: { tokenVersion: { increment: 1 } },
      }),
    );
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { portalUserId: 'pu1', revokedAt: null },
        data: expect.objectContaining({ revokeReason: 'TOKEN_REPLAY' }),
      }),
    );
  });

  it('rejects expired tokens without side effects', async () => {
    const stored = {
      id: 'rt1',
      portalUserId: 'pu1',
      tenantId: 't1',
      revokedAt: null,
      expiresAt: PAST,
    };
    const { service, prisma } = makeService({ storedRefresh: stored });
    await expect(service.refresh('old')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(prisma.refreshToken.update).not.toHaveBeenCalled();
  });

  it('rejects staff refresh tokens presented to the portal endpoint', async () => {
    const stored = {
      id: 'rt1',
      userId: 'u1',
      portalUserId: null,
      tenantId: 't1',
      revokedAt: null,
      expiresAt: FUTURE,
    };
    const { service } = makeService({ storedRefresh: stored });
    await expect(service.refresh('staff-token')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rotates a valid token and issues new credentials', async () => {
    const stored = {
      id: 'rt1',
      portalUserId: 'pu1',
      tenantId: 't1',
      revokedAt: null,
      expiresAt: FUTURE,
    };
    const { service, prisma } = makeService({ storedRefresh: stored });

    const result = await service.refresh('valid');
    expect(result.accessToken).toBe('signed-jwt');
    expect(result.refreshToken).toBeDefined();
    expect(prisma.refreshToken.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'rt1' },
        data: expect.objectContaining({ revokeReason: 'ROTATED' }),
      }),
    );
    // New token stored hashed, never plaintext
    const createArg = prisma.refreshToken.create.mock.calls[0][0];
    expect(createArg.data.tokenHash).toHaveLength(64);
    expect(createArg.data.tokenHash).toBe(
      createHash('sha256').update(result.refreshToken).digest('hex'),
    );
  });
});

describe('PortalAuthService — login gating', () => {
  it('rejects login when the portal module is disabled for the tenant', async () => {
    const { service } = makeService({
      tenant: {
        id: 't1',
        code: 'ACME',
        status: 'ACTIVE',
        tenantSettings: { customerPortalEnabled: false },
      },
    });
    await expect(
      service.login({
        tenantCode: 'ACME',
        email: 'cust@x.io',
        password: 'pw',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('access token payload carries userType CUSTOMER and customerId', async () => {
    const stored = {
      id: 'rt1',
      portalUserId: 'pu1',
      tenantId: 't1',
      revokedAt: null,
      expiresAt: FUTURE,
    };
    const { service, prisma } = makeService({ storedRefresh: stored });
    const jwtSign = (
      service as unknown as { jwtService: { sign: jest.Mock } }
    ).jwtService.sign;

    await service.refresh('valid');
    expect(jwtSign).toHaveBeenCalledWith(
      expect.objectContaining({
        userType: 'CUSTOMER',
        customerId: 'c1',
        role: 'PORTAL_CUSTOMER',
      }),
    );
    expect(prisma.refreshToken.create).toHaveBeenCalled();
  });
});
