import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../../rbac/guards/rbac.guard';
import { RequirePermission } from '../../rbac/decorators/require-permission.decorator';
import { PortalFeatureGuard } from '../guards/portal-feature.guard';
import { PortalInvitesService } from './portal-invites.service';
import {
  InviteContactDto,
  UpdatePortalUserDto,
} from '../auth/dto/portal-auth.dto';

/**
 * Staff-side portal user management (3.8_CustomerPortal BR-1) — lives on the
 * staff API surface: JWT + RBAC (PORTAL_USERS) + module feature gate.
 */
@ApiTags('Customer Portal — Staff Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RbacGuard, PortalFeatureGuard)
@Controller('customers/:customerId/portal')
export class PortalInvitesController {
  constructor(private readonly invitesService: PortalInvitesService) {}

  @ApiOperation({ summary: 'List portal users and pending invites' })
  @RequirePermission('PORTAL_USERS', 'READ')
  @Get()
  async list(
    @Request() req: any,
    @Param('customerId', ParseUUIDPipe) customerId: string,
  ) {
    return this.invitesService.listForCustomer(req.user.tenantId, customerId);
  }

  @ApiOperation({ summary: 'Invite a customer contact to the portal' })
  @RequirePermission('PORTAL_USERS', 'CREATE')
  @Post('invites')
  async invite(
    @Request() req: any,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Body() dto: InviteContactDto,
  ) {
    return this.invitesService.invite(
      req.user.tenantId,
      customerId,
      req.user.userId,
      dto,
    );
  }

  @ApiOperation({ summary: 'Revoke a pending invite' })
  @RequirePermission('PORTAL_USERS', 'DELETE')
  @Delete('invites/:inviteId')
  async revoke(
    @Request() req: any,
    @Param('inviteId', ParseUUIDPipe) inviteId: string,
  ) {
    return this.invitesService.revokeInvite(
      req.user.tenantId,
      inviteId,
      req.user.userId,
    );
  }

  @ApiOperation({ summary: 'Suspend/reactivate or change portal user role' })
  @RequirePermission('PORTAL_USERS', 'UPDATE')
  @Patch('users/:portalUserId')
  async update(
    @Request() req: any,
    @Param('portalUserId', ParseUUIDPipe) portalUserId: string,
    @Body() dto: UpdatePortalUserDto,
  ) {
    return this.invitesService.updatePortalUser(
      req.user.tenantId,
      portalUserId,
      req.user.userId,
      dto,
    );
  }

  @ApiOperation({ summary: 'Remove a portal user (soft delete)' })
  @RequirePermission('PORTAL_USERS', 'DELETE')
  @Delete('users/:portalUserId')
  async remove(
    @Request() req: any,
    @Param('portalUserId', ParseUUIDPipe) portalUserId: string,
  ) {
    return this.invitesService.removePortalUser(
      req.user.tenantId,
      portalUserId,
      req.user.userId,
    );
  }
}
