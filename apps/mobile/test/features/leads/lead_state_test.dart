import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/leads/presentation/lead_state.dart';

void main() {
  group('LeadSummary.fromJson', () {
    test('maps a pipeline row, including stage, owner and decimal value', () {
      final lead = LeadSummary.fromJson({
        'id': 'l1',
        'leadNumber': 'LD-1',
        'firstName': 'Asha',
        'lastName': 'K',
        'companyName': 'Acme',
        'pipelineStageId': 's1',
        'pipelineStage': {'id': 's1', 'name': 'Qualified'},
        'expectedValue': '12500.50',
        'ownerUser': {
          'email': 'o@example.com',
          'profile': {'firstName': 'Ravi', 'lastName': null},
        },
        'convertedCustomerId': null,
        'createdAt': '2026-11-19T09:00:00.000Z',
      });

      expect(lead.displayName, 'Asha K');
      expect(lead.stageName, 'Qualified');
      expect(lead.expectedValue, 12500.5);
      expect(lead.ownerName, 'Ravi');
      expect(lead.isConverted, isFalse);
      expect(lead.pendingSync, isFalse);
    });

    test('falls back to the owner email and marks converted leads', () {
      final lead = LeadSummary.fromJson({
        'id': 'l2',
        'leadNumber': 'LD-2',
        'firstName': 'B',
        'expectedValue': 300,
        'ownerUser': {'email': 'o@example.com', 'profile': null},
        'convertedCustomerId': 'c1',
        'createdAt': '2026-11-19T09:00:00.000Z',
      });
      expect(lead.ownerName, 'o@example.com');
      expect(lead.expectedValue, 300);
      expect(lead.isConverted, isTrue);
      expect(lead.stageName, isNull);
    });
  });

  test('CreateLeadRequest.toJson trims and drops empty optional fields', () {
    final json = const CreateLeadRequest(
      leadNumber: 'LD-1',
      firstName: '  Asha ',
      lastName: ' ',
      companyName: 'Acme ',
      email: '',
      expectedValue: 100,
    ).toJson();

    expect(json, {
      'leadNumber': 'LD-1',
      'firstName': 'Asha',
      'companyName': 'Acme',
      'expectedValue': 100,
    });
  });

  test(
    'generateLeadNumber is stable for the same inputs and differs otherwise',
    () {
      final now = DateTime.utc(2026, 11, 19, 9);
      final a = generateLeadNumber(now, 42);
      expect(a, generateLeadNumber(now, 42));
      expect(a, isNot(generateLeadNumber(now, 43)));
      expect(a, matches(RegExp(r'^LD-[0-9A-Z]+-[0-9A-Z]{4}$')));
    },
  );

  test('LeadListState filters by stage and keeps fields on copyWith', () {
    LeadSummary lead(String id, String? stage) => LeadSummary(
      id: id,
      leadNumber: id,
      firstName: id,
      stageId: stage,
      createdAt: DateTime(2026),
    );
    final state = LeadListState(
      leads: [lead('a', 's1'), lead('b', 's2'), lead('c', null)],
      errorMessage: 'old',
    );

    expect(state.visibleLeads.length, 3);
    final filtered = state.copyWith(stageFilter: 's1');
    expect(filtered.visibleLeads.map((l) => l.id), ['a']);
    expect(filtered.errorMessage, 'old');
    expect(filtered.copyWith(errorMessage: null).errorMessage, isNull);
    expect(filtered.copyWith(stageFilter: null).visibleLeads.length, 3);
  });
}
