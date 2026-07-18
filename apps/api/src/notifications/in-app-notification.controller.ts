import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InAppNotificationService } from './in-app-notification.service';

interface AuthRequest {
  user: {
    userId: string;
    tenantId: string;
    role: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// IN-APP NOTIFICATION FEED  (mobile Home bell + notification centre)
// ─────────────────────────────────────────────────────────────────────────────
//
// Every route is self-scoped: the recipient is always the JWT user, so a
// client can only ever read or mutate its own notifications. JwtAuthGuard
// suffices — no shared RBAC resource is involved.

@Controller('notifications/feed')
@UseGuards(JwtAuthGuard)
export class InAppNotificationController {
  constructor(private readonly service: InAppNotificationService) {}

  @Get()
  async list(
    @Req() req: AuthRequest,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.service.list(req.user.tenantId, req.user.userId, {
      unreadOnly: unreadOnly === 'true',
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Get('unread-count')
  async unreadCount(@Req() req: AuthRequest) {
    const count = await this.service.unreadCount(
      req.user.tenantId,
      req.user.userId,
    );
    return { count };
  }

  @Post('read-all')
  async markAllRead(@Req() req: AuthRequest) {
    return this.service.markAllRead(req.user.tenantId, req.user.userId);
  }

  @Post(':id/read')
  async markRead(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.service.markRead(req.user.tenantId, req.user.userId, id);
  }
}
