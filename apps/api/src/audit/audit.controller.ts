import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
  Body,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../rbac/guards/rbac.guard';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import { CurrentTenant } from '@pingforce-monorepo/shared';
import { AuditService, AuditSearchFilters } from './audit.service';
import { UpdateRetentionPolicyDto } from './dto/update-retention-policy.dto';

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
    @Query('includeArchived') includeArchived?: string,
  ) {
    const result = await this.auditService.search(
      tenantId,
      this.toFilters({
        module,
        entityName,
        action,
        actorId,
        severity,
        outcome,
        requestId,
        from,
        to,
        skip,
        take,
        includeArchived,
      }),
    );

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

  /** CSV export of the filtered trail (AuditLogs.md §13, AUDIT:EXPORT). */
  @Get('export')
  @RequirePermission('AUDIT', 'EXPORT')
  async export(
    @CurrentTenant() tenantId: string,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
    @Query('module') module?: string,
    @Query('entityName') entityName?: string,
    @Query('action') action?: string,
    @Query('actorId') actorId?: string,
    @Query('severity') severity?: string,
    @Query('outcome') outcome?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('includeArchived') includeArchived?: string,
  ): Promise<string> {
    const { filename, csv } = await this.auditService.exportCsv(
      tenantId,
      req.user?.userId,
      this.toFilters({
        module,
        entityName,
        action,
        actorId,
        severity,
        outcome,
        from,
        to,
        includeArchived,
      }),
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return csv;
  }

  /** Hash-chain tamper check (AuditLogs.md §10, AUD-006). */
  @Get('integrity')
  @RequirePermission('AUDIT', 'READ')
  async integrity(
    @CurrentTenant() tenantId: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.verifyChain(
      tenantId,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Get('retention')
  @RequirePermission('AUDIT', 'MANAGE')
  async getRetention(@CurrentTenant() tenantId: string) {
    return (
      (await this.auditService.getRetentionPolicy(tenantId)) ?? {
        tenantId,
        configured: false,
      }
    );
  }

  @Put('retention')
  @RequirePermission('AUDIT', 'MANAGE')
  async setRetention(
    @CurrentTenant() tenantId: string,
    @Req() req: any,
    @Body() dto: UpdateRetentionPolicyDto,
  ) {
    if (dto.archiveAfterDays >= dto.retentionDays) {
      throw new BadRequestException(
        'archiveAfterDays must be less than retentionDays',
      );
    }
    return this.auditService.setRetentionPolicy(
      tenantId,
      req.user?.userId,
      dto.retentionDays,
      dto.archiveAfterDays,
    );
  }

  @Get(':id')
  @RequirePermission('AUDIT', 'READ')
  async findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.auditService.findById(tenantId, id);
  }

  private toFilters(
    q: Partial<Record<string, string>>,
  ): AuditSearchFilters {
    return {
      module: q.module,
      entityName: q.entityName,
      action: q.action,
      actorId: q.actorId,
      severity: q.severity,
      outcome: q.outcome,
      requestId: q.requestId,
      from: q.from ? new Date(q.from) : undefined,
      to: q.to ? new Date(q.to) : undefined,
      skip: q.skip ? parseInt(q.skip, 10) : undefined,
      take: q.take ? parseInt(q.take, 10) : undefined,
      includeArchived: q.includeArchived === 'true',
    };
  }
}
