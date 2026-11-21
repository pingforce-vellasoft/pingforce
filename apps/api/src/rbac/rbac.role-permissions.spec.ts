import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { RbacService } from './rbac.service';

/** Granting permissions to a tenant role (PUT /rbac/roles/:id/permissions). */
function makeService(found: { id: string; module: string }[]) {
  const prisma = {
    role: {
      findFirst: jest.fn().mockResolvedValue({ id: 'r1', tenantId: 't1' }),
      findUnique: jest.fn().mockResolvedValue({ id: 'r1', permissions: [] }),
    },
    permission: { findMany: jest.fn().mockResolvedValue(found) },
    rolePermission: {
      deleteMany: jest.fn().mockReturnValue('delete'),
      createMany: jest.fn().mockReturnValue('create'),
    },
    $transaction: jest.fn().mockResolvedValue([]),
  };
  const cache = { get: jest.fn(), set: jest.fn(), del: jest.fn() };
  const service = new RbacService(
    prisma as unknown as ConstructorParameters<typeof RbacService>[0],
    cache as unknown as ConstructorParameters<typeof RbacService>[1],
  );
  return { service, prisma };
}

describe('RbacService.updateRolePermissions', () => {
  it('grants known tenant permissions with their scopes', async () => {
    const { service, prisma } = makeService([
      { id: 'p1', module: 'LEADS' },
      { id: 'p2', module: 'FAULTS' },
    ]);
    await service.updateRolePermissions('t1', 'r1', ['p1', 'p2', 'p1'], {
      p1: 'ALL',
    });
    expect(prisma.rolePermission.createMany).toHaveBeenCalledWith({
      data: [
        { roleId: 'r1', permissionId: 'p1', dataScope: 'ALL' },
        { roleId: 'r1', permissionId: 'p2', dataScope: 'OWN' },
      ],
    });
  });

  it('refuses unknown permission ids with 400, before touching grants', async () => {
    const { service, prisma } = makeService([{ id: 'p1', module: 'LEADS' }]);
    await expect(
      service.updateRolePermissions('t1', 'r1', ['p1', 'missing']),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it.each(['TENANTS', 'BILLING', 'SETTINGS'])(
    'refuses platform module %s for a tenant role',
    async (module) => {
      const { service, prisma } = makeService([{ id: 'p9', module }]);
      await expect(
        service.updateRolePermissions('t1', 'r1', ['p9']),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    },
  );

  it('lets the platform tenant grant platform modules', async () => {
    const { service, prisma } = makeService([{ id: 'p9', module: 'TENANTS' }]);
    await service.updateRolePermissions('SYSTEM', 'r1', ['p9']);
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('clears all grants with an empty list', async () => {
    const { service, prisma } = makeService([]);
    await service.updateRolePermissions('t1', 'r1', []);
    expect(prisma.permission.findMany).not.toHaveBeenCalled();
    expect(prisma.rolePermission.createMany).not.toHaveBeenCalled();
  });

  it('404s a role of another tenant', async () => {
    const { service, prisma } = makeService([]);
    prisma.role.findFirst.mockResolvedValue(null);
    await expect(service.updateRolePermissions('t2', 'r1', [])).rejects.toThrow(
      NotFoundException,
    );
  });
});
