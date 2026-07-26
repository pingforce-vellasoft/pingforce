import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { GeofenceAssignmentService } from './geofence-assignment.service';

/**
 * Employee ↔ geofence assignment.
 *
 * The rules that matter and are easy to regress:
 *  - a geofence id from another tenant is a 404, never a cross-tenant write;
 *  - with one-geofence-per-employee on, assigning someone held elsewhere is a
 *    409 unless `reassign` is passed, and reassigning releases the old row;
 *  - assignment is idempotent (re-adding is skipped, not an error);
 *  - every touched employee's punch cache is invalidated, or a freshly
 *    assigned worker keeps failing until the TTL lapses;
 *  - unassigning reports who is left unable to punch anywhere.
 */

type Mock = jest.Mock;

interface PrismaMock {
  geofence: { findFirst: Mock };
  employee: { findMany: Mock; findFirst: Mock; count: Mock };
  employeeGeofence: {
    findMany: Mock;
    updateMany: Mock;
    upsert: Mock;
    groupBy: Mock;
  };
  attendancePolicy: { findFirst: Mock; update: Mock; create: Mock };
  $transaction: Mock;
}

const ACTOR = { userId: 'u1', tenantId: 't1' };
const GEOFENCE = { id: 'g1', name: 'HQ', tenantId: 't1' };

function makeService(opts: {
  geofence?: { id: string; name: string; tenantId: string } | null;
  allowMultiple?: boolean;
  employees?: { id: string; firstName: string; lastName: string }[];
  /** Live assignments held by the employees being assigned. */
  existingAssignments?: {
    id: string;
    employeeId: string;
    geofenceId: string;
    geofence: { id: string; name: string };
  }[];
  /** Assignments still held after an unassign, for the stranded calculation. */
  remainingAfterUnassign?: { employeeId: string; _count: { _all: number } }[];
}) {
  const tx = {
    employeeGeofence: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      upsert: jest.fn().mockResolvedValue({}),
    },
  };

  const prisma: PrismaMock = {
    geofence: {
      findFirst: jest
        .fn()
        .mockResolvedValue(
          opts.geofence === undefined ? GEOFENCE : opts.geofence,
        ),
    },
    employee: {
      findMany: jest.fn().mockResolvedValue(opts.employees ?? []),
      findFirst: jest.fn().mockResolvedValue({
        id: 'e1',
        firstName: 'Ana',
        lastName: 'Diaz',
      }),
      count: jest.fn().mockResolvedValue(5),
    },
    employeeGeofence: {
      findMany: jest.fn().mockResolvedValue(opts.existingAssignments ?? []),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      upsert: jest.fn().mockResolvedValue({}),
      groupBy: jest.fn().mockResolvedValue(opts.remainingAfterUnassign ?? []),
    },
    attendancePolicy: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'p1',
        allowMultipleGeofencesPerEmployee: opts.allowMultiple ?? false,
      }),
      update: jest.fn().mockResolvedValue({
        id: 'p1',
        allowMultipleGeofencesPerEmployee: opts.allowMultiple ?? false,
      }),
      create: jest.fn().mockResolvedValue({
        id: 'p1',
        allowMultipleGeofencesPerEmployee: opts.allowMultiple ?? false,
      }),
    },
    $transaction: jest.fn(async (cb: (t: typeof tx) => Promise<unknown>) =>
      cb(tx),
    ),
  };

  const auditService = { log: jest.fn().mockResolvedValue(undefined) };
  const geofenceCache = {
    invalidate: jest.fn().mockResolvedValue(undefined),
    invalidateEmployees: jest.fn().mockResolvedValue(undefined),
  };

  const service = new GeofenceAssignmentService(
    prisma as unknown as ConstructorParameters<
      typeof GeofenceAssignmentService
    >[0],
    auditService as unknown as ConstructorParameters<
      typeof GeofenceAssignmentService
    >[1],
    geofenceCache as unknown as ConstructorParameters<
      typeof GeofenceAssignmentService
    >[2],
  );

  return { service, prisma, tx, geofenceCache, auditService };
}

describe('GeofenceAssignmentService', () => {
  describe('assign — positive', () => {
    it('assigns employees and invalidates their punch caches', async () => {
      const { service, tx, geofenceCache } = makeService({
        employees: [
          { id: 'e1', firstName: 'Ana', lastName: 'Diaz' },
          { id: 'e2', firstName: 'Bo', lastName: 'Khan' },
        ],
      });

      const result = await service.assign(ACTOR, 'g1', {
        employeeIds: ['e1', 'e2'],
      });

      expect(result).toMatchObject({ assigned: 2, skipped: 0, reassigned: 0 });
      expect(tx.employeeGeofence.upsert).toHaveBeenCalledTimes(2);
      // Without this the newly assigned employee punches against a stale
      // empty assignment list until the 60s TTL expires.
      expect(geofenceCache.invalidateEmployees).toHaveBeenCalledWith(
        't1',
        expect.arrayContaining(['e1', 'e2']),
      );
    });

    it('is idempotent — an already-assigned employee is skipped, not rejected', async () => {
      const { service, tx } = makeService({
        employees: [{ id: 'e1', firstName: 'Ana', lastName: 'Diaz' }],
        existingAssignments: [
          {
            id: 'a1',
            employeeId: 'e1',
            geofenceId: 'g1',
            geofence: { id: 'g1', name: 'HQ' },
          },
        ],
      });

      const result = await service.assign(ACTOR, 'g1', {
        employeeIds: ['e1'],
      });

      expect(result).toMatchObject({ assigned: 0, skipped: 1 });
      expect(tx.employeeGeofence.upsert).not.toHaveBeenCalled();
    });

    it('allows a second geofence when the tenant permits multiple', async () => {
      const { service, tx } = makeService({
        allowMultiple: true,
        employees: [{ id: 'e1', firstName: 'Ana', lastName: 'Diaz' }],
        existingAssignments: [
          {
            id: 'a1',
            employeeId: 'e1',
            geofenceId: 'g-other',
            geofence: { id: 'g-other', name: 'Depot' },
          },
        ],
      });

      const result = await service.assign(ACTOR, 'g1', {
        employeeIds: ['e1'],
      });

      expect(result).toMatchObject({ assigned: 1, reassigned: 0 });
      // The existing assignment must survive — this is the whole point of the
      // multi-geofence mode.
      expect(tx.employeeGeofence.updateMany).not.toHaveBeenCalled();
    });

    it('moves the employee when reassign is requested under single-geofence rules', async () => {
      const { service, tx, geofenceCache } = makeService({
        allowMultiple: false,
        employees: [{ id: 'e1', firstName: 'Ana', lastName: 'Diaz' }],
        existingAssignments: [
          {
            id: 'a1',
            employeeId: 'e1',
            geofenceId: 'g-other',
            geofence: { id: 'g-other', name: 'Depot' },
          },
        ],
      });

      const result = await service.assign(ACTOR, 'g1', {
        employeeIds: ['e1'],
        reassign: true,
      });

      expect(result).toMatchObject({ assigned: 1, reassigned: 1 });
      // Old assignment released, new one written, both inside one transaction.
      expect(tx.employeeGeofence.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 't1' }),
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
      expect(tx.employeeGeofence.upsert).toHaveBeenCalledTimes(1);
      expect(geofenceCache.invalidateEmployees).toHaveBeenCalledWith(
        't1',
        expect.arrayContaining(['e1']),
      );
    });
  });

  describe('assign — negative', () => {
    it('404s on a geofence belonging to another tenant', async () => {
      // requireGeofence filters on tenantId, so a foreign id simply misses.
      const { service, prisma } = makeService({ geofence: null });

      await expect(
        service.assign(ACTOR, 'g-foreign', { employeeIds: ['e1'] }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.employeeGeofence.findMany).not.toHaveBeenCalled();
    });

    it('409s naming the current geofence when multi is off and reassign is not set', async () => {
      const { service, tx } = makeService({
        allowMultiple: false,
        employees: [{ id: 'e1', firstName: 'Ana', lastName: 'Diaz' }],
        existingAssignments: [
          {
            id: 'a1',
            employeeId: 'e1',
            geofenceId: 'g-other',
            geofence: { id: 'g-other', name: 'Depot' },
          },
        ],
      });

      await expect(
        service.assign(ACTOR, 'g1', { employeeIds: ['e1'] }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          errorCode: 'GEOFENCE-003',
          conflicts: [
            expect.objectContaining({
              employeeId: 'e1',
              employeeName: 'Ana Diaz',
              currentGeofenceName: 'Depot',
            }),
          ],
        }),
      });
      // Nothing may be written when the batch conflicts.
      expect(tx.employeeGeofence.upsert).not.toHaveBeenCalled();
    });

    it('is a ConflictException so the HTTP layer returns 409', async () => {
      const { service } = makeService({
        allowMultiple: false,
        employees: [{ id: 'e1', firstName: 'Ana', lastName: 'Diaz' }],
        existingAssignments: [
          {
            id: 'a1',
            employeeId: 'e1',
            geofenceId: 'g-other',
            geofence: { id: 'g-other', name: 'Depot' },
          },
        ],
      });

      await expect(
        service.assign(ACTOR, 'g1', { employeeIds: ['e1'] }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('400s when an employee id is missing, inactive, or from another tenant', async () => {
      // The tenant-scoped findMany returns only e1; e2 was never theirs.
      const { service, tx } = makeService({
        employees: [{ id: 'e1', firstName: 'Ana', lastName: 'Diaz' }],
      });

      await expect(
        service.assign(ACTOR, 'g1', { employeeIds: ['e1', 'e2'] }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          errorCode: 'GEOFENCE-002',
          employeeIds: ['e2'],
        }),
      });
      // A partial assign would be worse than a rejection — assert none landed.
      expect(tx.employeeGeofence.upsert).not.toHaveBeenCalled();
    });

    it('rejects with BadRequestException rather than silently partial-assigning', async () => {
      const { service } = makeService({
        employees: [{ id: 'e1', firstName: 'Ana', lastName: 'Diaz' }],
      });

      await expect(
        service.assign(ACTOR, 'g1', { employeeIds: ['e1', 'e-ghost'] }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('unassign', () => {
    it('removes the assignment and flags employees left unable to punch', async () => {
      const { service, prisma, geofenceCache } = makeService({
        // e1 holds no other assignment after removal → stranded.
        remainingAfterUnassign: [],
      });
      prisma.employeeGeofence.findMany.mockResolvedValue([
        { id: 'a1', employeeId: 'e1' },
      ]);

      const result = await service.unassign(ACTOR, 'g1', {
        employeeIds: ['e1'],
      });

      expect(result).toMatchObject({
        removed: 1,
        leftWithoutGeofence: ['e1'],
      });
      expect(geofenceCache.invalidateEmployees).toHaveBeenCalledWith('t1', [
        'e1',
      ]);
    });

    it('does not flag an employee who still holds another geofence', async () => {
      const { service, prisma } = makeService({
        remainingAfterUnassign: [{ employeeId: 'e1', _count: { _all: 1 } }],
      });
      prisma.employeeGeofence.findMany.mockResolvedValue([
        { id: 'a1', employeeId: 'e1' },
      ]);

      const result = await service.unassign(ACTOR, 'g1', {
        employeeIds: ['e1'],
      });

      expect(result.leftWithoutGeofence).toEqual([]);
    });

    it('404s when none of the employees are assigned here', async () => {
      const { service, prisma } = makeService({});
      prisma.employeeGeofence.findMany.mockResolvedValue([]);

      await expect(
        service.unassign(ACTOR, 'g1', { employeeIds: ['e1'] }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ errorCode: 'GEOFENCE-004' }),
      });
    });

    it('404s on a geofence from another tenant before touching assignments', async () => {
      const { service, prisma } = makeService({ geofence: null });

      await expect(
        service.unassign(ACTOR, 'g-foreign', { employeeIds: ['e1'] }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.employeeGeofence.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('listAssignable', () => {
    it('hides employees assigned elsewhere under single-geofence rules', async () => {
      const { service, prisma } = makeService({ allowMultiple: false });
      prisma.employee.findMany.mockResolvedValue([]);
      prisma.employee.count.mockResolvedValue(0);

      await service.listAssignable(ACTOR, 'g1', {});

      // ASSIGNABLE scope + single-geofence mode ⇒ exclude anyone holding any
      // live assignment at all.
      expect(prisma.employee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            geofenceAssignments: { none: { deletedAt: null } },
          }),
        }),
      );
    });

    it('only excludes this geofence when the tenant allows multiple', async () => {
      const { service, prisma } = makeService({ allowMultiple: true });
      prisma.employee.findMany.mockResolvedValue([]);

      await service.listAssignable(ACTOR, 'g1', {});

      expect(prisma.employee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            geofenceAssignments: {
              none: { deletedAt: null, geofenceId: 'g1' },
            },
          }),
        }),
      );
    });

    it('reports tenantHasEmployees false so the UI prompts to create employees', async () => {
      const { service, prisma } = makeService({});
      prisma.employee.findMany.mockResolvedValue([]);
      prisma.employee.count.mockResolvedValue(0);

      const result = await service.listAssignable(ACTOR, 'g1', {});

      // Distinct from "no matches" — the caller shows a create-employees CTA.
      expect(result.tenantHasEmployees).toBe(false);
    });

    it('marks requiresReassign for candidates held elsewhere in single mode', async () => {
      const { service, prisma } = makeService({ allowMultiple: false });
      prisma.employee.findMany.mockResolvedValue([
        {
          id: 'e1',
          employeeCode: 'E-1',
          firstName: 'Ana',
          lastName: 'Diaz',
          displayName: null,
          photograph: null,
          geofenceAssignments: [
            {
              geofenceId: 'g-other',
              geofence: { id: 'g-other', name: 'Depot' },
            },
          ],
        },
      ]);

      const result = await service.listAssignable(ACTOR, 'g1', {
        scope: 'ALL',
      });

      expect(result.employees[0]).toMatchObject({
        requiresReassign: true,
        currentGeofences: [{ id: 'g-other', name: 'Depot' }],
      });
    });
  });

  describe('policy', () => {
    it('reports how many employees exceed the limit when switching to single mode', async () => {
      const { service, prisma } = makeService({ allowMultiple: false });
      prisma.employeeGeofence.groupBy.mockResolvedValue([
        { employeeId: 'e1', _count: { _all: 2 } },
        { employeeId: 'e2', _count: { _all: 1 } },
      ]);

      const result = await service.updatePolicy(ACTOR, {
        allowMultipleGeofencesPerEmployee: false,
      });

      // Existing breadth is preserved rather than silently revoked; the count
      // tells the admin what to clean up.
      expect(result.employeesOverLimit).toBe(1);
      expect(prisma.employeeGeofence.updateMany).not.toHaveBeenCalled();
    });

    it('defaults to single-geofence when the tenant has no policy row', async () => {
      const { service, prisma } = makeService({});
      prisma.attendancePolicy.findFirst.mockResolvedValue(null);

      await expect(service.allowsMultiple('t1')).resolves.toBe(false);
    });
  });
});
