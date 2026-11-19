import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/auth_session.dart';
import 'network_map_notifier.dart';
import 'network_map_state.dart';
import 'widgets/free_map_view.dart';

/// Connection Map (3.7_ConnectionMap): OLTE → customer topology on a real
/// map, for tenant admins (all connections, filterable) and employees
/// (assigned routes by default when permitted).
/// "5 min ago", "3 h ago", "2 days ago" for the offline banner.
String savedAgo(DateTime savedAt, [DateTime? now]) {
  final diff = (now ?? DateTime.now()).difference(savedAt);
  if (diff.inMinutes < 1) return 'just now';
  if (diff.inMinutes < 60) return '${diff.inMinutes} min ago';
  if (diff.inHours < 24) return '${diff.inHours} h ago';
  final days = diff.inDays;
  return days == 1 ? '1 day ago' : '$days days ago';
}

class NetworkMapScreen extends ConsumerStatefulWidget {
  const NetworkMapScreen({super.key});

  @override
  ConsumerState<NetworkMapScreen> createState() => _NetworkMapScreenState();
}

class _NetworkMapScreenState extends ConsumerState<NetworkMapScreen> {
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
    final isEmployee = (AuthSession.instance.roleCode ?? '').startsWith(
      'EMPLOYEE',
    );

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
          if (state.mapData.offlineSavedAt case final savedAt?)
            Container(
              width: double.infinity,
              color: Colors.blueGrey.shade100,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              child: Text(
                'Offline — showing the map saved ${savedAgo(savedAt)}. '
                'Map tiles appear for areas viewed before.',
                style: const TextStyle(fontSize: 12),
              ),
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
                // One map library on mobile (flutter_map); the tile source
                // follows the Super Admin platform map setting.
                FreeMapView(
                  data: state.mapData,
                  config: state.mapConfig,
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
                Positioned(right: 12, bottom: 24, child: _Legend()),
              ],
            ),
          ),
        ],
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
            for (final entry in networkStatusColors.entries)
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
                    networkStatusColors[detail.status] ?? Colors.blueGrey,
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (detail.customerName != null)
            _row(
              'Customer',
              '${detail.customerName} (${detail.customerCode ?? '—'})',
            ),
          _row('Type', '${detail.nodeType} / ${detail.connectionType ?? '—'}'),
          if (detail.olteCode != null) _row('OLTE', detail.olteCode!),
          if (detail.parentConnectionCode != null)
            _row('Parent', detail.parentConnectionCode!),
          _row('Downstream', '${detail.downstreamCount} node(s)'),
          if (detail.cableType != null)
            _row(
              'Cable',
              '${detail.cableType} ${detail.fiberCoreDetails ?? ''}'.trim(),
            ),
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
          Expanded(child: Text(value, style: const TextStyle(fontSize: 13))),
        ],
      ),
    );
  }
}
