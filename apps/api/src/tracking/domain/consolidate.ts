// Pure daily-consolidation logic: collapse a day's raw pings into field-time
// plus the places the operator dwelled longest. No I/O — unit-tested directly.

export interface RawPoint {
  readonly latitude: number;
  readonly longitude: number;
  readonly capturedAt: Date;
}

export interface TopPlace {
  readonly latitude: number;
  readonly longitude: number;
  readonly minutes: number;
  readonly pings: number;
}

export interface DailySummary {
  readonly minutesInField: number;
  readonly firstFixAt: Date;
  readonly lastFixAt: Date;
  readonly pointCount: number;
  readonly topPlaces: TopPlace[];
}

// Points within this radius are treated as the same "place". ~100m absorbs GPS
// jitter while keeping distinct sites (a tower vs an office) apart.
const CLUSTER_RADIUS_M = 100;
const MAX_TOP_PLACES = 5;
const EARTH_RADIUS_M = 6371000;

function haversineMeters(a: RawPoint | Place, b: RawPoint | Place): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) *
      Math.cos(toRad(b.latitude)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

interface Place {
  latitude: number;
  longitude: number;
  latSum: number;
  lngSum: number;
  pings: number;
  dwellMs: number;
  lastAt: number;
}

/**
 * Consolidate one employee's pings for a single day.
 *
 * Dwell time is credited to a place as the gap between a ping and the previous
 * ping (capped, so a long idle gap after leaving isn't miscounted as dwell).
 * Places are merged by proximity so revisits to the same spot accumulate,
 * then ranked by dwell minutes; the top 5 are kept. Returns null for an empty
 * day (nothing to summarise).
 */
export function consolidateDay(
  points: readonly RawPoint[],
): DailySummary | null {
  if (points.length === 0) return null;

  const sorted = [...points].sort(
    (a, b) => a.capturedAt.getTime() - b.capturedAt.getTime(),
  );
  const firstFixAt = sorted[0].capturedAt;
  const lastFixAt = sorted[sorted.length - 1].capturedAt;

  // A single fix means no measurable field time and one place.
  const places: Place[] = [];
  let prevAt: number | null = null;

  // Cap credited dwell per interval: with a 10-min cadence a fix stands in for
  // ~10 min of presence; a much larger gap (came back online after hours) must
  // not inflate dwell. 20 min covers a 10-min cadence with slack.
  const MAX_DWELL_PER_STEP_MS = 20 * 60 * 1000;

  for (const p of sorted) {
    const at = p.capturedAt.getTime();
    const step =
      prevAt === null ? 0 : Math.min(at - prevAt, MAX_DWELL_PER_STEP_MS);
    prevAt = at;

    let place = places.find((pl) => haversineMeters(pl, p) <= CLUSTER_RADIUS_M);
    if (!place) {
      place = {
        latitude: p.latitude,
        longitude: p.longitude,
        latSum: 0,
        lngSum: 0,
        pings: 0,
        dwellMs: 0,
        lastAt: at,
      };
      places.push(place);
    }
    place.latSum += p.latitude;
    place.lngSum += p.longitude;
    place.pings += 1;
    place.dwellMs += step;
    place.lastAt = at;
    // Re-centre on the running mean so the cluster tracks its true centroid.
    place.latitude = place.latSum / place.pings;
    place.longitude = place.lngSum / place.pings;
  }

  const topPlaces: TopPlace[] = places
    .sort((a, b) => b.dwellMs - a.dwellMs)
    .slice(0, MAX_TOP_PLACES)
    .map((pl) => ({
      latitude: round6(pl.latitude),
      longitude: round6(pl.longitude),
      minutes: Math.round(pl.dwellMs / 60000),
      pings: pl.pings,
    }));

  return {
    minutesInField: Math.round(
      (lastFixAt.getTime() - firstFixAt.getTime()) / 60000,
    ),
    firstFixAt,
    lastFixAt,
    pointCount: sorted.length,
    topPlaces,
  };
}

function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}
