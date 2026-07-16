import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../rbac/guards/rbac.guard';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import { CurrentTenant } from '@pingforce-monorepo/shared';
import { WorkflowsService } from './workflows.service';
import { WorkflowEngineService } from './workflow-engine.service';
import {
  CreateWorkflowDto,
  UpdateWorkflowDto,
} from './dto/create-workflow.dto';
import { CreateDelegationDto } from './dto/create-delegation.dto';

interface AuthRequest {
  user: { userId: string; tenantId: string };
}

/** REST surface of ApprovalWorkflow.md §17. */
@Controller('workflows')
@UseGuards(JwtAuthGuard, RbacGuard)
export class WorkflowsController {
  constructor(
    private readonly workflowsService: WorkflowsService,
    private readonly workflowEngine: WorkflowEngineService,
  ) {}

  // ── Delegations (§13) — static segments before ':id' ─────────────────────

  @Get('delegations')
  @RequirePermission('WORKFLOWS', 'READ')
  async listDelegations(@CurrentTenant() tenantId: string) {
    return this.workflowsService.listDelegations(tenantId);
  }

  @Post('delegations')
  @RequirePermission('WORKFLOWS', 'MANAGE')
  async createDelegation(
    @CurrentTenant() tenantId: string,
    @Req() req: AuthRequest,
    @Body() dto: CreateDelegationDto,
  ) {
    return this.workflowsService.createDelegation(
      tenantId,
      req.user.userId,
      dto,
    );
  }

  @Delete('delegations/:id')
  @RequirePermission('WORKFLOWS', 'MANAGE')
  async revokeDelegation(
    @CurrentTenant() tenantId: string,
    @Req() req: AuthRequest,
    @Param('id') id: string,
  ) {
    return this.workflowsService.revokeDelegation(
      tenantId,
      id,
      req.user.userId,
    );
  }

  // ── Instances (§17) ───────────────────────────────────────────────────────

  @Get('instances/:id/history')
  @RequirePermission('WORKFLOWS', 'READ')
  async instanceHistory(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    const history = await this.workflowEngine.getHistory(tenantId, id);
    if (!history) {
      throw new NotFoundException('Workflow instance not found');
    }
    return history;
  }

  // ── Definitions (§7/§17) ──────────────────────────────────────────────────

  @Get()
  @RequirePermission('WORKFLOWS', 'READ')
  async list(@CurrentTenant() tenantId: string) {
    return this.workflowsService.list(tenantId);
  }

  @Get(':id')
  @RequirePermission('WORKFLOWS', 'READ')
  async findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.workflowsService.findOne(tenantId, id);
  }

  @Post()
  @RequirePermission('WORKFLOWS', 'MANAGE')
  async create(
    @CurrentTenant() tenantId: string,
    @Req() req: AuthRequest,
    @Body() dto: CreateWorkflowDto,
  ) {
    return this.workflowsService.create(tenantId, req.user.userId, dto);
  }

  @Put(':id')
  @RequirePermission('WORKFLOWS', 'MANAGE')
  async update(
    @CurrentTenant() tenantId: string,
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: UpdateWorkflowDto,
  ) {
    return this.workflowsService.update(tenantId, id, req.user.userId, dto);
  }

  @Post(':id/activate')
  @RequirePermission('WORKFLOWS', 'MANAGE')
  async activate(
    @CurrentTenant() tenantId: string,
    @Req() req: AuthRequest,
    @Param('id') id: string,
  ) {
    return this.workflowsService.setActive(tenantId, id, req.user.userId, true);
  }

  @Post(':id/deactivate')
  @RequirePermission('WORKFLOWS', 'MANAGE')
  async deactivate(
    @CurrentTenant() tenantId: string,
    @Req() req: AuthRequest,
    @Param('id') id: string,
  ) {
    return this.workflowsService.setActive(
      tenantId,
      id,
      req.user.userId,
      false,
    );
  }

  @Delete(':id')
  @RequirePermission('WORKFLOWS', 'MANAGE')
  async remove(
    @CurrentTenant() tenantId: string,
    @Req() req: AuthRequest,
    @Param('id') id: string,
  ) {
    return this.workflowsService.remove(tenantId, id, req.user.userId);
  }
}
