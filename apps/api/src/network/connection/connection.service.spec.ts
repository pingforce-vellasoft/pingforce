import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CurrentUserContext } from '@pingforce-monorepo/shared';
import { ConnectionService } from './connection.service';
import { TopologyNode, TopologyService } from './topology.service';
import { AuditService } from '../../audit/audit.service';
import { RbacService } from '../../rbac/rbac.service';
import { CreateConnectionDto } from './dto/create-connection.dto';

const TENANT = 'tenant-1';
const USER = { userId: 'admin-1', tenantId: TENANT } as CurrentUserContext;
const OLTE = {
  id: 'olte-1',
  code: 'OLT-1',
  totalPorts: 8,
  usedPorts: 2,
};

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

describe('ConnectionService', () => {
  let prisma: {
    olte: { findFirst: jest.Mock };
    customer: { findFirst: jest.Mock };
    user: { findFirst: jest.Mock };
    networkConnection: {
      create: jest.Mock;
      update: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
    };
    connectionHistory: { create: jest.Mock; findMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let topology: {
    buildPath: jest.Mock;
    getNode: jest.Mock;
    getNodeTx: jest.Mock;
    getNodeIncludingArchived: jest.Mock;
    assertNotDescendant: jest.Mock;
    reparentSubtree: jest.Mock;
    recalcUsedPorts: jest.Mock;
    getImpact: jest.Mock;
  };
  let audit: { log: jest.Mock };
  let rbac: { resolveScopeIds: jest.Mock };
  let service: ConnectionService;

  const createDto = (
    overrides: Partial<CreateConnectionDto> = {},
  ): CreateConnectionDto =>
    ({
      connectionCode: 'C-1',
      olteId: 'olte-1',
      ...overrides,
    }) as CreateConnectionDto;

  beforeEach(() => {
    prisma = {
      olte: { findFirst: jest.fn().mockResolvedValue(OLTE) },
      customer: { findFirst: jest.fn().mockResolvedValue({ id: 'cust-1' }) },
      user: { findFirst: jest.fn().mockResolvedValue({ id: 'emp-1' }) },
      networkConnection: {
        create: jest.fn().mockResolvedValue({ id: 'new-1' }),
        update: jest.fn(async ({ where, data }) => ({
          id: where.id_tenantId.id,
          status: 'ACTIVE',
          ...data,
        })),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      connectionHistory: {
        create: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn((fn) => fn(prisma)),
    };
    topology = {
      buildPath: jest.fn((parent: { path: string } | null, id: string) =>
        parent ? `${parent.path}.${id}` : id,
      ),
      getNode: jest.fn(async (_t: string, id: string) => node({ id })),
      getNodeTx: jest.fn(async (_tx: unknown, _t: string, id: string) =>
        node({ id }),
      ),
      getNodeIncludingArchived: jest.fn().mockResolvedValue(node({ id: 'x' })),
      assertNotDescendant: jest.fn(),
      reparentSubtree: jest.fn(),
      recalcUsedPorts: jest.fn(),
      getImpact: jest.fn().mockResolvedValue({ downstreamCustomerCount: 3 }),
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    rbac = { resolveScopeIds: jest.fn().mockResolvedValue({ kind: 'ALL' }) };
    service = new ConnectionService(
      prisma as never,
      topology as unknown as TopologyService,
      audit as unknown as AuditService,
      rbac as unknown as RbacService,
    );
  });

  describe('create', () => {
    it('creates a root connection, sets its path and recalculates ports', async () => {
      await service.create(TENANT, USER, createDto());
      expect(prisma.networkConnection.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT,
          depth: 0,
          createdBy: USER.userId,
        }),
      });
      expect(prisma.networkConnection.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { path: 'new-1' } }),
      );
      expect(prisma.connectionHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: 'CREATED', tenantId: TENANT }),
      });
      expect(topology.recalcUsedPorts).toHaveBeenCalledWith(prisma, TENANT, [
        'olte-1',
      ]);
    });

    it('returns 404 for an OLTE outside the tenant', async () => {
      prisma.olte.findFirst.mockResolvedValue(null);
      await expect(service.create(TENANT, USER, createDto())).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.olte.findFirst).toHaveBeenCalledWith({
        where: { id: 'olte-1', tenantId: TENANT, deletedAt: null },
      });
    });

    it('rejects a parent on a different OLTE', async () => {
      topology.getNode.mockResolvedValue(node({ id: 'p', olteId: 'olte-2' }));
      await expect(
        service.create(TENANT, USER, createDto({ parentConnectionId: 'p' })),
      ).rejects.toThrow('different OLTE');
    });

    it('nests under a parent without using an OLTE port', async () => {
      prisma.olte.findFirst.mockResolvedValue({ ...OLTE, usedPorts: 8 });
      topology.getNode.mockResolvedValue(
        node({ id: 'p', path: 'root.p', depth: 1 }),
      );
      await service.create(
        TENANT,
        USER,
        createDto({ parentConnectionId: 'p' }),
      );
      expect(prisma.networkConnection.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ depth: 2 }),
      });
      expect(prisma.networkConnection.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { path: 'root.p.new-1' } }),
      );
    });

    it('rejects a root connection on a full OLTE', async () => {
      prisma.olte.findFirst.mockResolvedValue({ ...OLTE, usedPorts: 8 });
      await expect(service.create(TENANT, USER, createDto())).rejects.toThrow(
        'no available ports',
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('allows a DISCONNECTED root on a full OLTE (it takes no port)', async () => {
      prisma.olte.findFirst.mockResolvedValue({ ...OLTE, usedPorts: 8 });
      await service.create(TENANT, USER, createDto({ status: 'DISCONNECTED' }));
      expect(prisma.networkConnection.create).toHaveBeenCalled();
    });

    it('returns 404 for a customer outside the tenant', async () => {
      prisma.customer.findFirst.mockResolvedValue(null);
      await expect(
        service.create(TENANT, USER, createDto({ customerId: 'foreign' })),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.customer.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'foreign', tenantId: TENANT, deletedAt: null },
        }),
      );
    });

    it('rejects an assigned employee from another tenant', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(
        service.create(
          TENANT,
          USER,
          createDto({ assignedEmployeeId: 'foreign-user' }),
        ),
      ).rejects.toThrow('not a user in this tenant');
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('maps a duplicate connection code to 409', async () => {
      prisma.networkConnection.create.mockRejectedValue(
        Object.assign(new Error('dup'), { code: 'P2002' }),
      );
      await expect(service.create(TENANT, USER, createDto())).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('update', () => {
    it('rejects a customer from another tenant before writing', async () => {
      prisma.customer.findFirst.mockResolvedValue(null);
      await expect(
        service.update(TENANT, 'c1', USER, { customerId: 'foreign' }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects an assigned employee from another tenant', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(
        service.update(TENANT, 'c1', USER, { assignedEmployeeId: 'foreign' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('recalculates OLTE ports when the status changes', async () => {
      await service.update(TENANT, 'c1', USER, { status: 'DISCONNECTED' });
      expect(topology.recalcUsedPorts).toHaveBeenCalledWith(prisma, TENANT, [
        'olte-1',
      ]);
      expect(prisma.connectionHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'UPDATED',
          previousStatus: 'ACTIVE',
        }),
      });
    });

    it('leaves port counts alone for metadata-only edits', async () => {
      await service.update(TENANT, 'c1', USER, { remarks: 'new pole' });
      expect(topology.recalcUsedPorts).not.toHaveBeenCalled();
    });
  });

  describe('move', () => {
    it('needs a new parent or a new OLTE', async () => {
      await expect(service.move(TENANT, 'c1', USER, {})).rejects.toThrow(
        'Either newParentConnectionId or newOlteId is required',
      );
    });

    it('checks for cycles and recalculates both OLTEs on a parent move', async () => {
      topology.getNode.mockImplementation(async (_t: string, id: string) =>
        id === 'p' ? node({ id: 'p', olteId: 'olte-2' }) : node({ id }),
      );
      prisma.networkConnection.findFirst.mockResolvedValue({
        id: 'c1',
        path: 'p.c1',
      });
      await service.move(TENANT, 'c1', USER, { newParentConnectionId: 'p' });
      expect(topology.assertNotDescendant).toHaveBeenCalled();
      expect(topology.recalcUsedPorts).toHaveBeenCalledWith(prisma, TENANT, [
        'olte-1',
        'olte-2',
      ]);
    });

    it('rejects moving to the root of a full OLTE', async () => {
      topology.getNode.mockResolvedValue(
        node({ id: 'c1', parentConnectionId: 'p', path: 'p.c1', depth: 1 }),
      );
      prisma.olte.findFirst.mockResolvedValue({ ...OLTE, usedPorts: 8 });
      await expect(
        service.move(TENANT, 'c1', USER, { newOlteId: 'olte-1' }),
      ).rejects.toThrow('no available ports');
      expect(topology.reparentSubtree).not.toHaveBeenCalled();
    });

    it('allows re-saving a node that is already a root of that OLTE', async () => {
      prisma.olte.findFirst.mockResolvedValue({ ...OLTE, usedPorts: 8 });
      prisma.networkConnection.findFirst.mockResolvedValue({
        id: 'c1',
        path: 'c1',
      });
      await service.move(TENANT, 'c1', USER, { newOlteId: 'olte-1' });
      expect(topology.reparentSubtree).toHaveBeenCalled();
    });
  });

  describe('split and merge', () => {
    it('rejects split children that are not direct children', async () => {
      prisma.networkConnection.findMany.mockResolvedValue([{ id: 'a' }]);
      await expect(
        service.split(TENANT, 'c1', USER, {
          junctionCode: 'J-1',
          childConnectionIds: ['a', 'b'],
        }),
      ).rejects.toThrow('direct children');
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('refuses to merge a connection into itself', async () => {
      await expect(
        service.merge(TENANT, 'c1', USER, { targetConnectionId: 'c1' }),
      ).rejects.toThrow('into itself');
    });

    it('archives the merged source and recalculates both OLTEs', async () => {
      topology.getNode.mockImplementation(async (_t: string, id: string) =>
        id === 't' ? node({ id: 't', olteId: 'olte-2' }) : node({ id }),
      );
      prisma.networkConnection.findFirst.mockResolvedValue({
        id: 't',
        path: 't',
      });
      await service.merge(TENANT, 'c1', USER, { targetConnectionId: 't' });
      expect(prisma.networkConnection.update).toHaveBeenCalledWith({
        where: { id_tenantId: { id: 'c1', tenantId: TENANT } },
        data: expect.objectContaining({
          status: 'DISCONNECTED',
          deletedAt: expect.any(Date),
        }),
      });
      expect(topology.recalcUsedPorts).toHaveBeenCalledWith(prisma, TENANT, [
        'olte-1',
        'olte-2',
      ]);
    });
  });

  it('disconnect records downstream impact and frees the port', async () => {
    const result = await service.disconnect(TENANT, 'c1', USER);
    expect(result).toMatchObject({ id: 'c1', status: 'DISCONNECTED' });
    expect(prisma.connectionHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'DISCONNECTED',
        details: { downstreamCustomerCount: 3 },
      }),
    });
    expect(topology.recalcUsedPorts).toHaveBeenCalled();
  });

  it('caps history pages at 200', async () => {
    await service.getHistory(TENANT, 'c1', 0, 5000);
    expect(prisma.connectionHistory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: TENANT, connectionId: 'c1' },
        take: 200,
      }),
    );
  });

  describe('findOneForUser (map tap)', () => {
    const detail = { id: 'c1', path: 'r.c1' };

    beforeEach(() => {
      prisma.networkConnection.findFirst.mockImplementation(
        async (args: { select?: unknown }) =>
          args.select
            ? { path: 'r.c1', assignedEmployeeId: 'someone-else' }
            : detail,
      );
    });

    it('shows any tenant connection to a user with ALL scope', async () => {
      await expect(
        service.findOneForUser(TENANT, 'c1', 'admin'),
      ).resolves.toMatchObject({ id: 'c1' });
      expect(rbac.resolveScopeIds).toHaveBeenCalledWith(
        TENANT,
        'admin',
        'NETWORK',
        ['READ', 'READ_OWN'],
      );
    });

    it('shows field staff a connection assigned to them', async () => {
      rbac.resolveScopeIds.mockResolvedValue({ kind: 'IDS', userIds: ['emp'] });
      prisma.networkConnection.findFirst.mockImplementation(
        async (args: { select?: unknown }) =>
          args.select ? { path: 'r.c1', assignedEmployeeId: 'emp' } : detail,
      );
      await expect(
        service.findOneForUser(TENANT, 'c1', 'emp'),
      ).resolves.toMatchObject({ id: 'c1' });
    });

    it('shows field staff an upstream node on their route', async () => {
      rbac.resolveScopeIds.mockResolvedValue({ kind: 'IDS', userIds: ['emp'] });
      prisma.networkConnection.count.mockResolvedValue(1);
      await service.findOneForUser(TENANT, 'c1', 'emp');
      expect(prisma.networkConnection.count).toHaveBeenCalledWith({
        where: {
          tenantId: TENANT,
          deletedAt: null,
          assignedEmployeeId: { in: ['emp'] },
          path: { startsWith: 'r.c1.' },
        },
      });
    });

    it('returns 404 for a connection off the employee route', async () => {
      rbac.resolveScopeIds.mockResolvedValue({ kind: 'IDS', userIds: ['emp'] });
      prisma.networkConnection.count.mockResolvedValue(0);
      await expect(service.findOneForUser(TENANT, 'c1', 'emp')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns 404 when the user has no NETWORK scope', async () => {
      rbac.resolveScopeIds.mockResolvedValue({ kind: 'NONE' });
      await expect(
        service.findOneForUser(TENANT, 'c1', 'nobody'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
