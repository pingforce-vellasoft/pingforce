import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/network_map/data/network_map_offline_store.dart';
import 'package:mobile/features/network_map/data/network_map_remote_data_source.dart';
import 'package:mobile/features/network_map/presentation/network_map_screen.dart';
import 'package:mobile/features/network_map/presentation/widgets/free_map_view.dart';

/// Answers every request with [status]/[body], or throws a connection error
/// when [offline] is set.
class _FakeAdapter implements HttpClientAdapter {
  bool offline = false;
  int status = 200;
  Map<String, dynamic> body = const {};

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    if (offline) {
      throw DioException.connectionError(
        requestOptions: options,
        reason: 'no network',
      );
    }
    return ResponseBody.fromString(
      jsonEncode(body),
      status,
      headers: {
        Headers.contentTypeHeader: ['application/json'],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

Map<String, dynamic> _geo(String code) => {
  'type': 'FeatureCollection',
  'truncated': false,
  'features': [
    {
      'type': 'Feature',
      'geometry': {
        'type': 'Point',
        'coordinates': [79.41, 13.62],
      },
      'properties': {
        'featureType': 'CONNECTION',
        'id': 'c1',
        'connectionCode': code,
        'status': 'ACTIVE',
        'nodeType': 'CUSTOMER',
      },
    },
  ],
};

void main() {
  late _FakeAdapter adapter;
  late MemoryNetworkMapOfflineStore store;
  late NetworkMapRemoteDataSourceImpl source;

  setUp(() {
    adapter = _FakeAdapter();
    store = MemoryNetworkMapOfflineStore();
    final dio = Dio(BaseOptions(baseUrl: 'https://api.test'))
      ..httpClientAdapter = adapter;
    source = NetworkMapRemoteDataSourceImpl(dio: dio, offlineStore: store);
  });

  group('offline map data', () {
    test('live data is saved and marked live', () async {
      adapter.body = _geo('C-1');
      final data = await source.fetchMap(olteId: 'o1');
      expect(data.nodes.single.code, 'C-1');
      expect(data.offlineSavedAt, isNull);
      expect(store.entries.keys, ['/api/v1/network/map?olteId=o1']);
    });

    test('offline returns the saved copy with its save time', () async {
      adapter.body = _geo('C-1');
      await source.fetchMap(olteId: 'o1');

      adapter.offline = true;
      final data = await source.fetchMap(olteId: 'o1');
      expect(data.nodes.single.code, 'C-1');
      expect(data.offlineSavedAt, isNotNull);
    });

    test('offline with nothing saved for that filter still fails', () async {
      adapter.body = _geo('C-1');
      await source.fetchMap(olteId: 'o1');

      adapter.offline = true;
      await expectLater(
        source.fetchMap(olteId: 'o2'),
        throwsA(isA<DioException>()),
      );
    });

    test('API errors are never masked by the saved copy', () async {
      adapter.body = _geo('C-1');
      await source.fetchAssignedMap();

      adapter
        ..status = 403
        ..body = {'message': 'Forbidden'};
      await expectLater(
        source.fetchAssignedMap(),
        throwsA(
          isA<DioException>().having(
            (e) => e.response?.statusCode,
            'status',
            403,
          ),
        ),
      );
    });

    test('filters and map config also work offline once seen', () async {
      adapter.body = {
        'oltes': [
          {'id': 'o1', 'code': 'OLT-1', 'name': 'Main'},
        ],
        'areas': ['North'],
        'districts': <String>[],
        'statuses': <String>[],
        'provider': 'MAPBOX',
        'mapboxKey': 'pk.test',
      };
      await source.fetchFilters();
      await source.fetchMapConfig();

      adapter.offline = true;
      expect((await source.fetchFilters()).oltes.single.code, 'OLT-1');
      expect((await source.fetchMapConfig()).provider, 'MAPBOX');
    });
  });

  test('isOfflineError separates no-signal from API errors', () {
    final options = RequestOptions(path: '/x');
    expect(
      isOfflineError(
        DioException.connectionError(requestOptions: options, reason: 'down'),
      ),
      isTrue,
    );
    expect(
      isOfflineError(
        DioException.badResponse(
          statusCode: 500,
          requestOptions: options,
          response: Response(requestOptions: options, statusCode: 500),
        ),
      ),
      isFalse,
    );
    expect(isOfflineError(StateError('x')), isFalse);
  });

  test('tile cache key ignores the access token', () {
    const base =
        'https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/5/1/2';
    expect(
      tileCacheKey('$base?access_token=old'),
      tileCacheKey('$base?access_token=new'),
    );
    expect(tileCacheKey(base), isNot(tileCacheKey('${base}3')));
  });

  test('savedAgo reads naturally', () {
    final now = DateTime(2026, 11, 19, 12);
    expect(
      savedAgo(now.subtract(const Duration(seconds: 20)), now),
      'just now',
    );
    expect(
      savedAgo(now.subtract(const Duration(minutes: 5)), now),
      '5 min ago',
    );
    expect(savedAgo(now.subtract(const Duration(hours: 3)), now), '3 h ago');
    expect(savedAgo(now.subtract(const Duration(days: 1)), now), '1 day ago');
    expect(savedAgo(now.subtract(const Duration(days: 4)), now), '4 days ago');
  });
}
