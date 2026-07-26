import { GeofenceCacheService } from './geofence-cache.service';

/**
 * Punch-path geofence resolution.
 *
 * The behaviour change this guards: enforcement used to be tenant-wide, so an
 * employee hired for the North branch could punch at the South branch. It is
 * now scoped to the employee's own assignments, and the two failure modes are
 * reported separately — NO_ASSIGNMENT needs an admin, OUTSIDE just needs the
 * employee to move.
 */

// Chennai HQ, 100 m radius.
const HQ = {
  id: 'g1',
  latitude: 13.0827,
  longitude: 80.2707,
  radiusMeters: 100,
};
// Depot ~5 km away — comfortably outside HQ's radius.
const DEPOT = {
  id: 'g2',
  latitude: 13.1275,
  longitude: 80.2707,
  radiusMeters: 100,
};

function makeService(opts: {
  assigned?: {
    id: string;
    latitude: number;
    longitude: number;
    radiusMeters: number;
  }[];
  cached?: unknown;
}) {
  const rows = (opts.assigned ?? []).map((geofence) => ({ geofence }));

  const prisma = {
    employeeGeofence: { findMany: jest.fn().mockResolvedValue(rows) },
    geofence: { findMany: jest.fn().mockResolvedValue([]) },
  };
  const cacheManager = {
    get: jest.fn().mockResolvedValue(opts.cached),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  };

  const service = new GeofenceCacheService(
    prisma as unknown as ConstructorParameters<typeof GeofenceCacheService>[0],
    cacheManager as unknown as ConstructorParameters<
      typeof GeofenceCacheService
    >[1],
  );
  return { service, prisma, cacheManager };
}

describe('GeofenceCacheService.checkAssigned', () => {
  it('accepts a punch inside an assigned geofence', async () => {
    const { service } = makeService({ assigned: [HQ] });

    await expect(
      service.checkAssigned('t1', 'e1', HQ.latitude, HQ.longitude),
    ).resolves.toEqual({ status: 'INSIDE', geofenceId: 'g1' });
  });

  it('accepts a punch at any one of several assigned geofences', async () => {
    const { service } = makeService({ assigned: [HQ, DEPOT] });

    await expect(
      service.checkAssigned('t1', 'e1', DEPOT.latitude, DEPOT.longitude),
    ).resolves.toEqual({ status: 'INSIDE', geofenceId: 'g2' });
  });

  it('rejects a punch inside a geofence the employee is NOT assigned to', async () => {
    // The regression this feature exists to prevent: standing inside a valid
    // tenant geofence is no longer sufficient — it must be one of theirs.
    const { service } = makeService({ assigned: [HQ] });

    await expect(
      service.checkAssigned('t1', 'e1', DEPOT.latitude, DEPOT.longitude),
    ).resolves.toEqual({ status: 'OUTSIDE' });
  });

  it('reports NO_ASSIGNMENT distinctly when the employee has no geofence', async () => {
    // Must not collapse into OUTSIDE: the employee cannot fix this by moving,
    // and the mobile client keys the "contact your administrator" copy on it.
    const { service } = makeService({ assigned: [] });

    await expect(
      service.checkAssigned('t1', 'e1', HQ.latitude, HQ.longitude),
    ).resolves.toEqual({ status: 'NO_ASSIGNMENT' });
  });

  it('rejects a coordinate just outside the assigned radius', async () => {
    const { service } = makeService({
      assigned: [{ ...HQ, radiusMeters: 50 }],
    });

    // ~0.01° latitude ≈ 1.1 km north, well beyond a 50 m radius.
    await expect(
      service.checkAssigned('t1', 'e1', HQ.latitude + 0.01, HQ.longitude),
    ).resolves.toEqual({ status: 'OUTSIDE' });
  });
});

describe('GeofenceCacheService caching', () => {
  it('treats an empty cached array as a hit rather than re-querying', async () => {
    // An unassigned employee caches as []. Re-querying on every punch would
    // put the DB back on the hot path for exactly the users hammering retry.
    const { service, prisma } = makeService({ cached: [] });

    const result = await service.checkAssigned('t1', 'e1', 0, 0);

    expect(result).toEqual({ status: 'NO_ASSIGNMENT' });
    expect(prisma.employeeGeofence.findMany).not.toHaveBeenCalled();
  });

  it('queries and caches on a miss', async () => {
    const { service, prisma, cacheManager } = makeService({
      assigned: [HQ],
      cached: undefined,
    });

    await service.getAssigned('t1', 'e1');

    expect(prisma.employeeGeofence.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: 't1',
          employeeId: 'e1',
          deletedAt: null,
          // A soft-deleted or deactivated geofence must not keep granting
          // access through a live assignment row.
          geofence: { active: true, deletedAt: null },
        }),
      }),
    );
    expect(cacheManager.set).toHaveBeenCalled();
  });

  it('invalidates each affected employee key individually', async () => {
    const { service, cacheManager } = makeService({});

    await service.invalidateEmployees('t1', ['e1', 'e2']);

    expect(cacheManager.del).toHaveBeenCalledWith('geofences_employee_t1_e1');
    expect(cacheManager.del).toHaveBeenCalledWith('geofences_employee_t1_e2');
  });

  it('scopes the cache key by tenant so two tenants never share an entry', async () => {
    const { service, cacheManager } = makeService({ assigned: [HQ] });

    await service.getAssigned('t1', 'e1');
    await service.getAssigned('t2', 'e1');

    expect(cacheManager.get).toHaveBeenCalledWith('geofences_employee_t1_e1');
    expect(cacheManager.get).toHaveBeenCalledWith('geofences_employee_t2_e1');
  });
});
