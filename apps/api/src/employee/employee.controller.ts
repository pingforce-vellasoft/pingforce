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
import { RbacGuard } from '../rbac/guards/rbac.guard';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import {
  CurrentTenant,
  CurrentUser,
  CurrentUserContext,
} from '@pingforce-monorepo/shared';

@UseGuards(JwtAuthGuard, RbacGuard)
@Controller('employees')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Post()
  @RequirePermission('EMPLOYEES', 'CREATE')
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
  @RequirePermission('EMPLOYEES', 'READ')
  findAll(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: CurrentUserContext,
    @Query('cursor') cursor?: string,
    @Query('take') take?: string,
  ) {
    const takeVal = take ? parseInt(take, 10) : 50;
    return this.employeeService.findAll(tenantId, user.userId, {
      cursor,
      take: takeVal,
    });
  }

  @Get(':id')
  @RequirePermission('EMPLOYEES', 'READ')
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.employeeService.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermission('EMPLOYEES', 'UPDATE')
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
  ) {
    return this.employeeService.update(tenantId, id, updateEmployeeDto);
  }

  @Delete(':id')
  @RequirePermission('EMPLOYEES', 'DELETE')
  remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.employeeService.remove(tenantId, id);
  }
}
