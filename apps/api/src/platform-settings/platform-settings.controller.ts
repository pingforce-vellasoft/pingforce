import { Controller, Get, Put, Body, UseGuards, Req } from '@nestjs/common';
import { PlatformSettingsService } from './platform-settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../rbac/guards/rbac.guard';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';

@Controller('platform/settings')
@UseGuards(JwtAuthGuard, RbacGuard)
export class PlatformSettingsController {
  constructor(private readonly platformSettingsService: PlatformSettingsService) {}

  @Get()
  @RequirePermission('platform', 'manage')
  async getSettings() {
    return this.platformSettingsService.getSettings();
  }

  @Put()
  @RequirePermission('platform', 'manage')
  async updateSettings(@Body() settings: any[], @Req() req: any) {
    // Expected format: [{ key: 'MAP_PROVIDER', value: 'OpenStreetMap', category: 'INTEGRATIONS' }]
    const updatedBy = req.user?.email || 'system';
    return this.platformSettingsService.updateSettings(settings, updatedBy);
  }
}
