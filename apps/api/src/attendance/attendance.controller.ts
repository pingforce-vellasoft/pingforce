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
import { PunchDto, CreateGeofenceDto } from './dto/attendance.dto';
import { ManualCheckoutDto } from './dto/manual-checkout.dto';
import { CreateCorrectionDto } from './dto/create-correction.dto';
import { CorrectionsService } from './corrections.service';
import { SyncPunchesDto } from './dto/sync-punches.dto';
import { OfflineSyncService } from './offline-sync.service';
import { AttendanceLogService } from './attendance-log.service';
import { AttendanceAdminService } from './attendance-admin.service';
import { TrackingGapService } from './tracking-gap.service';
import { AttendanceDailyLogQueryDto } from './dto/attendance-daily-log.dto';
import {
  AdjustSessionTimesDto,
  OverrideDayStatusDto,
} from './dto/admin-adjust.dto';
import {
  OpenTrackingGapDto,
  RequestExemptionDto,
  ReviewExemptionDto,
} from './dto/tracking-gap.dto';

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
    private readonly attendanceLogService: AttendanceLogService,
    private readonly attendanceAdminService: AttendanceAdminService,
    private readonly trackingGapService: TrackingGapService,
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

  @Post('corrections/:id/cancel')
  @RequirePermission('ATTENDANCE', 'CREATE')
  async cancelCorrection(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.correctionsService.cancel(
      req.user.tenantId,
      id,
      req.user.userId,
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

  // Device registration, revocation and listing moved to DevicesModule
  // (POST /devices/bind, POST /devices/:id/revoke, GET /devices).
  //
  // The old POST device/register was the fraud path this module closed: it
  // revoked the employee's current binding and trusted a new handset on
  // request, so anyone could re-bind to a colleague's phone and punch from it.
  // Binding is now one-shot at onboarding and every later move needs
  // DEVICES:APPROVE.

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

  /**
   * Today's snapshot for the signed-in employee: open session + break state,
   * today's punch history, totals and leave balances. Drives the mobile
   * attendance screen's resume-on-open behaviour.
   */
  @Get('today')
  @RequirePermission('ATTENDANCE', 'READ_OWN')
  async getToday(@Req() req: AuthRequest) {
    return this.attendanceService.getToday(req.user);
  }

  /**
   * Day-grouped attendance log — one row per employee-day with punch times,
   * worked/break totals, status and exceptions. Backs both the employee's own
   * history and the tenant-wide admin table; data scope decides which rows the
   * caller sees.
   */
  @Get('daily-logs')
  @RequirePermission('ATTENDANCE', 'READ_OWN')
  async getDailyLogs(
    @Req() req: AuthRequest,
    @Query() query: AttendanceDailyLogQueryDto,
  ) {
    return this.attendanceLogService.getDailyLogs(req.user, query);
  }

  // ── Admin adjustments (exceptional cases) ─────────────────────────────────

  @Post('admin/adjust-session')
  @RequirePermission('ATTENDANCE', 'UPDATE')
  async adjustSessionTimes(
    @Req() req: AuthRequest,
    @Body() dto: AdjustSessionTimesDto,
  ) {
    return this.attendanceAdminService.adjustSessionTimes(req.user, dto);
  }

  @Post('admin/override-status')
  @RequirePermission('ATTENDANCE', 'UPDATE')
  async overrideDayStatus(
    @Req() req: AuthRequest,
    @Body() dto: OverrideDayStatusDto,
  ) {
    return this.attendanceAdminService.overrideDayStatus(req.user, dto);
  }

  // ── Tracking gaps + device exemptions ─────────────────────────────────────

  @Post('tracking-gap/open')
  @RequirePermission('ATTENDANCE', 'CREATE')
  async openTrackingGap(
    @Req() req: AuthRequest,
    @Body() dto: OpenTrackingGapDto,
  ) {
    return this.trackingGapService.openGap(req.user, dto);
  }

  @Post('tracking-gap/close')
  @RequirePermission('ATTENDANCE', 'CREATE')
  async closeTrackingGap(@Req() req: AuthRequest) {
    return this.trackingGapService.closeGap(req.user);
  }

  @Get('tracking-exemptions')
  @RequirePermission('ATTENDANCE', 'UPDATE')
  async listExemptions(
    @Req() req: AuthRequest,
    @Query('status') status?: string,
  ) {
    return this.trackingGapService.listExemptions(req.user, status);
  }

  @Post('tracking-exemptions')
  @RequirePermission('ATTENDANCE', 'UPDATE')
  async requestExemption(
    @Req() req: AuthRequest,
    @Body() dto: RequestExemptionDto,
  ) {
    return this.trackingGapService.requestExemption(req.user, dto);
  }

  @Post('tracking-exemptions/:id/review')
  @RequirePermission('ATTENDANCE', 'APPROVE')
  async reviewExemption(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: ReviewExemptionDto,
  ) {
    return this.trackingGapService.reviewExemption(req.user, id, dto);
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
