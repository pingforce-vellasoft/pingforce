import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TopologyService, TopologyNode } from './topology.service';

/**
 * Tree invariants (3.7_ConnectionMap §5.3): materialized-path construction,
 * cycle rejection on move, subtree path/depth rewrite, downstream impact
 * counting, and OLTE port accounting.
 */

function node(partial: Partial<TopologyNode> & { id: string }): TopologyNode {
  return {
    olteId: 'olte-1',
    parentConnectionId: null,
    path: partial.id,
    depth: 0,
    nodeType: 'CUSTOMER',
    status: 'ACTIVE',
    ...partial,
  };
}

function makeService(overrides: Record<string, unknown> = {}) {
  const prisma = {
    networkConnection: {
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      update: jest.fn(),
    },
    olte: { update: jest.fn() },
    $executeRaw: jest.fn(),
    ...overrides,
  };
  return { service: new TopologyService(prisma as never), prisma };
}

describe('TopologyService', () => {
  describe('buildPath', () => {
    it('roots directly-attached connections at their own id', () => {
      const { service } = makeService();
      expect(service.buildPath(null, 'c1')).toBe('c1');
    });

    it('appends the id to the parent path', () => {
      const { service } = makeService();
      expect(service.buildPath({ path: 'a.b' }, 'c1')).toBe('a.b.c1');
    });
  });

  describe('assertNotDescendant (cycle guard)', () => {
    const moving = node({ id: 'b', path: 'a.b', depth: 1 });

    it('rejects moving a node under itself', () => {
      const { service } = makeService();
      expect(() => service.assertNotDescendant(moving, moving)).toThrow(
        BadRequestException,
      );
    });

    it('rejects moving a node under its own descendant', () => {
      const { service } = makeService();
      const descendant = node({ id: 'd', path: 'a.b.c.d', depth: 3 });
      expect(() => service.assertNotDescendant(moving, descendant)).toThrow(
        BadRequestException,
      );
    });

    it('does not confuse sibling ids sharing a prefix', () => {
      const { service } = makeService();
      // "a.bb" must NOT count as a descendant of "a.b"
      const sibling = node({ id: 'bb', path: 'a.bb', depth: 1 });
      expect(() =>
        service.assertNotDescendant(moving, sibling),
      ).not.toThrow();
    });

    it('allows moving under an unrelated branch', () => {
      const { service } = makeService();
      const other = node({ id: 'x', path: 'x', depth: 0 });
      expect(() => service.assertNotDescendant(moving, other)).not.toThrow();
    });
  });

  describe('getNode', () => {
    it('throws NotFound for unknown or cross-tenant ids', async () => {
      const { service, prisma } = makeService();
      prisma.networkConnection.findFirst.mockResolvedValue(null);
      await expect(service.getNode('t1', 'nope')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('scopes the lookup to the tenant and excludes soft-deleted rows', async () => {
      const { service, prisma } = makeService();
      prisma.networkConnection.findFirst.mockResolvedValue(node({ id: 'c1' }));
      await service.getNode('t1', 'c1');
      expect(prisma.networkConnection.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'c1', tenantId: 't1', deletedAt: null },
        }),
      );
    });
  });

  describe('reparentSubtree', () => {
    it('rewrites the root link and rewrites descendants with the new prefix', async () => {
      const { service, prisma } = makeService();
      const tx = {
        networkConnection: { update: jest.fn() },
        $executeRaw: jest.fn(),
      };
      const moving = node({
        id: 'b',
        path: 'a.b',
        depth: 1,
        parentConnectionId: 'a',
      });
      const newParent = node({ id: 'x', path: 'x.y', depth: 1, olteId: 'olte-2' });

      await service.reparentSubtree(tx as never, 't1', moving, newParent, 'olte-2');

      expect(tx.networkConnection.update).toHaveBeenCalledWith({
        where: { id_tenantId: { id: 'b', tenantId: 't1' } },
        data: {
          parentConnectionId: 'x',
          olteId: 'olte-2',
          path: 'x.y.b',
          depth: 2,
        },
      });
      expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
      expect(prisma.$executeRaw).not.toHaveBeenCalled();
    });

    it('moves a subtree to OLTE root level (no parent, depth 0)', async () => {
      const { service } = makeService();
      const tx = {
        networkConnection: { update: jest.fn() },
        $executeRaw: jest.fn(),
      };
      const moving = node({
        id: 'c',
        path: 'a.b.c',
        depth: 2,
        parentConnectionId: 'b',
      });

      await service.reparentSubtree(tx as never, 't1', moving, null, 'olte-1');

      expect(tx.networkConnection.update).toHaveBeenCalledWith({
        where: { id_tenantId: { id: 'c', tenantId: 't1' } },
        data: {
          parentConnectionId: null,
          olteId: 'olte-1',
          path: 'c',
          depth: 0,
        },
      });
    });
  });

  describe('getImpact', () => {
    it('counts downstream nodes and downstream customers separately', async () => {
      const { service, prisma } = makeService();
      prisma.networkConnection.findFirst.mockResolvedValue(
        node({ id: 'c2', path: 'c1.c2', depth: 1 }),
      );
      prisma.networkConnection.findMany.mockResolvedValue([
        { id: 'c5', connectionCode: 'CONN-5', customerId: 'cust-5', status: 'ACTIVE' },
        { id: 'j1', connectionCode: 'JCT-1', customerId: null, status: 'ACTIVE' },
        { id: 'c9', connectionCode: 'CONN-9', customerId: 'cust-9', status: 'SUSPENDED' },
      ]);

      const impact = await service.getImpact('t1', 'c2');

      expect(impact.downstreamCount).toBe(3);
      expect(impact.downstreamCustomerCount).toBe(2);
      expect(prisma.networkConnection.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 't1',
            path: { startsWith: 'c1.c2.' },
          }),
        }),
      );
    });
  });

  describe('recalcUsedPorts', () => {
    it('recounts live root connections per OLTE, deduplicating ids', async () => {
      const { service } = makeService();
      const tx = {
        networkConnection: { count: jest.fn().mockResolvedValue(7) },
        olte: { update: jest.fn() },
      };

      await service.recalcUsedPorts(tx as never, 't1', [
        'olte-1',
        'olte-1',
        'olte-2',
      ]);

      expect(tx.networkConnection.count).toHaveBeenCalledTimes(2);
      expect(tx.networkConnection.count).toHaveBeenCalledWith({
        where: {
          tenantId: 't1',
          olteId: 'olte-1',
          parentConnectionId: null,
          deletedAt: null,
          status: { not: 'DISCONNECTED' },
        },
      });
      expect(tx.olte.update).toHaveBeenCalledWith({
        where: { id_tenantId: { id: 'olte-2', tenantId: 't1' } },
        data: { usedPorts: 7 },
      });
    });
  });
});
