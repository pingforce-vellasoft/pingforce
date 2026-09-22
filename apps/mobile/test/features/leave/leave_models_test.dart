import 'package:flutter_test/flutter_test.dart';
import '../../../lib/features/leave/data/models/leave_models.dart';

void main() {
  test('uses persisted half-day charge instead of date difference', () {
    final request = LeaveRequestModel.fromJson({
      'id': 'request',
      'startDate': '2026-09-21',
      'endDate': '2026-09-21',
      'requestedDays': 0.5,
      'duration': 'FIRST_HALF',
      'status': 'PENDING',
      'createdAt': '2026-09-20',
    });
    expect(request.days, 0.5);
    expect(request.duration, 'FIRST_HALF');
  });
  test('uses persisted working-day charge for a multi-day range', () {
    final request = LeaveRequestModel.fromJson({
      'startDate': '2026-09-18',
      'endDate': '2026-09-22',
      'requestedDays': 2,
    });
    expect(request.days, 2);
  });
  test('keeps pending reservation distinct from used entitlement', () {
    final balance = LeaveBalanceModel.fromJson({
      'totalDays': 20,
      'usedDays': 5,
      'reservedDays': 0.5,
      'availableDays': 14.5,
    });
    expect(balance.pendingDays, 0.5);
    expect(balance.usedDays, 5);
    expect(balance.availableDays, 14.5);
  });
  test('supports legacy response without reservation field', () {
    final balance = LeaveBalanceModel.fromJson({
      'totalDays': 20,
      'usedDays': 5,
      'availableDays': 14,
    });
    expect(balance.pendingDays, 1);
  });
}
