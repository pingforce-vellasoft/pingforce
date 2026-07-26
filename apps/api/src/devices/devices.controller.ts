import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../rbac/guards/rbac.guard';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import { DevicesService } from './devices.service';
import {
  BindDeviceDto,
  ClaimDeviceDto,
  CreateDeviceChangeRequestDto,
  ListDeviceChangeRequestsDto,
  ListDevicesDto,
  RejectDeviceChangeRequestDto,
  RevokeDeviceDto,
} from './dto/device.dto';

interface AuthRequest {
  user: {
    userId: string;
    tenantId: string;
    role: string;
  };
  id?: string;
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
}

/**
 * Device binding lifecycle (DeviceManagement.md §13).
 *
 * Self-service actions (bind, claim, request change) are deliberately separated
 * from review actions (approve, reject, revoke): an admin login holds
 * DEVICES:APPROVE but never BIND, so nobody can bind themselves a punching
 * device and then approve their own change requests.
 */
@ApiTags('devices')
@ApiBearerAuth()
@Controller('devices')
@UseGuards(JwtAuthGuard, RbacGuard)
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  private actor(req: AuthRequest) {
    const userAgent = req.headers?.['user-agent'];
    return {
      userId: req.user.userId,
      tenantId: req.user.tenantId,
      requestId: req.id,
      ipAddress: req.ip,
      userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent,
    };
  }

  // ── Employee self-service ────────────────────────────────────────────────

  @Post('bind')
  @RequirePermission('DEVICES', 'BIND')
  @ApiOperation({
    summary: 'Bind this handset during onboarding (only while unbound)',
  })
  async bindDevice(@Req() req: AuthRequest, @Body() dto: BindDeviceDto) {
    return this.devicesService.bindDevice(this.actor(req), dto);
  }

  @Post('claim')
  @RequirePermission('DEVICES', 'BIND')
  @ApiOperation({
    summary:
      'Activate a binding an administrator approved, with this device key',
  })
  async claimDevice(@Req() req: AuthRequest, @Body() dto: ClaimDeviceDto) {
    return this.devicesService.claimApprovedDevice(
      this.actor(req),
      dto.deviceId,
      dto.publicKey,
    );
  }

  @Get('me')
  @ApiOperation({
    summary: 'Own device binding and any pending change request',
  })
  async getMyDevice(@Req() req: AuthRequest) {
    return this.devicesService.getMyDevice(this.actor(req));
  }

  @Post('change-requests')
  @RequirePermission('DEVICES', 'REQUEST_CHANGE')
  @ApiOperation({ summary: 'Request that the binding move to a new handset' })
  async createChangeRequest(
    @Req() req: AuthRequest,
    @Body() dto: CreateDeviceChangeRequestDto,
  ) {
    return this.devicesService.createChangeRequest(this.actor(req), dto);
  }

  @Post('change-requests/:id/cancel')
  @RequirePermission('DEVICES', 'REQUEST_CHANGE')
  @ApiOperation({ summary: 'Cancel own pending change request' })
  async cancelChangeRequest(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.devicesService.cancelChangeRequest(this.actor(req), id);
  }

  // ── Admin / HR ───────────────────────────────────────────────────────────

  @Get()
  @RequirePermission('DEVICES', 'READ')
  @ApiOperation({ summary: 'Tenant device inventory' })
  async listDevices(@Req() req: AuthRequest, @Query() query: ListDevicesDto) {
    return this.devicesService.listDevices(
      this.actor(req),
      query.search,
      query.skip,
      query.take,
    );
  }

  @Get('change-requests')
  @RequirePermission('DEVICES', 'READ')
  @ApiOperation({ summary: 'Device change request queue' })
  async listChangeRequests(
    @Req() req: AuthRequest,
    @Query() query: ListDeviceChangeRequestsDto,
  ) {
    return this.devicesService.listChangeRequests(
      this.actor(req),
      query.status,
      query.skip,
      query.take,
    );
  }

  @Post('change-requests/:id/approve')
  @RequirePermission('DEVICES', 'APPROVE')
  @ApiOperation({
    summary: 'Approve a change request: rebind the employee and cut sessions',
  })
  async approveChangeRequest(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.devicesService.approveChangeRequest(this.actor(req), id);
  }

  @Post('change-requests/:id/reject')
  @RequirePermission('DEVICES', 'APPROVE')
  @ApiOperation({ summary: 'Reject a change request with a stated reason' })
  async rejectChangeRequest(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: RejectDeviceChangeRequestDto,
  ) {
    return this.devicesService.rejectChangeRequest(
      this.actor(req),
      id,
      dto.rejectionReason,
    );
  }

  @Post(':id/revoke')
  @RequirePermission('DEVICES', 'APPROVE')
  @ApiOperation({ summary: 'Force-revoke a device binding' })
  async revokeDevice(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: RevokeDeviceDto,
  ) {
    return this.devicesService.revokeDevice(this.actor(req), id, dto.reason);
  }
}
