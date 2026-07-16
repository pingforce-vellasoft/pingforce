import { ReportsExportService } from './reports-export.service';

/**
 * CSV export hardening: RFC-4180 quoting plus the CSV/formula-injection
 * guard (CWE-1236) — cells starting with = + - @ tab or CR must never reach
 * Excel/Sheets as live formulas.
 */

function makeService(leadRows: Record<string, unknown>[]) {
  const prisma = {
    lead: { findMany: jest.fn().mockResolvedValue(leadRows) },
    visit: { findMany: jest.fn().mockResolvedValue([]) },
    fault: { findMany: jest.fn().mockResolvedValue([]) },
  };
  const reportsService = {
    resolveReportScope: jest.fn().mockResolvedValue({ kind: 'ALL' }),
    leadScopeWhere: jest.fn().mockReturnValue({}),
    visitScopeWhere: jest.fn().mockReturnValue({}),
    faultScopeWhere: jest.fn().mockReturnValue({}),
    attendanceReport: jest.fn(),
  };
  const auditService = { log: jest.fn().mockResolvedValue(undefined) };
  return new ReportsExportService(
    prisma as unknown as ConstructorParameters<typeof ReportsExportService>[0],
    reportsService as unknown as ConstructorParameters<
      typeof ReportsExportService
    >[1],
    auditService as unknown as ConstructorParameters<
      typeof ReportsExportService
    >[2],
  );
}

const actor = { userId: 'u1', tenantId: 't1' } as never;

describe('ReportsExportService CSV hardening', () => {
  it('neutralizes formula-leading cells with a quote prefix', async () => {
    const service = makeService([
      {
        leadNumber: 'L-1',
        firstName: '=cmd|/C calc!A0',
        lastName: '+SUM(A1:A9)',
        companyName: '-2+3',
        email: '@import',
        mobile: '12345',
        expectedValue: 10,
        convertedAt: null,
        createdAt: new Date('2026-07-01T00:00:00.000Z'),
        pipelineStage: { name: 'New' },
      },
    ]);
    const { csv } = await service.exportCsv('t1', actor, {
      type: 'leads',
    } as never);

    expect(csv).toContain(`'=cmd|/C calc!A0`);
    expect(csv).toContain(`'+SUM(A1:A9)`);
    expect(csv).toContain(`'-2+3`);
    expect(csv).toContain(`'@import`);
    // No raw formula openers at a cell boundary
    for (const line of csv.split('\r\n').slice(1)) {
      for (const cell of line.split(',')) {
        expect(cell).not.toMatch(/^[=+@]/);
      }
    }
  });

  it('quotes cells containing delimiters and escapes quotes (RFC-4180)', async () => {
    const service = makeService([
      {
        leadNumber: 'L-2',
        firstName: 'a,b',
        lastName: 'say "hi"',
        companyName: 'Acme',
        email: null,
        mobile: undefined,
        expectedValue: 0,
        convertedAt: null,
        createdAt: new Date('2026-07-01T00:00:00.000Z'),
        pipelineStage: null,
      },
    ]);
    const { csv } = await service.exportCsv('t1', actor, {
      type: 'leads',
    } as never);

    expect(csv).toContain('"a,b"');
    expect(csv).toContain('"say ""hi"""');
  });

  it('returns headers only when the caller has no data scope', async () => {
    const service = makeService([]);
    const scoped = service as unknown as {
      reportsService: { resolveReportScope: jest.Mock };
    };
    scoped.reportsService.resolveReportScope.mockResolvedValue({
      kind: 'NONE',
    });
    const { csv } = await service.exportCsv('t1', actor, {
      type: 'leads',
    } as never);
    expect(csv.split('\r\n')).toHaveLength(1);
    expect(csv).toContain('leadNumber');
  });
});
