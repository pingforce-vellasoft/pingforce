import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerRepository } from './customer.repository';

@Injectable()
export class CustomerService {
  constructor(private readonly customerRepository: CustomerRepository) {}

  async create(tenantId: string, createCustomerDto: CreateCustomerDto) {
    return await this.customerRepository.create(tenantId, createCustomerDto);
  }

  async findAll(tenantId: string, skip?: number, take?: number) {
    return await this.customerRepository.findAll(tenantId, skip, take);
  }

  async findOne(tenantId: string, id: string) {
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
  ) {
    try {
      return await this.customerRepository.update(
        tenantId,
        id,
        updateCustomerDto,
      );
    } catch (e: any) {
      if (e.code === 'P2025') throw new NotFoundException();
      throw e;
    }
  }

  async remove(tenantId: string, id: string) {
    try {
      return await this.customerRepository.delete(tenantId, id);
    } catch (e: any) {
      if (e.code === 'P2025') throw new NotFoundException();
      throw e;
    }
  }
}
