import { AuditService, AuditEntry, canonicalJson } from './audit.service';

/**
 * Audit hardening (AuditLogs.md §10): chained writes carry a gapless
 * per-tenant sequence + SHA-256 linkage, verifyChain detects tampering,
 * and the CSV export applies the formula-injection guard (CWE-1236).
 */

interface StoredRow {
  id: string;
  tenantId: string;
  actorId: string | null;
  module: string | null;
  entityName: string;
  entityId: string;
  action: string;
  outcome: string;
  severity: string;
  oldValue: unknown;
  newValue: unknown;
  requestId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  deviceId: string | null;
  sequence: bigint | null;
  prevHash: string | null;
  chainHash: string | null;
  createdAt: Date;
}

/** Minimal in-memory prisma double for the chain head + audit rows. */
function makeService() {
  let head: {
    tenantId: string;
    lastSequence: bigint;
    lastHash: string;
  } | null = null;
  const rows: StoredRow[] = [];
  let nextId = 1;

  const client = {
    auditChainHead: {
      findUnique: jest
        .fn()
        .mockImplementation(() => Promise.resolve(head ? { ...head } : null)),
      create: jest.fn().mockImplementation(({ data }) => {
        head = {
          tenantId: data.tenantId,
          lastSequence: BigInt(0),
          lastHash: 'GENESIS',
        };
        return Promise.resolve({ ...head });
      }),
      updateMany: jest.fn().mockImplementation(({ where, data }) => {
        if (head && head.lastSequence === where.lastSequence) {
          head = {
            ...head,
            lastSequence: data.lastSequence,
            lastHash: data.lastHash,
          };
          return Promise.resolve({ count: 1 });
        }
        return Promise.resolve({ count: 0 });
      }),
    },
    auditLog: {
      create: jest.fn().mockImplementation(({ data }) => {
        const row: StoredRow = {
          id: `a${nextId++}`,
          actorId: null,
          module: null,
          requestId: null,
          ipAddress: null,
          userAgent: null,
          deviceId: null,
          oldValue: null,
          newValue: null,
          sequence: null,
          prevHash: null,
          chainHash: null,
          ...data,
        };
        rows.push(row);
        return Promise.resolve(row);
      }),
      findMany: jest
        .fn()
        .mockImplementation(() =>
          Promise.resolve(
            rows
              .filter((r) => r.sequence !== null)
              .sort((a, b) => Number((a.sequence ?? 0n) - (b.sequence ?? 0n))),
          ),
        ),
    },
    $transaction: jest.fn().mockImplementation((fn) => fn(client)),
  };

  const service = new AuditService(
    client as unknown as ConstructorParameters<typeof AuditService>[0],
  );
  return { service, rows, client };
}

const entry: AuditEntry = {
  tenantId: 't1',
  actorId: 'u1',
  module: 'LEAVES',
  entityName: 'leave_request',
  entityId: 'lr1',
  action: 'WORKFLOW_APPROVED',
  newValue: { decision: 'APPROVED', b: 1, a: 2 },
};

describe('AuditService hash chain (AuditLogs.md §10)', () => {
  it('chains writes with gapless sequences and linked hashes', async () => {
    const { service, rows } = makeService();
    await service.log(entry);
    await service.log({ ...entry, entityId: 'lr2' });
    await service.log({ ...entry, entityId: 'lr3' });

    expect(rows.map((r) => r.sequence)).toEqual([
      BigInt(1),
      BigInt(2),
      BigInt(3),
    ]);
    expect(rows[0].prevHash).toBe('GENESIS');
    expect(rows[1].prevHash).toBe(rows[0].chainHash);
    expect(rows[2].prevHash).toBe(rows[1].chainHash);
  });

  it('verifyChain passes on an untampered chain', async () => {
    const { service } = makeService();
    await service.log(entry);
    await service.log({ ...entry, entityId: 'lr2' });

    const verification = await service.verifyChain('t1');
    expect(verification).toEqual({ checked: 2, valid: true });
  });

  it('verifyChain flags altered record content (AUD-006)', async () => {
    const { service, rows } = makeService();
    await service.log(entry);
    await service.log({ ...entry, entityId: 'lr2' });

    rows[0].action = 'WORKFLOW_REJECTED'; // tamper

    const verification = await service.verifyChain('t1');
    expect(verification.valid).toBe(false);
    expect(verification.brokenAtSequence).toBe('1');
    expect(verification.reason).toContain('Hash mismatch');
  });

  it('verifyChain flags broken linkage between records', async () => {
    const { service, rows } = makeService();
    await service.log(entry);
    await service.log({ ...entry, entityId: 'lr2' });

    rows[1].prevHash = 'forged'; // splice attempt

    const verification = await service.verifyChain('t1');
    expect(verification.valid).toBe(false);
    expect(verification.brokenAtSequence).toBe('2');
  });

  it('json key order does not affect the recomputed hash (jsonb round-trip)', async () => {
    const { service, rows } = makeService();
    await service.log(entry);

    // Simulate Postgres jsonb returning keys in a different order
    rows[0].newValue = { a: 2, b: 1, decision: 'APPROVED' };

    const verification = await service.verifyChain('t1');
    expect(verification.valid).toBe(true);
  });
});

describe('canonicalJson', () => {
  it('sorts object keys recursively and drops undefined members', () => {
    expect(canonicalJson({ b: { d: 1, c: 2 }, a: 3, skip: undefined })).toBe(
      '{"a":3,"b":{"c":2,"d":1}}',
    );
  });

  it('preserves array order', () => {
    expect(canonicalJson([3, 1, { b: 1, a: 2 }])).toBe('[3,1,{"a":2,"b":1}]');
  });
});

describe('AuditService.exportCsv (AuditLogs.md §13/§16)', () => {
  it('exports rows, records the export and neutralizes formula openers', async () => {
    const exportCreate = jest.fn().mockResolvedValue({});
    const client = {
      auditLog: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'a1',
            createdAt: new Date('2026-07-16T00:00:00.000Z'),
            module: 'LEAVES',
            entityName: 'leave_request',
            entityId: '=cmd|/C calc!A0',
            action: 'WORKFLOW_APPROVED',
            outcome: 'SUCCESS',
            severity: 'INFO',
            actorId: 'u1',
            requestId: null,
            ipAddress: null,
            sequence: BigInt(1),
            chainHash: 'abc',
          },
        ]),
        create: jest.fn().mockResolvedValue({}),
      },
      auditExport: { create: exportCreate },
      auditChainHead: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          tenantId: 't1',
          lastSequence: BigInt(0),
          lastHash: 'GENESIS',
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      $transaction: jest.fn().mockImplementation((fn) => fn(client)),
    };
    const service = new AuditService(
      client as unknown as ConstructorParameters<typeof AuditService>[0],
    );

    const { csv, rowCount } = await service.exportCsv('t1', 'u1', {});
    expect(rowCount).toBe(1);
    expect(csv).toContain(`'=cmd|/C calc!A0`);
    expect(exportCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tenantId: 't1', rowCount: 1 }),
      }),
    );
  });
});
