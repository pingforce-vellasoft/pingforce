import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Customer } from '@prisma/client';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerRepository } from './customer.repository';

/** Guard for walking the parent chain when checking for cycles. */
const MAX_HIERARCHY_DEPTH = 20;

type CustomerReferences = Pick<
  CreateCustomerDto,
  'companyId' | 'accountManagerId' | 'parentCustomerId'
>;

@Injectable()
export class CustomerService {
  constructor(private readonly customerRepository: CustomerRepository) {}

  async create(
    tenantId: string,
    createCustomerDto: CreateCustomerDto,
  ): Promise<Customer> {
    await this.assertReferences(tenantId, createCustomerDto);
    return this.customerRepository.create(tenantId, createCustomerDto);
  }

  async findAll(
    tenantId: string,
    skip?: number,
    take?: number,
  ): Promise<Customer[]> {
    return this.customerRepository.findAll(tenantId, skip, take);
  }

  async findOne(tenantId: string, id: string): Promise<Customer> {
    const customer = await this.customerRepository.findById(tenantId, id);
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }
    return customer;
  }

  async update(
    tenantId: string,
    id: string,
    updateCustomerDto: UpdateCustomerDto,
  ): Promise<Customer> {
    // 404 before validating references, so an unknown id never reports a
    // reference error that hints at other data.
    await this.findOne(tenantId, id);
    await this.assertReferences(tenantId, updateCustomerDto, id);
    // The base repository maps a missing row (P2025) to 404.
    return this.customerRepository.update(tenantId, id, updateCustomerDto);
  }

  /** Soft delete: the Prisma extension turns delete into deletedAt = now(). */
  async remove(tenantId: string, id: string): Promise<Customer> {
    return this.customerRepository.delete(tenantId, id);
  }

  /**
   * Every id a customer points at must belong to the caller's tenant.
   * Without this, a customer could be linked to another tenant's user, and
   * GET /customers/:id would return that user's email and phone.
   */
  private async assertReferences(
    tenantId: string,
    refs: CustomerReferences,
    selfId?: string,
  ): Promise<void> {
    if (
      refs.companyId &&
      !(await this.customerRepository.companyExists(tenantId, refs.companyId))
    ) {
      throw new BadRequestException('Invalid companyId for this tenant');
    }
    if (
      refs.accountManagerId &&
      !(await this.customerRepository.userExists(
        tenantId,
        refs.accountManagerId,
      ))
    ) {
      throw new BadRequestException('Invalid accountManagerId for this tenant');
    }
    if (refs.parentCustomerId) {
      if (refs.parentCustomerId === selfId) {
        throw new BadRequestException('A customer cannot be its own parent');
      }
      if (
        !(await this.customerRepository.customerExists(
          tenantId,
          refs.parentCustomerId,
        ))
      ) {
        throw new BadRequestException(
          'Invalid parentCustomerId for this tenant',
        );
      }
      if (selfId)
        await this.assertNoCycle(tenantId, refs.parentCustomerId, selfId);
    }
  }

  /** Walks up from the new parent; reaching selfId means a cycle. */
  private async assertNoCycle(
    tenantId: string,
    parentId: string,
    selfId: string,
  ): Promise<void> {
    let current: string | null | undefined = parentId;
    for (let depth = 0; current && depth < MAX_HIERARCHY_DEPTH; depth++) {
      current = await this.customerRepository.parentOf(tenantId, current);
      if (current === selfId) {
        throw new BadRequestException(
          'This parent would create a customer hierarchy loop',
        );
      }
    }
  }
}
