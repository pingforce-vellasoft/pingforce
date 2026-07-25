import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../rbac/guards/rbac.guard';
import { PlatformAdminGuard } from '../rbac/guards/platform-admin.guard';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import { PlansService } from './plans.service';
import { SubscriptionsService } from './subscriptions.service';
import { BillingAnalyticsService } from './billing-analytics.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

interface AuthRequest {
  user: { userId: string; tenantId: string };
}

/**
 * Super-Admin billing management: plan catalog CRUD, subscription tracking and
 * platform analytics. Super-admin JWTs carry tenantId==='SYSTEM', which the
 * RbacGuard treats as full access; the permission decorators document intent.
 */
@Controller('billing')
@UseGuards(JwtAuthGuard, RbacGuard, PlatformAdminGuard)
export class BillingController {
  constructor(
    private readonly plans: PlansService,
    private readonly subscriptions: SubscriptionsService,
    private readonly analytics: BillingAnalyticsService,
  ) {}

  // ── Analytics ───────────────────────────────────────────────────────────
  @Get('analytics/summary')
  @RequirePermission('BILLING', 'READ')
  summary() {
    return this.analytics.summary();
  }

  @Get('analytics/plan-mix')
  @RequirePermission('BILLING', 'READ')
  planMix() {
    return this.analytics.planMix();
  }

  @Get('analytics/revenue-trend')
  @RequirePermission('BILLING', 'READ')
  revenueTrend(@Query('months') months?: string) {
    return this.analytics.revenueTrend(months ? Number(months) : 6);
  }

  // ── Plans ─────────────────────────────────────────────────────────────────
  @Get('plans')
  @RequirePermission('BILLING', 'READ')
  listPlans() {
    return this.plans.listAll();
  }

  @Post('plans')
  @RequirePermission('BILLING', 'UPDATE')
  createPlan(@Body() dto: CreatePlanDto, @Req() req: AuthRequest) {
    return this.plans.create(dto, req.user.userId);
  }

  @Patch('plans/:id')
  @RequirePermission('BILLING', 'UPDATE')
  updatePlan(
    @Param('id') id: string,
    @Body() dto: UpdatePlanDto,
    @Req() req: AuthRequest,
  ) {
    return this.plans.update(id, dto, req.user.userId);
  }

  @Delete('plans/:id')
  @RequirePermission('BILLING', 'UPDATE')
  removePlan(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.plans.remove(id, req.user.userId);
  }

  // ── Subscriptions ─────────────────────────────────────────────────────────
  @Get('subscriptions')
  @RequirePermission('BILLING', 'READ')
  listSubscriptions(
    @Query('status') status?: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.subscriptions.list({ status, tenantId });
  }

  @Get('subscriptions/:id')
  @RequirePermission('BILLING', 'READ')
  getSubscription(@Param('id') id: string) {
    return this.subscriptions.findOne(id);
  }

  @Post('subscriptions/:id/cancel')
  @RequirePermission('BILLING', 'UPDATE')
  cancelSubscription(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.subscriptions.cancel(id, req.user.userId);
  }
}
