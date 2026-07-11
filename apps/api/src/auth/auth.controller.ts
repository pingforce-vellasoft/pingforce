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
} from '@nestjs/common';
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

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject('IAuthService') private readonly authService: IAuthService,
  ) {}

  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'User successfully logged in.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
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

  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 200, description: 'OTP sent.' })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetDto: ResetPasswordDto) {
    return { message: 'OTP sent to your email.' };
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

  @ApiOperation({ summary: 'Register a new tenant' })
  @ApiResponse({ status: 201, description: 'Tenant registered successfully.' })
  @Post('register-tenant')
  async registerTenant(@Body() registerDto: RegisterTenantDto) {
    return (this.authService as any).registerTenant(registerDto);
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
    return (this.authService as any).onboardTenant(req.user.userId, req.user.tenantId, dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Complete employee onboarding' })
  @UseGuards(JwtAuthGuard)
  @Post('onboarding/employee')
  async onboardEmployee(@Request() req: any, @Body() dto: OnboardingEmployeeDto) {
    return (this.authService as any).onboardEmployee(req.user.userId, req.user.tenantId, dto);
  }
}
