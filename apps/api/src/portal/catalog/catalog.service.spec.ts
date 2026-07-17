import { NotFoundException } from '@nestjs/common';
import { CatalogService } from './catalog.service';

/**
 * Catalog CRUD invariants (3.8_CustomerPortal P3):
 * - updates/archives require the record to exist within the tenant
 * - archive is a soft-delete that also deactivates (never leaves an archived
 *   plan visible in the portal shop window)
 * - list(activeOnly) only surfaces active, non-deleted rows
 */

const USER = { userId: 'u1' } as never;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeService(over: any = {}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prisma: any = {
    servicePlan: {
      create: jest.fn().mockResolvedValue({ id: 'p1' }),
      findFirst: jest.fn().mockResolvedValue(over.plan ?? null),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({ id: 'p1' }),
    },
    addOn: {
      create: jest.fn().mockResolvedValue({ id: 'a1' }),
      findFirst: jest.fn().mockResolvedValue(over.addOn ?? null),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({ id: 'a1' }),
    },
  };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const service = new CatalogService(
    prisma as unknown as ConstructorParameters<typeof CatalogService>[0],
    audit as unknown as ConstructorParameters<typeof CatalogService>[1],
  );
  return { service, prisma };
}

describe('CatalogService — plans', () => {
  it('updatePlan throws when the plan is not in the tenant', async () => {
    const { service } = makeService({ plan: null });
    await expect(
      service.updatePlan('t1', USER, 'missing', { name: 'X' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('archivePlan soft-deletes and deactivates', async () => {
    const { service, prisma } = makeService({ plan: { id: 'p1' } });
    await service.archivePlan('t1', USER, 'p1');
    const arg = prisma.servicePlan.update.mock.calls[0][0];
    expect(arg.data.deletedAt).toBeInstanceOf(Date);
    expect(arg.data.isActive).toBe(false);
  });

  it('listPlans(activeOnly) filters active + non-deleted, tenant-scoped', async () => {
    const { service, prisma } = makeService();
    await service.listPlans('t1', { activeOnly: true });
    expect(prisma.servicePlan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: 't1', deletedAt: null, isActive: true },
      }),
    );
  });
});

describe('CatalogService — add-ons', () => {
  it('updateAddOn throws when missing', async () => {
    const { service } = makeService({ addOn: null });
    await expect(
      service.updateAddOn('t1', USER, 'missing', { name: 'X' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('archiveAddOn soft-deletes and deactivates', async () => {
    const { service, prisma } = makeService({ addOn: { id: 'a1' } });
    await service.archiveAddOn('t1', USER, 'a1');
    const arg = prisma.addOn.update.mock.calls[0][0];
    expect(arg.data.deletedAt).toBeInstanceOf(Date);
    expect(arg.data.isActive).toBe(false);
  });
});
