import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResetGateChainDto } from './dto/reset-gate-chain.dto';
import { GateChainState, TestingService } from './testing.service';

interface AuthRequest {
  user: {
    userId: string;
    tenantId: string;
  };
  id?: string;
}

/**
 * Non-production test support (see TestingService for the security rationale).
 *
 * Routed under /testing and mounted only when TestingService.isEnabled() — the
 * module is left out of AppModule entirely in production, so these routes do
 * not exist there.
 *
 * Super-admin only. Deliberately NOT behind RbacGuard/@RequirePermission: a
 * tenant permission for this would be grantable to a tenant role, and no tenant
 * role should ever be able to clear another account's forced-password flag or
 * unbind the handset their attendance is pinned to.
 */
@ApiTags('testing')
@ApiBearerAuth()
@Controller('testing')
@UseGuards(JwtAuthGuard)
export class TestingController {
  constructor(private readonly testingService: TestingService) {}

  /** Super admins authenticate with the reserved 'SYSTEM' tenant. */
  private requireSuperAdmin(req: AuthRequest): string {
    if (req.user?.tenantId !== 'SYSTEM') {
      throw new ForbiddenException('Super admin only');
    }
    return req.user.userId;
  }

  @Post('reset-gate-chain')
  @ApiOperation({
    summary: 'Rewind a test account to the start of the mobile gate chain',
    description:
      'Re-arms the forced password change, profile setup and device binding ' +
      'gates so the chain can be walked again from an installed APK. The ' +
      'permissions gate is device-local — clear app storage to replay it. ' +
      'Non-production only; the account email must contain "gatetest".',
  })
  async resetGateChain(
    @Req() req: AuthRequest,
    @Body() dto: ResetGateChainDto,
  ): Promise<GateChainState> {
    const superAdminId = this.requireSuperAdmin(req);
    return this.testingService.resetGateChain(dto, {
      superAdminId,
      requestId: req.id,
    });
  }

  @Get('gate-chain')
  @ApiOperation({
    summary: 'Read the current server-side gate flags for an account',
    description:
      'Answers "which gate is this account sitting on?" without changing ' +
      'anything. permissionsFlowSeen is device-local and not reported.',
  })
  async inspectGateChain(
    @Req() req: AuthRequest,
    @Query('tenantCode') tenantCode: string,
    @Query('email') email: string,
  ): Promise<GateChainState> {
    this.requireSuperAdmin(req);
    return this.testingService.inspectGateChain(tenantCode, email);
  }
}
