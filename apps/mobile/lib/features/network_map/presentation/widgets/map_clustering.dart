import 'dart:ui';

// ─────────────────────────────────────────────────────────────────────────────
// Grid clustering for the connection map (3.7_ConnectionMap). Same algorithm
// as the admin map (apps/admin/.../network/map-clustering.ts): points are
// bucketed into fixed-size cells in screen pixels at the current zoom, so
// panning keeps the grid and only a zoom change regroups.
// ─────────────────────────────────────────────────────────────────────────────

/// At or above this zoom every node is drawn on its own.
const clusterMaxZoom = 16.0;

/// Cell size in screen pixels.
const clusterCellPx = 56.0;

class ProjectedPoint<T> {
  const ProjectedPoint(this.offset, this.item);

  /// Pixel position at the current zoom (absolute, e.g. projectAtZoom).
  final Offset offset;
  final T item;
}

class PointCluster<T> {
  const PointCluster(this.items, this.offset);

  final List<T> items;

  /// Mean pixel position of the members.
  final Offset offset;

  bool get isSingle => items.length == 1;
}

/// Groups points that share a grid cell. Below [maxZoom] a cell with two or
/// more points becomes one cluster; singletons (and everything at [maxZoom]+)
/// come back as clusters of one. Order follows the first point in each cell.
List<PointCluster<T>> clusterPoints<T>(
  List<ProjectedPoint<T>> points,
  double zoom, {
  double cellPx = clusterCellPx,
  double maxZoom = clusterMaxZoom,
}) {
  if (zoom >= maxZoom) {
    return [
      for (final p in points) PointCluster<T>([p.item], p.offset),
    ];
  }
  final cells = <String, List<ProjectedPoint<T>>>{};
  for (final p in points) {
    final key =
        '${(p.offset.dx / cellPx).floor()}:${(p.offset.dy / cellPx).floor()}';
    (cells[key] ??= []).add(p);
  }
  return [
    for (final members in cells.values)
      PointCluster<T>(
        [for (final m in members) m.item],
        Offset(
          members.fold<double>(0, (s, m) => s + m.offset.dx) / members.length,
          members.fold<double>(0, (s, m) => s + m.offset.dy) / members.length,
        ),
      ),
  ];
}

/// Coordinate key used to match link endpoints to drawn nodes.
String coordKey(double lat, double lng) =>
    '${lat.toStringAsFixed(7)},${lng.toStringAsFixed(7)}';
