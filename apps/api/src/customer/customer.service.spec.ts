import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CustomerRepository } from './customer.repository';
import { CreateCustomerDto } from './dto/create-customer.dto';

const TENANT = 'tenant-1';
const ID = '11111111-1111-4111-8111-111111111111';
const PARENT = '22222222-2222-4222-8222-222222222222';
const GRANDPARENT = '33333333-3333-4333-8333-333333333333';

type RepoMock = {
  [K in
    | 'create'
    | 'findAll'
    | 'findById'
    | 'update'
    | 'delete'
    | 'companyExists'
    | 'userExists'
    | 'customerExists'
    | 'parentOf']: jest.Mock;
};

describe('CustomerService', () => {
  let repo: RepoMock;
  let service: CustomerService;

  const dto = (overrides: Partial<CreateCustomerDto> = {}): CreateCustomerDto =>
    ({
      customerCode: 'C-001',
      legalName: 'Acme',
      ...overrides,
    }) as CreateCustomerDto;

  beforeEach(() => {
    repo = {
      create: jest.fn(async (_t: string, data: object) => ({
        id: ID,
        ...data,
      })),
      findAll: jest.fn().mockResolvedValue([]),
      findById: jest.fn().mockResolvedValue({ id: ID, tenantId: TENANT }),
      update: jest.fn(async (_t: string, id: string, data: object) => ({
        id,
        ...data,
      })),
      delete: jest.fn().mockResolvedValue({ id: ID }),
      companyExists: jest.fn().mockResolvedValue(true),
      userExists: jest.fn().mockResolvedValue(true),
      customerExists: jest.fn().mockResolvedValue(true),
      parentOf: jest.fn().mockResolvedValue(null),
    };
    service = new CustomerService(repo as unknown as CustomerRepository);
  });

  describe('create', () => {
    it('creates within the caller tenant when there are no references', async () => {
      await service.create(TENANT, dto());
      expect(repo.create).toHaveBeenCalledWith(TENANT, dto());
      expect(repo.companyExists).not.toHaveBeenCalled();
      expect(repo.userExists).not.toHaveBeenCalled();
      expect(repo.customerExists).not.toHaveBeenCalled();
    });

    it('checks every reference against the caller tenant', async () => {
      await service.create(
        TENANT,
        dto({
          companyId: 'co',
          accountManagerId: 'u',
          parentCustomerId: PARENT,
        }),
      );
      expect(repo.companyExists).toHaveBeenCalledWith(TENANT, 'co');
      expect(repo.userExists).toHaveBeenCalledWith(TENANT, 'u');
      expect(repo.customerExists).toHaveBeenCalledWith(TENANT, PARENT);
      expect(repo.create).toHaveBeenCalled();
    });

    it.each([
      ['companyId', 'companyExists', 'Invalid companyId'],
      ['accountManagerId', 'userExists', 'Invalid accountManagerId'],
      ['parentCustomerId', 'customerExists', 'Invalid parentCustomerId'],
    ] as const)(
      'rejects a %s from another tenant (or deleted) without creating',
      async (field, check, message) => {
        repo[check].mockResolvedValue(false);
        await expect(
          service.create(TENANT, dto({ [field]: 'other-tenant-id' })),
        ).rejects.toThrow(message);
        expect(repo.create).not.toHaveBeenCalled();
      },
    );
  });

  describe('findAll / findOne', () => {
    it('passes tenant and paging straight to the repository', async () => {
      await service.findAll(TENANT, 10, 20);
      expect(repo.findAll).toHaveBeenCalledWith(TENANT, 10, 20);
    });

    it('returns the customer for this tenant', async () => {
      await expect(service.findOne(TENANT, ID)).resolves.toMatchObject({
        id: ID,
      });
      expect(repo.findById).toHaveBeenCalledWith(TENANT, ID);
    });

    it('returns 404 when the customer is not in this tenant', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.findOne(TENANT, ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('updates after confirming the customer exists in this tenant', async () => {
      await service.update(TENANT, ID, { legalName: 'Acme 2' });
      expect(repo.findById).toHaveBeenCalledWith(TENANT, ID);
      expect(repo.update).toHaveBeenCalledWith(TENANT, ID, {
        legalName: 'Acme 2',
      });
    });

    it('returns 404 for an unknown customer before checking references', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(
        service.update(TENANT, ID, { companyId: 'co' }),
      ).rejects.toThrow(NotFoundException);
      expect(repo.companyExists).not.toHaveBeenCalled();
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('rejects a cross-tenant account manager', async () => {
      repo.userExists.mockResolvedValue(false);
      await expect(
        service.update(TENANT, ID, { accountManagerId: 'foreign-user' }),
      ).rejects.toThrow(BadRequestException);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('rejects making a customer its own parent', async () => {
      await expect(
        service.update(TENANT, ID, { parentCustomerId: ID }),
      ).rejects.toThrow('cannot be its own parent');
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('rejects a parent that would create a loop', async () => {
      // ID -> PARENT -> GRANDPARENT -> ID
      repo.parentOf.mockImplementation(async (_t: string, id: string) =>
        id === PARENT ? GRANDPARENT : id === GRANDPARENT ? ID : null,
      );
      await expect(
        service.update(TENANT, ID, { parentCustomerId: PARENT }),
      ).rejects.toThrow('hierarchy loop');
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('accepts a parent whose chain ends without reaching the customer', async () => {
      repo.parentOf.mockImplementation(async (_t: string, id: string) =>
        id === PARENT ? GRANDPARENT : null,
      );
      await service.update(TENANT, ID, { parentCustomerId: PARENT });
      expect(repo.update).toHaveBeenCalled();
    });

    it('stops walking a corrupt chain instead of looping forever', async () => {
      repo.parentOf.mockResolvedValue(PARENT); // PARENT points at itself
      await service.update(TENANT, ID, { parentCustomerId: PARENT });
      expect(repo.parentOf.mock.calls.length).toBeLessThanOrEqual(20);
      expect(repo.update).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes through the repository (soft delete via the Prisma extension)', async () => {
      await service.remove(TENANT, ID);
      expect(repo.delete).toHaveBeenCalledWith(TENANT, ID);
    });

    it('propagates the repository 404 for an unknown customer', async () => {
      repo.delete.mockRejectedValue(new NotFoundException());
      await expect(service.remove(TENANT, ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
