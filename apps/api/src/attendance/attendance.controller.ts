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
import { CommandBus } from '@nestjs/cqrs';
import { AttendanceService } from './attendance.service';
import {
  PunchCommand,
  StartBreakCommand,
  EndBreakCommand,
} from './commands/impl';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../rbac/guards/rbac.guard';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import {
  RegisterDeviceDto,
  PunchDto,
  CreateGeofenceDto,
} from './dto/attendance.dto';
import { ManualCheckoutDto } from './dto/manual-checkout.dto';
import { CreateCorrectionDto } from './dto/create-correction.dto';
import { CorrectionsService } from './corrections.service';
import { SyncPunchesDto } from './dto/sync-punches.dto';
import { OfflineSyncService } from './offline-sync.service';

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
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly correctionsService: CorrectionsService,
    private readonly offlineSyncService: OfflineSyncService,
    private readonly commandBus: CommandBus,
  ) {}

  // ── Offline sync (3.1 OFFLINE_SYNC.md) ────────────────────────────────────

  @Post('sync')
  @RequirePermission('ATTENDANCE', 'CREATE')
  async syncPunches(@Req() req: AuthRequest, @Body() dto: SyncPunchesDto) {
    return this.offlineSyncService.syncPunches(req.user, dto);
  }

  // ── Corrections (ATTENDANCE_CORRECTION.md) ────────────────────────────────

  @Post('corrections')
  @RequirePermission('ATTENDANCE', 'CREATE')
  async requestCorrection(
    @Req() req: AuthRequest,
    @Body() dto: CreateCorrectionDto,
  ) {
    return this.correctionsService.requestCorrection(
      req.user.tenantId,
      req.user.userId,
      dto,
    );
  }

  @Get('corrections/pending')
  @RequirePermission('ATTENDANCE', 'READ')
  async listPendingCorrections(
    @Req() req: AuthRequest,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.correctionsService.listPending(
      req.user.tenantId,
      req.user.userId,
      skip ? parseInt(skip, 10) : undefined,
      take ? parseInt(take, 10) : undefined,
    );
  }

  @Post('corrections/:id/approve')
  @RequirePermission('ATTENDANCE', 'APPROVE')
  async approveCorrection(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body('notes') notes?: string,
  ) {
    return this.correctionsService.decide(
      req.user.tenantId,
      id,
      req.user.userId,
      'APPROVED',
      notes,
    );
  }

  @Post('corrections/:id/reject')
  @RequirePermission('ATTENDANCE', 'APPROVE')
  async rejectCorrection(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body('notes') notes?: string,
  ) {
    return this.correctionsService.decide(
      req.user.tenantId,
      id,
      req.user.userId,
      'REJECTED',
      notes,
    );
  }

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
    return this.commandBus.execute(new PunchCommand(req.user, dto));
  }

  @Post('break/start')
  @RequirePermission('ATTENDANCE', 'CREATE')
  async startBreak(
    @Req() req: AuthRequest,
    @Body('breakType') breakType?: string,
  ) {
    return this.commandBus.execute(
      new StartBreakCommand(req.user, breakType || 'LUNCH'),
    );
  }

  @Post('break/end')
  @RequirePermission('ATTENDANCE', 'CREATE')
  async endBreak(@Req() req: AuthRequest) {
    return this.commandBus.execute(new EndBreakCommand(req.user));
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
