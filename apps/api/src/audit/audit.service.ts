import { Injectable, Inject, Logger } from '@nestjs/common';
import { IPrismaService } from '@pingforce-monorepo/shared';

export interface AuditEntry {
  readonly tenantId: string;
  readonly actorId?: string;
  readonly module?: string;
  readonly entityName: string;
  readonly entityId: string;
  readonly action: string;
  readonly outcome?: 'SUCCESS' | 'FAILURE';
  readonly severity?: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly oldValue?: unknown;
  readonly newValue?: unknown;
  readonly requestId?: string;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly deviceId?: string;
}

export interface AuditSearchFilters {
  readonly module?: string;
  readonly entityName?: string;
  readonly action?: string;
  readonly actorId?: string;
  readonly severity?: string;
  readonly outcome?: string;
  readonly requestId?: string;
  readonly from?: Date;
  readonly to?: Date;
  readonly skip?: number;
  readonly take?: number;
}

/**
 * Append-only audit trail (AuditLogs.md).
 * Writes must never break the business request — failures are logged and
 * swallowed. There is intentionally no update/delete API on audit records.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
  ) {}

  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId: entry.tenantId,
          actorId: entry.actorId,
          module: entry.module,
          entityName: entry.entityName,
          entityId: entry.entityId,
          action: entry.action,
          outcome: entry.outcome ?? 'SUCCESS',
          severity: entry.severity ?? 'INFO',
          oldValue: entry.oldValue as never,
          newValue: entry.newValue as never,
          requestId: entry.requestId,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          deviceId: entry.deviceId,
        },
      });
    } catch (error) {
      this.logger.error(
        `Audit write failed for ${entry.module}/${entry.entityName}:${entry.action}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async search(tenantId: string, filters: AuditSearchFilters) {
    const take = Math.min(filters.take ?? 50, 200);
    const skip = filters.skip ?? 0;

    const where = {
      tenantId,
      ...(filters.module && { module: filters.module }),
      ...(filters.entityName && { entityName: filters.entityName }),
      ...(filters.action && { action: filters.action }),
      ...(filters.actorId && { actorId: filters.actorId }),
      ...(filters.severity && { severity: filters.severity }),
      ...(filters.outcome && { outcome: filters.outcome }),
      ...(filters.requestId && { requestId: filters.requestId }),
      ...((filters.from || filters.to) && {
        createdAt: {
          ...(filters.from && { gte: filters.from }),
          ...(filters.to && { lte: filters.to }),
        },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total, skip, take };
  }

  async findById(tenantId: string, id: string) {
    return this.prisma.auditLog.findFirst({ where: { id, tenantId } });
  }
}
