import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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
import { CatalogService } from './catalog.service';
import {
  CreateServicePlanDto,
  UpdateServicePlanDto,
} from './dto/service-plan.dto';
import { CreateAddOnDto, UpdateAddOnDto } from './dto/addon.dto';

/**
 * Staff-facing catalog management (3.8_CustomerPortal P3). Lives under
 * /api/v1/catalog/**; RBAC PORTAL_CATALOG. Portal customers never reach these
 * routes — their read-only view is served by CatalogPortalController.
 */
@ApiTags('Service Catalog')
@UseGuards(JwtAuthGuard, RbacGuard)
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  // ---- plans ---------------------------------------------------------------

  @Post('plans')
  @RequirePermission('PORTAL_CATALOG', 'MANAGE')
  createPlan(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: CurrentUserContext,
    @Body() dto: CreateServicePlanDto,
  ) {
    return this.catalog.createPlan(tenantId, user, dto);
  }

  @Get('plans')
  @RequirePermission('PORTAL_CATALOG', 'READ')
  listPlans(
    @CurrentTenant() tenantId: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.catalog.listPlans(tenantId, {
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
      activeOnly: activeOnly === 'true',
    });
  }

  @Patch('plans/:id')
  @RequirePermission('PORTAL_CATALOG', 'MANAGE')
  updatePlan(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: CurrentUserContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServicePlanDto,
  ) {
    return this.catalog.updatePlan(tenantId, user, id, dto);
  }

  @Delete('plans/:id')
  @RequirePermission('PORTAL_CATALOG', 'MANAGE')
  archivePlan(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: CurrentUserContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.catalog.archivePlan(tenantId, user, id);
  }

  // ---- add-ons -------------------------------------------------------------

  @Post('addons')
  @RequirePermission('PORTAL_CATALOG', 'MANAGE')
  createAddOn(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: CurrentUserContext,
    @Body() dto: CreateAddOnDto,
  ) {
    return this.catalog.createAddOn(tenantId, user, dto);
  }

  @Get('addons')
  @RequirePermission('PORTAL_CATALOG', 'READ')
  listAddOns(
    @CurrentTenant() tenantId: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.catalog.listAddOns(tenantId, {
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
      activeOnly: activeOnly === 'true',
    });
  }

  @Patch('addons/:id')
  @RequirePermission('PORTAL_CATALOG', 'MANAGE')
  updateAddOn(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: CurrentUserContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAddOnDto,
  ) {
    return this.catalog.updateAddOn(tenantId, user, id, dto);
  }

  @Delete('addons/:id')
  @RequirePermission('PORTAL_CATALOG', 'MANAGE')
  archiveAddOn(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: CurrentUserContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.catalog.archiveAddOn(tenantId, user, id);
  }
}
