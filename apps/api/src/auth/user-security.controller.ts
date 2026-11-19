import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentTenant } from '@pingforce-monorepo/shared';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RbacGuard } from '../rbac/guards/rbac.guard';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import { UserSecurityService } from './user-security.service';

interface AuthedRequest {
  readonly user: { readonly userId: string };
}

/**
 * Tenant-admin controls over another user's sessions and lockout state
 * (SessionManagement.md §2, PasswordPolicy.md §12). Tenant-scoped via JWT.
 */
@ApiTags('Security')
@ApiBearerAuth()
@Controller('security/users')
@UseGuards(JwtAuthGuard, RbacGuard)
export class UserSecurityController {
  constructor(private readonly userSecurity: UserSecurityService) {}

  @Get(':userId/status')
  @RequirePermission('USERS', 'READ')
  @ApiOperation({ summary: 'Lockout + password status for a user' })
  getStatus(
    @CurrentTenant() tenantId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.userSecurity.getStatus(tenantId, userId);
  }

  @Get(':userId/sessions')
  @RequirePermission('USERS', 'READ')
  @ApiOperation({ summary: 'List active sessions of a user' })
  listSessions(
    @CurrentTenant() tenantId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.userSecurity.listSessions(tenantId, userId);
  }

  @Post(':userId/sessions/:sessionId/revoke')
  @RequirePermission('USERS', 'UPDATE')
  @ApiOperation({ summary: 'Revoke one session of a user' })
  revokeSession(
    @CurrentTenant() tenantId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Request() req: AuthedRequest,
  ) {
    return this.userSecurity.revokeSession(
      tenantId,
      userId,
      sessionId,
      req.user.userId,
    );
  }

  @Post(':userId/sessions/revoke-all')
  @RequirePermission('USERS', 'UPDATE')
  @ApiOperation({ summary: 'Force logout of a user on every device' })
  revokeAll(
    @CurrentTenant() tenantId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Request() req: AuthedRequest,
  ) {
    return this.userSecurity.revokeAllSessions(
      tenantId,
      userId,
      req.user.userId,
    );
  }

  @Post(':userId/unlock')
  @RequirePermission('USERS', 'UPDATE')
  @ApiOperation({ summary: 'Clear a sign-in lockout' })
  unlock(
    @CurrentTenant() tenantId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Request() req: AuthedRequest,
  ) {
    return this.userSecurity.unlock(tenantId, userId, req.user.userId);
  }
}
