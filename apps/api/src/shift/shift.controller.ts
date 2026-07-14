import { Controller, Post, Get, Body, UseGuards, Param } from '@nestjs/common';
import { ShiftService } from './shift.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../rbac/guards/rbac.guard';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import { CurrentTenant } from '@pingforce-monorepo/shared';
import { CreateShiftDto } from './dto/create-shift.dto';
import { AssignShiftDto } from './dto/assign-shift.dto';

@Controller('shifts')
@UseGuards(JwtAuthGuard, RbacGuard)
export class ShiftController {
  constructor(private readonly shiftService: ShiftService) {}

  @Post()
  @RequirePermission('SHIFTS', 'CREATE')
  async create(@CurrentTenant() tenantId: string, @Body() dto: CreateShiftDto) {
    return this.shiftService.create(tenantId, dto);
  }

  @Get()
  @RequirePermission('SHIFTS', 'READ')
  async findAll(@CurrentTenant() tenantId: string) {
    return this.shiftService.findAll(tenantId);
  }

  @Post('assignments')
  @RequirePermission('SHIFTS', 'ASSIGN')
  async assignShift(
    @CurrentTenant() tenantId: string,
    @Body() dto: AssignShiftDto,
  ) {
    return this.shiftService.assignShift(
      tenantId,
      dto.employeeId,
      dto.shiftId,
      new Date(dto.effectiveFrom),
      dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
    );
  }

  @Get('assignments/:employeeId/:date')
  @RequirePermission('SHIFTS', 'READ_OWN')
  async getAssignedShift(
    @CurrentTenant() tenantId: string,
    @Param('employeeId') employeeId: string,
    @Param('date') date: string,
  ) {
    return this.shiftService.getAssignedShift(
      tenantId,
      employeeId,
      new Date(date),
    );
  }
}
