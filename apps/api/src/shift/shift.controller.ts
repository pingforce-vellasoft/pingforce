import { Controller, Post, Get, Body, UseGuards, Param } from '@nestjs/common';
import { ShiftService } from './shift.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '@pingforce-monorepo/shared';
import { CreateShiftDto } from './dto/create-shift.dto';

@Controller('v1/shifts')
@UseGuards(JwtAuthGuard)
export class ShiftController {
  constructor(private readonly shiftService: ShiftService) {}

  @Post()
  async create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateShiftDto,
  ) {
    return this.shiftService.create(tenantId, dto);
  }

  @Get()
  async findAll(@CurrentTenant() tenantId: string) {
    return this.shiftService.findAll(tenantId);
  }

  @Post('assignments')
  async assignShift(
    @CurrentTenant() tenantId: string,
    @Body() payload: { employeeId: string, shiftId: string, effectiveFrom: Date, effectiveTo?: Date }
  ) {
    return this.shiftService.assignShift(tenantId, payload.employeeId, payload.shiftId, payload.effectiveFrom, payload.effectiveTo);
  }

  @Get('assignments/:employeeId/:date')
  async getAssignedShift(
    @CurrentTenant() tenantId: string,
    @Param('employeeId') employeeId: string,
    @Param('date') date: string
  ) {
    return this.shiftService.getAssignedShift(tenantId, employeeId, new Date(date));
  }
}
