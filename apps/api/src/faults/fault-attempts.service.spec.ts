import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { FaultAttemptsService } from './fault-attempts.service';
import { FaultAccessService } from './fault-access.service';
import { CreateFaultAttemptDto } from './dto/create-fault-attempt.dto';

const TENANT = 'tenant-1';
const FAULT = 'fault-1';
const USER = 'user-1';

function uniqueError(field: string): Error & { code: string; meta: object } {
  return Object.assign(new Error('Unique constraint failed'), {
    code: 'P2002',
    meta: { target: ['faultId', field] },
  });
}

describe('FaultAttemptsService', () => {
  let prisma: {
    fault: { findFirst: jest.Mock };
    faultAttempt: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
    };
    faultTimeline: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let access: { scopeForAction: jest.Mock };
  let service: FaultAttemptsService;

  const dto = (
    overrides: Partial<CreateFaultAttemptDto> = {},
  ): CreateFaultAttemptDto => ({
    attemptType: 'INITIAL_VISIT',
    outcome: 'REVISIT_REQUIRED',
    startedAt: new Date(Date.now() - 60 * 60_000).toISOString(),
    ...overrides,
  });

  beforeEach(() => {
    prisma = {
      fault: {
        findFirst: jest.fn().mockResolvedValue({
          id: FAULT,
          status: 'IN_PROGRESS',
        }),
      },
      faultAttempt: {
        // first call (inside tx) = last attempt; null = none yet
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(({ data }) =>
          Promise.resolve({ id: 'attempt-1', ...data }),
        ),
      },
      faultTimeline: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn((fn) => fn(prisma)),
    };
    access = {
      scopeForAction: jest.fn().mockResolvedValue({ assignedToId: USER }),
    };
    service = new FaultAttemptsService(
      prisma as never,
      access as unknown as FaultAccessService,
    );
  });

  describe('create', () => {
    it('numbers the first attempt 1, stamps the technician and logs the timeline', async () => {
      const result = await service.create(TENANT, FAULT, USER, dto());

      expect(access.scopeForAction).toHaveBeenCalledWith(
        TENANT,
        USER,
        'UPDATE',
      );
      expect(prisma.fault.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            assignedToId: USER,
            id: FAULT,
            tenantId: TENANT,
            deletedAt: null,
          },
        }),
      );
      const data = prisma.faultAttempt.create.mock.calls[0][0].data;
      expect(data).toMatchObject({
        tenantId: TENANT,
        faultId: FAULT,
        attemptNumber: 1,
        technicianId: USER,
        outcome: 'REVISIT_REQUIRED',
        createdBy: USER,
      });
      expect(result).toMatchObject({ attemptNumber: 1 });
      expect(prisma.faultTimeline.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT,
          faultId: FAULT,
          isCustomerVisible: false,
          notes: 'Attempt #1 (INITIAL_VISIT): REVISIT_REQUIRED',
        }),
      });
    });

    it('numbers sequentially after the last attempt', async () => {
      prisma.faultAttempt.findFirst.mockResolvedValueOnce({ attemptNumber: 3 });
      await service.create(TENANT, FAULT, USER, dto());
      expect(
        prisma.faultAttempt.create.mock.calls[0][0].data.attemptNumber,
      ).toBe(4);
    });

    it('computes durationMinutes from start and end', async () => {
      const start = new Date(Date.now() - 90 * 60_000);
      const end = new Date(start.getTime() + 45 * 60_000);
      await service.create(
        TENANT,
        FAULT,
        USER,
        dto({ startedAt: start.toISOString(), endedAt: end.toISOString() }),
      );
      expect(
        prisma.faultAttempt.create.mock.calls[0][0].data.durationMinutes,
      ).toBe(45);
    });

    it('returns 404 for a fault outside the caller scope (or another tenant)', async () => {
      prisma.fault.findFirst.mockResolvedValue(null);
      await expect(service.create(TENANT, FAULT, USER, dto())).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.faultAttempt.create).not.toHaveBeenCalled();
    });

    it('propagates a missing FAULTS:UPDATE permission', async () => {
      access.scopeForAction.mockRejectedValue(new ForbiddenException());
      await expect(service.create(TENANT, FAULT, USER, dto())).rejects.toThrow(
        ForbiddenException,
      );
    });

    it.each(['RESOLVED', 'CLOSED'])(
      'refuses attempts on a %s fault',
      async (status) => {
        prisma.fault.findFirst.mockResolvedValue({ id: FAULT, status });
        await expect(
          service.create(TENANT, FAULT, USER, dto()),
        ).rejects.toThrow(BadRequestException);
      },
    );

    it('requires work notes for a RESOLVED outcome', async () => {
      await expect(
        service.create(
          TENANT,
          FAULT,
          USER,
          dto({ outcome: 'RESOLVED', workNotes: '   ' }),
        ),
      ).rejects.toThrow('workNotes are required');
    });

    it('rejects an end before the start', async () => {
      const start = new Date(Date.now() - 60_000);
      await expect(
        service.create(
          TENANT,
          FAULT,
          USER,
          dto({
            startedAt: start.toISOString(),
            endedAt: new Date(start.getTime() - 1).toISOString(),
          }),
        ),
      ).rejects.toThrow('endedAt must not be before startedAt');
    });

    it('rejects a start time in the future', async () => {
      await expect(
        service.create(
          TENANT,
          FAULT,
          USER,
          dto({ startedAt: new Date(Date.now() + 60 * 60_000).toISOString() }),
        ),
      ).rejects.toThrow('cannot be in the future');
    });

    it('rejects latitude without longitude', async () => {
      await expect(
        service.create(TENANT, FAULT, USER, dto({ latitude: 12.9 })),
      ).rejects.toThrow('latitude and longitude');
    });

    it('returns the existing attempt for a replayed clientRef without writing', async () => {
      const existing = { id: 'attempt-1', attemptNumber: 1, clientRef: 'c-1' };
      prisma.faultAttempt.findFirst.mockResolvedValueOnce(existing);

      const result = await service.create(
        TENANT,
        FAULT,
        USER,
        dto({ clientRef: 'c-1' }),
      );

      expect(result).toBe(existing);
      expect(prisma.faultAttempt.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT, faultId: FAULT, clientRef: 'c-1' },
        }),
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('returns the winner when a concurrent retry hits the clientRef unique key', async () => {
      const winner = { id: 'attempt-1', clientRef: 'c-1' };
      prisma.faultAttempt.findFirst
        .mockResolvedValueOnce(null) // replay check
        .mockResolvedValueOnce(null) // last attempt in tx
        .mockResolvedValueOnce(winner); // lookup after the conflict
      prisma.faultAttempt.create.mockRejectedValueOnce(
        uniqueError('clientRef'),
      );

      await expect(
        service.create(TENANT, FAULT, USER, dto({ clientRef: 'c-1' })),
      ).resolves.toBe(winner);
    });

    it('retries when a concurrent submit took the attempt number', async () => {
      prisma.faultAttempt.create.mockRejectedValueOnce(
        uniqueError('attemptNumber'),
      );
      await service.create(TENANT, FAULT, USER, dto());
      expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    });

    it('gives up with 409 after repeated number conflicts', async () => {
      prisma.faultAttempt.create.mockRejectedValue(
        uniqueError('attemptNumber'),
      );
      await expect(service.create(TENANT, FAULT, USER, dto())).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.$transaction).toHaveBeenCalledTimes(4);
    });
  });

  describe('list', () => {
    it('lists attempts oldest first, scoped to tenant and READ/READ_OWN', async () => {
      await service.list(TENANT, FAULT, USER);
      expect(access.scopeForAction).toHaveBeenCalledWith(TENANT, USER, [
        'READ',
        'READ_OWN',
      ]);
      expect(prisma.faultAttempt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT, faultId: FAULT, deletedAt: null },
          orderBy: { attemptNumber: 'asc' },
        }),
      );
    });

    it('returns 404 when the fault is not visible to the caller', async () => {
      prisma.fault.findFirst.mockResolvedValue(null);
      await expect(service.list(TENANT, FAULT, USER)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.faultAttempt.findMany).not.toHaveBeenCalled();
    });
  });
});
