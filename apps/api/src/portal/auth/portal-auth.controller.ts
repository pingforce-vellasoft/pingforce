import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PortalUserGuard } from '../guards/portal-user.guard';
import { PortalAuthService } from './portal-auth.service';
import {
  ActivateInviteDto,
  PortalLoginDto,
  PortalOtpLoginDto,
  PortalOtpRequestDto,
  PortalRefreshDto,
  VerifyInviteDto,
} from './dto/portal-auth.dto';

/**
 * Public authentication surface for customer portal identities
 * (3.8_CustomerPortal BR-1). Stricter throttling than staff auth: portal
 * endpoints face the open internet from subscriber devices.
 */
@ApiTags('Customer Portal — Auth')
@Controller('portal/auth')
export class PortalAuthController {
  constructor(private readonly portalAuthService: PortalAuthService) {}

  @ApiOperation({ summary: 'Verify an invite token; sends activation OTP' })
  @Throttle({
    burst: { limit: 5, ttl: 60000 },
    sustained: { limit: 10, ttl: 60000 },
  })
  @Post('invite/verify')
  @HttpCode(HttpStatus.OK)
  async verifyInvite(@Body() dto: VerifyInviteDto, @Request() req: any) {
    return this.portalAuthService.verifyInvite(dto.token, {
      ip: req.ip,
      requestId: req.requestId,
    });
  }

  @ApiOperation({ summary: 'Activate account with invite token + OTP' })
  @Throttle({
    burst: { limit: 5, ttl: 60000 },
    sustained: { limit: 10, ttl: 60000 },
  })
  @Post('invite/activate')
  @HttpCode(HttpStatus.OK)
  async activate(@Body() dto: ActivateInviteDto, @Request() req: any) {
    return this.portalAuthService.activate(dto, {
      ip: req.ip,
      requestId: req.requestId,
    });
  }

  @ApiOperation({ summary: 'Portal login with password' })
  @Throttle({
    burst: { limit: 5, ttl: 60000 },
    sustained: { limit: 10, ttl: 60000 },
  })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: PortalLoginDto, @Request() req: any) {
    return this.portalAuthService.login(dto, {
      ip: req.ip,
      requestId: req.requestId,
      userAgent: req.headers?.['user-agent'],
    });
  }

  @ApiOperation({ summary: 'Request a login OTP' })
  @Throttle({
    burst: { limit: 3, ttl: 60000 },
    sustained: { limit: 6, ttl: 60000 },
  })
  @Post('otp/request')
  @HttpCode(HttpStatus.OK)
  async requestOtp(@Body() dto: PortalOtpRequestDto, @Request() req: any) {
    return this.portalAuthService.requestLoginOtp(dto, {
      ip: req.ip,
      requestId: req.requestId,
    });
  }

  @ApiOperation({ summary: 'Login with OTP' })
  @Throttle({
    burst: { limit: 5, ttl: 60000 },
    sustained: { limit: 10, ttl: 60000 },
  })
  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  async loginWithOtp(@Body() dto: PortalOtpLoginDto, @Request() req: any) {
    return this.portalAuthService.loginWithOtp(dto, {
      ip: req.ip,
      requestId: req.requestId,
    });
  }

  @ApiOperation({ summary: 'Rotate refresh token' })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: PortalRefreshDto) {
    return this.portalAuthService.refresh(dto.refreshToken);
  }

  @ApiOperation({ summary: 'Logout — revoke all refresh tokens' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PortalUserGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Request() req: any) {
    return this.portalAuthService.logout(req.user.userId, req.user.tenantId);
  }
}
