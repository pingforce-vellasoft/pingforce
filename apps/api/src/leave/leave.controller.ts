import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { LeaveService } from './leave.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../rbac/guards/rbac.guard';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import {
  CurrentTenant,
  CurrentUser,
  CurrentUserContext,
} from '@pingforce-monorepo/shared';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';

@Controller('leaves')
@UseGuards(JwtAuthGuard, RbacGuard)
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post('request')
  @RequirePermission('LEAVES', 'CREATE')
  async requestLeave(
    @CurrentTenant() tenantId: string,
    @CurrentUser() currentUser: CurrentUserContext,
    @Body() dto: CreateLeaveRequestDto,
  ) {
    // employeeId is always derived from the authenticated user — clients
    // cannot file leave on behalf of someone else.
    return this.leaveService.requestLeave(tenantId, currentUser.userId, dto);
  }

  // ── Self-service (mobile Leave screen) ────────────────────────────────────
  // employeeId is always derived from the JWT — a client can never read or
  // file leave for another employee.

  @Get('types')
  @RequirePermission('LEAVES', 'READ_OWN')
  async getLeaveTypes(@CurrentTenant() tenantId: string) {
    return this.leaveService.getLeaveTypes(tenantId);
  }

  @Get('my-balance')
  @RequirePermission('LEAVES', 'READ_OWN')
  async getMyBalances(
    @CurrentTenant() tenantId: string,
    @CurrentUser() currentUser: CurrentUserContext,
    @Query('year') year?: string,
  ) {
    return this.leaveService.getMyBalances(
      tenantId,
      currentUser.userId,
      year ? parseInt(year, 10) : new Date().getFullYear(),
    );
  }

  @Get('my')
  @RequirePermission('LEAVES', 'READ_OWN')
  async getMyRequests(
    @CurrentTenant() tenantId: string,
    @CurrentUser() currentUser: CurrentUserContext,
    @Query('status') status?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.leaveService.getMyRequests(
      tenantId,
      currentUser.userId,
      status,
      skip ? parseInt(skip, 10) : undefined,
      take ? parseInt(take, 10) : undefined,
    );
  }

  @Get('balance/:employeeId')
  @RequirePermission('LEAVES', 'READ_OWN')
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
  @RequirePermission('LEAVES', 'READ')
  async getPendingLeaves(
    @CurrentTenant() tenantId: string,
    @CurrentUser() currentUser: CurrentUserContext,
  ) {
    return this.leaveService.getPendingLeaves(tenantId, currentUser.userId);
  }

  @Post(':id/approve')
  @RequirePermission('LEAVES', 'APPROVE')
  async approveLeave(
    @CurrentTenant() tenantId: string,
    @CurrentUser() currentUser: CurrentUserContext,
    @Param('id') leaveId: string,
  ) {
    return this.leaveService.updateLeaveStatus(
      tenantId,
      leaveId,
      'APPROVED',
      currentUser.userId,
    );
  }

  @Post(':id/reject')
  @RequirePermission('LEAVES', 'APPROVE')
  async rejectLeave(
    @CurrentTenant() tenantId: string,
    @CurrentUser() currentUser: CurrentUserContext,
    @Param('id') leaveId: string,
  ) {
    return this.leaveService.updateLeaveStatus(
      tenantId,
      leaveId,
      'REJECTED',
      currentUser.userId,
    );
  }
}
