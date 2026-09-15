import { AttendanceService } from './attendance.service';

const actor = { userId: 'u1', tenantId: 't1' };
const dto = {
  gpsRequired: true,
  geofenceRequired: true,
  biometricRequired: false,
  gpsAccuracyThreshold: 25,
  allowLowAccuracy: false,
  allowOfflineCheckIn: true,
  outsideGeofencePolicy: 'BLOCK' as const,
  mockLocationPolicy: 'BLOCK' as const,
};

function makeService(existing: { id: string } | null) {
  const effective = { id: existing?.id ?? 'p1', tenantId: 't1', ...dto };
  const prisma = {
    attendancePolicy: {
      findFirst: jest
        .fn()
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(effective),
      update: jest.fn().mockResolvedValue(effective),
      create: jest.fn().mockResolvedValue(effective),
    },
  };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const service = new AttendanceService(
    prisma as never,
    {} as never,
    {} as never,
    audit as never,
  );
  return { service, prisma, audit };
}

describe('AttendanceService policy', () => {
  it('updates the effective tenant policy and audits it', async () => {
    const { service, prisma, audit } = makeService({ id: 'p1' });

    await service.updatePolicy(actor, dto);

    expect(prisma.attendancePolicy.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p1' },
        data: expect.objectContaining({ gpsAccuracyThreshold: 25 }),
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ATTENDANCE_POLICY_UPDATED' }),
    );
  });

  it('creates the tenant policy when none exists', async () => {
    const { service, prisma } = makeService(null);

    await service.updatePolicy(actor, dto);

    expect(prisma.attendancePolicy.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: 't1',
          createdBy: 'u1',
          geofenceRequired: true,
        }),
      }),
    );
  });
});
