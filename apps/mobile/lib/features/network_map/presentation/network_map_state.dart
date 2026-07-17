import 'package:flutter/foundation.dart';

/// Presentation models + immutable state for the Connection Map feature
/// (3.7_ConnectionMap). Hand-rolled copyWith — no codegen dependency.

@immutable
class OlteOption {
  const OlteOption({
    required this.id,
    required this.code,
    required this.name,
    this.area,
    this.district,
  });

  final String id;
  final String code;
  final String name;
  final String? area;
  final String? district;
}

@immutable
class NetworkFilters {
  const NetworkFilters({
    this.oltes = const [],
    this.areas = const [],
    this.districts = const [],
    this.statuses = const [],
  });

  final List<OlteOption> oltes;
  final List<String> areas;
  final List<String> districts;
  final List<String> statuses;
}

@immutable
class MapProviderConfig {
  const MapProviderConfig({
    this.provider = 'OPENSTREETMAP',
    this.mapboxKey = '',
  });

  final String provider; // OPENSTREETMAP | GOOGLE_MAPS | MAPBOX
  final String mapboxKey;

  bool get useGoogle => provider == 'GOOGLE_MAPS';
}

@immutable
class MapNode {
  const MapNode({
    required this.id,
    required this.isOlte,
    required this.code,
    required this.name,
    required this.status,
    required this.nodeType,
    required this.latitude,
    required this.longitude,
    this.assigned = false,
  });

  final String id;
  final bool isOlte;
  final String code;
  final String name;
  final String status;
  final String nodeType;
  final double latitude;
  final double longitude;
  final bool assigned;
}

@immutable
class MapEdge {
  const MapEdge({
    required this.fromLat,
    required this.fromLng,
    required this.toLat,
    required this.toLng,
    required this.status,
  });

  final double fromLat;
  final double fromLng;
  final double toLat;
  final double toLng;
  final String status;
}

@immutable
class NetworkMapData {
  const NetworkMapData({
    this.nodes = const [],
    this.edges = const [],
    this.truncated = false,
  });

  final List<MapNode> nodes;
  final List<MapEdge> edges;
  final bool truncated;
}

@immutable
class ConnectionDetail {
  const ConnectionDetail({
    required this.id,
    required this.connectionCode,
    required this.nodeType,
    required this.status,
    this.connectionType,
    this.cableType,
    this.fiberCoreDetails,
    this.distanceMeters,
    this.installationDate,
    this.remarks,
    this.customerName,
    this.customerCode,
    this.parentConnectionCode,
    this.olteCode,
    this.downstreamCount = 0,
  });

  final String id;
  final String connectionCode;
  final String nodeType;
  final String status;
  final String? connectionType;
  final String? cableType;
  final String? fiberCoreDetails;
  final double? distanceMeters;
  final DateTime? installationDate;
  final String? remarks;
  final String? customerName;
  final String? customerCode;
  final String? parentConnectionCode;
  final String? olteCode;
  final int downstreamCount;
}

@immutable
class NetworkMapState {
  const NetworkMapState({
    this.isLoading = false,
    this.errorMessage,
    this.filters = const NetworkFilters(),
    this.mapData = const NetworkMapData(),
    this.selectedOlteId = '',
    this.selectedArea = '',
    this.selectedDistrict = '',
    this.selectedStatus = '',
    this.assignedOnly = false,
    this.featureDisabled = false,
    this.mapConfig = const MapProviderConfig(),
  });

  final bool isLoading;
  final String? errorMessage;
  final NetworkFilters filters;
  final NetworkMapData mapData;
  final String selectedOlteId;
  final String selectedArea;
  final String selectedDistrict;
  final String selectedStatus;

  /// Employee "my routes" mode — server-scoped to assigned connections.
  final bool assignedOnly;

  /// Tenant flag off / employee access NONE — module hidden with a notice.
  final bool featureDisabled;

  /// Super Admin platform setting: which map renders the tiles.
  final MapProviderConfig mapConfig;

  NetworkMapState copyWith({
    bool? isLoading,
    String? errorMessage,
    bool clearError = false,
    NetworkFilters? filters,
    NetworkMapData? mapData,
    String? selectedOlteId,
    String? selectedArea,
    String? selectedDistrict,
    String? selectedStatus,
    bool? assignedOnly,
    bool? featureDisabled,
    MapProviderConfig? mapConfig,
  }) {
    return NetworkMapState(
      isLoading: isLoading ?? this.isLoading,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      filters: filters ?? this.filters,
      mapData: mapData ?? this.mapData,
      selectedOlteId: selectedOlteId ?? this.selectedOlteId,
      selectedArea: selectedArea ?? this.selectedArea,
      selectedDistrict: selectedDistrict ?? this.selectedDistrict,
      selectedStatus: selectedStatus ?? this.selectedStatus,
      assignedOnly: assignedOnly ?? this.assignedOnly,
      featureDisabled: featureDisabled ?? this.featureDisabled,
      mapConfig: mapConfig ?? this.mapConfig,
    );
  }
}
