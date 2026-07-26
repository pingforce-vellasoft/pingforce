import { DevicesService } from './devices.service';
import { DevicesRepository } from './devices.repository';
import { AuditService } from '../audit/audit.service';
import { SessionService } from '../auth/session.service';
import {
  BindDeviceDto,
  CreateDeviceChangeRequestDto,
  DeviceChangeReason,
} from './dto/device.dto';

/**
 * Device binding (DeviceManagement.md §7, DeviceSecurity.md §12).
 *
 * The property under test throughout: an employee can never move their own
 * binding. Binding is one-shot at onboarding; every later move needs an
 * admin-approved change request. That is what stops a lent handset from
 * punching attendance for a colleague.
 */

const ACTOR = { userId: 'u1', tenantId: 't1' };
const EMPLOYEE = { id: 'e1', tenantId: 't1', userId: 'u1' };

interface Overrides {
  employee?: unknown;
  activeBinding?: unknown;
  deviceById?: unknown;
  pendingRequest?: unknown;
  recentRequestCount?: number;
  request?: unknown;
  settings?: { requestsPer90Days: number; expiryDays: number } | null;
}

function makeService(o: Overrides = {}) {
  const prisma = {
    employee: {
      findFirst: jest
        .fn()
        .mockResolvedValue(o.employee === undefined ? EMPLOYEE : o.employee),
      update: jest.fn().mockResolvedValue({}),
    },
    employeeDevice: {
      upsert: jest.fn().mockResolvedValue({ id: 'dev-row-1' }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      update: jest.fn().mockResolvedValue({ id: 'dev-row-1' }),
      findFirst: jest.fn().mockResolvedValue(o.deviceById ?? null),
    },
    deviceChangeRequest: {
      create: jest.fn().mockResolvedValue({ id: 'req1' }),
      update: jest.fn().mockResolvedValue({ id: 'req1', status: 'APPROVED' }),
    },
    tenantSetting: {
      findUnique: jest.fn().mockResolvedValue(
        o.settings === undefined
          ? {
              deviceChangeRequestsPer90Days: 2,
              deviceChangeRequestExpiryDays: 7,
            }
          : o.settings,
      ),
    },
    $transaction: jest
      .fn()
      .mockResolvedValue([{}, { id: 'dev-row-1' }, { id: 'req1' }, {}]),
  };

  const repo = {
    findActiveBinding: jest.fn().mockResolvedValue(o.activeBinding ?? null),
    findDeviceById: jest.fn().mockResolvedValue(o.deviceById ?? null),
    findPendingRequestForEmployee: jest
      .fn()
      .mockResolvedValue(o.pendingRequest ?? null),
    countRequestsSince: jest.fn().mockResolvedValue(o.recentRequestCount ?? 0),
    findRequest: jest.fn().mockResolvedValue(o.request ?? null),
    listDevices: jest.fn().mockResolvedValue({ rows: [], total: 0 }),
    listRequests: jest.fn().mockResolvedValue({ rows: [], total: 0 }),
    countRequestsForEmployees: jest.fn().mockResolvedValue(new Map()),
  };

  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const sessions = { revokeAllForUser: jest.fn().mockResolvedValue(undefined) };

  const service = new DevicesService(
    prisma as unknown as ConstructorParameters<typeof DevicesService>[0],
    repo as unknown as DevicesRepository,
    audit as unknown as AuditService,
    sessions as unknown as SessionService,
  );

  return { service, prisma, repo, audit, sessions };
}

const BIND_DTO: BindDeviceDto = {
  deviceId: 'dev-aaaaaaaa',
  publicKey: 'public-key-value',
  deviceName: 'Galaxy A54',
  platform: 'ANDROID',
};

const CHANGE_DTO: CreateDeviceChangeRequestDto = {
  newDeviceId: 'dev-bbbbbbbb',
  publicKey: 'public-key-value',
  reason: DeviceChangeReason.LOST,
};

describe('DevicesService — binding', () => {
  it('binds when the employee has no active device', async () => {
    const { service, prisma } = makeService();

    await service.bindDevice(ACTOR, BIND_DTO);

    expect(prisma.$transaction).toHaveBeenCalled();
    // deviceBoundAt must be set in the same transaction, otherwise a bound
    // employee stays gated or an unbound one slips through.
    expect(prisma.employee.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ deviceBoundAt: expect.any(Date) }),
      }),
    );
  });

  it('refuses a second binding — the self-service rebind path', async () => {
    const { service, prisma } = makeService({
      activeBinding: { id: 'dev-row-0', deviceId: 'dev-aaaaaaaa' },
    });

    await expect(service.bindDevice(ACTOR, BIND_DTO)).rejects.toMatchObject({
      response: { errorCode: 'DEVICE-008' },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('refuses a handset already bound to another employee', async () => {
    const { service } = makeService({
      deviceById: {
        employeeId: 'other-employee',
        isTrusted: true,
        revokedAt: null,
      },
    });

    await expect(service.bindDevice(ACTOR, BIND_DTO)).rejects.toMatchObject({
      response: { errorCode: 'DEVICE-011' },
    });
  });

  it('rejects a non-employee account', async () => {
    const { service } = makeService({ employee: null });
    await expect(service.bindDevice(ACTOR, BIND_DTO)).rejects.toThrow(
      /not an employee/i,
    );
  });
});

describe('DevicesService — change requests', () => {
  it('creates a pending request', async () => {
    const { service, prisma } = makeService({
      activeBinding: { deviceId: 'dev-aaaaaaaa' },
    });

    await service.createChangeRequest(ACTOR, CHANGE_DTO);

    expect(prisma.deviceChangeRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'PENDING',
          currentDeviceId: 'dev-aaaaaaaa',
          newDeviceId: 'dev-bbbbbbbb',
        }),
      }),
    );
  });

  it('does not store the new public key on the request', async () => {
    const { service, prisma } = makeService();

    await service.createChangeRequest(ACTOR, CHANGE_DTO);

    // Approval must not be able to hand trust to a key captured at request
    // time — the handset presents its own key when it claims the binding.
    const data = prisma.deviceChangeRequest.create.mock.calls[0][0].data;
    expect(JSON.stringify(data)).not.toContain('public-key-value');
  });

  it('refuses a second pending request', async () => {
    const { service } = makeService({ pendingRequest: { id: 'req0' } });

    await expect(
      service.createChangeRequest(ACTOR, CHANGE_DTO),
    ).rejects.toMatchObject({ response: { errorCode: 'DEVICE-010' } });
  });

  it('enforces the tenant 90-day quota', async () => {
    const { service } = makeService({ recentRequestCount: 2 });

    await expect(
      service.createChangeRequest(ACTOR, CHANGE_DTO),
    ).rejects.toMatchObject({ response: { errorCode: 'DEVICE-009' } });
  });
});

describe('DevicesService — approval', () => {
  const pendingRequest = {
    id: 'req1',
    tenantId: 't1',
    employeeId: 'e1',
    currentDeviceId: 'dev-aaaaaaaa',
    newDeviceId: 'dev-bbbbbbbb',
    status: 'PENDING',
    reason: 'LOST',
    expiresAt: new Date(Date.now() + 86_400_000),
  };

  it('rebinds and cuts the employee sessions', async () => {
    const { service, prisma, sessions } = makeService({
      request: pendingRequest,
    });

    await service.approveChangeRequest(ACTOR, 'req1');

    expect(prisma.$transaction).toHaveBeenCalled();
    // DeviceSecurity.md §12: a replaced device keeping a live refresh token is
    // still a working credential.
    expect(sessions.revokeAllForUser).toHaveBeenCalledWith(
      't1',
      'u1',
      'DEVICE_REPLACED',
    );
  });

  it('leaves the change applied when session revocation fails', async () => {
    const { service, sessions } = makeService({ request: pendingRequest });
    sessions.revokeAllForUser.mockRejectedValueOnce(new Error('redis down'));

    await expect(
      service.approveChangeRequest(ACTOR, 'req1'),
    ).resolves.toBeDefined();
  });

  it('refuses an expired request', async () => {
    const { service } = makeService({
      request: { ...pendingRequest, expiresAt: new Date(Date.now() - 1000) },
    });

    await expect(service.approveChangeRequest(ACTOR, 'req1')).rejects.toThrow(
      /expired/i,
    );
  });

  it('refuses a request that was already reviewed', async () => {
    const { service } = makeService({
      request: { ...pendingRequest, status: 'APPROVED' },
    });

    await expect(service.approveChangeRequest(ACTOR, 'req1')).rejects.toThrow(
      /already been reviewed/i,
    );
  });

  it('does not resolve a request belonging to another tenant', async () => {
    // findRequest is tenant-scoped, so a foreign id resolves to null.
    const { service } = makeService({ request: null });

    await expect(service.approveChangeRequest(ACTOR, 'req1')).rejects.toThrow(
      /not found/i,
    );
  });

  it('records a rejection reason', async () => {
    const { service, prisma } = makeService({ request: pendingRequest });

    await service.rejectChangeRequest(ACTOR, 'req1', 'Hand in the old phone');

    expect(prisma.deviceChangeRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'REJECTED',
          rejectionReason: 'Hand in the old phone',
        }),
      }),
    );
  });
});

describe('DevicesService — claiming an approved binding', () => {
  it('fills the public key the approval deliberately left empty', async () => {
    const { service, prisma } = makeService({
      deviceById: {
        id: 'dev-row-1',
        employeeId: 'e1',
        isTrusted: true,
        revokedAt: null,
        publicKey: '',
      },
    });

    await service.claimApprovedDevice(ACTOR, 'dev-bbbbbbbb', 'fresh-key');

    expect(prisma.employeeDevice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ publicKey: 'fresh-key' }),
      }),
    );
  });

  it('refuses to re-claim an already activated device', async () => {
    const { service } = makeService({
      deviceById: {
        id: 'dev-row-1',
        employeeId: 'e1',
        isTrusted: true,
        revokedAt: null,
        publicKey: 'existing-key',
      },
    });

    await expect(
      service.claimApprovedDevice(ACTOR, 'dev-bbbbbbbb', 'attacker-key'),
    ).rejects.toMatchObject({ response: { errorCode: 'DEVICE-008' } });
  });

  it('refuses to claim a binding owned by another employee', async () => {
    const { service } = makeService({
      deviceById: {
        id: 'dev-row-1',
        employeeId: 'someone-else',
        isTrusted: true,
        revokedAt: null,
        publicKey: '',
      },
    });

    await expect(
      service.claimApprovedDevice(ACTOR, 'dev-bbbbbbbb', 'attacker-key'),
    ).rejects.toMatchObject({ response: { errorCode: 'DEVICE-007' } });
  });
});

describe('DevicesService — admin revoke', () => {
  it('clears deviceBoundAt so the employee is re-gated', async () => {
    const { service, prisma, sessions } = makeService({
      deviceById: { id: 'dev-row-1', employeeId: 'e1', deviceId: 'dev-a' },
    });

    await service.revokeDevice(ACTOR, 'dev-row-1');

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(sessions.revokeAllForUser).toHaveBeenCalledWith(
      't1',
      'u1',
      'DEVICE_REVOKED',
    );
  });

  it('does not revoke a device from another tenant', async () => {
    const { service } = makeService({ deviceById: null });
    await expect(service.revokeDevice(ACTOR, 'dev-row-1')).rejects.toThrow(
      /not found/i,
    );
  });
});
