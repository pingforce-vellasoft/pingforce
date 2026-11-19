import { CLUSTER_MAX_ZOOM, clusterPoints, coordKey } from './map-clustering';

const pt = (x: number, y: number, item: string) => ({ x, y, item });

describe('clusterPoints', () => {
  it('merges points that share a grid cell and averages their position', () => {
    const result = clusterPoints(
      [pt(10, 10, 'a'), pt(30, 20, 'b'), pt(200, 200, 'c')],
      12,
      56,
    );
    expect(result).toEqual([
      { items: ['a', 'b'], x: 20, y: 15 },
      { items: ['c'], x: 200, y: 200 },
    ]);
  });

  it('keeps points in different cells apart even when close', () => {
    const result = clusterPoints([pt(55, 0, 'a'), pt(57, 0, 'b')], 12, 56);
    expect(result.map((c) => c.items)).toEqual([['a'], ['b']]);
  });

  it('draws every point on its own at the max zoom and above', () => {
    const result = clusterPoints(
      [pt(10, 10, 'a'), pt(11, 11, 'b')],
      CLUSTER_MAX_ZOOM,
    );
    expect(result.map((c) => c.items)).toEqual([['a'], ['b']]);
  });

  it('handles negative pixel coordinates and an empty input', () => {
    expect(clusterPoints([], 10)).toEqual([]);
    const result = clusterPoints([pt(-1, -1, 'a'), pt(1, 1, 'b')], 10, 56);
    expect(result.length).toBe(2);
  });
});

describe('coordKey', () => {
  it('matches equal coordinates and separates distinct ones', () => {
    expect(coordKey(13.6288, 79.4192)).toBe(coordKey(13.6288, 79.4192));
    expect(coordKey(13.6288, 79.4192)).not.toBe(coordKey(13.6289, 79.4192));
  });
});
