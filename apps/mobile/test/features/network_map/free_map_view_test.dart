import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/network_map/presentation/network_map_state.dart';
import 'package:mobile/features/network_map/presentation/widgets/free_map_view.dart';

void main() {
  group('tileUrlFor', () {
    test('uses OpenStreetMap by default', () {
      expect(
        tileUrlFor(const MapProviderConfig()),
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      );
    });

    test(
      'uses OpenStreetMap for GOOGLE_MAPS (Google tiles need their SDK)',
      () {
        expect(
          tileUrlFor(const MapProviderConfig(provider: 'GOOGLE_MAPS')),
          contains('openstreetmap.org'),
        );
      },
    );

    test('uses Mapbox only when a key is set', () {
      expect(
        tileUrlFor(
          const MapProviderConfig(provider: 'MAPBOX', mapboxKey: 'pk.test'),
        ),
        allOf(contains('api.mapbox.com'), endsWith('access_token=pk.test')),
      );
      expect(
        tileUrlFor(const MapProviderConfig(provider: 'MAPBOX')),
        contains('openstreetmap.org'),
      );
    });
  });

  test('attribution matches the tile source', () {
    expect(
      attributionFor(const MapProviderConfig()),
      '© OpenStreetMap contributors',
    );
    expect(
      attributionFor(
        const MapProviderConfig(provider: 'MAPBOX', mapboxKey: 'pk.test'),
      ),
      contains('Mapbox'),
    );
  });

  test('only disconnected links are dashed', () {
    expect(isDashedEdge('DISCONNECTED'), isTrue);
    expect(isDashedEdge('ACTIVE'), isFalse);
    expect(isDashedEdge('FAULTY'), isFalse);
  });

  test('every status in the legend has a colour', () {
    expect(
      networkStatusColors.keys,
      containsAll([
        'ACTIVE',
        'PENDING_INSTALLATION',
        'SUSPENDED',
        'DISCONNECTED',
        'FAULTY',
        'MAINTENANCE',
      ]),
    );
  });
}
