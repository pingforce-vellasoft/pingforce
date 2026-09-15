import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { FaultPriority } from '@pingforce-monorepo/shared';
import { SlaPolicy } from '@prisma/client';
import { SlaPolicyService } from './sla-policy.service';

type ServiceArgs = ConstructorParameters<typeof SlaPolicyService>;

const activePolicy: SlaPolicy = {
  id: '11111111-1111-4111-8111-111111111111',
  tenantId: 'tenant-1',
  priority: FaultPriority.HIGH,
  resolveInHours: 4,
  escalateToId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: 'user-1',
  updatedBy: 'user-1',
  deletedAt: null,
};

function makeService(policy: typeof activePolicy | null = null) {
  const prisma = {
    slaPolicy: {
      findUnique: jest.fn().mockResolvedValue(policy),
      findFirst: jest.fn().mockResolvedValue(policy),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest
        .fn()
        .mockImplementation(({ data }) =>
          Promise.resolve({ ...activePolicy, ...data }),
        ),
      update: jest
        .fn()
        .mockImplementation(({ data }) =>
          Promise.resolve({ ...activePolicy, ...data }),
        ),
    },
    user: {
      findFirst: jest.fn().mockResolvedValue({ id: 'manager-1' }),
    },
  };

  return {
    service: new SlaPolicyService(prisma as unknown as ServiceArgs[0]),
    prisma,
  };
}

describe('SlaPolicyService', () => {
  it('rejects a duplicate active priority', async () => {
    const { service } = makeService(activePolicy);

    await expect(
      service.create('tenant-1', 'user-1', {
        priority: FaultPriority.HIGH,
        resolveInHours: 2,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns a conflict when concurrent policy creation loses the unique race', async () => {
    const { service, prisma } = makeService(null);
    prisma.slaPolicy.create.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.create('tenant-1', 'user-1', {
        priority: FaultPriority.HIGH,
        resolveInHours: 2,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('restores a soft-deleted priority instead of creating a duplicate', async () => {
    const { service, prisma } = makeService({
      ...activePolicy,
      deletedAt: new Date(),
    });

    await service.create('tenant-1', 'user-2', {
      priority: FaultPriority.HIGH,
      resolveInHours: 2,
    });

    expect(prisma.slaPolicy.update).toHaveBeenCalledWith({
      where: {
        id_tenantId: { id: activePolicy.id, tenantId: 'tenant-1' },
      },
      data: expect.objectContaining({
        resolveInHours: 2,
        deletedAt: null,
        updatedBy: 'user-2',
      }),
    });
    expect(prisma.slaPolicy.create).not.toHaveBeenCalled();
  });

  it('rejects an escalation user outside the tenant', async () => {
    const { service, prisma } = makeService(null);
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(
      service.create('tenant-1', 'user-1', {
        priority: FaultPriority.CRITICAL,
        resolveInHours: 1,
        escalateToId: '22222222-2222-4222-8222-222222222222',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('soft-deletes a policy and records the actor', async () => {
    const { service, prisma } = makeService(activePolicy);

    await service.remove('tenant-1', activePolicy.id, 'user-2');

    expect(prisma.slaPolicy.update).toHaveBeenCalledWith({
      where: {
        id_tenantId: { id: activePolicy.id, tenantId: 'tenant-1' },
      },
      data: { deletedAt: expect.any(Date), updatedBy: 'user-2' },
    });
  });

  it('does not return a deleted policy by id', async () => {
    const { service, prisma } = makeService(null);
    prisma.slaPolicy.findFirst.mockResolvedValue(null);

    await expect(
      service.findOne('tenant-1', activePolicy.id),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
