import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../../../core/auth/auth_session.dart';
import 'network_map_notifier.dart';
import 'network_map_state.dart';
import 'widgets/free_map_view.dart';

const _statusColors = <String, Color>{
  'ACTIVE': Color(0xFF2E7D32),
  'PENDING_INSTALLATION': Color(0xFFF9A825),
  'SUSPENDED': Color(0xFFEF6C00),
  'DISCONNECTED': Color(0xFFC62828),
  'FAULTY': Color(0xFF212121),
  'MAINTENANCE': Color(0xFF6A1B9A),
};

double _statusHue(String status) {
  switch (status) {
    case 'ACTIVE':
      return BitmapDescriptor.hueGreen;
    case 'PENDING_INSTALLATION':
      return BitmapDescriptor.hueYellow;
    case 'SUSPENDED':
      return BitmapDescriptor.hueOrange;
    case 'DISCONNECTED':
      return BitmapDescriptor.hueRed;
    case 'FAULTY':
      return BitmapDescriptor.hueViolet;
    default:
      return BitmapDescriptor.hueCyan;
  }
}

/// Connection Map (3.7_ConnectionMap): OLTE → customer topology on a real
/// map, for tenant admins (all connections, filterable) and employees
/// (assigned routes by default when permitted).
class NetworkMapScreen extends ConsumerStatefulWidget {
  const NetworkMapScreen({super.key});

  @override
  ConsumerState<NetworkMapScreen> createState() => _NetworkMapScreenState();
}

class _NetworkMapScreenState extends ConsumerState<NetworkMapScreen> {
  GoogleMapController? _controller;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(networkMapNotifierProvider.notifier).init();
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(networkMapNotifierProvider);
    final notifier = ref.read(networkMapNotifierProvider.notifier);
    final isEmployee =
        (AuthSession.instance.roleCode ?? '').startsWith('EMPLOYEE');

    ref.listen(networkMapNotifierProvider, (previous, next) {
      if (previous?.mapData != next.mapData) {
        _fitBounds(next.mapData);
      }
    });

    if (state.featureDisabled) {
      return Scaffold(
        appBar: AppBar(title: const Text('Connection Map')),
        body: const Center(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Text(
              'The Connection Map module is not enabled for your account. '
              'Contact your administrator.',
              textAlign: TextAlign.center,
            ),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Connection Map'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: notifier.refresh,
          ),
        ],
      ),
      body: Column(
        children: [
          _FilterBar(
            state: state,
            notifier: notifier,
            showAssignedToggle: isEmployee,
          ),
          if (state.mapData.truncated)
            Container(
              width: double.infinity,
              color: Colors.orange.shade100,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              child: const Text(
                'Too many nodes to show at once — narrow the filters.',
                style: TextStyle(fontSize: 12),
              ),
            ),
          Expanded(
            child: Stack(
              children: [
                // Provider comes from the Super Admin platform setting:
                // GOOGLE_MAPS → native Google map; OSM/Mapbox → flutter_map.
                if (state.mapConfig.useGoogle)
                  GoogleMap(
                    initialCameraPosition: const CameraPosition(
                      target: LatLng(13.6288, 79.4192),
                      zoom: 12,
                    ),
                    markers: _buildMarkers(state.mapData),
                    polylines: _buildPolylines(state.mapData),
                    onMapCreated: (controller) {
                      _controller = controller;
                      _fitBounds(state.mapData);
                    },
                    myLocationButtonEnabled: false,
                  )
                else
                  FreeMapView(
                    data: state.mapData,
                    mapboxKey: state.mapConfig.provider == 'MAPBOX'
                        ? state.mapConfig.mapboxKey
                        : '',
                    onNodeTap: (node) => _openDetail(node.id),
                  ),
                if (state.isLoading)
                  const Positioned.fill(
                    child: ColoredBox(
                      color: Color(0x66FFFFFF),
                      child: Center(child: CircularProgressIndicator()),
                    ),
                  ),
                if (state.errorMessage != null)
                  Positioned(
                    left: 16,
                    right: 16,
                    bottom: 24,
                    child: Material(
                      color: Colors.red.shade700,
                      borderRadius: BorderRadius.circular(8),
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Text(
                          state.errorMessage!,
                          style: const TextStyle(color: Colors.white),
                        ),
                      ),
                    ),
                  ),
                Positioned(
                  right: 12,
                  bottom: 24,
                  child: _Legend(),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Set<Marker> _buildMarkers(NetworkMapData data) {
    return data.nodes.map((node) {
      return Marker(
        markerId: MarkerId(node.id),
        position: LatLng(node.latitude, node.longitude),
        icon: node.isOlte
            ? BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueAzure)
            : BitmapDescriptor.defaultMarkerWithHue(_statusHue(node.status)),
        infoWindow: InfoWindow(
          title: node.code,
          snippet: node.isOlte ? node.name : '${node.name} • ${node.status}',
        ),
        onTap: node.isOlte ? null : () => _openDetail(node.id),
      );
    }).toSet();
  }

  Set<Polyline> _buildPolylines(NetworkMapData data) {
    var index = 0;
    return data.edges.map((edge) {
      index++;
      return Polyline(
        polylineId: PolylineId('edge-$index'),
        points: [
          LatLng(edge.fromLat, edge.fromLng),
          LatLng(edge.toLat, edge.toLng),
        ],
        color: _statusColors[edge.status] ?? Colors.blueGrey,
        width: 3,
        patterns: edge.status == 'DISCONNECTED'
            ? [PatternItem.dash(12), PatternItem.gap(8)]
            : const [],
      );
    }).toSet();
  }

  void _fitBounds(NetworkMapData data) {
    if (_controller == null || data.nodes.isEmpty) return;
    var minLat = data.nodes.first.latitude;
    var maxLat = data.nodes.first.latitude;
    var minLng = data.nodes.first.longitude;
    var maxLng = data.nodes.first.longitude;
    for (final node in data.nodes) {
      if (node.latitude < minLat) minLat = node.latitude;
      if (node.latitude > maxLat) maxLat = node.latitude;
      if (node.longitude < minLng) minLng = node.longitude;
      if (node.longitude > maxLng) maxLng = node.longitude;
    }
    _controller!.animateCamera(
      CameraUpdate.newLatLngBounds(
        LatLngBounds(
          southwest: LatLng(minLat, minLng),
          northeast: LatLng(maxLat, maxLng),
        ),
        60,
      ),
    );
  }

  Future<void> _openDetail(String connectionId) async {
    final detail = await ref
        .read(networkMapNotifierProvider.notifier)
        .loadConnection(connectionId);
    if (detail == null || !mounted) return;
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (_) => _ConnectionDetailSheet(detail: detail),
    );
  }
}

class _FilterBar extends StatelessWidget {
  const _FilterBar({
    required this.state,
    required this.notifier,
    required this.showAssignedToggle,
  });

  final NetworkMapState state;
  final NetworkMapNotifier notifier;
  final bool showAssignedToggle;

  @override
  Widget build(BuildContext context) {
    final filters = state.filters;
    final oltes = notifier.visibleOltes();
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: Row(
        children: [
          if (showAssignedToggle) ...[
            FilterChip(
              label: const Text('My routes'),
              selected: state.assignedOnly,
              onSelected: notifier.setAssignedOnly,
            ),
            const SizedBox(width: 8),
          ],
          if (!state.assignedOnly) ...[
            if (filters.districts.isNotEmpty) ...[
              _Dropdown(
                hint: 'District',
                value: state.selectedDistrict,
                options: filters.districts,
                allLabel: 'All districts',
                onChanged: notifier.selectDistrict,
              ),
              const SizedBox(width: 8),
            ],
            if (filters.areas.isNotEmpty) ...[
              _Dropdown(
                hint: 'Area',
                value: state.selectedArea,
                options: filters.areas,
                allLabel: 'All areas',
                onChanged: notifier.selectArea,
              ),
              const SizedBox(width: 8),
            ],
            _Dropdown(
              hint: 'OLTE',
              value: state.selectedOlteId,
              options: [for (final o in oltes) o.id],
              labels: {for (final o in oltes) o.id: o.code},
              allLabel: 'All OLTEs',
              onChanged: notifier.selectOlte,
            ),
            const SizedBox(width: 8),
            _Dropdown(
              hint: 'Status',
              value: state.selectedStatus,
              options: filters.statuses,
              allLabel: 'All statuses',
              onChanged: notifier.selectStatus,
            ),
          ],
        ],
      ),
    );
  }
}

class _Dropdown extends StatelessWidget {
  const _Dropdown({
    required this.hint,
    required this.value,
    required this.options,
    required this.allLabel,
    required this.onChanged,
    this.labels,
  });

  final String hint;
  final String value;
  final List<String> options;
  final String allLabel;
  final Map<String, String>? labels;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10),
      decoration: BoxDecoration(
        border: Border.all(color: Colors.grey.shade400),
        borderRadius: BorderRadius.circular(8),
      ),
      child: DropdownButton<String>(
        value: options.contains(value) ? value : '',
        hint: Text(hint),
        underline: const SizedBox.shrink(),
        items: [
          DropdownMenuItem(value: '', child: Text(allLabel)),
          for (final option in options)
            DropdownMenuItem(
              value: option,
              child: Text(labels?[option] ?? option),
            ),
        ],
        onChanged: (selected) => onChanged(selected ?? ''),
      ),
    );
  }
}

class _Legend extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Material(
      elevation: 2,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.all(8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            _legendRow(const Color(0xFF1565C0), 'OLTE'),
            for (final entry in _statusColors.entries)
              _legendRow(entry.value, entry.key.replaceAll('_', ' ')),
          ],
        ),
      ),
    );
  }

  Widget _legendRow(Color color, String label) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 1),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 10,
            height: 10,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 6),
          Text(label, style: const TextStyle(fontSize: 11)),
        ],
      ),
    );
  }
}

class _ConnectionDetailSheet extends StatelessWidget {
  const _ConnectionDetailSheet({required this.detail});

  final ConnectionDetail detail;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  detail.connectionCode,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ),
              Chip(
                label: Text(
                  detail.status,
                  style: const TextStyle(color: Colors.white, fontSize: 11),
                ),
                backgroundColor:
                    _statusColors[detail.status] ?? Colors.blueGrey,
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (detail.customerName != null)
            _row('Customer',
                '${detail.customerName} (${detail.customerCode ?? '—'})'),
          _row('Type', '${detail.nodeType} / ${detail.connectionType ?? '—'}'),
          if (detail.olteCode != null) _row('OLTE', detail.olteCode!),
          if (detail.parentConnectionCode != null)
            _row('Parent', detail.parentConnectionCode!),
          _row('Downstream', '${detail.downstreamCount} node(s)'),
          if (detail.cableType != null)
            _row('Cable',
                '${detail.cableType} ${detail.fiberCoreDetails ?? ''}'.trim()),
          if (detail.distanceMeters != null)
            _row('Distance', '${detail.distanceMeters!.toStringAsFixed(0)} m'),
          if (detail.installationDate != null)
            _row(
              'Installed',
              '${detail.installationDate!.day}/${detail.installationDate!.month}/${detail.installationDate!.year}',
            ),
          if (detail.remarks != null && detail.remarks!.isNotEmpty)
            _row('Remarks', detail.remarks!),
        ],
      ),
    );
  }

  Widget _row(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 110,
            child: Text(
              label,
              style: const TextStyle(color: Colors.grey, fontSize: 13),
            ),
          ),
          Expanded(
            child: Text(value, style: const TextStyle(fontSize: 13)),
          ),
        ],
      ),
    );
  }
}
