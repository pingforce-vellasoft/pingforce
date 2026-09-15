import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateFaultDto } from './dto/create-fault.dto';
import { UpdateFaultDto } from './dto/update-fault.dto';
import { UpdateFaultStatusDto } from './dto/update-fault-status.dto';
import { SyncFaultsDto } from './dto/sync-faults.dto';
import { FaultListQueryDto } from './dto/fault-list-query.dto';
import { AssignFaultDto } from './dto/assign-fault.dto';
import { FaultPageQueryDto } from './dto/fault-page-query.dto';
import {
  AddFaultNoteDto,
  UpdateTimelineVisibilityDto,
} from './dto/fault-note.dto';
import { FaultsSyncService } from './faults-sync.service';
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
  AssignFaultCommand,
  AddFaultNoteCommand,
  SetTimelineVisibilityCommand,
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
    private readonly faultsSyncService: FaultsSyncService,
  ) {}

  @Post('sync')
  @RequirePermission('FAULTS', 'CREATE')
  sync(
    @CurrentTenant() tenantId: string,
    @CurrentUser() currentUser: CurrentUserContext,
    @Body() dto: SyncFaultsDto,
  ) {
    return this.faultsSyncService.syncActions(tenantId, currentUser, dto);
  }

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
    @CurrentUser() currentUser: CurrentUserContext,
    @Query() query: FaultListQueryDto,
  ) {
    return this.queryBus.execute(
      new GetFaultsQuery(tenantId, currentUser.userId, query),
    );
  }

  @Get('breached')
  @RequirePermission('FAULTS', 'READ')
  findBreached(
    @CurrentTenant() tenantId: string,
    @CurrentUser() currentUser: CurrentUserContext,
    @Query() query: FaultPageQueryDto,
  ) {
    return this.queryBus.execute(
      new GetBreachedFaultsQuery(
        tenantId,
        currentUser.userId,
        query.skip,
        query.take,
      ),
    );
  }

  @Get('assigned')
  @RequirePermission('FAULTS', 'READ_OWN')
  findAssignedToMe(
    @CurrentTenant() tenantId: string,
    @CurrentUser() currentUser: CurrentUserContext,
    @Query() query: FaultPageQueryDto,
  ) {
    return this.queryBus.execute(
      new GetAssignedFaultsQuery(
        tenantId,
        currentUser.userId,
        query.skip,
        query.take,
      ),
    );
  }

  @Get(':id')
  @RequirePermission('FAULTS', 'READ_OWN')
  findOne(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: CurrentUserContext,
  ) {
    return this.queryBus.execute(
      new GetFaultByIdQuery(tenantId, id, currentUser.userId),
    );
  }

  @Patch(':id')
  @RequirePermission('FAULTS', 'UPDATE')
  update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
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
    @Param('id', ParseUUIDPipe) id: string,
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

  @Post(':id/assign')
  @RequirePermission('FAULTS', 'ASSIGN')
  assign(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: CurrentUserContext,
    @Body() assignFaultDto: AssignFaultDto,
  ) {
    return this.commandBus.execute(
      new AssignFaultCommand(tenantId, id, currentUser, assignFaultDto),
    );
  }

  @Post(':id/notes')
  @RequirePermission('FAULTS', 'UPDATE')
  addNote(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: CurrentUserContext,
    @Body() dto: AddFaultNoteDto,
  ) {
    return this.commandBus.execute(
      new AddFaultNoteCommand(tenantId, id, currentUser, dto),
    );
  }

  @Patch(':id/timeline/:entryId/visibility')
  @RequirePermission('FAULTS', 'UPDATE')
  setTimelineVisibility(
    @CurrentTenant() tenantId: string,
    @CurrentUser() currentUser: CurrentUserContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @Body() dto: UpdateTimelineVisibilityDto,
  ) {
    return this.commandBus.execute(
      new SetTimelineVisibilityCommand(
        tenantId,
        id,
        entryId,
        dto.isCustomerVisible,
        currentUser,
      ),
    );
  }

  @Post(':id/escalate')
  @RequirePermission('FAULTS', 'ESCALATE')
  escalate(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: CurrentUserContext,
  ) {
    return this.commandBus.execute(
      new EscalateFaultCommand(tenantId, id, currentUser),
    );
  }

  @Delete(':id')
  @RequirePermission('FAULTS', 'DELETE')
  remove(
    @CurrentTenant() tenantId: string,
    @CurrentUser() currentUser: CurrentUserContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.commandBus.execute(
      new RemoveFaultCommand(tenantId, id, currentUser),
    );
  }
}
