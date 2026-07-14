import {
  Controller,
  Post,
  Body,
  Get,
  Delete,
  Param,
  UseGuards,
  Query,
  Req,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../rbac/guards/rbac.guard';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import {
  RegisterDeviceDto,
  PunchDto,
  CreateGeofenceDto,
} from './dto/attendance.dto';
import { ManualCheckoutDto } from './dto/manual-checkout.dto';

interface AuthRequest {
  user: {
    userId: string;
    tenantId: string;
    role: string;
  };
}

@Controller('attendance')
@UseGuards(JwtAuthGuard, RbacGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('device/register')
  @RequirePermission('ATTENDANCE', 'CREATE')
  async registerDevice(
    @Req() req: AuthRequest,
    @Body() dto: RegisterDeviceDto,
  ) {
    return this.attendanceService.registerDevice(req.user, dto);
  }

  @Post('device/revoke')
  @RequirePermission('ATTENDANCE', 'APPROVE')
  async revokeDevice(
    @Req() req: AuthRequest,
    @Body('employeeId') employeeId: string,
    @Body('deviceId') deviceId: string,
  ) {
    return this.attendanceService.revokeDevice(req.user, employeeId, deviceId);
  }

  @Post('punch')
  @RequirePermission('ATTENDANCE', 'CREATE')
  async punch(@Req() req: AuthRequest, @Body() dto: PunchDto) {
    return this.attendanceService.punch(req.user, dto);
  }

  @Post('manual-checkout')
  @RequirePermission('ATTENDANCE', 'APPROVE')
  async manualCheckout(
    @Req() req: AuthRequest,
    @Body() dto: ManualCheckoutDto,
  ) {
    return this.attendanceService.manualCheckout(req.user, dto);
  }

  @Get('device')
  @RequirePermission('ATTENDANCE', 'READ')
  async getDevices(@Req() req: AuthRequest) {
    return this.attendanceService.getDevices(req.user);
  }

  @Get('logs')
  @RequirePermission('ATTENDANCE', 'READ_OWN')
  async getLogs(
    @Req() req: AuthRequest,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: string,
  ) {
    return this.attendanceService.getLogs(
      req.user,
      Number(page),
      Number(limit),
      search,
      sortBy,
      sortDir,
    );
  }

  @Post('geofence')
  @RequirePermission('GEOFENCES', 'CREATE')
  async createGeofence(
    @Req() req: AuthRequest,
    @Body() dto: CreateGeofenceDto,
  ) {
    return this.attendanceService.createGeofence(req.user, dto);
  }

  @Get('geofence')
  @RequirePermission('GEOFENCES', 'READ')
  async getGeofences(@Req() req: AuthRequest) {
    return this.attendanceService.getGeofences(req.user);
  }

  @Delete('geofence/:id')
  @RequirePermission('GEOFENCES', 'DELETE')
  async deleteGeofence(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.attendanceService.deleteGeofence(req.user, id);
  }
}
