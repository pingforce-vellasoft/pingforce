import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../../rbac/guards/rbac.guard';
import { RequirePermission } from '../../rbac/decorators/require-permission.decorator';
import {
  CurrentTenant,
  CurrentUser,
  CurrentUserContext,
} from '@pingforce-monorepo/shared';
import { NetworkFeatureGuard } from '../guards/network-feature.guard';
import { ConnectionService } from './connection.service';
import { CreateConnectionDto } from './dto/create-connection.dto';
import { UpdateConnectionDto } from './dto/update-connection.dto';
import { MoveConnectionDto } from './dto/move-connection.dto';
import { SplitConnectionDto } from './dto/split-connection.dto';
import { MergeConnectionDto } from './dto/merge-connection.dto';

@UseGuards(JwtAuthGuard, RbacGuard, NetworkFeatureGuard)
@Controller('network/connections')
export class ConnectionController {
  constructor(private readonly connectionService: ConnectionService) {}

  @Post()
  @RequirePermission('NETWORK', 'CREATE')
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() currentUser: CurrentUserContext,
    @Body() dto: CreateConnectionDto,
  ) {
    return this.connectionService.create(tenantId, currentUser, dto);
  }

  @Get('assigned')
  @RequirePermission('NETWORK', 'READ_OWN')
  findAssigned(
    @CurrentTenant() tenantId: string,
    @CurrentUser() currentUser: CurrentUserContext,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.connectionService.findAssigned(
      tenantId,
      currentUser.userId,
      skip ? parseInt(skip, 10) : undefined,
      take ? parseInt(take, 10) : undefined,
    );
  }

  @Get(':id')
  @RequirePermission('NETWORK', 'READ')
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.connectionService.findOne(tenantId, id);
  }

  @Get(':id/impact')
  @RequirePermission('NETWORK', 'READ')
  getImpact(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.connectionService.getImpact(tenantId, id);
  }

  @Get(':id/history')
  @RequirePermission('NETWORK', 'READ')
  getHistory(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.connectionService.getHistory(
      tenantId,
      id,
      skip ? parseInt(skip, 10) : undefined,
      take ? parseInt(take, 10) : undefined,
    );
  }

  @Patch(':id')
  @RequirePermission('NETWORK', 'UPDATE')
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() currentUser: CurrentUserContext,
    @Body() dto: UpdateConnectionDto,
  ) {
    return this.connectionService.update(tenantId, id, currentUser, dto);
  }

  @Post(':id/move')
  @RequirePermission('NETWORK', 'MOVE')
  move(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() currentUser: CurrentUserContext,
    @Body() dto: MoveConnectionDto,
  ) {
    return this.connectionService.move(tenantId, id, currentUser, dto);
  }

  @Post(':id/split')
  @RequirePermission('NETWORK', 'MOVE')
  split(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() currentUser: CurrentUserContext,
    @Body() dto: SplitConnectionDto,
  ) {
    return this.connectionService.split(tenantId, id, currentUser, dto);
  }

  @Post(':id/merge')
  @RequirePermission('NETWORK', 'MOVE')
  merge(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() currentUser: CurrentUserContext,
    @Body() dto: MergeConnectionDto,
  ) {
    return this.connectionService.merge(tenantId, id, currentUser, dto);
  }

  @Post(':id/disconnect')
  @RequirePermission('NETWORK', 'UPDATE')
  disconnect(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() currentUser: CurrentUserContext,
  ) {
    return this.connectionService.disconnect(tenantId, id, currentUser);
  }

  @Post(':id/reconnect')
  @RequirePermission('NETWORK', 'UPDATE')
  reconnect(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() currentUser: CurrentUserContext,
  ) {
    return this.connectionService.reconnect(tenantId, id, currentUser);
  }
}
