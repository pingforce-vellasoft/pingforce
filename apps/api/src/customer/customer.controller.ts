import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../rbac/guards/rbac.guard';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import { CurrentTenant } from '@pingforce-monorepo/shared';

@UseGuards(JwtAuthGuard, RbacGuard)
@Controller('customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post()
  @RequirePermission('CUSTOMERS', 'CREATE')
  create(
    @CurrentTenant() tenantId: string,
    @Body() createCustomerDto: CreateCustomerDto,
  ) {
    return this.customerService.create(tenantId, createCustomerDto);
  }

  @Get()
  @RequirePermission('CUSTOMERS', 'READ')
  findAll(
    @CurrentTenant() tenantId: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.customerService.findAll(
      tenantId,
      skip ? parseInt(skip, 10) : undefined,
      take ? parseInt(take, 10) : undefined,
    );
  }

  @Get(':id')
  @RequirePermission('CUSTOMERS', 'READ')
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.customerService.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermission('CUSTOMERS', 'UPDATE')
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    return this.customerService.update(tenantId, id, updateCustomerDto);
  }

  @Delete(':id')
  @RequirePermission('CUSTOMERS', 'DELETE')
  remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.customerService.remove(tenantId, id);
  }
}
