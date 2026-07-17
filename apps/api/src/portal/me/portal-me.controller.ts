import {
  Body,
  Controller,
  Get,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PortalUserGuard } from '../guards/portal-user.guard';
import { PortalFeatureGuard } from '../guards/portal-feature.guard';
import { PortalMeService } from './portal-me.service';
import { PortalUpdateProfileDto } from '../auth/dto/portal-auth.dto';

@ApiTags('Customer Portal — Account')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PortalUserGuard, PortalFeatureGuard)
@Controller('portal')
export class PortalMeController {
  constructor(private readonly meService: PortalMeService) {}

  @ApiOperation({ summary: 'Own profile' })
  @Get('me')
  async me(@Request() req: any) {
    return this.meService.getMe(req.user.tenantId, req.user.userId);
  }

  @ApiOperation({ summary: 'Update own profile' })
  @Patch('me')
  async updateMe(@Request() req: any, @Body() dto: PortalUpdateProfileDto) {
    return this.meService.updateProfile(
      req.user.tenantId,
      req.user.userId,
      dto,
    );
  }

  @ApiOperation({ summary: 'Customer account summary' })
  @Get('account')
  async account(@Request() req: any) {
    return this.meService.getAccount(req.user.tenantId, req.user.customerId);
  }

  @ApiOperation({ summary: 'Own connections' })
  @Get('connections')
  async connections(@Request() req: any) {
    return this.meService.getConnections(
      req.user.tenantId,
      req.user.customerId,
    );
  }
}
