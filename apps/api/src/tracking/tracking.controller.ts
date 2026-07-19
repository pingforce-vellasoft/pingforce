import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../rbac/guards/rbac.guard';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import { TrackingService } from './tracking.service';
import { PingBatchDto } from './dto/tracking.dto';

interface AuthRequest {
  user: {
    userId: string;
    tenantId: string;
    role: string;
  };
}

@Controller('tracking')
@UseGuards(JwtAuthGuard, RbacGuard)
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  /**
   * Operator posts its own background pings. Uses the operator's own
   * ATTENDANCE:CREATE grant (field staff already hold it) — deliberately NOT
   * TRACKING:VIEW_LIVE, which is a manager-only view permission.
   */
  @Post('ping/batch')
  @RequirePermission('ATTENDANCE', 'CREATE')
  async ingestBatch(@Req() req: AuthRequest, @Body() dto: PingBatchDto) {
    return this.trackingService.ingestBatch(req.user, dto);
  }

  /** Latest position per operator the caller may see (admin live map). */
  @Get('live')
  @RequirePermission('TRACKING', 'VIEW_LIVE')
  async getLive(@Req() req: AuthRequest) {
    return this.trackingService.getLive(req.user);
  }

  /** Breadcrumb trail for one operator, time-bounded. */
  @Get(':employeeId/trail')
  @RequirePermission('TRACKING', 'VIEW_LIVE')
  async getTrail(
    @Req() req: AuthRequest,
    @Param('employeeId') employeeId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.trackingService.getTrail(req.user, employeeId, from, to);
  }

  /** Consolidated daily summaries (field-time + top places) for one operator. */
  @Get(':employeeId/summary')
  @RequirePermission('TRACKING', 'VIEW_LIVE')
  async getDailySummaries(
    @Req() req: AuthRequest,
    @Param('employeeId') employeeId: string,
    @Query('limit') limit?: string,
  ) {
    return this.trackingService.getDailySummaries(
      req.user,
      employeeId,
      limit ? parseInt(limit, 10) : undefined,
    );
  }
}
