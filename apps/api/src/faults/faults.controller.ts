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

@UseGuards(JwtAuthGuard)
@Controller('faults')
export class FaultsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
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
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.queryBus.execute(new GetFaultByIdQuery(tenantId, id));
  }

  @Patch(':id')
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
  remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.commandBus.execute(new RemoveFaultCommand(tenantId, id));
  }
}
