import { BadRequestException } from '@nestjs/common';
import { CustomerRepository } from './customer.repository';
import { CreateCustomerDto } from './dto/create-customer.dto';

const TENANT = 'tenant-1';

describe('CustomerRepository', () => {
  let prisma: {
    customer: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
    company: { count: jest.Mock };
    user: { count: jest.Mock };
  };
  let repo: CustomerRepository;

  beforeEach(() => {
    prisma = {
      customer: {
        create: jest.fn().mockResolvedValue({ id: 'c1' }),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn().mockResolvedValue(1),
      },
      company: { count: jest.fn().mockResolvedValue(1) },
      user: { count: jest.fn().mockResolvedValue(0) },
    };
    repo = new CustomerRepository(prisma as never);
  });

  it('stamps the tenant on create and maps a duplicate code to 400', async () => {
    const dto = { customerCode: 'C-1', legalName: 'Acme' } as CreateCustomerDto;
    await repo.create(TENANT, dto);
    expect(prisma.customer.create).toHaveBeenCalledWith({
      data: { ...dto, tenantId: TENANT },
    });

    prisma.customer.create.mockRejectedValue(
      Object.assign(new Error('dup'), { code: 'P2002' }),
    );
    await expect(repo.create(TENANT, dto)).rejects.toThrow(BadRequestException);
  });

  it('scopes list and detail reads to the tenant', async () => {
    await repo.findAll(TENANT, 0, 10);
    expect(prisma.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: TENANT },
        skip: 0,
        take: 10,
      }),
    );
    await expect(repo.findById(TENANT, 'c1')).resolves.toBeNull();
    expect(prisma.customer.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'c1', tenantId: TENANT } }),
    );
  });

  it('never selects user secrets for the account manager', async () => {
    await repo.findById(TENANT, 'c1');
    const include = prisma.customer.findFirst.mock.calls[0][0].include;
    const fields = Object.keys(include.accountManager.select);
    expect(fields).not.toContain('passwordHash');
    expect(fields).not.toContain('tokenVersion');
  });

  it('checks references inside the tenant only', async () => {
    await expect(repo.companyExists(TENANT, 'co')).resolves.toBe(true);
    expect(prisma.company.count).toHaveBeenCalledWith({
      where: { id: 'co', tenantId: TENANT },
    });

    await expect(repo.userExists(TENANT, 'u')).resolves.toBe(false);
    expect(prisma.user.count).toHaveBeenCalledWith({
      where: { id: 'u', tenantId: TENANT },
    });

    await expect(repo.customerExists(TENANT, 'p')).resolves.toBe(true);
    expect(prisma.customer.count).toHaveBeenCalledWith({
      where: { id: 'p', tenantId: TENANT },
    });
  });

  it('reports the parent id, or undefined when the customer is not in the tenant', async () => {
    prisma.customer.findFirst.mockResolvedValueOnce({ parentCustomerId: 'p' });
    await expect(repo.parentOf(TENANT, 'c1')).resolves.toBe('p');
    expect(prisma.customer.findFirst).toHaveBeenLastCalledWith({
      where: { id: 'c1', tenantId: TENANT },
      select: { parentCustomerId: true },
    });

    prisma.customer.findFirst.mockResolvedValueOnce(null);
    await expect(repo.parentOf(TENANT, 'c1')).resolves.toBeUndefined();
  });
});
