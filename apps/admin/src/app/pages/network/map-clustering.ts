/**
 * Grid clustering for the connection map (3.7_ConnectionMap). Points are
 * bucketed into fixed-size cells in screen pixels at the current zoom, so the
 * result only changes when the zoom changes (panning keeps the same grid).
 * No dependency: the same algorithm runs on mobile (map_clustering.dart).
 */

/** At or above this zoom every node is drawn on its own. */
export const CLUSTER_MAX_ZOOM = 16;
/** Cell size in screen pixels. */
export const CLUSTER_CELL_PX = 56;

export interface ProjectedPoint<T> {
  /** Pixel position at the current zoom (absolute, e.g. Leaflet project()). */
  readonly x: number;
  readonly y: number;
  readonly item: T;
}

export interface PointCluster<T> {
  readonly items: T[];
  /** Mean pixel position of the members. */
  readonly x: number;
  readonly y: number;
}

/**
 * Groups points sharing a grid cell. Below `maxZoom` a cell with two or more
 * points becomes one cluster; singletons (and everything at `maxZoom`+)
 * come back as clusters of one, which callers draw as normal markers.
 * Output order follows the first point seen in each cell, so it is stable.
 */
export function clusterPoints<T>(
  points: readonly ProjectedPoint<T>[],
  zoom: number,
  cellPx = CLUSTER_CELL_PX,
  maxZoom = CLUSTER_MAX_ZOOM,
): PointCluster<T>[] {
  if (zoom >= maxZoom) {
    return points.map((p) => ({ items: [p.item], x: p.x, y: p.y }));
  }
  const cells = new Map<string, ProjectedPoint<T>[]>();
  for (const p of points) {
    const key = `${Math.floor(p.x / cellPx)}:${Math.floor(p.y / cellPx)}`;
    const cell = cells.get(key);
    if (cell) cell.push(p);
    else cells.set(key, [p]);
  }
  return [...cells.values()].map((members) => ({
    items: members.map((m) => m.item),
    x: members.reduce((sum, m) => sum + m.x, 0) / members.length,
    y: members.reduce((sum, m) => sum + m.y, 0) / members.length,
  }));
}

/** Coordinate key used to match link endpoints to drawn nodes. */
export function coordKey(lat: number, lng: number): string {
  return `${lat.toFixed(7)},${lng.toFixed(7)}`;
}
