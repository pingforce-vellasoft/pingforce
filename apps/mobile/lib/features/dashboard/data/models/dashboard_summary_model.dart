// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD SUMMARY MODEL  — mirrors GET /api/v1/dashboard/summary
// ─────────────────────────────────────────────────────────────────────────────
//
// Plain data transfer objects with fromJson. The notifier maps these onto the
// presentation-layer DashboardState models. Kept null-tolerant: the server
// degrades individual sections rather than failing the whole payload.

class DashboardSummaryModel {
  const DashboardSummaryModel({
    required this.user,
    required this.attendance,
    required this.kpiCards,
    required this.activityFeed,
    required this.unreadNotifications,
  });

  final DashboardUserModel user;
  final DashboardAttendanceModel attendance;
  final List<DashboardKpiModel> kpiCards;
  final List<DashboardActivityModel> activityFeed;
  final int unreadNotifications;

  factory DashboardSummaryModel.fromJson(Map<String, dynamic> json) {
    return DashboardSummaryModel(
      user: DashboardUserModel.fromJson(
        (json['user'] as Map).cast<String, dynamic>(),
      ),
      attendance: DashboardAttendanceModel.fromJson(
        (json['attendance'] as Map).cast<String, dynamic>(),
      ),
      kpiCards: ((json['kpiCards'] as List?) ?? const [])
          .map((e) =>
              DashboardKpiModel.fromJson((e as Map).cast<String, dynamic>()))
          .toList(),
      activityFeed: ((json['activityFeed'] as List?) ?? const [])
          .map((e) => DashboardActivityModel.fromJson(
              (e as Map).cast<String, dynamic>()))
          .toList(),
      unreadNotifications: (json['unreadNotifications'] as int?) ?? 0,
    );
  }
}

class DashboardUserModel {
  const DashboardUserModel({
    required this.userId,
    required this.firstName,
    required this.lastName,
    required this.role,
    required this.department,
    required this.avatarUrl,
    required this.isManager,
  });

  final String userId;
  final String firstName;
  final String lastName;
  final String role;
  final String? department;
  final String? avatarUrl;
  final bool isManager;

  factory DashboardUserModel.fromJson(Map<String, dynamic> json) {
    return DashboardUserModel(
      userId: (json['userId'] as String?) ?? '',
      firstName: (json['firstName'] as String?) ?? '',
      lastName: (json['lastName'] as String?) ?? '',
      role: (json['role'] as String?) ?? '',
      department: json['department'] as String?,
      avatarUrl: json['avatarUrl'] as String?,
      isManager: (json['isManager'] as bool?) ?? false,
    );
  }
}

class DashboardAttendanceModel {
  const DashboardAttendanceModel({
    required this.status,
    required this.sessionId,
    required this.checkInTime,
    required this.checkOutTime,
    required this.shiftName,
    required this.shiftStart,
    required this.shiftEnd,
    required this.totalShiftMinutes,
    required this.gracePeriodMinutes,
    required this.workedMinutes,
    required this.breaksTaken,
    required this.isLate,
    required this.minutesLate,
  });

  final String status;
  final String? sessionId;
  final DateTime? checkInTime;
  final DateTime? checkOutTime;
  final String? shiftName;
  final String? shiftStart;
  final String? shiftEnd;
  final int? totalShiftMinutes;
  final int? gracePeriodMinutes;
  final int? workedMinutes;
  final int breaksTaken;
  final bool isLate;
  final int? minutesLate;

  factory DashboardAttendanceModel.fromJson(Map<String, dynamic> json) {
    DateTime? parse(String? s) => s == null ? null : DateTime.tryParse(s);
    return DashboardAttendanceModel(
      status: (json['status'] as String?) ?? 'noShift',
      sessionId: json['sessionId'] as String?,
      checkInTime: parse(json['checkInTime'] as String?),
      checkOutTime: parse(json['checkOutTime'] as String?),
      shiftName: json['shiftName'] as String?,
      shiftStart: json['shiftStart'] as String?,
      shiftEnd: json['shiftEnd'] as String?,
      totalShiftMinutes: json['totalShiftMinutes'] as int?,
      gracePeriodMinutes: json['gracePeriodMinutes'] as int?,
      workedMinutes: json['workedMinutes'] as int?,
      breaksTaken: (json['breaksTaken'] as int?) ?? 0,
      isLate: (json['isLate'] as bool?) ?? false,
      minutesLate: json['minutesLate'] as int?,
    );
  }
}

class DashboardKpiModel {
  const DashboardKpiModel({
    required this.id,
    required this.title,
    required this.primaryValue,
    required this.label,
    required this.iconName,
    required this.secondaryLabel,
    required this.severity,
    required this.route,
  });

  final String id;
  final String title;
  final String primaryValue;
  final String label;
  final String iconName;
  final String? secondaryLabel;
  final String severity;
  final String? route;

  factory DashboardKpiModel.fromJson(Map<String, dynamic> json) {
    return DashboardKpiModel(
      id: (json['id'] as String?) ?? '',
      title: (json['title'] as String?) ?? '',
      primaryValue: (json['primaryValue'] as String?) ?? '',
      label: (json['label'] as String?) ?? '',
      iconName: (json['iconName'] as String?) ?? '',
      secondaryLabel: json['secondaryLabel'] as String?,
      severity: (json['severity'] as String?) ?? 'normal',
      route: json['route'] as String?,
    );
  }
}

class DashboardActivityModel {
  const DashboardActivityModel({
    required this.id,
    required this.type,
    required this.title,
    required this.subtitle,
    required this.timestamp,
    required this.route,
  });

  final String id;
  final String type;
  final String title;
  final String? subtitle;
  final DateTime timestamp;
  final String? route;

  factory DashboardActivityModel.fromJson(Map<String, dynamic> json) {
    return DashboardActivityModel(
      id: (json['id'] as String?) ?? '',
      type: (json['type'] as String?) ?? 'notification',
      title: (json['title'] as String?) ?? '',
      subtitle: json['subtitle'] as String?,
      timestamp:
          DateTime.tryParse((json['timestamp'] as String?) ?? '') ??
              DateTime.now(),
      route: json['route'] as String?,
    );
  }
}
