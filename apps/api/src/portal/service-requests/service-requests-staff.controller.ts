import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  CurrentTenant,
  CurrentUser,
  CurrentUserContext,
} from '@pingforce-monorepo/shared';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../../rbac/guards/rbac.guard';
import { RequirePermission } from '../../rbac/decorators/require-permission.decorator';
import { ServiceRequestsService } from './service-requests.service';
import { PortalSettingsService } from './portal-settings.service';
import { StaffTransitionServiceRequestDto } from './dto/service-request.dto';
import {
  UpdatePortalSettingsDto,
  UpsertServiceRequestPolicyDto,
} from './dto/portal-settings.dto';

/**
 * Staff-facing service-request queue + portal commercial configuration
 * (3.8_CustomerPortal P4/§9.2). RBAC SERVICE_REQUESTS. Lives under
 * /api/v1/service-requests/**.
 */
@ApiTags('Service Requests (Staff)')
@UseGuards(JwtAuthGuard, RbacGuard)
@Controller('service-requests')
export class ServiceRequestsStaffController {
  constructor(
    private readonly service: ServiceRequestsService,
    private readonly settings: PortalSettingsService,
  ) {}

  // ---- portal settings + policies (specific routes before :id) ------------

  @Get('settings')
  @RequirePermission('SERVICE_REQUESTS', 'READ')
  getSettings(@CurrentTenant() tenantId: string) {
    return this.settings.getSettings(tenantId);
  }

  @Put('settings')
  @RequirePermission('SERVICE_REQUESTS', 'MANAGE')
  updateSettings(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: CurrentUserContext,
    @Body() dto: UpdatePortalSettingsDto,
  ) {
    return this.settings.updateSettings(tenantId, user, dto);
  }

  @Get('policies')
  @RequirePermission('SERVICE_REQUESTS', 'READ')
  listPolicies(@CurrentTenant() tenantId: string) {
    return this.settings.listPolicies(tenantId);
  }

  @Put('policies')
  @RequirePermission('SERVICE_REQUESTS', 'MANAGE')
  upsertPolicy(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: CurrentUserContext,
    @Body() dto: UpsertServiceRequestPolicyDto,
  ) {
    return this.settings.upsertPolicy(tenantId, user, dto);
  }

  // ---- queue --------------------------------------------------------------

  @Get()
  @RequirePermission('SERVICE_REQUESTS', 'READ')
  listQueue(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('assignedToId') assignedToId?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.service.listQueue(tenantId, {
      status,
      assignedToId,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Get(':id')
  @RequirePermission('SERVICE_REQUESTS', 'READ')
  findOne(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findForStaff(tenantId, id);
  }

  @Patch(':id/transition')
  @RequirePermission('SERVICE_REQUESTS', 'MANAGE')
  transition(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: CurrentUserContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: StaffTransitionServiceRequestDto,
  ) {
    return this.service.transition(tenantId, user, id, dto);
  }
}
