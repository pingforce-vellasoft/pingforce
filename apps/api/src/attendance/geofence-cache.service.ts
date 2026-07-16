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
      where: { tenantId, active: true },
      select: { id: true, latitude: true, longitude: true, radiusMeters: true },
    });

    await this.cacheManager.set(
      this.key(tenantId),
      geofences,
      GEOFENCE_CACHE_TTL_MS,
    );
    return geofences;
  }

  /** True when the coordinate falls inside any active geofence of the tenant. */
  async isInsideAny(
    tenantId: string,
    latitude: number,
    longitude: number,
  ): Promise<boolean> {
    const geofences = await this.getActive(tenantId);
    return geofences.some(
      (g) =>
        haversineMeters(latitude, longitude, g.latitude, g.longitude) <=
        g.radiusMeters,
    );
  }

  /** Call after any geofence mutation so changes apply immediately. */
  async invalidate(tenantId: string): Promise<void> {
    await this.cacheManager.del(this.key(tenantId));
  }
}
