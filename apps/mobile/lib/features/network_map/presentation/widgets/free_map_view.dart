import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../network_map_state.dart';

const _statusColors = <String, Color>{
  'ACTIVE': Color(0xFF2E7D32),
  'PENDING_INSTALLATION': Color(0xFFF9A825),
  'SUSPENDED': Color(0xFFEF6C00),
  'DISCONNECTED': Color(0xFFC62828),
  'FAULTY': Color(0xFF212121),
  'MAINTENANCE': Color(0xFF6A1B9A),
};

const _olteColor = Color(0xFF1565C0);

/// Free-provider map (OpenStreetMap default, Mapbox raster with a key) —
/// used when the Super Admin platform setting is not GOOGLE_MAPS.
class FreeMapView extends StatefulWidget {
  const FreeMapView({
    super.key,
    required this.data,
    required this.mapboxKey,
    required this.onNodeTap,
  });

  final NetworkMapData data;
  final String mapboxKey;
  final void Function(MapNode node) onNodeTap;

  @override
  State<FreeMapView> createState() => _FreeMapViewState();
}

class _FreeMapViewState extends State<FreeMapView> {
  final MapController _controller = MapController();

  @override
  void didUpdateWidget(FreeMapView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.data != widget.data) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _fitBounds());
    }
  }

  void _fitBounds() {
    final nodes = widget.data.nodes;
    if (nodes.isEmpty) return;
    final points = [
      for (final n in nodes) LatLng(n.latitude, n.longitude),
    ];
    _controller.fitCamera(
      CameraFit.bounds(
        bounds: LatLngBounds.fromPoints(points),
        padding: const EdgeInsets.all(48),
      ),
    );
  }

  String get _tileUrl => widget.mapboxKey.isNotEmpty
      ? 'https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${widget.mapboxKey}'
      : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

  @override
  Widget build(BuildContext context) {
    return FlutterMap(
      mapController: _controller,
      options: const MapOptions(
        initialCenter: LatLng(13.6288, 79.4192),
        initialZoom: 12,
      ),
      children: [
        TileLayer(
          urlTemplate: _tileUrl,
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
                color: _statusColors[edge.status] ?? Colors.blueGrey,
                strokeWidth: 3,
              ),
          ],
        ),
        MarkerLayer(
          markers: [
            for (final node in widget.data.nodes)
              Marker(
                point: LatLng(node.latitude, node.longitude),
                width: node.isOlte ? 26 : 20,
                height: node.isOlte ? 26 : 20,
                child: GestureDetector(
                  onTap: node.isOlte ? null : () => widget.onNodeTap(node),
                  child: Container(
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: node.isOlte
                          ? _olteColor
                          : _statusColors[node.status] ?? Colors.blueGrey,
                      border: Border.all(color: Colors.white, width: 2),
                    ),
                    child: node.isOlte
                        ? const Icon(Icons.router,
                            size: 14, color: Colors.white)
                        : null,
                  ),
                ),
              ),
          ],
        ),
      ],
    );
  }
}
