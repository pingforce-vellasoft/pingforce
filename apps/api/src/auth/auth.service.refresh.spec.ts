import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

/**
 * Refresh-token rotation + replay detection (RefreshToken.md §3, §8):
 * - a used (rotated) token presented again kills every session,
 * - a valid token is rotated (revoked) and a new opaque token issued,
 * - expired/unknown tokens are rejected without side effects.
 */

interface StoredToken {
  id: string;
  userId: string | null;
  superAdminId: string | null;
  sessionId: string | null;
  tenantId: string;
  revokedAt: Date | null;
  expiresAt: Date;
}

const FUTURE = new Date(Date.now() + 7 * 24 * 3600 * 1000);
const PAST = new Date(Date.now() - 1000);

const activeUser = {
  id: 'u1',
  tenantId: 't1',
  tokenVersion: 3,
  status: 'ACTIVE',
  email: 'user@x.io',
  role: { code: 'EMPLOYEE' },
  tenant: { id: 't1', code: 'T1', status: 'ACTIVE' },
  profile: { firstName: 'A', lastName: 'B' },
};

function makeService(stored: StoredToken | null) {
  const prisma = {
    refreshToken: {
      findUnique: jest.fn().mockResolvedValue(stored),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({}),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue(activeUser),
      update: jest.fn().mockResolvedValue({}),
    },
    superAdmin: {
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({}),
    },
  };
  const jwtService = { sign: jest.fn().mockReturnValue('signed-jwt') };
  const sessionService = {
    isActive: jest.fn().mockResolvedValue(true),
    touch: jest.fn().mockResolvedValue(undefined),
    revokeAllForUser: jest.fn().mockResolvedValue(undefined),
  };
  const auditService = { log: jest.fn().mockResolvedValue(undefined) };

  const service = new AuthService(
    prisma as unknown as ConstructorParameters<typeof AuthService>[0],
    jwtService as unknown as ConstructorParameters<typeof AuthService>[1],
    sessionService as unknown as ConstructorParameters<typeof AuthService>[2],
    auditService as unknown as ConstructorParameters<typeof AuthService>[3],
  );
  return { service, prisma, sessionService };
}

describe('AuthService.refreshToken', () => {
  it('rejects unknown tokens', async () => {
    const { service } = makeService(null);
    await expect(service.refreshToken('nope')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects expired tokens without rotating', async () => {
    const { service, prisma } = makeService({
      id: 'rt1',
      userId: 'u1',
      superAdminId: null,
      sessionId: null,
      tenantId: 't1',
      revokedAt: null,
      expiresAt: PAST,
    });
    await expect(service.refreshToken('expired')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(prisma.refreshToken.update).not.toHaveBeenCalled();
  });

  it('replay of a rotated token revokes every session and bumps tokenVersion', async () => {
    const { service, prisma, sessionService } = makeService({
      id: 'rt1',
      userId: 'u1',
      superAdminId: null,
      sessionId: 's1',
      tenantId: 't1',
      revokedAt: new Date(),
      expiresAt: FUTURE,
    });
    await expect(service.refreshToken('stolen')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { tokenVersion: { increment: 1 } },
    });
    expect(sessionService.revokeAllForUser).toHaveBeenCalledWith(
      't1',
      'u1',
      'TOKEN_REPLAY',
    );
  });

  it('rotates a valid token: old one revoked, new opaque token issued', async () => {
    const { service, prisma } = makeService({
      id: 'rt1',
      userId: 'u1',
      superAdminId: null,
      sessionId: null,
      tenantId: 't1',
      revokedAt: null,
      expiresAt: FUTURE,
    });
    const result = await service.refreshToken('valid-token');

    expect(prisma.refreshToken.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'rt1' },
        data: expect.objectContaining({ revokeReason: 'ROTATED' }),
      }),
    );
    // New refresh token persisted as a hash, returned opaque (not a JWT)
    expect(prisma.refreshToken.create).toHaveBeenCalled();
    expect(result.refreshToken).toBeDefined();
    expect(result.refreshToken).not.toBe('valid-token');
    expect(result.refreshToken.split('.')).not.toHaveLength(3);
    expect(result.accessToken).toBe('signed-jwt');
  });

  it('rejects when the linked session was revoked', async () => {
    const { service, sessionService } = makeService({
      id: 'rt1',
      userId: 'u1',
      superAdminId: null,
      sessionId: 's1',
      tenantId: 't1',
      revokedAt: null,
      expiresAt: FUTURE,
    });
    (sessionService.isActive as jest.Mock).mockResolvedValue(false);
    await expect(service.refreshToken('valid-token')).rejects.toThrow(
      'Session has been revoked or expired',
    );
  });

  it('rejects suspended users', async () => {
    const { service, prisma } = makeService({
      id: 'rt1',
      userId: 'u1',
      superAdminId: null,
      sessionId: null,
      tenantId: 't1',
      revokedAt: null,
      expiresAt: FUTURE,
    });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      ...activeUser,
      status: 'SUSPENDED',
    });
    await expect(service.refreshToken('valid-token')).rejects.toThrow(
      'Account is inactive or suspended',
    );
  });
});
