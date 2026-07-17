import 'package:dio/dio.dart';

import '../presentation/network_map_state.dart';

/// Remote datasource for the Connection Map module (3.7_ConnectionMap).
/// Parses the API's GeoJSON FeatureCollection into presentation models.
abstract class NetworkMapRemoteDataSource {
  Future<NetworkFilters> fetchFilters();

  /// Platform-configured provider (Super Admin: OSM / Google / Mapbox).
  Future<MapProviderConfig> fetchMapConfig();

  /// Full tenant map, filtered server-side.
  Future<NetworkMapData> fetchMap({
    String? olteId,
    String? area,
    String? district,
    String? status,
  });

  /// Employee view: own assigned connections + upstream route context.
  Future<NetworkMapData> fetchAssignedMap();

  Future<ConnectionDetail> fetchConnection(String id);
}

class NetworkMapRemoteDataSourceImpl implements NetworkMapRemoteDataSource {
  NetworkMapRemoteDataSourceImpl({required this.dio});

  final Dio dio;

  @override
  Future<NetworkFilters> fetchFilters() async {
    final response = await dio.get('/api/v1/network/filters');
    final data = response.data as Map<String, dynamic>;
    return NetworkFilters(
      oltes: (data['oltes'] as List? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(
            (o) => OlteOption(
              id: o['id'] as String,
              code: (o['code'] ?? '') as String,
              name: (o['name'] ?? '') as String,
              area: o['area'] as String?,
              district: o['district'] as String?,
            ),
          )
          .toList(growable: false),
      areas: (data['areas'] as List? ?? []).cast<String>(),
      districts: (data['districts'] as List? ?? []).cast<String>(),
      statuses: (data['statuses'] as List? ?? []).cast<String>(),
    );
  }

  @override
  Future<MapProviderConfig> fetchMapConfig() async {
    final response = await dio.get('/api/v1/network/map-config');
    final data = response.data as Map<String, dynamic>;
    return MapProviderConfig(
      provider: (data['provider'] ?? 'OPENSTREETMAP') as String,
      mapboxKey: (data['mapboxKey'] ?? '') as String,
    );
  }

  @override
  Future<NetworkMapData> fetchMap({
    String? olteId,
    String? area,
    String? district,
    String? status,
  }) async {
    final response = await dio.get(
      '/api/v1/network/map',
      queryParameters: {
        if (olteId != null && olteId.isNotEmpty) 'olteId': olteId,
        if (area != null && area.isNotEmpty) 'area': area,
        if (district != null && district.isNotEmpty) 'district': district,
        if (status != null && status.isNotEmpty) 'status': status,
      },
    );
    return _parseGeoJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<NetworkMapData> fetchAssignedMap() async {
    final response = await dio.get('/api/v1/network/map/assigned');
    return _parseGeoJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<ConnectionDetail> fetchConnection(String id) async {
    final response = await dio.get('/api/v1/network/connections/$id');
    final json = response.data as Map<String, dynamic>;
    final customer = json['customer'] as Map<String, dynamic>?;
    final parent = json['parentConnection'] as Map<String, dynamic>?;
    return ConnectionDetail(
      id: json['id'] as String,
      connectionCode: (json['connectionCode'] ?? '') as String,
      nodeType: (json['nodeType'] ?? 'CUSTOMER') as String,
      status: (json['status'] ?? '') as String,
      connectionType: json['connectionType'] as String?,
      cableType: json['cableType'] as String?,
      fiberCoreDetails: json['fiberCoreDetails'] as String?,
      distanceMeters: (json['distanceMeters'] as num?)?.toDouble(),
      installationDate: json['installationDate'] != null
          ? DateTime.tryParse(json['installationDate'] as String)
          : null,
      remarks: json['remarks'] as String?,
      customerName: customer == null
          ? null
          : (customer['displayName'] ?? customer['legalName']) as String?,
      customerCode: customer?['customerCode'] as String?,
      parentConnectionCode: parent?['connectionCode'] as String?,
      olteCode: (json['olte']?['code']) as String?,
      downstreamCount: (json['downstreamCount'] as num?)?.toInt() ?? 0,
    );
  }

  NetworkMapData _parseGeoJson(Map<String, dynamic> geoJson) {
    final nodes = <MapNode>[];
    final edges = <MapEdge>[];

    for (final feature
        in (geoJson['features'] as List? ?? []).whereType<Map<String, dynamic>>()) {
      final props = feature['properties'] as Map<String, dynamic>? ?? {};
      final geometry = feature['geometry'] as Map<String, dynamic>? ?? {};
      final type = props['featureType'] as String?;

      if (type == 'EDGE') {
        final coords = (geometry['coordinates'] as List? ?? [])
            .whereType<List>()
            .toList();
        if (coords.length == 2) {
          edges.add(
            MapEdge(
              fromLat: (coords[0][1] as num).toDouble(),
              fromLng: (coords[0][0] as num).toDouble(),
              toLat: (coords[1][1] as num).toDouble(),
              toLng: (coords[1][0] as num).toDouble(),
              status: (props['status'] ?? '') as String,
            ),
          );
        }
        continue;
      }

      final coords = geometry['coordinates'] as List?;
      if (coords == null || coords.length < 2) continue;
      final customer = props['customer'] as Map<String, dynamic>?;

      nodes.add(
        MapNode(
          id: props['id'] as String,
          isOlte: type == 'OLTE',
          code: (type == 'OLTE'
              ? props['code']
              : props['connectionCode'] ?? '') as String,
          name: type == 'OLTE'
              ? (props['name'] ?? '') as String
              : (customer?['displayName'] ??
                      customer?['legalName'] ??
                      '') as String,
          status: (props['status'] ?? '') as String,
          nodeType: (props['nodeType'] ?? 'OLTE') as String,
          latitude: (coords[1] as num).toDouble(),
          longitude: (coords[0] as num).toDouble(),
          assigned: props['assigned'] == true,
        ),
      );
    }

    return NetworkMapData(
      nodes: nodes,
      edges: edges,
      truncated: geoJson['truncated'] == true,
    );
  }
}
