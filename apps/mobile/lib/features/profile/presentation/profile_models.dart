// Plain presentation models for the profile module (kept simple, matching the
// faults/visits datasource style — no freezed).

class ProfileInfo {
  const ProfileInfo({
    required this.userId,
    required this.email,
    required this.roleCode,
    required this.tenantId,
    required this.isOnboarded,
    this.firstName,
    this.lastName,
    this.avatar,
  });

  final String userId;
  final String email;
  final String roleCode;
  final String tenantId;
  final bool isOnboarded;
  final String? firstName;
  final String? lastName;
  final String? avatar;

  /// Initials from the profile name when present, otherwise the email
  /// local-part (accounts that have not completed profile setup).
  String get initials {
    final first = firstName?.trim() ?? '';
    final last = lastName?.trim() ?? '';
    if (first.isNotEmpty && last.isNotEmpty) {
      return '${first[0]}${last[0]}'.toUpperCase();
    }
    if (first.isNotEmpty) {
      return (first.length >= 2 ? first.substring(0, 2) : first).toUpperCase();
    }
    final local = email.split('@').first;
    if (local.isEmpty) return '?';
    return (local.length >= 2 ? local.substring(0, 2) : local).toUpperCase();
  }

  /// Full name from the user profile, falling back to the email local-part.
  String get displayName {
    final name = '${firstName?.trim() ?? ''} ${lastName?.trim() ?? ''}'.trim();
    if (name.isNotEmpty) return name;
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
