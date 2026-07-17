import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/auth_session.dart';
import '../../../injection_container.dart';
import '../data/network_map_remote_data_source.dart';
import 'network_map_state.dart';

// ─────────────────────────────────────────────────────────────────────────────
// NETWORK MAP NOTIFIER (3.7_ConnectionMap)
// Employees default to "my routes"; tenant admins default to the first OLTE.
// Every filter change refetches the map server-side.
// ─────────────────────────────────────────────────────────────────────────────

final networkMapNotifierProvider =
    NotifierProvider<NetworkMapNotifier, NetworkMapState>(
        NetworkMapNotifier.new);

class NetworkMapNotifier extends Notifier<NetworkMapState> {
  @override
  NetworkMapState build() => const NetworkMapState(isLoading: true);

  NetworkMapRemoteDataSource get _dataSource =>
      sl<NetworkMapRemoteDataSource>();

  bool get _isEmployee {
    final role = AuthSession.instance.roleCode ?? '';
    return role.startsWith('EMPLOYEE');
  }

  Future<void> init() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      // Provider config failure must not block the map — default to OSM.
      try {
        state = state.copyWith(
          mapConfig: await _dataSource.fetchMapConfig(),
        );
      } catch (_) {}
      final filters = await _dataSource.fetchFilters();
      final assignedOnly = _isEmployee;
      // Default: first OLTE selected so big tenants never load everything.
      final defaultOlte =
          !assignedOnly && filters.oltes.isNotEmpty ? filters.oltes.first.id : '';
      state = state.copyWith(
        filters: filters,
        assignedOnly: assignedOnly,
        selectedOlteId: defaultOlte,
      );
      await _loadMap();
    } catch (e) {
      _handleError(e);
    }
  }

  Future<void> refresh() => _loadMap();

  Future<void> selectOlte(String olteId) async {
    state = state.copyWith(selectedOlteId: olteId);
    await _loadMap();
  }

  Future<void> selectArea(String area) async {
    state = state.copyWith(selectedArea: area);
    _reconcileOlteWithLocation();
    await _loadMap();
  }

  Future<void> selectDistrict(String district) async {
    state = state.copyWith(selectedDistrict: district);
    _reconcileOlteWithLocation();
    await _loadMap();
  }

  Future<void> selectStatus(String status) async {
    state = state.copyWith(selectedStatus: status);
    await _loadMap();
  }

  Future<void> setAssignedOnly(bool value) async {
    state = state.copyWith(assignedOnly: value);
    await _loadMap();
  }

  Future<ConnectionDetail?> loadConnection(String id) async {
    try {
      return await _dataSource.fetchConnection(id);
    } catch (_) {
      return null;
    }
  }

  /// OLTEs visible for the current area/district selection.
  List<OlteOption> visibleOltes() {
    return state.filters.oltes
        .where((o) =>
            (state.selectedArea.isEmpty || o.area == state.selectedArea) &&
            (state.selectedDistrict.isEmpty ||
                o.district == state.selectedDistrict))
        .toList(growable: false);
  }

  /// Keep the OLTE selection valid after an area/district change.
  void _reconcileOlteWithLocation() {
    final visible = visibleOltes();
    final current = state.selectedOlteId;
    if (current.isNotEmpty && !visible.any((o) => o.id == current)) {
      state = state.copyWith(
        selectedOlteId: visible.isNotEmpty ? visible.first.id : '',
      );
    }
  }

  Future<void> _loadMap() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final mapData = state.assignedOnly
          ? await _dataSource.fetchAssignedMap()
          : await _dataSource.fetchMap(
              olteId: state.selectedOlteId,
              area: state.selectedArea,
              district: state.selectedDistrict,
              status: state.selectedStatus,
            );
      state = state.copyWith(isLoading: false, mapData: mapData);
    } catch (e) {
      _handleError(e);
    }
  }

  void _handleError(Object error) {
    // 403 = module disabled for tenant / employee access NONE.
    if (error is DioException && error.response?.statusCode == 403) {
      state = state.copyWith(isLoading: false, featureDisabled: true);
      return;
    }
    state = state.copyWith(
      isLoading: false,
      errorMessage: 'Could not load the network map. Pull to retry.',
    );
  }
}
