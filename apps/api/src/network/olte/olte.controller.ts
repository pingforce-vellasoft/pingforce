import {
  Body,
  Controller,
  Delete,
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
import { OlteService } from './olte.service';
import { CreateOlteDto } from './dto/create-olte.dto';
import { UpdateOlteDto } from './dto/update-olte.dto';

@UseGuards(JwtAuthGuard, RbacGuard, NetworkFeatureGuard)
@Controller('network/oltes')
export class OlteController {
  constructor(private readonly olteService: OlteService) {}

  @Post()
  @RequirePermission('NETWORK', 'OLTE_MANAGE')
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() currentUser: CurrentUserContext,
    @Body() dto: CreateOlteDto,
  ) {
    return this.olteService.create(tenantId, currentUser, dto);
  }

  @Get()
  @RequirePermission('NETWORK', 'READ')
  findAll(
    @CurrentTenant() tenantId: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('status') status?: string,
  ) {
    return this.olteService.findAll(
      tenantId,
      skip ? parseInt(skip, 10) : undefined,
      take ? parseInt(take, 10) : undefined,
      status,
    );
  }

  @Get(':id')
  @RequirePermission('NETWORK', 'READ')
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.olteService.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermission('NETWORK', 'OLTE_MANAGE')
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() currentUser: CurrentUserContext,
    @Body() dto: UpdateOlteDto,
  ) {
    return this.olteService.update(tenantId, id, currentUser, dto);
  }

  @Delete(':id')
  @RequirePermission('NETWORK', 'OLTE_MANAGE')
  archive(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() currentUser: CurrentUserContext,
  ) {
    return this.olteService.archive(tenantId, id, currentUser);
  }
}
