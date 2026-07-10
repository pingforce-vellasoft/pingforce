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
} from '@nestjs/common';
import { LeadService } from './lead.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { UpdateLeadStageDto } from './dto/update-lead-stage.dto';
import { UpdateLeadOwnerDto } from './dto/update-lead-owner.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '@pingforce-monorepo/shared';

@UseGuards(JwtAuthGuard)
@Controller('leads')
export class LeadController {
  constructor(private readonly leadService: LeadService) {}

  @Post()
  create(
    @CurrentTenant() tenantId: string,
    @Body() createLeadDto: CreateLeadDto,
  ) {
    return this.leadService.create(tenantId, createLeadDto);
  }

  @Get()
  findAll(
    @CurrentTenant() tenantId: string,
    @Query('cursor') cursor?: string,
    @Query('take') take?: string,
  ) {
    return this.leadService.findAll(
      tenantId,
      cursor,
      take ? parseInt(take, 10) : undefined,
    );
  }

  @Get('pipeline')
  getPipeline(
    @CurrentTenant() tenantId: string,
    @Query('cursor') cursor?: string,
    @Query('take') take?: string,
  ) {
    return this.leadService.getPipeline(
      tenantId,
      cursor,
      take ? parseInt(take, 10) : undefined,
    );
  }

  @Get(':id')
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.leadService.findOne(tenantId, id);
  }

  @Patch(':id')
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() updateLeadDto: UpdateLeadDto,
  ) {
    return this.leadService.update(tenantId, id, updateLeadDto);
  }

  @Patch(':id/assign')
  assignOwner(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateLeadOwnerDto,
  ) {
    return this.leadService.assignOwner(tenantId, id, dto.ownerUserId);
  }

  @Patch(':id/stage')
  updateStage(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateLeadStageDto,
  ) {
    return this.leadService.updateStage(tenantId, id, dto.pipelineStageId);
  }

  @Delete(':id')
  remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.leadService.remove(tenantId, id);
  }
}
