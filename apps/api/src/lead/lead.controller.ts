import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { LeadService } from './lead.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { ConvertLeadDto } from './dto/convert-lead.dto';
import { SyncLeadsDto } from './dto/sync-leads.dto';
import { UpdateLeadStageDto } from './dto/update-lead-stage.dto';
import { UpdateLeadOwnerDto } from './dto/update-lead-owner.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../rbac/guards/rbac.guard';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import {
  CurrentTenant,
  CurrentUser,
  CurrentUserContext,
} from '@pingforce-monorepo/shared';

@UseGuards(JwtAuthGuard, RbacGuard)
@Controller('leads')
export class LeadController {
  constructor(private readonly leadService: LeadService) {}

  @Post()
  @RequirePermission('LEADS', 'CREATE')
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: CurrentUserContext,
    @Body() createLeadDto: CreateLeadDto,
  ) {
    return this.leadService.create(tenantId, user.userId, createLeadDto);
  }

  @Post('sync')
  @RequirePermission('LEADS', 'CREATE')
  sync(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: CurrentUserContext,
    @Body() dto: SyncLeadsDto,
  ) {
    return this.leadService.syncLeads(tenantId, user.userId, dto);
  }

  @Get()
  @RequirePermission('LEADS', 'READ')
  findAll(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: CurrentUserContext,
    @Query('cursor') cursor?: string,
    @Query('take') take?: string,
  ) {
    return this.leadService.findAll(
      tenantId,
      user.userId,
      cursor,
      take ? parseInt(take, 10) : undefined,
    );
  }

  @Get('pipeline')
  @RequirePermission('LEADS', 'READ')
  getPipeline(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: CurrentUserContext,
    @Query('cursor') cursor?: string,
    @Query('take') take?: string,
  ) {
    return this.leadService.getPipeline(
      tenantId,
      user.userId,
      cursor,
      take ? parseInt(take, 10) : undefined,
    );
  }

  /** Board columns; seeds the default stages for a tenant that has none. */
  @Get('stages')
  @RequirePermission('LEADS', 'READ')
  listStages(@CurrentTenant() tenantId: string) {
    return this.leadService.listStages(tenantId);
  }

  @Get(':id')
  @RequirePermission('LEADS', 'READ')
  findOne(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserContext,
  ) {
    return this.leadService.findOne(tenantId, id, user.userId);
  }

  @Patch(':id')
  @RequirePermission('LEADS', 'UPDATE')
  update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserContext,
    @Body() updateLeadDto: UpdateLeadDto,
  ) {
    return this.leadService.update(tenantId, id, user.userId, updateLeadDto);
  }

  @Patch(':id/assign')
  @RequirePermission('LEADS', 'UPDATE')
  assignOwner(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserContext,
    @Body() dto: UpdateLeadOwnerDto,
  ) {
    return this.leadService.assignOwner(
      tenantId,
      id,
      user.userId,
      dto.ownerUserId,
    );
  }

  @Patch(':id/stage')
  @RequirePermission('LEADS', 'UPDATE')
  updateStage(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserContext,
    @Body() dto: UpdateLeadStageDto,
  ) {
    return this.leadService.updateStage(
      tenantId,
      id,
      user.userId,
      dto.pipelineStageId,
    );
  }

  @Post(':id/convert')
  @RequirePermission('LEADS', 'CONVERT')
  convert(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserContext,
    @Body() dto: ConvertLeadDto,
  ) {
    return this.leadService.convert(tenantId, id, user.userId, dto);
  }

  @Delete(':id')
  @RequirePermission('LEADS', 'DELETE')
  remove(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserContext,
  ) {
    return this.leadService.remove(tenantId, id, user.userId);
  }
}
