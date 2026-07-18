/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  Get,
  Request,
  Inject,
  Param,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { IAuthService } from '@pingforce-monorepo/shared';
import {
  LoginDto,
  RefreshTokenDto,
  ResetPasswordDto,
} from '@pingforce-monorepo/dto';
import { RegisterTenantDto } from './dto/register-tenant.dto';
import { RegisterEmployeeDto } from './dto/register-employee.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OnboardingTenantDto } from './dto/onboarding-tenant.dto';
import { OnboardingEmployeeDto } from './dto/onboarding-employee.dto';
import { ConfirmPasswordResetDto } from './dto/confirm-password-reset.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { PasswordResetService } from './password-reset.service';
import { SessionService } from './session.service';
import { OtpService } from './otp.service';
import { RequestOtpDto, VerifyOtpDto } from './dto/otp.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { LoginHistoryService } from './login-history.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject('IAuthService') private readonly authService: IAuthService,
    private readonly passwordResetService: PasswordResetService,
    private readonly sessionService: SessionService,
    private readonly otpService: OtpService,
    private readonly notifications: NotificationsService,
    private readonly loginHistoryService: LoginHistoryService,
  ) {}

  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'User successfully logged in.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  @Throttle({
    burst: { limit: 10, ttl: 60000 },
    sustained: { limit: 10, ttl: 60000 },
  })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Request() req: any) {
    return (this.authService as any).login(loginDto, {
      ip: req.ip,
      userAgent: req.headers?.['user-agent'],
      deviceId: req.headers?.['x-device-id'],
    });
  }

  @ApiOperation({ summary: 'Refresh JWT token' })
  @ApiResponse({ status: 200, description: 'Token successfully refreshed.' })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token.',
  })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() refreshDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshDto.refreshToken);
  }

  @ApiOperation({ summary: 'Request password reset (sends OTP by email)' })
  @ApiResponse({ status: 200, description: 'Generic acknowledgement.' })
  @Throttle({
    burst: { limit: 5, ttl: 60000 },
    sustained: { limit: 5, ttl: 60000 },
  })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetDto: ResetPasswordDto, @Request() req: any) {
    return this.passwordResetService.requestReset(
      resetDto.email,
      resetDto.tenantCode,
      { ip: req.ip, requestId: req.requestId },
    );
  }

  @ApiOperation({ summary: 'Confirm password reset with OTP' })
  @ApiResponse({ status: 200, description: 'Password reset.' })
  @ApiResponse({ status: 401, description: 'Invalid or expired code.' })
  @Throttle({
    burst: { limit: 5, ttl: 60000 },
    sustained: { limit: 5, ttl: 60000 },
  })
  @Post('reset-password/confirm')
  @HttpCode(HttpStatus.OK)
  async confirmResetPassword(
    @Body() dto: ConfirmPasswordResetDto,
    @Request() req: any,
  ) {
    return this.passwordResetService.confirmReset(
      dto.email,
      dto.tenantCode,
      dto.otp,
      dto.newPassword,
      { ip: req.ip, requestId: req.requestId },
    );
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Request an OTP for the authenticated user (OTP.md §11)',
  })
  @Throttle({
    burst: { limit: 3, ttl: 60000 },
    sustained: { limit: 3, ttl: 60000 },
  })
  @UseGuards(JwtAuthGuard)
  @Post('otp/request')
  @HttpCode(HttpStatus.OK)
  async requestOtp(@Request() req: any, @Body() dto: RequestOtpDto) {
    if (req.user.tenantId === 'SYSTEM') {
      // OTP records reference tenant users; super admins have no User row
      return { message: 'OTP is not available for platform accounts' };
    }

    const otp = await this.otpService.issue(
      req.user.tenantId,
      req.user.userId,
      dto.purpose,
      { ip: req.ip, requestId: req.requestId },
    );

    if (req.user.email) {
      await this.notifications.sendRawEmail(
        req.user.email,
        'Your PingForce verification code',
        `<p>Your verification code is <b>${otp}</b>.</p>
         <p>It expires in 10 minutes.</p>`,
      );
    }

    return { message: 'Verification code sent' };
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Verify an OTP for the authenticated user (OTP.md §11)',
  })
  @Throttle({
    burst: { limit: 5, ttl: 60000 },
    sustained: { limit: 5, ttl: 60000 },
  })
  @UseGuards(JwtAuthGuard)
  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Request() req: any, @Body() dto: VerifyOtpDto) {
    if (req.user.tenantId === 'SYSTEM') {
      return { message: 'OTP is not available for platform accounts' };
    }

    await this.otpService.verify(
      req.user.tenantId,
      req.user.userId,
      dto.purpose,
      dto.otp,
      { ip: req.ip, requestId: req.requestId },
    );
    return { message: 'Verified' };
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'List own active sessions' })
  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  async listSessions(@Request() req: any) {
    return this.sessionService.listForUser(req.user.tenantId, req.user.userId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'List own login history (LoginHistory.md §14)' })
  @UseGuards(JwtAuthGuard)
  @Get('login-history')
  async listLoginHistory(@Request() req: any) {
    if (req.user.tenantId === 'SYSTEM') {
      // Login history references tenant users; platform accounts have none
      return { items: [], total: 0, page: 1, pageSize: 20 };
    }
    const page = parseInt(req.query?.page ?? '1', 10) || 1;
    const pageSize = parseInt(req.query?.pageSize ?? '20', 10) || 20;
    return this.loginHistoryService.listForUser(
      req.user.tenantId,
      req.user.userId,
      page,
      pageSize,
    );
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke one of your sessions' })
  @UseGuards(JwtAuthGuard)
  @Post('sessions/:id/revoke')
  @HttpCode(HttpStatus.OK)
  async revokeSession(@Request() req: any, @Param('id') sessionId: string) {
    await this.sessionService.revoke(
      req.user.tenantId,
      req.user.userId,
      sessionId,
      'ADMIN_REVOKE',
    );
    return { message: 'Session revoked' };
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout current session' })
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Request() req: any) {
    if (req.user.sessionId) {
      await this.sessionService.revoke(
        req.user.tenantId,
        req.user.userId,
        req.user.sessionId,
        'LOGOUT',
      );
    }
    return { message: 'Logged out' };
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout everywhere (revokes all sessions/tokens)' })
  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  async logoutAll(@Request() req: any) {
    await (this.authService as any).logoutAll(
      req.user.tenantId,
      req.user.userId,
    );
    return { message: 'All sessions revoked' };
  }

  @ApiOperation({ summary: 'Sign in with Google' })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged in via Google.',
  })
  @ApiResponse({ status: 401, description: 'Invalid Google token.' })
  @Post('google')
  @HttpCode(HttpStatus.OK)
  async googleAuth(@Body() googleDto: GoogleAuthDto) {
    return (this.authService as any).googleAuth(googleDto);
  }

  @ApiOperation({ summary: 'Register a new tenant (website self-signup)' })
  @ApiResponse({ status: 201, description: 'Tenant registered successfully.' })
  @Throttle({
    burst: { limit: 5, ttl: 60000 },
    sustained: { limit: 5, ttl: 60000 },
  })
  @Post('register-tenant')
  async registerTenant(@Body() registerDto: RegisterTenantDto) {
    return (this.authService as any).registerTenant(registerDto);
  }

  @ApiOperation({ summary: 'Verify signup email and activate the workspace' })
  @ApiResponse({
    status: 200,
    description: 'Email verified, tenant activated.',
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired code.' })
  @Throttle({
    burst: { limit: 5, ttl: 60000 },
    sustained: { limit: 5, ttl: 60000 },
  })
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return (this.authService as any).verifyEmail(dto);
  }

  @ApiOperation({ summary: 'Register a new employee' })
  @ApiResponse({
    status: 201,
    description: 'Employee registered successfully.',
  })
  @Post('register-employee')
  async registerEmployee(@Body() registerDto: RegisterEmployeeDto) {
    return (this.authService as any).registerEmployee(registerDto);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Change own password (also clears the force-change flag)',
  })
  @ApiResponse({ status: 200, description: 'Password changed.' })
  @ApiResponse({ status: 401, description: 'Current password incorrect.' })
  @Throttle({
    burst: { limit: 5, ttl: 60000 },
    sustained: { limit: 5, ttl: 60000 },
  })
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(@Request() req: any, @Body() dto: ChangePasswordDto) {
    return (this.authService as any).changePassword(
      req.user.tenantId,
      req.user.userId,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Request() req: any) {
    return req.user;
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Complete tenant onboarding' })
  @UseGuards(JwtAuthGuard)
  @Post('onboarding/tenant')
  async onboardTenant(@Request() req: any, @Body() dto: OnboardingTenantDto) {
    return (this.authService as any).onboardTenant(
      req.user.userId,
      req.user.tenantId,
      dto,
    );
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Complete employee onboarding' })
  @UseGuards(JwtAuthGuard)
  @Post('onboarding/employee')
  async onboardEmployee(
    @Request() req: any,
    @Body() dto: OnboardingEmployeeDto,
  ) {
    return (this.authService as any).onboardEmployee(
      req.user.userId,
      req.user.tenantId,
      dto,
    );
  }
}
