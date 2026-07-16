import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../rbac/guards/rbac.guard';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import {
  CurrentTenant,
  CurrentUser,
  CurrentUserContext,
} from '@pingforce-monorepo/shared';
import { ReportsService } from './reports.service';
import { ReportsExportService } from './reports-export.service';
import { ReportQueryDto, ExportQueryDto } from './dto/report-query.dto';

/** Reports & analytics API (3.5_ReportsAnalytics/API.md §6, §8, §9, §12). */
@UseGuards(JwtAuthGuard, RbacGuard)
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly reportsExportService: ReportsExportService,
  ) {}

  @Get('attendance')
  @RequirePermission('REPORTS', 'READ')
  attendance(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: CurrentUserContext,
    @Query() query: ReportQueryDto,
  ) {
    return this.reportsService.attendanceReport(tenantId, user.userId, query);
  }

  @Get('visits')
  @RequirePermission('REPORTS', 'READ')
  visits(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: CurrentUserContext,
    @Query() query: ReportQueryDto,
  ) {
    return this.reportsService.visitsReport(tenantId, user.userId, query);
  }

  @Get('faults')
  @RequirePermission('REPORTS', 'READ')
  faults(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: CurrentUserContext,
    @Query() query: ReportQueryDto,
  ) {
    return this.reportsService.faultsReport(tenantId, user.userId, query);
  }

  @Get('leads')
  @RequirePermission('REPORTS', 'READ')
  leads(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: CurrentUserContext,
    @Query() query: ReportQueryDto,
  ) {
    return this.reportsService.leadsReport(tenantId, user.userId, query);
  }

  @Get('kpis')
  @RequirePermission('REPORTS', 'READ')
  kpis(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: CurrentUserContext,
  ) {
    return this.reportsService.kpiSummary(tenantId, user.userId);
  }

  @Get('export')
  @RequirePermission('REPORTS', 'EXPORT')
  async export(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: CurrentUserContext,
    @Query() query: ExportQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<string> {
    const { filename, csv } = await this.reportsExportService.exportCsv(
      tenantId,
      user,
      query,
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return csv;
  }
}
