import { Injectable, Inject, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
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
  /** Also search audit_archive (AuditLogs.md §7 — archives stay searchable). */
  readonly includeArchived?: boolean;
}

export interface ChainVerification {
  readonly checked: number;
  readonly valid: boolean;
  /** First sequence whose hash/linkage failed (AUD-006), if any. */
  readonly brokenAtSequence?: string;
  readonly reason?: string;
}

const EXPORT_ROW_CAP = 10_000;
const RETENTION_BATCH = 1_000;

/**
 * Append-only audit trail (AuditLogs.md).
 * Writes must never break the business request — failures are logged and
 * swallowed. There is intentionally no update/delete API on audit records.
 *
 * Integrity (§10): every write is chained per tenant — a gapless sequence
 * plus SHA-256 over (prevHash + canonical payload) — advanced with an
 * optimistic claim on audit_chain_heads inside the same transaction. Under
 * pathological contention the write lands unchained (sequence NULL) rather
 * than being lost. verifyChain() recomputes the chain for tamper detection.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
  ) {}

  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.writeChained(entry);
    } catch (error) {
      this.logger.error(
        `Audit write failed for ${entry.module}/${entry.entityName}:${entry.action}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async writeChained(entry: AuditEntry): Promise<void> {
    const createdAt = new Date();

    for (let attempt = 0; attempt < 3; attempt++) {
      let head = await this.prisma.auditChainHead.findUnique({
        where: { tenantId: entry.tenantId },
      });
      if (!head) {
        try {
          head = await this.prisma.auditChainHead.create({
            data: { tenantId: entry.tenantId },
          });
        } catch {
          continue; // concurrent genesis — re-read on next attempt
        }
      }

      const sequence = head.lastSequence + BigInt(1);
      const prevHash = head.lastHash;
      const chainHash = this.computeHash(entry, sequence, prevHash, createdAt);

      const claimed = await this.prisma.$transaction(async (tx) => {
        const claim = await tx.auditChainHead.updateMany({
          where: {
            tenantId: entry.tenantId,
            lastSequence: head.lastSequence,
          },
          data: { lastSequence: sequence, lastHash: chainHash },
        });
        if (claim.count === 0) return false; // lost the race — retry

        await tx.auditLog.create({
          data: {
            ...this.toRowData(entry),
            sequence,
            prevHash,
            chainHash,
            createdAt,
          },
        });
        return true;
      });
      if (claimed) return;
    }

    // Contention exhausted — write unchained rather than dropping the event
    await this.prisma.auditLog.create({
      data: { ...this.toRowData(entry), createdAt },
    });
  }

  private toRowData(entry: AuditEntry) {
    return {
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
    };
  }

  private computeHash(
    row: {
      tenantId: string;
      actorId?: string | null;
      module?: string | null;
      entityName: string;
      entityId: string;
      action: string;
      outcome?: string | null;
      severity?: string | null;
      oldValue?: unknown;
      newValue?: unknown;
      requestId?: string | null;
    },
    sequence: bigint,
    prevHash: string,
    createdAt: Date,
  ): string {
    const payload = canonicalJson([
      row.tenantId,
      sequence.toString(),
      prevHash,
      row.actorId ?? null,
      row.module ?? null,
      row.entityName,
      row.entityId,
      row.action,
      row.outcome ?? 'SUCCESS',
      row.severity ?? 'INFO',
      row.oldValue ?? null,
      row.newValue ?? null,
      row.requestId ?? null,
      createdAt.toISOString(),
    ]);
    return createHash('sha256').update(payload).digest('hex');
  }

  /**
   * Recomputes the hash chain (§10, AUD-006 tamper detection). Verifies
   * every chained live row: hash matches its stored payload, prevHash links
   * to the previous row, sequence is gapless. Rows archived out of the live
   * table anchor the chain at the first remaining row's stored prevHash.
   */
  async verifyChain(
    tenantId: string,
    limit = 10_000,
  ): Promise<ChainVerification> {
    const rows = await this.prisma.auditLog.findMany({
      where: { tenantId, sequence: { not: null } },
      orderBy: { sequence: 'asc' },
      take: Math.min(limit, 50_000),
    });

    let previous: (typeof rows)[number] | null = null;
    for (const row of rows) {
      const recomputed = this.computeHash(
        row,
        row.sequence as bigint,
        row.prevHash ?? 'GENESIS',
        row.createdAt,
      );
      if (recomputed !== row.chainHash) {
        return {
          checked: rows.length,
          valid: false,
          brokenAtSequence: String(row.sequence),
          reason: 'Hash mismatch — record content altered',
        };
      }
      if (previous) {
        if (
          (row.sequence as bigint) !==
          (previous.sequence as bigint) + BigInt(1)
        ) {
          return {
            checked: rows.length,
            valid: false,
            brokenAtSequence: String(row.sequence),
            reason: 'Sequence gap — record(s) missing',
          };
        }
        if (row.prevHash !== previous.chainHash) {
          return {
            checked: rows.length,
            valid: false,
            brokenAtSequence: String(row.sequence),
            reason: 'Broken linkage — prevHash does not match prior record',
          };
        }
      }
      previous = row;
    }
    return { checked: rows.length, valid: true };
  }

  async search(tenantId: string, filters: AuditSearchFilters) {
    const take = Math.min(filters.take ?? 50, 200);
    const skip = filters.skip ?? 0;
    const where = this.buildWhere(tenantId, filters);

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    if (!filters.includeArchived) {
      return { data, total, skip, take };
    }

    // Archived logs remain searchable (§7) — same filters over audit_archive
    const [archived, archivedTotal] = await Promise.all([
      this.prisma.auditArchive.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.auditArchive.count({ where }),
    ]);
    return { data, total, archived, archivedTotal, skip, take };
  }

  private buildWhere(tenantId: string, filters: AuditSearchFilters) {
    return {
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
  }

  async findById(tenantId: string, id: string) {
    const live = await this.prisma.auditLog.findFirst({
      where: { id, tenantId },
    });
    if (live) return live;
    return this.prisma.auditArchive.findFirst({ where: { id, tenantId } });
  }

  // ── Export (§13/§16) ───────────────────────────────────────────────────────

  /**
   * CSV export of the filtered trail (live + archive when requested).
   * Capped at 10k rows; recorded in audit_exports and audited (§16).
   */
  async exportCsv(
    tenantId: string,
    actorUserId: string | undefined,
    filters: AuditSearchFilters,
  ): Promise<{ filename: string; csv: string; rowCount: number }> {
    const where = this.buildWhere(tenantId, filters);
    const rows = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: EXPORT_ROW_CAP,
    });
    const archivedRows = filters.includeArchived
      ? await this.prisma.auditArchive.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: Math.max(EXPORT_ROW_CAP - rows.length, 0),
        })
      : [];

    const headers = [
      'id',
      'createdAt',
      'module',
      'entityName',
      'entityId',
      'action',
      'outcome',
      'severity',
      'actorId',
      'requestId',
      'ipAddress',
      'sequence',
      'chainHash',
    ];
    const toRecord = (row: (typeof rows)[number]) => ({
      id: row.id,
      createdAt: row.createdAt,
      module: row.module,
      entityName: row.entityName,
      entityId: row.entityId,
      action: row.action,
      outcome: row.outcome,
      severity: row.severity,
      actorId: row.actorId,
      requestId: row.requestId,
      ipAddress: row.ipAddress,
      sequence: row.sequence === null ? '' : String(row.sequence),
      chainHash: row.chainHash,
    });
    const csv = toCsv(headers, [
      ...rows.map(toRecord),
      ...archivedRows.map(toRecord),
    ]);
    const rowCount = rows.length + archivedRows.length;

    await this.prisma.auditExport.create({
      data: {
        tenantId,
        requestedBy: actorUserId,
        filters: filters as never,
        rowCount,
      },
    });
    void this.log({
      tenantId,
      actorId: actorUserId,
      module: 'AUDIT',
      entityName: 'audit',
      entityId: '-',
      action: 'AUDIT_EXPORTED',
      severity: 'MEDIUM',
      newValue: { rowCount },
    });

    const stamp = new Date().toISOString().slice(0, 10);
    return { filename: `audit-${stamp}.csv`, csv, rowCount };
  }

  // ── Retention & archive (§7/§12) ──────────────────────────────────────────

  async getRetentionPolicy(tenantId: string) {
    return this.prisma.auditRetentionPolicy.findUnique({ where: { tenantId } });
  }

  async setRetentionPolicy(
    tenantId: string,
    actorUserId: string,
    retentionDays: number,
    archiveAfterDays: number,
  ) {
    const policy = await this.prisma.auditRetentionPolicy.upsert({
      where: { tenantId },
      create: {
        tenantId,
        retentionDays,
        archiveAfterDays,
        updatedBy: actorUserId,
      },
      update: { retentionDays, archiveAfterDays, updatedBy: actorUserId },
    });
    void this.log({
      tenantId,
      actorId: actorUserId,
      module: 'AUDIT',
      entityName: 'audit_retention_policy',
      entityId: policy.id,
      action: 'RETENTION_UPDATED',
      severity: 'MEDIUM',
      newValue: { retentionDays, archiveAfterDays },
    });
    return policy;
  }

  /**
   * Moves live rows past archiveAfterDays into audit_archive and purges
   * archived rows past retentionDays. Batched; tenants without a policy are
   * untouched (retention is opt-in per tenant, §7).
   */
  async runRetention(): Promise<{ archived: number; purged: number }> {
    const policies = await this.prisma.auditRetentionPolicy.findMany();
    let archived = 0;
    let purged = 0;

    for (const policy of policies) {
      const archiveCutoff = new Date(
        Date.now() - policy.archiveAfterDays * 86_400_000,
      );
      // Bounded batches so one tenant's backlog can't hold connections
      for (let batch = 0; batch < 20; batch++) {
        const rows = await this.prisma.auditLog.findMany({
          where: {
            tenantId: policy.tenantId,
            createdAt: { lt: archiveCutoff },
          },
          take: RETENTION_BATCH,
        });
        if (rows.length === 0) break;

        await this.prisma.$transaction([
          this.prisma.auditArchive.createMany({
            data: rows.map((r) => ({
              id: r.id,
              tenantId: r.tenantId,
              actorId: r.actorId,
              module: r.module,
              entityName: r.entityName,
              entityId: r.entityId,
              action: r.action,
              outcome: r.outcome,
              severity: r.severity,
              oldValue: r.oldValue as never,
              newValue: r.newValue as never,
              requestId: r.requestId,
              ipAddress: r.ipAddress,
              userAgent: r.userAgent,
              deviceId: r.deviceId,
              sequence: r.sequence,
              prevHash: r.prevHash,
              chainHash: r.chainHash,
              createdAt: r.createdAt,
            })),
            skipDuplicates: true,
          }),
          this.prisma.auditLog.deleteMany({
            where: { id: { in: rows.map((r) => r.id) } },
          }),
        ]);
        archived += rows.length;
        if (rows.length < RETENTION_BATCH) break;
      }

      const purgeCutoff = new Date(
        Date.now() - policy.retentionDays * 86_400_000,
      );
      const { count } = await this.prisma.auditArchive.deleteMany({
        where: { tenantId: policy.tenantId, createdAt: { lt: purgeCutoff } },
      });
      purged += count;

      if (archived > 0 || purged > 0) {
        void this.log({
          tenantId: policy.tenantId,
          module: 'AUDIT',
          entityName: 'audit',
          entityId: '-',
          action: 'ARCHIVE_CREATED',
          newValue: { archived, purged },
        });
      }
    }
    return { archived, purged };
  }
}

/** Deterministic JSON — object keys sorted recursively so hashes recompute
 *  identically after a jsonb round-trip (Postgres does not preserve order). */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`);
  return `{${entries.join(',')}}`;
}

/** RFC-4180 CSV with the formula-injection guard (CWE-1236). */
function toCsv(
  headers: readonly string[],
  rows: readonly Record<string, unknown>[],
): string {
  const escape = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    let str = value instanceof Date ? value.toISOString() : String(value);
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`;
    }
    return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(','));
  }
  return lines.join('\r\n');
}
