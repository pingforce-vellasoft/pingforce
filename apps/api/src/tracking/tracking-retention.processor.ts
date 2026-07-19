import { Process, Processor, InjectQueue } from '@nestjs/bull';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bull';
import { ExtendedPrismaClient } from '../prisma/prisma.module';
import { consolidateDay } from './domain/consolidate';

// All tracking maintenance runs once a day, off-peak.
const DAILY_MS = 24 * 60 * 60 * 1000;

// Raw breadcrumb pings are detail-level: kept only long enough for recent trail
// replay, then consolidated away. Summaries are the long-term record.
const RAW_RETENTION_DAYS = Number(process.env.TRACKING_RAW_RETENTION_DAYS ?? 7);
const SUMMARY_RETENTION_DAYS = Number(
  process.env.TRACKING_SUMMARY_RETENTION_DAYS ?? 90,
);

// Chunked deletes so a big backlog never locks a table in one statement.
const DELETE_BATCH = 10_000;
const MAX_BATCHES_PER_RUN = 200;
// Per consolidation run, cap employees processed so one run can't run away on a
// huge tenant; the daily cadence catches up over subsequent runs.
const MAX_EMPLOYEES_PER_RUN = 5000;

interface EmployeeDayRow {
  tenantId: string;
  employeeId: string;
}

/**
 * Nightly tracking maintenance:
 *  1. consolidate — collapse yesterday's raw pings per employee into ONE
 *     daily_location_summaries row (field-time + top dwell places).
 *  2. purge raw — delete breadcrumb pings older than RAW_RETENTION_DAYS (7d).
 *  3. purge summaries — delete daily summaries older than SUMMARY_RETENTION_DAYS
 *     (90d); nothing here is permanent.
 * The live current-position table is left untouched (it self-overwrites).
 */
@Injectable()
@Processor('tracking-retention')
export class TrackingRetentionProcessor implements OnModuleInit {
  private readonly logger = new Logger(TrackingRetentionProcessor.name);

  constructor(
    @Inject('IPrismaService') private readonly prisma: ExtendedPrismaClient,
    @InjectQueue('tracking-retention') private readonly queue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    // Idempotent: same jobId replaces any previous repeatable registration.
    // Consolidation runs first (before the raw purge in the same job body).
    await this.queue.add(
      'nightly-maintenance',
      {},
      {
        jobId: 'tracking-nightly-maintenance',
        repeat: { every: DAILY_MS },
        removeOnComplete: true,
        removeOnFail: 10,
      },
    );
    this.logger.log(
      `Tracking maintenance scheduled daily ` +
        `(consolidate; keep raw ${RAW_RETENTION_DAYS}d, summaries ${SUMMARY_RETENTION_DAYS}d)`,
    );
  }

  @Process('nightly-maintenance')
  async runMaintenance(): Promise<void> {
    await this.consolidateYesterday();
    await this.purgeRawPings();
    await this.purgeOldSummaries();
  }

  /** Build a daily summary per employee who had pings the previous day. */
  private async consolidateYesterday(): Promise<void> {
    const { start, end, day } = yesterdayBounds();

    // Distinct employees with any ping yesterday — small key set, not the pings.
    const rows = await this.prisma.$queryRaw<EmployeeDayRow[]>`
      SELECT DISTINCT "tenantId", "employeeId"
      FROM "employee_locations"
      WHERE "capturedAt" >= ${start} AND "capturedAt" < ${end}
      LIMIT ${MAX_EMPLOYEES_PER_RUN}
    `;

    let written = 0;
    for (const { tenantId, employeeId } of rows) {
      const points = await this.prisma.employeeLocation.findMany({
        where: {
          employeeId,
          capturedAt: { gte: start, lt: end },
        },
        select: { latitude: true, longitude: true, capturedAt: true },
        orderBy: { capturedAt: 'asc' },
      });

      const summary = consolidateDay(points);
      if (!summary) continue;

      // Idempotent: re-running the job for the same day overwrites the row.
      await this.prisma.dailyLocationSummary.upsert({
        where: { employeeId_day: { employeeId, day } },
        create: {
          tenantId,
          employeeId,
          day,
          minutesInField: summary.minutesInField,
          firstFixAt: summary.firstFixAt,
          lastFixAt: summary.lastFixAt,
          pointCount: summary.pointCount,
          topPlaces: summary.topPlaces,
        },
        update: {
          minutesInField: summary.minutesInField,
          firstFixAt: summary.firstFixAt,
          lastFixAt: summary.lastFixAt,
          pointCount: summary.pointCount,
          topPlaces: summary.topPlaces,
        },
      });
      written += 1;
    }

    if (written > 0) {
      this.logger.log(
        `Tracking consolidation: wrote ${written} daily summary row(s) for ${day
          .toISOString()
          .slice(0, 10)}`,
      );
    }
  }

  private async purgeRawPings(): Promise<void> {
    const cutoff = daysAgo(RAW_RETENTION_DAYS);
    let total = 0;
    for (let i = 0; i < MAX_BATCHES_PER_RUN; i++) {
      const deleted = await this.prisma.$executeRaw`
        DELETE FROM "employee_locations"
        WHERE "id" IN (
          SELECT "id" FROM "employee_locations"
          WHERE "capturedAt" < ${cutoff}
          LIMIT ${DELETE_BATCH}
        )
      `;
      total += deleted;
      if (deleted < DELETE_BATCH) break;
    }
    if (total > 0) {
      this.logger.log(
        `Tracking retention: purged ${total} raw ping(s) older than ${cutoff.toISOString()}`,
      );
    }
  }

  private async purgeOldSummaries(): Promise<void> {
    const cutoff = daysAgo(SUMMARY_RETENTION_DAYS);
    const { count } = await this.prisma.dailyLocationSummary.deleteMany({
      where: { day: { lt: cutoff } },
    });
    if (count > 0) {
      this.logger.log(
        `Tracking retention: purged ${count} daily summary row(s) older than ${cutoff
          .toISOString()
          .slice(0, 10)}`,
      );
    }
  }
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * DAILY_MS);
}

/** UTC bounds of the previous calendar day plus its midnight date. */
function yesterdayBounds(): { start: Date; end: Date; day: Date } {
  const now = new Date();
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const start = new Date(end.getTime() - DAILY_MS);
  return { start, end, day: start };
}
