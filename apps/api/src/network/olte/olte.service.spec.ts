import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CurrentUserContext } from '@pingforce-monorepo/shared';
import { OlteService } from './olte.service';
import { AuditService } from '../../audit/audit.service';
import { CreateOlteDto } from './dto/create-olte.dto';

const TENANT = 'tenant-1';
const USER = { userId: 'admin-1', tenantId: TENANT } as CurrentUserContext;
const EXISTING = { id: 'o1', code: 'OLT-1', totalPorts: 16, usedPorts: 10 };

describe('OlteService', () => {
  let prisma: {
    olte: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    networkConnection: { count: jest.Mock };
  };
  let audit: { log: jest.Mock };
  let service: OlteService;

  beforeEach(() => {
    prisma = {
      olte: {
        create: jest.fn().mockResolvedValue({ id: 'o1' }),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(EXISTING),
        update: jest.fn(async ({ data }) => ({ ...EXISTING, ...data })),
      },
      networkConnection: { count: jest.fn().mockResolvedValue(0) },
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    service = new OlteService(
      prisma as never,
      audit as unknown as AuditService,
    );
  });

  it('creates within the tenant and maps a duplicate code to 409', async () => {
    const dto = { code: 'OLT-1', name: 'Main' } as CreateOlteDto;
    await service.create(TENANT, USER, dto);
    expect(prisma.olte.create).toHaveBeenCalledWith({
      data: { ...dto, tenantId: TENANT, createdBy: USER.userId },
    });

    prisma.olte.create.mockRejectedValue(
      Object.assign(new Error('dup'), { code: 'P2002' }),
    );
    await expect(service.create(TENANT, USER, dto)).rejects.toThrow(
      ConflictException,
    );
  });

  it('caps list pages at 200 and scopes to the tenant', async () => {
    await service.findAll(TENANT, 0, 1000, 'ACTIVE');
    expect(prisma.olte.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: TENANT, deletedAt: null, status: 'ACTIVE' },
        take: 200,
      }),
    );
  });

  it('reports available ports on the detail view, never negative', async () => {
    prisma.olte.findFirst.mockResolvedValue({
      ...EXISTING,
      totalPorts: 4,
      usedPorts: 6,
    });
    prisma.networkConnection.count
      .mockResolvedValueOnce(7)
      .mockResolvedValueOnce(5);
    await expect(service.findOne(TENANT, 'o1')).resolves.toMatchObject({
      totalConnections: 7,
      activeConnections: 5,
      availablePorts: 0,
    });
  });

  it('returns 404 for an OLTE outside the tenant', async () => {
    prisma.olte.findFirst.mockResolvedValue(null);
    await expect(service.findOne(TENANT, 'o1')).rejects.toThrow(
      NotFoundException,
    );
    await expect(service.update(TENANT, 'o1', USER, {})).rejects.toThrow(
      NotFoundException,
    );
  });

  describe('update capacity', () => {
    it('rejects lowering totalPorts below the ports in use', async () => {
      await expect(
        service.update(TENANT, 'o1', USER, { totalPorts: 8 }),
      ).rejects.toThrow('cannot be below the 10 port(s) in use');
      expect(prisma.olte.update).not.toHaveBeenCalled();
    });

    it('allows 0 (unlimited) and any capacity that still fits', async () => {
      await service.update(TENANT, 'o1', USER, { totalPorts: 0 });
      await service.update(TENANT, 'o1', USER, { totalPorts: 10 });
      expect(prisma.olte.update).toHaveBeenCalledTimes(2);
    });
  });

  describe('archive', () => {
    it('is blocked while live connections are attached', async () => {
      prisma.networkConnection.count.mockResolvedValue(3);
      await expect(service.archive(TENANT, 'o1', USER)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.networkConnection.count).toHaveBeenCalledWith({
        where: {
          tenantId: TENANT,
          olteId: 'o1',
          deletedAt: null,
          status: { not: 'DISCONNECTED' },
        },
      });
      expect(prisma.olte.update).not.toHaveBeenCalled();
    });

    it('soft-archives an OLTE with no live connections', async () => {
      await service.archive(TENANT, 'o1', USER);
      expect(prisma.olte.update).toHaveBeenCalledWith({
        where: { id_tenantId: { id: 'o1', tenantId: TENANT } },
        data: expect.objectContaining({
          status: 'ARCHIVED',
          deletedAt: expect.any(Date),
        }),
      });
    });
  });
});
