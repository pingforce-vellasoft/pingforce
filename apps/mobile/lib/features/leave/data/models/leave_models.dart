// ─────────────────────────────────────────────────────────────────────────────
// LEAVE DATA MODELS  — mirror the /api/v1/leaves self-service endpoints
// ─────────────────────────────────────────────────────────────────────────────

class LeaveTypeModel {
  const LeaveTypeModel({
    required this.id,
    required this.name,
    required this.code,
    required this.isPaid,
  });

  final String id;
  final String name;
  final String code;
  final bool isPaid;

  factory LeaveTypeModel.fromJson(Map<String, dynamic> json) {
    return LeaveTypeModel(
      id: (json['id'] as String?) ?? '',
      name: (json['name'] as String?) ?? '',
      code: (json['code'] as String?) ?? '',
      isPaid: (json['isPaid'] as bool?) ?? true,
    );
  }
}

class LeaveBalanceModel {
  const LeaveBalanceModel({
    required this.id,
    required this.leaveTypeId,
    required this.leaveTypeName,
    required this.totalDays,
    required this.usedDays,
    required this.availableDays,
    required this.year,
  });

  final String id;
  final String leaveTypeId;
  final String leaveTypeName;
  final double totalDays;
  final double usedDays;
  final double availableDays;
  final int year;

  /// Days awaiting approval = entitled minus used minus still-available.
  double get pendingDays {
    final p = totalDays - usedDays - availableDays;
    return p > 0 ? p : 0;
  }

  double get usedFraction => totalDays > 0 ? usedDays / totalDays : 0;
  double get pendingFraction => totalDays > 0 ? pendingDays / totalDays : 0;

  factory LeaveBalanceModel.fromJson(Map<String, dynamic> json) {
    double d(dynamic v) => (v is num) ? v.toDouble() : 0.0;
    final type = (json['leaveType'] as Map?)?.cast<String, dynamic>();
    return LeaveBalanceModel(
      id: (json['id'] as String?) ?? '',
      leaveTypeId: (json['leaveTypeId'] as String?) ?? '',
      leaveTypeName: (type?['name'] as String?) ?? 'Leave',
      totalDays: d(json['totalDays']),
      usedDays: d(json['usedDays']),
      availableDays: d(json['availableDays']),
      year: (json['year'] as int?) ?? DateTime.now().year,
    );
  }
}

class LeaveRequestModel {
  const LeaveRequestModel({
    required this.id,
    required this.leaveTypeName,
    required this.startDate,
    required this.endDate,
    required this.status,
    required this.reason,
    required this.appliedOn,
  });

  final String id;
  final String leaveTypeName;
  final DateTime startDate;
  final DateTime endDate;
  final String status; // PENDING | APPROVED | REJECTED | CANCELLED
  final String? reason;
  final DateTime appliedOn;

  int get days => endDate.difference(startDate).inDays + 1;

  factory LeaveRequestModel.fromJson(Map<String, dynamic> json) {
    DateTime parse(String? s) => DateTime.tryParse(s ?? '') ?? DateTime.now();
    final type = (json['leaveType'] as Map?)?.cast<String, dynamic>();
    return LeaveRequestModel(
      id: (json['id'] as String?) ?? '',
      leaveTypeName: (type?['name'] as String?) ?? 'Leave',
      startDate: parse(json['startDate'] as String?),
      endDate: parse(json['endDate'] as String?),
      status: (json['status'] as String?) ?? 'PENDING',
      reason: json['reason'] as String?,
      appliedOn: parse(json['createdAt'] as String?),
    );
  }
}
