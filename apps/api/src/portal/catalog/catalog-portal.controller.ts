import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PortalUserGuard } from '../guards/portal-user.guard';
import { PortalFeatureGuard } from '../guards/portal-feature.guard';
import { CatalogService } from './catalog.service';

/**
 * Read-only catalog "shop window" for portal customers (3.8_CustomerPortal
 * BR-2.6). Returns only active plans/add-ons, scoped to the customer's tenant
 * from the JWT. Entry point for service requests (P4).
 */
@ApiTags('Customer Portal — Catalog')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PortalUserGuard, PortalFeatureGuard)
@Controller('portal/catalog')
export class CatalogPortalController {
  constructor(private readonly catalog: CatalogService) {}

  @ApiOperation({ summary: 'Browse active service plans' })
  @Get('plans')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listPlans(@Request() req: any) {
    return this.catalog.listPlans(req.user.tenantId, { activeOnly: true });
  }

  @ApiOperation({ summary: 'Browse active add-ons' })
  @Get('addons')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listAddOns(@Request() req: any) {
    return this.catalog.listAddOns(req.user.tenantId, { activeOnly: true });
  }
}
