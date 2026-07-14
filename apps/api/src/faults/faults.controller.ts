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
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateFaultDto } from './dto/create-fault.dto';
import { UpdateFaultDto } from './dto/update-fault.dto';
import { UpdateFaultStatusDto } from './dto/update-fault-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../rbac/guards/rbac.guard';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import {
  CurrentTenant,
  CurrentUserContext,
  CurrentUser,
} from '@pingforce-monorepo/shared';

import {
  CreateFaultCommand,
  UpdateFaultCommand,
  UpdateFaultStatusCommand,
  EscalateFaultCommand,
  RemoveFaultCommand,
} from './commands/impl';

import {
  GetFaultsQuery,
  GetAssignedFaultsQuery,
  GetFaultByIdQuery,
  GetBreachedFaultsQuery,
} from './queries/impl';

@UseGuards(JwtAuthGuard, RbacGuard)
@Controller('faults')
export class FaultsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @RequirePermission('FAULTS', 'CREATE')
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() currentUser: CurrentUserContext,
    @Body() createFaultDto: CreateFaultDto,
  ) {
    return this.commandBus.execute(
      new CreateFaultCommand(tenantId, currentUser, createFaultDto),
    );
  }

  @Get()
  @RequirePermission('FAULTS', 'READ')
  findAll(
    @CurrentTenant() tenantId: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.queryBus.execute(
      new GetFaultsQuery(
        tenantId,
        skip ? parseInt(skip, 10) : undefined,
        take ? parseInt(take, 10) : undefined,
      ),
    );
  }

  @Get('breached')
  @RequirePermission('FAULTS', 'READ')
  findBreached(
    @CurrentTenant() tenantId: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.queryBus.execute(
      new GetBreachedFaultsQuery(
        tenantId,
        skip ? parseInt(skip, 10) : undefined,
        take ? parseInt(take, 10) : undefined,
      ),
    );
  }

  @Get('assigned')
  @RequirePermission('FAULTS', 'READ_OWN')
  findAssignedToMe(
    @CurrentTenant() tenantId: string,
    @CurrentUser() currentUser: CurrentUserContext,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.queryBus.execute(
      new GetAssignedFaultsQuery(
        tenantId,
        currentUser.userId,
        skip ? parseInt(skip, 10) : undefined,
        take ? parseInt(take, 10) : undefined,
      ),
    );
  }

  @Get(':id')
  @RequirePermission('FAULTS', 'READ_OWN')
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.queryBus.execute(new GetFaultByIdQuery(tenantId, id));
  }

  @Patch(':id')
  @RequirePermission('FAULTS', 'UPDATE')
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() currentUser: CurrentUserContext,
    @Body() updateFaultDto: UpdateFaultDto,
  ) {
    return this.commandBus.execute(
      new UpdateFaultCommand(tenantId, id, currentUser, updateFaultDto),
    );
  }

  @Patch(':id/status')
  @RequirePermission('FAULTS', 'UPDATE')
  updateStatus(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() currentUser: CurrentUserContext,
    @Body() updateFaultStatusDto: UpdateFaultStatusDto,
  ) {
    return this.commandBus.execute(
      new UpdateFaultStatusCommand(
        tenantId,
        id,
        currentUser,
        updateFaultStatusDto,
      ),
    );
  }

  @Post(':id/escalate')
  @RequirePermission('FAULTS', 'ESCALATE')
  escalate(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() currentUser: CurrentUserContext,
  ) {
    return this.commandBus.execute(
      new EscalateFaultCommand(tenantId, id, currentUser),
    );
  }

  @Delete(':id')
  @RequirePermission('FAULTS', 'DELETE')
  remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.commandBus.execute(new RemoveFaultCommand(tenantId, id));
  }
}
