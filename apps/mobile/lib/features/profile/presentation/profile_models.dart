// Plain presentation models for the profile module (kept simple, matching the
// faults/visits datasource style — no freezed).

class ProfileInfo {
  const ProfileInfo({
    required this.userId,
    required this.email,
    required this.roleCode,
    required this.tenantId,
    required this.isOnboarded,
  });

  final String userId;
  final String email;
  final String roleCode;
  final String tenantId;
  final bool isOnboarded;

  /// Two-letter initials derived from the email local-part.
  String get initials {
    final local = email.split('@').first;
    if (local.isEmpty) return '?';
    return local.length >= 2
        ? local.substring(0, 2).toUpperCase()
        : local.substring(0, 1).toUpperCase();
  }

  /// Human-friendly name from the email local-part (backend has no name field).
  String get displayName {
    final local = email.split('@').first;
    if (local.isEmpty) return 'User';
    return local[0].toUpperCase() + local.substring(1);
  }

  String get roleLabel => roleCode
      .split('_')
      .map((w) => w.isEmpty ? w : w[0] + w.substring(1).toLowerCase())
      .join(' ');
}

class ActiveSession {
  const ActiveSession({
    required this.id,
    this.deviceId,
    this.platform,
    this.ip,
    this.userAgent,
    this.lastActivityAt,
    this.createdAt,
    this.expiresAt,
  });

  final String id;
  final String? deviceId;
  final String? platform;
  final String? ip;
  final String? userAgent;
  final DateTime? lastActivityAt;
  final DateTime? createdAt;
  final DateTime? expiresAt;
}

class LoginHistoryEntry {
  const LoginHistoryEntry({
    required this.id,
    required this.outcome,
    this.authMethod,
    this.deviceId,
    this.ipAddress,
    this.userAgent,
    this.createdAt,
    this.logoutAt,
  });

  final String id;
  final String outcome; // SUCCESS | FAILURE | ...
  final String? authMethod;
  final String? deviceId;
  final String? ipAddress;
  final String? userAgent;
  final DateTime? createdAt;
  final DateTime? logoutAt;

  bool get isSuccess => outcome.toUpperCase() == 'SUCCESS';
}

class LoginHistoryPage {
  const LoginHistoryPage({
    required this.items,
    required this.total,
    required this.page,
    required this.pageSize,
  });

  final List<LoginHistoryEntry> items;
  final int total;
  final int page;
  final int pageSize;
}
