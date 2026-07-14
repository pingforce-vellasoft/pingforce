import { Controller, Get, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../rbac/guards/rbac.guard';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import { CurrentTenant } from '@pingforce-monorepo/shared';
import { AuditService } from './audit.service';

@Controller('audit')
@UseGuards(JwtAuthGuard, RbacGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermission('AUDIT', 'READ')
  async search(
    @CurrentTenant() tenantId: string,
    @Req() req: any,
    @Query('module') module?: string,
    @Query('entityName') entityName?: string,
    @Query('action') action?: string,
    @Query('actorId') actorId?: string,
    @Query('severity') severity?: string,
    @Query('outcome') outcome?: string,
    @Query('requestId') requestId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const result = await this.auditService.search(tenantId, {
      module,
      entityName,
      action,
      actorId,
      severity,
      outcome,
      requestId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });

    // Audit access is itself audited (AuditLogs.md §16)
    void this.auditService.log({
      tenantId,
      actorId: req.user?.userId,
      module: 'AUDIT',
      entityName: 'audit',
      entityId: '-',
      action: 'AUDIT_VIEWED',
      requestId: req.requestId,
      ipAddress: req.ip,
      userAgent: req.headers?.['user-agent'],
    });

    return result;
  }

  @Get(':id')
  @RequirePermission('AUDIT', 'READ')
  async findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.auditService.findById(tenantId, id);
  }
}
