import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../network_map_state.dart';
import 'map_clustering.dart';

const networkStatusColors = <String, Color>{
  'ACTIVE': Color(0xFF2E7D32),
  'PENDING_INSTALLATION': Color(0xFFF9A825),
  'SUSPENDED': Color(0xFFEF6C00),
  'DISCONNECTED': Color(0xFFC62828),
  'FAULTY': Color(0xFF212121),
  'MAINTENANCE': Color(0xFF6A1B9A),
};

const _olteColor = Color(0xFF1565C0);

const _osmTiles = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

/// Tile source for the platform map setting. flutter_map is the only map
/// library on mobile: MAPBOX uses Mapbox raster tiles when a key is set;
/// everything else (OPENSTREETMAP, and GOOGLE_MAPS, whose tiles may not be
/// used outside Google's own SDK) uses OpenStreetMap.
String tileUrlFor(MapProviderConfig config) {
  if (config.provider == 'MAPBOX' && config.mapboxKey.isNotEmpty) {
    return 'https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}'
        '?access_token=${config.mapboxKey}';
  }
  return _osmTiles;
}

/// Tiles kept on the device for offline use (flutter_map's built-in cache).
const mapTileCacheBytes = 200 * 1024 * 1024;

/// How long a cached tile is served without asking the server again. Tiles
/// are only cached as they are viewed (no bulk download — OSM's tile policy
/// forbids it), and a stale tile cannot be shown offline, so this is what
/// lets a technician open an area they viewed in the last month without
/// signal.
const mapTileFreshAge = Duration(days: 30);

/// Cache key for a tile URL, ignoring the query string so a rotated Mapbox
/// access token does not throw the cache away.
String tileCacheKey(String url) {
  final q = url.indexOf('?');
  return BuiltInMapCachingProvider.uuidTileKeyGenerator(
    q < 0 ? url : url.substring(0, q),
  );
}

/// Attribution text required by the tile provider's terms.
String attributionFor(MapProviderConfig config) =>
    tileUrlFor(config) == _osmTiles
    ? '© OpenStreetMap contributors'
    : '© Mapbox © OpenStreetMap contributors';

/// Disconnected links are dashed so they read differently from a red
/// (FAULTY-adjacent) solid line at a glance.
bool isDashedEdge(String status) => status == 'DISCONNECTED';

/// Connection map on flutter_map: OLTEs, customer nodes and the links
/// between them, fitted to the visible nodes.
class FreeMapView extends StatefulWidget {
  const FreeMapView({
    super.key,
    required this.data,
    required this.config,
    required this.onNodeTap,
  });

  final NetworkMapData data;
  final MapProviderConfig config;
  final void Function(MapNode node) onNodeTap;

  @override
  State<FreeMapView> createState() => _FreeMapViewState();
}

class _FreeMapViewState extends State<FreeMapView> {
  final MapController _controller = MapController();
  bool _ready = false;

  @override
  void didUpdateWidget(FreeMapView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.data != widget.data && _ready) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _fitBounds());
    }
  }

  void _fitBounds() {
    final nodes = widget.data.nodes;
    if (nodes.isEmpty || !mounted) return;
    if (nodes.length == 1) {
      _controller.move(LatLng(nodes.first.latitude, nodes.first.longitude), 15);
      return;
    }
    _controller.fitCamera(
      CameraFit.bounds(
        bounds: LatLngBounds.fromPoints([
          for (final n in nodes) LatLng(n.latitude, n.longitude),
        ]),
        padding: const EdgeInsets.all(48),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return FlutterMap(
      mapController: _controller,
      options: MapOptions(
        initialCenter: const LatLng(13.6288, 79.4192),
        initialZoom: 12,
        onMapReady: () {
          _ready = true;
          _fitBounds();
        },
      ),
      children: [
        TileLayer(
          urlTemplate: tileUrlFor(widget.config),
          userAgentPackageName: 'com.vellasoft.pingforce',
          tileProvider: NetworkTileProvider(
            cachingProvider: BuiltInMapCachingProvider.getOrCreateInstance(
              maxCacheSize: mapTileCacheBytes,
              overrideFreshAge: mapTileFreshAge,
              tileKeyGenerator: tileCacheKey,
            ),
          ),
        ),
        _ClusteredNetworkLayer(data: widget.data, onNodeTap: widget.onNodeTap),
        SimpleAttributionWidget(source: Text(attributionFor(widget.config))),
      ],
    );
  }
}

/// Links and nodes at the current zoom. Below [clusterMaxZoom], connection
/// nodes sharing a grid cell collapse into a count bubble (tap to zoom in);
/// OLTEs are never clustered. Links are drawn only between nodes shown on
/// their own. Reads the camera, so it rebuilds as the map moves; clusters
/// are cached per whole zoom level so panning does not regroup.
class _ClusteredNetworkLayer extends StatefulWidget {
  const _ClusteredNetworkLayer({required this.data, required this.onNodeTap});

  final NetworkMapData data;
  final void Function(MapNode node) onNodeTap;

  @override
  State<_ClusteredNetworkLayer> createState() => _ClusteredNetworkLayerState();
}

class _ClusteredNetworkLayerState extends State<_ClusteredNetworkLayer> {
  NetworkMapData? _cachedData;
  int? _cachedZoom;
  List<PointCluster<MapNode>> _clusters = const [];

  List<PointCluster<MapNode>> _clustersFor(MapCamera camera) {
    final zoom = camera.zoom.floor();
    if (identical(_cachedData, widget.data) && _cachedZoom == zoom) {
      return _clusters;
    }
    _cachedData = widget.data;
    _cachedZoom = zoom;
    _clusters = clusterPoints([
      for (final n in widget.data.nodes)
        if (!n.isOlte)
          ProjectedPoint(
            camera.projectAtZoom(
              LatLng(n.latitude, n.longitude),
              zoom.toDouble(),
            ),
            n,
          ),
    ], zoom.toDouble());
    return _clusters;
  }

  @override
  Widget build(BuildContext context) {
    final camera = MapCamera.of(context);
    final clusters = _clustersFor(camera);
    final zoom = camera.zoom.floor().toDouble();

    final drawn = <String>{
      for (final n in widget.data.nodes)
        if (n.isOlte) coordKey(n.latitude, n.longitude),
      for (final c in clusters)
        if (c.isSingle)
          coordKey(c.items.first.latitude, c.items.first.longitude),
    };

    return Stack(
      children: [
        PolylineLayer(
          polylines: [
            for (final edge in widget.data.edges)
              if (drawn.contains(coordKey(edge.fromLat, edge.fromLng)) &&
                  drawn.contains(coordKey(edge.toLat, edge.toLng)))
                Polyline(
                  points: [
                    LatLng(edge.fromLat, edge.fromLng),
                    LatLng(edge.toLat, edge.toLng),
                  ],
                  color: networkStatusColors[edge.status] ?? Colors.blueGrey,
                  strokeWidth: 3,
                  pattern: isDashedEdge(edge.status)
                      ? StrokePattern.dashed(segments: const [12, 8])
                      : const StrokePattern.solid(),
                ),
          ],
        ),
        MarkerLayer(
          markers: [
            for (final c in clusters)
              if (c.isSingle)
                _nodeMarker(c.items.first)
              else
                _clusterMarker(c, camera.unprojectAtZoom(c.offset, zoom)),
            for (final n in widget.data.nodes)
              if (n.isOlte) _nodeMarker(n),
          ],
        ),
      ],
    );
  }

  Marker _clusterMarker(PointCluster<MapNode> cluster, LatLng center) {
    final count = cluster.items.length;
    final size = count < 10 ? 32.0 : (count < 100 ? 38.0 : 46.0);
    return Marker(
      point: center,
      width: size,
      height: size,
      child: Semantics(
        button: true,
        label: '$count connections, tap to zoom in',
        child: GestureDetector(
          onTap: () {
            final controller = MapController.maybeOf(context);
            if (controller == null) return;
            controller.fitCamera(
              CameraFit.coordinates(
                coordinates: [
                  for (final n in cluster.items)
                    LatLng(n.latitude, n.longitude),
                ],
                padding: const EdgeInsets.all(64),
                maxZoom: clusterMaxZoom + 1,
              ),
            );
          },
          child: Container(
            alignment: Alignment.center,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: _olteColor.withValues(alpha: 0.85),
              border: Border.all(color: Colors.white, width: 3),
              boxShadow: const [
                BoxShadow(color: Color(0x59000000), blurRadius: 4),
              ],
            ),
            child: Text(
              '$count',
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w600,
                fontSize: 12,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Marker _nodeMarker(MapNode node) {
    return Marker(
      point: LatLng(node.latitude, node.longitude),
      width: node.isOlte ? 28 : 22,
      height: node.isOlte ? 28 : 22,
      child: Tooltip(
        message: node.isOlte
            ? '${node.code} · ${node.name}'
            : '${node.code} · ${node.name} · ${node.status}',
        child: GestureDetector(
          onTap: node.isOlte ? null : () => widget.onNodeTap(node),
          child: Container(
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: node.isOlte
                  ? _olteColor
                  : networkStatusColors[node.status] ?? Colors.blueGrey,
              border: Border.all(color: Colors.white, width: 2),
            ),
            child: node.isOlte
                ? const Icon(Icons.router, size: 14, color: Colors.white)
                : null,
          ),
        ),
      ),
    );
  }
}
