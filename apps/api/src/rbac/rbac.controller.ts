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
import { RequirePermission } from './decorators/require-permission.decorator';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';

@Controller('rbac')
@UseGuards(JwtAuthGuard, RbacGuard)
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  @Get('roles')
  @RequirePermission('ROLES', 'READ')
  findAllRoles(@CurrentTenant() tenantId: string) {
    return this.rbacService.findAllRoles(tenantId);
  }

  @Post('roles')
  @RequirePermission('ROLES', 'CREATE')
  createRole(@CurrentTenant() tenantId: string, @Body() body: CreateRoleDto) {
    return this.rbacService.createRole(tenantId, body);
  }

  @Put('roles/:id')
  @RequirePermission('ROLES', 'UPDATE')
  updateRole(
    @CurrentTenant() tenantId: string,
    @Param('id') roleId: string,
    @Body() body: UpdateRoleDto,
  ) {
    return this.rbacService.updateRole(tenantId, roleId, body);
  }

  @Get('permissions')
  @RequirePermission('ROLES', 'READ')
  findAllPermissions(@CurrentTenant() tenantId: string) {
    return this.rbacService.findAllPermissions(tenantId);
  }

  @Put('roles/:id/permissions')
  @RequirePermission('ROLES', 'UPDATE')
  updateRolePermissions(
    @CurrentTenant() tenantId: string,
    @Param('id') roleId: string,
    @Body() body: UpdateRolePermissionsDto,
  ) {
    return this.rbacService.updateRolePermissions(
      tenantId,
      roleId,
      body.permissionIds,
    );
  }

  @Delete('roles/:id')
  @RequirePermission('ROLES', 'DELETE')
  deleteRole(@CurrentTenant() tenantId: string, @Param('id') roleId: string) {
    return this.rbacService.deleteRole(tenantId, roleId);
  }
}
