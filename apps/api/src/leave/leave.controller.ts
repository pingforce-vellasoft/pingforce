import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Req,
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
import { LeaveQueryDto } from './dto/leave-query.dto';
import { CancelLeaveDto, LeaveDecisionDto } from './dto/leave-decision.dto';

@Controller('leaves')
@UseGuards(JwtAuthGuard, RbacGuard)
export class LeaveController {
  constructor(private readonly service: LeaveService) {}

  @Get('access')
  @RequirePermission('LEAVES', 'READ')
  access(
    @CurrentUser() user: CurrentUserContext,
  ): ReturnType<LeaveService['access']> {
    return this.service.access(user.userId);
  }

  @Post('request')
  @RequirePermission('LEAVES', 'CREATE')
  requestLeave(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: CurrentUserContext,
    @Body() dto: CreateLeaveRequestDto,
    @Req() request: { id?: string },
  ): ReturnType<LeaveService['requestLeave']> {
    return this.service.requestLeave(tenantId, user.userId, dto, request.id);
  }

  @Post('preview')
  @RequirePermission('LEAVES', 'CREATE')
  preview(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateLeaveRequestDto,
  ): ReturnType<LeaveService['preview']> {
    return this.service.preview(tenantId, dto);
  }

  @Get('types')
  @RequirePermission('LEAVES', 'READ_OWN')
  getTypes(
    @CurrentTenant() tenantId: string,
  ): ReturnType<LeaveService['getLeaveTypes']> {
    return this.service.getLeaveTypes(tenantId);
  }

  @Get('my-balance')
  @RequirePermission('LEAVES', 'READ_OWN')
  getMyBalances(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: CurrentUserContext,
    @Query() query: LeaveQueryDto,
  ): ReturnType<LeaveService['getMyBalances']> {
    return this.service.getMyBalances(tenantId, user.userId, query.year);
  }

  @Get('my')
  @RequirePermission('LEAVES', 'READ_OWN')
  getMyRequests(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: CurrentUserContext,
    @Query() query: LeaveQueryDto,
  ): ReturnType<LeaveService['getMyRequests']> {
    return this.service.getMyRequests(
      tenantId,
      user.userId,
      query.status,
      query.skip,
      query.take,
    );
  }

  @Get('balance/:employeeId')
  @RequirePermission('LEAVES', 'READ_OWN')
  getBalances(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: CurrentUserContext,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Query() query: LeaveQueryDto,
  ): ReturnType<LeaveService['getLeaveBalances']> {
    return this.service.getLeaveBalances(
      tenantId,
      user.userId,
      employeeId,
      query.year,
    );
  }

  @Get('pending')
  @RequirePermission('LEAVES', 'READ')
  getPending(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: CurrentUserContext,
    @Query() query: LeaveQueryDto,
  ): ReturnType<LeaveService['getPendingLeaves']> {
    return this.service.getPendingLeaves(tenantId, user.userId, query);
  }

  @Post(':id/approve')
  @RequirePermission('LEAVES', 'APPROVE')
  approve(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: CurrentUserContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LeaveDecisionDto,
    @Req() request: { id?: string },
  ): ReturnType<LeaveService['updateLeaveStatus']> {
    return this.service.updateLeaveStatus(
      tenantId,
      id,
      'APPROVED',
      user.userId,
      dto.reason,
      request.id,
    );
  }

  @Post(':id/reject')
  @RequirePermission('LEAVES', 'APPROVE')
  reject(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: CurrentUserContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LeaveDecisionDto,
    @Req() request: { id?: string },
  ): ReturnType<LeaveService['updateLeaveStatus']> {
    return this.service.updateLeaveStatus(
      tenantId,
      id,
      'REJECTED',
      user.userId,
      dto.reason,
      request.id,
    );
  }

  @Post(':id/withdraw')
  @RequirePermission('LEAVES', 'CREATE')
  withdraw(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: CurrentUserContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: { id?: string },
  ): ReturnType<LeaveService['withdraw']> {
    return this.service.withdraw(tenantId, user.userId, id, request.id);
  }

  @Post(':id/cancel')
  @RequirePermission('LEAVES', 'APPROVE')
  cancel(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: CurrentUserContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelLeaveDto,
    @Req() request: { id?: string },
  ): ReturnType<LeaveService['cancelApproved']> {
    return this.service.cancelApproved(
      tenantId,
      user.userId,
      id,
      dto.reason,
      request.id,
    );
  }
}
