import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  UseGuards,
  Delete,
} from '@nestjs/common';
import { RbacService } from './rbac.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '@pingforce-monorepo/shared';
import { RbacGuard } from './guards/rbac.guard';

@Controller('rbac')
@UseGuards(JwtAuthGuard, RbacGuard)
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  @Get('roles')
  findAllRoles(@CurrentTenant() tenantId: string) {
    return this.rbacService.findAllRoles(tenantId);
  }

  @Post('roles')
  createRole(
    @CurrentTenant() tenantId: string,
    @Body()
    body: {
      name: string;
      code: string;
      description?: string;
      permissionIds?: string[];
    },
  ) {
    return this.rbacService.createRole(tenantId, body);
  }

  @Put('roles/:id')
  updateRole(
    @CurrentTenant() tenantId: string,
    @Param('id') roleId: string,
    @Body() body: { name: string; description?: string },
  ) {
    return this.rbacService.updateRole(tenantId, roleId, body);
  }

  @Get('permissions')
  findAllPermissions(@CurrentTenant() tenantId: string) {
    return this.rbacService.findAllPermissions(tenantId);
  }

  @Put('roles/:id/permissions')
  updateRolePermissions(
    @CurrentTenant() tenantId: string,
    @Param('id') roleId: string,
    @Body('permissionIds') permissionIds: string[],
  ) {
    return this.rbacService.updateRolePermissions(
      tenantId,
      roleId,
      permissionIds,
    );
  }

  @Delete('roles/:id')
  deleteRole(@CurrentTenant() tenantId: string, @Param('id') roleId: string) {
    return this.rbacService.deleteRole(tenantId, roleId);
  }
}
