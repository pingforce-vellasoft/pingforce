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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../rbac/guards/rbac.guard';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import {
  CurrentTenant,
  CurrentUser,
  CurrentUserContext,
} from '@pingforce-monorepo/shared';
import { VisitsService } from './visits.service';
import { VisitsSyncService } from './visits-sync.service';
import { CreateVisitDto } from './dto/create-visit.dto';
import { UpdateVisitDto } from './dto/update-visit.dto';
import {
  VisitActionDto,
  AssignVisitDto,
  CompleteVisitDto,
  AddVisitNoteDto,
} from './dto/visit-action.dto';
import { SyncVisitsDto } from './dto/sync-visits.dto';

/** Visit lifecycle API (3.2_GPSVisitManagement/API.md §4, §10). */
@UseGuards(JwtAuthGuard, RbacGuard)
@Controller('visits')
export class VisitsController {
  constructor(
    private readonly visitsService: VisitsService,
    private readonly visitsSyncService: VisitsSyncService,
  ) {}

  @Post()
  @RequirePermission('VISITS', 'CREATE')
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: CurrentUserContext,
    @Body() dto: CreateVisitDto,
  ) {
    return this.visitsService.create(tenantId, user, dto);
  }

  @Get()
  @RequirePermission('VISITS', 'READ')
  findAll(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('employeeId') employeeId?: string,
    @Query('customerId') customerId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('cursor') cursor?: string,
    @Query('take') take?: string,
  ) {
    return this.visitsService.findAll(
      tenantId,
      { status, employeeId, customerId, from, to },
      cursor,
      take ? parseInt(take, 10) : undefined,
    );
  }

  @Get('assigned')
  @RequirePermission('VISITS', 'READ_OWN')
  findAssigned(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: CurrentUserContext,
    @Query('status') status?: string,
    @Query('cursor') cursor?: string,
    @Query('take') take?: string,
  ) {
    return this.visitsService.findAssigned(
      tenantId,
      user.userId,
      status,
      cursor,
      take ? parseInt(take, 10) : undefined,
    );
  }

  @Post('sync')
  @RequirePermission('VISITS', 'EXECUTE')
  sync(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: CurrentUserContext,
    @Body() dto: SyncVisitsDto,
  ) {
    return this.visitsSyncService.syncActions(tenantId, user, dto);
  }

  @Get(':id')
  @RequirePermission('VISITS', 'READ_OWN')
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.visitsService.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermission('VISITS', 'UPDATE')
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserContext,
    @Body() dto: UpdateVisitDto,
  ) {
    return this.visitsService.update(tenantId, id, user, dto);
  }

  @Delete(':id')
  @RequirePermission('VISITS', 'DELETE')
  remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.visitsService.remove(tenantId, id);
  }

  // ------------------------------------------------------------ lifecycle

  @Post(':id/assign')
  @RequirePermission('VISITS', 'ASSIGN')
  assign(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserContext,
    @Body() dto: AssignVisitDto,
  ) {
    return this.visitsService.assign(tenantId, id, user, dto);
  }

  @Post(':id/accept')
  @RequirePermission('VISITS', 'EXECUTE')
  accept(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserContext,
    @Body() dto: VisitActionDto,
  ) {
    return this.visitsService.accept(tenantId, id, user, dto);
  }

  @Post(':id/reject')
  @RequirePermission('VISITS', 'EXECUTE')
  reject(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserContext,
    @Body() dto: VisitActionDto,
  ) {
    return this.visitsService.reject(tenantId, id, user, dto);
  }

  @Post(':id/start')
  @RequirePermission('VISITS', 'EXECUTE')
  start(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserContext,
    @Body() dto: VisitActionDto,
  ) {
    return this.visitsService.start(tenantId, id, user, dto);
  }

  @Post(':id/pause')
  @RequirePermission('VISITS', 'EXECUTE')
  pause(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserContext,
    @Body() dto: VisitActionDto,
  ) {
    return this.visitsService.pause(tenantId, id, user, dto);
  }

  @Post(':id/resume')
  @RequirePermission('VISITS', 'EXECUTE')
  resume(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserContext,
    @Body() dto: VisitActionDto,
  ) {
    return this.visitsService.resume(tenantId, id, user, dto);
  }

  @Post(':id/complete')
  @RequirePermission('VISITS', 'EXECUTE')
  complete(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserContext,
    @Body() dto: CompleteVisitDto,
  ) {
    return this.visitsService.complete(tenantId, id, user, dto);
  }

  @Post(':id/abort')
  @RequirePermission('VISITS', 'EXECUTE')
  abort(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserContext,
    @Body() dto: VisitActionDto,
  ) {
    return this.visitsService.abort(tenantId, id, user, dto);
  }

  @Post(':id/cancel')
  @RequirePermission('VISITS', 'UPDATE')
  cancel(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserContext,
    @Body() dto: VisitActionDto,
  ) {
    return this.visitsService.cancel(tenantId, id, user, dto);
  }

  @Post(':id/approve')
  @RequirePermission('VISITS', 'APPROVE')
  approve(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserContext,
    @Body() dto: VisitActionDto,
  ) {
    return this.visitsService.approve(tenantId, id, user, dto);
  }

  @Post(':id/close')
  @RequirePermission('VISITS', 'APPROVE')
  close(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserContext,
    @Body() dto: VisitActionDto,
  ) {
    return this.visitsService.close(tenantId, id, user, dto);
  }

  @Post(':id/reopen')
  @RequirePermission('VISITS', 'APPROVE')
  reopen(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserContext,
    @Body() dto: VisitActionDto,
  ) {
    return this.visitsService.reopen(tenantId, id, user, dto);
  }

  // ----------------------------------------------------------------- notes

  @Post(':id/notes')
  @RequirePermission('VISITS', 'EXECUTE')
  addNote(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserContext,
    @Body() dto: AddVisitNoteDto,
  ) {
    return this.visitsService.addNote(tenantId, id, user, dto);
  }

  @Get(':id/notes')
  @RequirePermission('VISITS', 'READ_OWN')
  getNotes(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.visitsService.getNotes(tenantId, id);
  }
}
