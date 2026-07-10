import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaRepository, IPrismaService } from '@pingforce-monorepo/shared';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CustomerRepository extends PrismaRepository<
  any,
  CreateCustomerDto,
  UpdateCustomerDto,
  Prisma.CustomerDelegate<any>
> {
  constructor(@Inject('IPrismaService') prisma: IPrismaService) {
    super(prisma.customer);
  }

  override async create(
    tenantId: string,
    data: CreateCustomerDto,
  ): Promise<any> {
    try {
      return await super.create(tenantId, data);
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new BadRequestException('Customer code already exists');
      }
      throw error;
    }
  }

  override async findAll(
    tenantId: string,
    skip?: number,
    take?: number,
  ): Promise<any[]> {
    return this.delegate.findMany({
      where: { tenantId },
      include: {
        parentCustomer: true,
        accountManager: true,
      },
      skip,
      take,
    });
  }

  override async findById(tenantId: string, id: string): Promise<any | null> {
    const customer = await this.delegate.findFirst({
      where: { id, tenantId },
      include: {
        parentCustomer: true,
        childCustomers: true,
        accountManager: true,
      },
    });

    if (!customer) {
      return null;
    }

    return customer;
  }
}
