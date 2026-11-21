import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TrackingGapService } from './tracking-gap.service';

/** Opening a tracking gap validates the client-supplied session and time. */
function makeService(session: { id: string } | null = { id: 's1' }) {
  const prisma = {
    employee: {
      findUnique: jest.fn().mockResolvedValue({ id: 'e1', tenantId: 't1' }),
    },
    trackingGap: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn((args: { data: unknown }) => Promise.resolve(args.data)),
    },
    attendanceSession: { findFirst: jest.fn().mockResolvedValue(session) },
    deviceTrackingExemption: { findFirst: jest.fn().mockResolvedValue(null) },
  };
  const service = new TrackingGapService(
    prisma as unknown as ConstructorParameters<typeof TrackingGapService>[0],
    { log: jest.fn() } as unknown as ConstructorParameters<
      typeof TrackingGapService
    >[1],
  );
  return { service, prisma };
}
const user = { userId: 'u1', tenantId: 't1' };

describe('TrackingGapService.openGap', () => {
  it('links a gap to one of the caller own sessions', async () => {
    const { service, prisma } = makeService();
    await service.openGap(user, {
      reason: 'LOCATION_DISABLED',
      attendanceSessionId: 's1',
    } as never);
    expect(prisma.attendanceSession.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 's1',
          tenantId: 't1',
          employeeId: 'e1',
        }),
      }),
    );
    expect(prisma.trackingGap.create).toHaveBeenCalled();
  });

  it('refuses a session that is not the caller own', async () => {
    const { service, prisma } = makeService(null);
    await expect(
      service.openGap(user, {
        reason: 'LOCATION_DISABLED',
        attendanceSessionId: 'someone-else',
      } as never),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.trackingGap.create).not.toHaveBeenCalled();
  });

  it('refuses a start time in the future', async () => {
    const { service, prisma } = makeService();
    await expect(
      service.openGap(user, {
        reason: 'LOCATION_DISABLED',
        startedAt: new Date(Date.now() + 3_600_000).toISOString(),
      } as never),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.trackingGap.create).not.toHaveBeenCalled();
  });
});
