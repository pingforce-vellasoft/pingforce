import { Prisma } from '@prisma/client';
import { IPrismaService } from '@pingforce-monorepo/shared';
import {
  LeaveRepository,
  LeaveTransactionRepository,
} from './leave.repository';

describe('Leave repository transactions', () => {
  it('uses serializable isolation and bounded timeout', async () => {
    const prisma = {
      $transaction: jest.fn().mockImplementation(async (work) => work({})),
    };
    const repo = new LeaveRepository(prisma as unknown as IPrismaService);
    expect(await repo.transaction(async () => 'done')).toBe('done');
    expect(prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        isolationLevel: 'Serializable',
        timeout: 15000,
      }),
    );
  });
  it('retries a serialization failure, but never endlessly', async () => {
    const conflict = new Prisma.PrismaClientKnownRequestError('Conflict', {
      code: 'P2034',
      clientVersion: '7',
    });
    const prisma = { $transaction: jest.fn().mockRejectedValue(conflict) };
    const repo = new LeaveRepository(prisma as unknown as IPrismaService);
    await expect(repo.transaction(async () => undefined)).rejects.toBe(
      conflict,
    );
    expect(prisma.$transaction).toHaveBeenCalledTimes(3);
  });
  it('does not retry a business validation failure', async () => {
    const error = new Error('Insufficient balance');
    const prisma = { $transaction: jest.fn().mockRejectedValue(error) };
    await expect(
      new LeaveRepository(prisma as unknown as IPrismaService).transaction(
        async () => undefined,
      ),
    ).rejects.toBe(error);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
  it('cannot override tenant and deletion filters in list queries', async () => {
    const client = {
      leaveRequest: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const repo = new LeaveTransactionRepository(
      client as unknown as Prisma.TransactionClient,
    );
    await repo.list('t1', { tenantId: 't2' }, 0, 25);
    expect(client.leaveRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [{ tenantId: 't1', deletedAt: null }, { tenantId: 't2' }],
        },
      }),
    );
  });
  it('uses tenant-scoped compare-and-set for a state transition', async () => {
    const client = {
      leaveRequest: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    };
    const repo = new LeaveTransactionRepository(
      client as unknown as Prisma.TransactionClient,
    );
    await repo.update('t1', 'r1', 'PENDING', { status: 'APPROVED' });
    expect(client.leaveRequest.updateMany).toHaveBeenCalledWith({
      where: { tenantId: 't1', id: 'r1', status: 'PENDING', deletedAt: null },
      data: { status: 'APPROVED' },
    });
  });
});
