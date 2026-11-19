import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/network_map/presentation/widgets/map_clustering.dart';

ProjectedPoint<String> pt(double x, double y, String id) =>
    ProjectedPoint(Offset(x, y), id);

void main() {
  test('merges points sharing a cell and averages their position', () {
    final result = clusterPoints([
      pt(10, 10, 'a'),
      pt(30, 20, 'b'),
      pt(200, 200, 'c'),
    ], 12);
    expect(result.map((c) => c.items).toList(), [
      ['a', 'b'],
      ['c'],
    ]);
    expect(result.first.offset, const Offset(20, 15));
    expect(result.last.isSingle, isTrue);
  });

  test('keeps points in neighbouring cells apart', () {
    final result = clusterPoints([pt(55, 0, 'a'), pt(57, 0, 'b')], 12);
    expect(result.map((c) => c.items).toList(), [
      ['a'],
      ['b'],
    ]);
  });

  test('draws every point on its own at the max zoom', () {
    final result = clusterPoints([
      pt(10, 10, 'a'),
      pt(11, 11, 'b'),
    ], clusterMaxZoom);
    expect(result.every((c) => c.isSingle), isTrue);
  });

  test('handles negative coordinates and empty input', () {
    expect(clusterPoints(<ProjectedPoint<String>>[], 10), isEmpty);
    expect(clusterPoints([pt(-1, -1, 'a'), pt(1, 1, 'b')], 10).length, 2);
  });

  test('coordKey matches equal coordinates only', () {
    expect(coordKey(13.6288, 79.4192), coordKey(13.6288, 79.4192));
    expect(coordKey(13.6288, 79.4192), isNot(coordKey(13.6289, 79.4192)));
  });
}
