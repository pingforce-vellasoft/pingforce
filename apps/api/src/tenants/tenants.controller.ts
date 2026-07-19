import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../rbac/guards/rbac.guard';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';

@Controller('tenants')
@UseGuards(JwtAuthGuard, RbacGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  @RequirePermission('platform', 'manage')
  async findAll() {
    return this.tenantsService.findAll();
  }

  @Post()
  @RequirePermission('platform', 'manage')
  async create(@Body() body: any) {
    return this.tenantsService.create(body);
  }

  @Get(':id')
  @RequirePermission('platform', 'manage')
  async findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(id);
  }

  @Post(':id/resend-invite')
  @RequirePermission('platform', 'manage')
  async resendInvite(@Param('id') id: string) {
    return this.tenantsService.resendWelcomeInvite(id);
  }

  @Patch(':id/provisioning')
  @RequirePermission('platform', 'manage')
  async updateProvisioning(
    @Param('id') id: string,
    @Body()
    body: { isAttendanceEnabled: boolean; maxFieldStaff: number | null },
  ) {
    return this.tenantsService.updateProvisioning(
      id,
      body.isAttendanceEnabled,
      body.maxFieldStaff,
    );
  }

  @Patch(':id')
  @RequirePermission('platform', 'manage')
  async update(@Param('id') id: string, @Body() body: any) {
    // Basic implementation for Super Admin overriding tenant data
    return this.tenantsService.update(id, body);
  }

  @Delete(':id')
  @RequirePermission('platform', 'manage')
  async remove(@Param('id') id: string) {
    return this.tenantsService.delete(id);
  }
}
