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
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '@pingforce-monorepo/shared';

@UseGuards(JwtAuthGuard)
@Controller('v1/employees')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Post()
  create(
    @CurrentTenant() tenantId: string,
    @Body() createEmployeeDto: CreateEmployeeDto,
    @Request() req: any,
  ) {
    if (
      req.user?.clientCode === 'SYS_ADMIN' ||
      req.user?.role?.code === 'SUPER_ADMIN'
    ) {
      throw new ForbiddenException(
        'Super Admins cannot directly create standard employees. Please use Tenant Admin credentials.',
      );
    }
    return this.employeeService.create(tenantId, createEmployeeDto);
  }

  @Get()
  findAll(
    @CurrentTenant() tenantId: string,
    @Query('cursor') cursor?: string,
    @Query('take') take?: string,
  ) {
    const takeVal = take ? parseInt(take, 10) : 50;
    return this.employeeService.findAll(tenantId, { cursor, take: takeVal });
  }

  @Get(':id')
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.employeeService.findOne(tenantId, id);
  }

  @Patch(':id')
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
  ) {
    return this.employeeService.update(tenantId, id, updateEmployeeDto);
  }

  @Delete(':id')
  remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.employeeService.remove(tenantId, id);
  }
}
