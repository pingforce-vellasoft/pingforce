import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../../rbac/guards/rbac.guard';
import { RequirePermission } from '../../rbac/decorators/require-permission.decorator';
import {
  CurrentTenant,
  CurrentUser,
  CurrentUserContext,
} from '@pingforce-monorepo/shared';
import { NetworkFeatureGuard } from '../guards/network-feature.guard';
import { NetworkMapService } from './map.service';

@UseGuards(JwtAuthGuard, RbacGuard, NetworkFeatureGuard)
@Controller('network')
export class NetworkMapController {
  constructor(private readonly mapService: NetworkMapService) {}

  @Get('map')
  @RequirePermission('NETWORK', 'READ')
  getMap(
    @CurrentTenant() tenantId: string,
    @Query('olteId') olteId?: string,
    @Query('status') status?: string,
    @Query('area') area?: string,
    @Query('district') district?: string,
    @Query('bbox') bbox?: string,
  ) {
    return this.mapService.getMap(tenantId, {
      olteId,
      status,
      area,
      district,
      bbox,
    });
  }

  /** Employee view: assigned connections + upstream route context only. */
  @Get('map/assigned')
  @RequirePermission('NETWORK', 'READ_OWN')
  getAssignedMap(
    @CurrentTenant() tenantId: string,
    @CurrentUser() currentUser: CurrentUserContext,
  ) {
    return this.mapService.getAssignedMap(tenantId, currentUser.userId);
  }

  /** Filter dropdown options — READ_OWN so employees can populate the bar. */
  @Get('filters')
  @RequirePermission('NETWORK', 'READ_OWN')
  getFilters(@CurrentTenant() tenantId: string) {
    return this.mapService.getFilters(tenantId);
  }

  /** Active map provider + client rendering keys (Super Admin controlled). */
  @Get('map-config')
  @RequirePermission('NETWORK', 'READ_OWN')
  getMapConfig() {
    return this.mapService.getMapConfig();
  }

  @Get('oltes/:id/tree')
  @RequirePermission('NETWORK', 'READ')
  getTree(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.mapService.getOlteTree(tenantId, id);
  }

  @Get('search')
  @RequirePermission('NETWORK', 'READ')
  search(@CurrentTenant() tenantId: string, @Query('q') q = '') {
    return this.mapService.search(tenantId, q);
  }

  @Get('stats')
  @RequirePermission('NETWORK', 'READ')
  getStats(@CurrentTenant() tenantId: string) {
    return this.mapService.getStats(tenantId);
  }
}
