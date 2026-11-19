import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../network_map_state.dart';

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
        ),
        PolylineLayer(
          polylines: [
            for (final edge in widget.data.edges)
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
            for (final node in widget.data.nodes)
              Marker(
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
                            : networkStatusColors[node.status] ??
                                  Colors.blueGrey,
                        border: Border.all(color: Colors.white, width: 2),
                      ),
                      child: node.isOlte
                          ? const Icon(
                              Icons.router,
                              size: 14,
                              color: Colors.white,
                            )
                          : null,
                    ),
                  ),
                ),
              ),
          ],
        ),
        SimpleAttributionWidget(source: Text(attributionFor(widget.config))),
      ],
    );
  }
}
