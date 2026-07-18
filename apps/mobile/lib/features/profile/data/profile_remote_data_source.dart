import 'package:dio/dio.dart';

import '../presentation/profile_models.dart';

/// Remote datasource for the profile module. Wraps the staff auth-profile
/// endpoints (auth.controller.ts): current user, active sessions, login history
/// and logout actions.
abstract class ProfileRemoteDataSource {
  Future<ProfileInfo> fetchMe();
  Future<List<ActiveSession>> fetchSessions();
  Future<LoginHistoryPage> fetchLoginHistory({int page, int pageSize});
  Future<void> revokeSession(String sessionId);
  Future<void> logout();
  Future<void> logoutAll();
}

class ProfileRemoteDataSourceImpl implements ProfileRemoteDataSource {
  ProfileRemoteDataSourceImpl({required this.dio});

  final Dio dio;

  @override
  Future<ProfileInfo> fetchMe() async {
    final res = await dio.get('/api/v1/auth/me');
    final json = res.data as Map<String, dynamic>;
    return ProfileInfo(
      userId: (json['userId'] ?? '') as String,
      email: (json['email'] ?? '') as String? ?? '',
      roleCode: (json['roleCode'] ?? 'UNKNOWN') as String,
      tenantId: (json['tenantId'] ?? '') as String,
      isOnboarded: (json['isOnboarded'] ?? false) as bool,
    );
  }

  @override
  Future<List<ActiveSession>> fetchSessions() async {
    final res = await dio.get('/api/v1/auth/sessions');
    final rows = res.data is List ? res.data as List : <dynamic>[];
    return rows
        .whereType<Map<String, dynamic>>()
        .map(
          (j) => ActiveSession(
            id: (j['id'] ?? '') as String,
            deviceId: j['deviceId'] as String?,
            platform: j['platform'] as String?,
            ip: j['ip'] as String?,
            userAgent: j['userAgent'] as String?,
            lastActivityAt: _parseDate(j['lastActivityAt']),
            createdAt: _parseDate(j['createdAt']),
            expiresAt: _parseDate(j['expiresAt']),
          ),
        )
        .toList(growable: false);
  }

  @override
  Future<LoginHistoryPage> fetchLoginHistory({
    int page = 1,
    int pageSize = 20,
  }) async {
    final res = await dio.get(
      '/api/v1/auth/login-history',
      queryParameters: {'page': page, 'pageSize': pageSize},
    );
    final data = res.data as Map<String, dynamic>;
    final items = (data['items'] as List? ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(
          (j) => LoginHistoryEntry(
            id: (j['id'] ?? '') as String,
            authMethod: j['authMethod'] as String?,
            outcome: (j['outcome'] ?? '') as String? ?? '',
            deviceId: j['deviceId'] as String?,
            ipAddress: j['ipAddress'] as String?,
            userAgent: j['userAgent'] as String?,
            createdAt: _parseDate(j['createdAt']),
            logoutAt: _parseDate(j['logoutAt']),
          ),
        )
        .toList(growable: false);
    return LoginHistoryPage(
      items: items,
      total: (data['total'] ?? items.length) as int,
      page: (data['page'] ?? page) as int,
      pageSize: (data['pageSize'] ?? pageSize) as int,
    );
  }

  @override
  Future<void> revokeSession(String sessionId) async {
    await dio.post('/api/v1/auth/sessions/$sessionId/revoke');
  }

  @override
  Future<void> logout() async {
    await dio.post('/api/v1/auth/logout');
  }

  @override
  Future<void> logoutAll() async {
    await dio.post('/api/v1/auth/logout-all');
  }

  DateTime? _parseDate(dynamic v) {
    if (v is String && v.isNotEmpty) return DateTime.tryParse(v);
    return null;
  }
}
