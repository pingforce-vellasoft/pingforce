import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../rbac/guards/rbac.guard';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import { IPrismaService } from '@pingforce-monorepo/shared';
import { RegisterDeviceTokenDto } from './dto/register-device-token.dto';
import { UpsertEmailConfigDto } from './dto/upsert-email-config.dto';
import { TenantEmailConfigService } from './tenant-email-config.service';

interface AuthRequest {
  user: {
    userId: string;
    tenantId: string;
    role: string;
  };
}

/**
 * FCM device-token lifecycle. Users manage only their own tokens, so
 * JwtAuthGuard suffices — no RBAC resource involved.
 */
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
    private readonly emailConfig: TenantEmailConfigService,
  ) {}

  // --- Per-tenant email provider (Email.md §5) ---

  @Get('email-config')
  @UseGuards(RbacGuard)
  @RequirePermission('NOTIFICATIONS', 'MANAGE')
  async getEmailConfig(@Req() req: AuthRequest) {
    return (
      (await this.emailConfig.getMasked(req.user.tenantId)) ?? {
        configured: false,
      }
    );
  }

  @Put('email-config')
  @UseGuards(RbacGuard)
  @RequirePermission('NOTIFICATIONS', 'MANAGE')
  async upsertEmailConfig(
    @Req() req: AuthRequest,
    @Body() dto: UpsertEmailConfigDto,
  ) {
    return this.emailConfig.upsert(req.user.tenantId, dto, req.user.userId);
  }

  @Delete('email-config')
  @UseGuards(RbacGuard)
  @RequirePermission('NOTIFICATIONS', 'MANAGE')
  async removeEmailConfig(@Req() req: AuthRequest) {
    await this.emailConfig.remove(req.user.tenantId);
    return { deleted: true };
  }

  @Post('device-tokens')
  async registerDeviceToken(
    @Req() req: AuthRequest,
    @Body() dto: RegisterDeviceTokenDto,
  ) {
    return this.prisma.deviceToken.upsert({
      where: {
        userId_deviceId: { userId: req.user.userId, deviceId: dto.deviceId },
      },
      create: {
        userId: req.user.userId,
        deviceId: dto.deviceId,
        fcmToken: dto.fcmToken,
        platform: dto.platform ?? 'ANDROID',
      },
      update: {
        fcmToken: dto.fcmToken,
        platform: dto.platform ?? 'ANDROID',
        lastSeenAt: new Date(),
      },
    });
  }

  @Delete('device-tokens/:deviceId')
  async removeDeviceToken(
    @Req() req: AuthRequest,
    @Param('deviceId') deviceId: string,
  ) {
    await this.prisma.deviceToken.deleteMany({
      where: { userId: req.user.userId, deviceId },
    });
    return { deleted: true };
  }
}
