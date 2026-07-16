import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AuditService } from './audit.service';

/**
 * Nightly retention sweep (AuditLogs.md §7/§12): archives live rows past
 * each tenant's archiveAfterDays and purges archived rows past
 * retentionDays. Tenants without a policy row are untouched.
 */
@Injectable()
export class AuditRetentionService {
  private readonly logger = new Logger(AuditRetentionService.name);

  constructor(private readonly auditService: AuditService) {}

  @Cron('30 1 * * *', { name: 'audit-retention-sweep' })
  async sweep(): Promise<void> {
    try {
      const { archived, purged } = await this.auditService.runRetention();
      if (archived > 0 || purged > 0) {
        this.logger.log(
          `Audit retention: archived ${archived}, purged ${purged}`,
        );
      }
    } catch (error) {
      this.logger.error(
        'Audit retention sweep failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
