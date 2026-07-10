import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { LeaveService } from './leave.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '@pingforce-monorepo/shared';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';

@Controller('leaves')
@UseGuards(JwtAuthGuard)
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post('request')
  async requestLeave(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateLeaveRequestDto,
  ) {
    return this.leaveService.requestLeave(tenantId, dto);
  }

  @Get('balance/:employeeId')
  async getLeaveBalances(
    @CurrentTenant() tenantId: string,
    @Param('employeeId') employeeId: string,
    @Query('year') year: number,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.leaveService.getLeaveBalances(
      tenantId,
      employeeId,
      Number(year) || new Date().getFullYear(),
      skip ? parseInt(skip, 10) : undefined,
      take ? parseInt(take, 10) : undefined,
    );
  }

  @Get('pending')
  async getPendingLeaves(@CurrentTenant() tenantId: string) {
    return this.leaveService.getPendingLeaves(tenantId);
  }

  @Post(':id/approve')
  async approveLeave(
    @CurrentTenant() tenantId: string,
    @Param('id') leaveId: string,
    @Request() req: any,
  ) {
    return this.leaveService.updateLeaveStatus(
      tenantId,
      leaveId,
      'APPROVED',
      req.user.id,
    );
  }

  @Post(':id/reject')
  async rejectLeave(
    @CurrentTenant() tenantId: string,
    @Param('id') leaveId: string,
    @Request() req: any,
  ) {
    return this.leaveService.updateLeaveStatus(
      tenantId,
      leaveId,
      'REJECTED',
      req.user.id,
    );
  }
}
