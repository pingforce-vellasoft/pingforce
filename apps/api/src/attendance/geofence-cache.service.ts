import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ExtendedPrismaClient } from '../prisma/prisma.module';

interface CachedGeofence {
  readonly id: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly radiusMeters: number;
}

// Geofences change rarely (admin action) but are read on every punch during
// the morning rush — 60s staleness is an acceptable trade for dropping a
// PostGIS query per punch. Mutations invalidate immediately anyway.
const GEOFENCE_CACHE_TTL_MS = 60_000;

const EARTH_RADIUS_M = 6371000;

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

/**
 * Redis-cached active geofences per tenant (SCALABILITY_AUDIT: the punch
 * hot path ran a PostGIS ST_DWithin query per request). The containment
 * check runs in-process with haversine — identical semantics for circular
 * geofences, zero DB round-trips on cache hit.
 */
@Injectable()
export class GeofenceCacheService {
  constructor(
    @Inject('IPrismaService') private readonly prisma: ExtendedPrismaClient,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  private key(tenantId: string): string {
    return `geofences_active_${tenantId}`;
  }

  async getActive(tenantId: string): Promise<CachedGeofence[]> {
    const cached = await this.cacheManager.get<CachedGeofence[]>(
      this.key(tenantId),
    );
    if (cached) return cached;

    const geofences = await this.prisma.geofence.findMany({
      where: { tenantId, active: true, deletedAt: null },
      select: { id: true, latitude: true, longitude: true, radiusMeters: true },
    });

    await this.cacheManager.set(
      this.key(tenantId),
      geofences,
      GEOFENCE_CACHE_TTL_MS,
    );
    return geofences;
  }

  // `isInsideAny(tenantId, lat, lng)` used to live here and was the punch
  // check: inside ANY active geofence of the tenant. It is deliberately gone.
  // Attendance is now scoped to the geofences an employee is assigned to, and
  // leaving a tenant-wide helper in place invites a future caller to wire it
  // back in and silently reopen the hole where anyone could punch at any site.
  // Use checkAssigned() below.

  private employeeKey(tenantId: string, employeeId: string): string {
    return `geofences_employee_${tenantId}_${employeeId}`;
  }

  /**
   * The active geofences this employee is assigned to. Cached per employee on
   * the same short TTL as the tenant list — assignments are an admin action,
   * and every mutation invalidates the affected employees explicitly.
   */
  async getAssigned(
    tenantId: string,
    employeeId: string,
  ): Promise<CachedGeofence[]> {
    const key = this.employeeKey(tenantId, employeeId);
    const cached = await this.cacheManager.get<CachedGeofence[]>(key);
    // An employee with no assignments caches as `[]`, which is falsy-adjacent
    // but not falsy — checking for undefined keeps that a cache hit instead of
    // re-querying on every punch of a blocked employee.
    if (cached !== undefined && cached !== null) return cached;

    const rows = await this.prisma.employeeGeofence.findMany({
      where: {
        tenantId,
        employeeId,
        deletedAt: null,
        geofence: { active: true, deletedAt: null },
      },
      select: {
        geofence: {
          select: {
            id: true,
            latitude: true,
            longitude: true,
            radiusMeters: true,
          },
        },
      },
    });

    const geofences = rows.map((r) => r.geofence);
    await this.cacheManager.set(key, geofences, GEOFENCE_CACHE_TTL_MS);
    return geofences;
  }

  /**
   * Punch-path check. Distinguishes the two failure modes the caller must
   * report differently: an employee with no assignment at all needs an admin
   * to act, while an assigned employee standing in the wrong place just needs
   * to move.
   */
  async checkAssigned(
    tenantId: string,
    employeeId: string,
    latitude: number,
    longitude: number,
  ): Promise<
    | { readonly status: 'INSIDE'; readonly geofenceId: string }
    | { readonly status: 'NO_ASSIGNMENT' }
    | { readonly status: 'OUTSIDE' }
  > {
    const assigned = await this.getAssigned(tenantId, employeeId);
    if (assigned.length === 0) return { status: 'NO_ASSIGNMENT' };

    const match = assigned.find(
      (g) =>
        haversineMeters(latitude, longitude, g.latitude, g.longitude) <=
        g.radiusMeters,
    );
    return match
      ? { status: 'INSIDE', geofenceId: match.id }
      : { status: 'OUTSIDE' };
  }

  /** Call after any geofence mutation so changes apply immediately. */
  async invalidate(tenantId: string): Promise<void> {
    await this.cacheManager.del(this.key(tenantId));
  }

  /**
   * Call after assigning/unassigning. Only the affected employees are dropped,
   * so one roster edit does not cost every other employee a cache miss.
   */
  async invalidateEmployees(
    tenantId: string,
    employeeIds: readonly string[],
  ): Promise<void> {
    await Promise.all(
      employeeIds.map((id) =>
        this.cacheManager.del(this.employeeKey(tenantId, id)),
      ),
    );
  }
}
