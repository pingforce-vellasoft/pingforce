import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Customer, Prisma } from '@prisma/client';
import { PrismaRepository, IPrismaService } from '@pingforce-monorepo/shared';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

// Safe projection for User relations — never expose passwordHash/tokenVersion
const SAFE_USER_SELECT = {
  select: {
    id: true,
    email: true,
    phone: true,
    status: true,
    profile: { select: { firstName: true, lastName: true } },
  },
} as const;

function hasPrismaCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === code
  );
}

@Injectable()
export class CustomerRepository extends PrismaRepository<
  Customer,
  CreateCustomerDto,
  UpdateCustomerDto,
  Prisma.CustomerDelegate
> {
  constructor(
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
  ) {
    super(prisma.customer);
  }

  override async create(
    tenantId: string,
    data: CreateCustomerDto,
  ): Promise<Customer> {
    try {
      return await super.create(tenantId, data);
    } catch (error: unknown) {
      if (hasPrismaCode(error, 'P2002')) {
        throw new BadRequestException('Customer code already exists');
      }
      throw error;
    }
  }

  override async findAll(
    tenantId: string,
    skip?: number,
    take?: number,
  ): Promise<Customer[]> {
    return this.delegate.findMany({
      where: { tenantId },
      include: {
        parentCustomer: true,
        accountManager: SAFE_USER_SELECT,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  override async findById(
    tenantId: string,
    id: string,
  ): Promise<Customer | null> {
    return this.delegate.findFirst({
      where: { id, tenantId },
      include: {
        parentCustomer: true,
        childCustomers: true,
        accountManager: SAFE_USER_SELECT,
      },
    });
  }

  // Reference checks: every id a customer points at must live in the same
  // tenant (soft-deleted rows are excluded by the Prisma extension).

  async companyExists(tenantId: string, id: string): Promise<boolean> {
    return (await this.prisma.company.count({ where: { id, tenantId } })) > 0;
  }

  async userExists(tenantId: string, id: string): Promise<boolean> {
    return (await this.prisma.user.count({ where: { id, tenantId } })) > 0;
  }

  async customerExists(tenantId: string, id: string): Promise<boolean> {
    return (await this.prisma.customer.count({ where: { id, tenantId } })) > 0;
  }

  /** Parent id of a customer in this tenant, or undefined when not found. */
  async parentOf(
    tenantId: string,
    id: string,
  ): Promise<string | null | undefined> {
    const row = await this.prisma.customer.findFirst({
      where: { id, tenantId },
      select: { parentCustomerId: true },
    });
    return row === null ? undefined : row.parentCustomerId;
  }
}
