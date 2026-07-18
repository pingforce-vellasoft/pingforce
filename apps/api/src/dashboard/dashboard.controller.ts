import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../rbac/guards/rbac.guard';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import { DashboardService } from './dashboard.service';
import { DashboardSummaryDto } from './dto/dashboard-summary.dto';

interface AuthRequest {
  user: {
    userId: string;
    tenantId: string;
    role: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD CONTROLLER  (Home screen aggregate — DASHBOARD_SPEC.md)
// ─────────────────────────────────────────────────────────────────────────────

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RbacGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * One-shot aggregate for the mobile Home screen: attendance hero, KPI
   * cards and activity feed for the authenticated user. Scoped to the
   * caller's own data (ATTENDANCE:READ_OWN).
   */
  @Get('summary')
  @RequirePermission('ATTENDANCE', 'READ_OWN')
  async getSummary(@Req() req: AuthRequest): Promise<DashboardSummaryDto> {
    return this.dashboardService.getSummary(req.user);
  }
}
