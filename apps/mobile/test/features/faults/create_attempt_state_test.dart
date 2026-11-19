import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/faults/presentation/create_attempt_state.dart';

void main() {
  group('CreateAttemptRequest.toJson', () {
    test('sends UTC times, coordinates as a pair and the clientRef', () {
      final json = CreateAttemptRequest(
        attemptType: 'INITIAL_VISIT',
        outcome: 'RESOLVED',
        startedAt: DateTime.utc(2026, 11, 19, 9),
        endedAt: DateTime.utc(2026, 11, 19, 10),
        latitude: 12.97,
        longitude: 77.59,
        workNotes: 'Replaced ONT',
        clientRef: 'att-1',
      ).toJson();

      expect(json, {
        'attemptType': 'INITIAL_VISIT',
        'outcome': 'RESOLVED',
        'startedAt': '2026-11-19T09:00:00.000Z',
        'endedAt': '2026-11-19T10:00:00.000Z',
        'latitude': 12.97,
        'longitude': 77.59,
        'workNotes': 'Replaced ONT',
        'clientRef': 'att-1',
      });
    });

    test('omits optional fields that are empty or half a coordinate', () {
      final json = CreateAttemptRequest(
        attemptType: 'FOLLOW_UP_VISIT',
        outcome: 'REVISIT_REQUIRED',
        startedAt: DateTime.utc(2026, 11, 19, 9),
        latitude: 12.97,
        workNotes: '',
        nextAction: '',
        clientRef: 'att-2',
      ).toJson();

      expect(json.keys, ['attemptType', 'outcome', 'startedAt', 'clientRef']);
    });
  });

  test('prettyAttemptValue turns wire values into labels', () {
    expect(prettyAttemptValue('PARTIALLY_RESOLVED'), 'Partially resolved');
    expect(prettyAttemptValue('RESOLVED'), 'Resolved');
  });
}
