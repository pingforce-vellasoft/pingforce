import { consolidateDay, RawPoint } from './consolidate';

/**
 * Daily consolidation: a day of raw pings → field-time + top dwell places.
 */

const at = (iso: string) => new Date(iso);
// Two well-separated sites (>100m apart); jitter stays inside one cluster.
const SITE_A = { latitude: 12.9, longitude: 77.6 };
const SITE_B = { latitude: 12.95, longitude: 77.65 }; // ~7km from A

function p(site: { latitude: number; longitude: number }, iso: string): RawPoint {
  return { ...site, capturedAt: at(iso) };
}

describe('consolidateDay', () => {
  it('returns null for an empty day', () => {
    expect(consolidateDay([])).toBeNull();
  });

  it('computes field-time from first to last fix', () => {
    const s = consolidateDay([
      p(SITE_A, '2026-07-19T09:00:00Z'),
      p(SITE_A, '2026-07-19T17:00:00Z'),
    ]);
    expect(s?.minutesInField).toBe(480); // 8h
    expect(s?.pointCount).toBe(2);
  });

  it('ranks the place with more dwell time first', () => {
    // 4 fixes at A (spans 30m dwell), 2 at B (spans 10m) — A should win.
    const s = consolidateDay([
      p(SITE_A, '2026-07-19T09:00:00Z'),
      p(SITE_A, '2026-07-19T09:10:00Z'),
      p(SITE_A, '2026-07-19T09:20:00Z'),
      p(SITE_A, '2026-07-19T09:30:00Z'),
      p(SITE_B, '2026-07-19T10:00:00Z'),
      p(SITE_B, '2026-07-19T10:10:00Z'),
    ]);
    expect(s).not.toBeNull();
    expect(s!.topPlaces.length).toBe(2);
    expect(s!.topPlaces[0].latitude).toBeCloseTo(SITE_A.latitude, 2);
    expect(s!.topPlaces[0].minutes).toBeGreaterThanOrEqual(
      s!.topPlaces[1].minutes,
    );
    expect(s!.topPlaces[0].pings).toBe(4);
  });

  it('merges nearby jittered pings into one place', () => {
    // Three fixes within ~a few metres — one cluster, not three.
    const s = consolidateDay([
      p({ latitude: 12.9, longitude: 77.6 }, '2026-07-19T09:00:00Z'),
      p({ latitude: 12.90005, longitude: 77.60005 }, '2026-07-19T09:10:00Z'),
      p({ latitude: 12.89995, longitude: 77.59995 }, '2026-07-19T09:20:00Z'),
    ]);
    expect(s!.topPlaces.length).toBe(1);
    expect(s!.topPlaces[0].pings).toBe(3);
  });

  it('keeps at most 5 places', () => {
    // 6 distinct sites, each ~1km+ apart.
    const points: RawPoint[] = Array.from({ length: 6 }, (_, i) =>
      p(
        { latitude: 12.9 + i * 0.02, longitude: 77.6 + i * 0.02 },
        `2026-07-19T${String(9 + i).padStart(2, '0')}:00:00Z`,
      ),
    );
    const s = consolidateDay(points);
    expect(s!.topPlaces.length).toBe(5);
  });

  it('does not credit a huge offline gap as dwell', () => {
    // Two fixes at A 6 hours apart: field-time is 360m but neither place's
    // dwell may absorb the whole gap (capped per step).
    const s = consolidateDay([
      p(SITE_A, '2026-07-19T09:00:00Z'),
      p(SITE_A, '2026-07-19T15:00:00Z'),
    ]);
    expect(s!.minutesInField).toBe(360);
    expect(s!.topPlaces[0].minutes).toBeLessThanOrEqual(20);
  });
});
