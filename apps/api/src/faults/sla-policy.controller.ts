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
import { SlaPolicyService } from './sla-policy.service';
import { CreateSlaPolicyDto } from './dto/create-sla-policy.dto';
import { UpdateSlaPolicyDto } from './dto/update-sla-policy.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../rbac/guards/rbac.guard';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import {
  CurrentTenant,
  CurrentUser,
  CurrentUserContext,
} from '@pingforce-monorepo/shared';
import { FaultPageQueryDto } from './dto/fault-page-query.dto';

@UseGuards(JwtAuthGuard, RbacGuard)
@Controller('sla-policies')
export class SlaPolicyController {
  constructor(private readonly slaPolicyService: SlaPolicyService) {}

  @Post()
  @RequirePermission('FAULTS', 'MANAGE_SLA')
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() currentUser: CurrentUserContext,
    @Body() dto: CreateSlaPolicyDto,
  ) {
    return this.slaPolicyService.create(tenantId, currentUser.userId, dto);
  }

  @Get()
  @RequirePermission('FAULTS', 'READ')
  findAll(
    @CurrentTenant() tenantId: string,
    @Query() query: FaultPageQueryDto,
  ) {
    return this.slaPolicyService.findAll(tenantId, query.skip, query.take);
  }

  @Get(':id')
  @RequirePermission('FAULTS', 'READ')
  findOne(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.slaPolicyService.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermission('FAULTS', 'MANAGE_SLA')
  update(
    @CurrentTenant() tenantId: string,
    @CurrentUser() currentUser: CurrentUserContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSlaPolicyDto,
  ) {
    return this.slaPolicyService.update(tenantId, id, currentUser.userId, dto);
  }

  @Delete(':id')
  @RequirePermission('FAULTS', 'MANAGE_SLA')
  remove(
    @CurrentTenant() tenantId: string,
    @CurrentUser() currentUser: CurrentUserContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.slaPolicyService.remove(tenantId, id, currentUser.userId);
  }
}
