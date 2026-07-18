import 'package:dio/dio.dart';

import '../models/notification_model.dart';

abstract class NotificationRemoteDataSource {
  Future<List<NotificationModel>> list({bool unreadOnly});
  Future<int> unreadCount();
  Future<void> markRead(String id);
  Future<void> markAllRead();
}

class NotificationRemoteDataSourceImpl implements NotificationRemoteDataSource {
  final Dio dio;

  NotificationRemoteDataSourceImpl({required this.dio});

  @override
  Future<List<NotificationModel>> list({bool unreadOnly = false}) async {
    final res = await dio.get(
      '/api/v1/notifications/feed',
      queryParameters: unreadOnly ? {'unreadOnly': 'true'} : null,
    );
    if (res.statusCode != 200) throw Exception('Failed to load notifications');
    final raw = (res.data as List?) ?? const [];
    return raw
        .map((e) =>
            NotificationModel.fromJson((e as Map).cast<String, dynamic>()))
        .toList();
  }

  @override
  Future<int> unreadCount() async {
    final res = await dio.get('/api/v1/notifications/feed/unread-count');
    if (res.statusCode != 200) throw Exception('Failed to load count');
    final data = (res.data as Map).cast<String, dynamic>();
    return (data['count'] as int?) ?? 0;
  }

  @override
  Future<void> markRead(String id) async {
    final res = await dio.post('/api/v1/notifications/feed/$id/read');
    if (res.statusCode != 200 && res.statusCode != 201) {
      throw Exception('Failed to mark read');
    }
  }

  @override
  Future<void> markAllRead() async {
    final res = await dio.post('/api/v1/notifications/feed/read-all');
    if (res.statusCode != 200 && res.statusCode != 201) {
      throw Exception('Failed to mark all read');
    }
  }
}
