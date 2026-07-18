// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION MODEL  — mirrors GET /api/v1/notifications/feed
// ─────────────────────────────────────────────────────────────────────────────

class NotificationModel {
  const NotificationModel({
    required this.id,
    required this.category,
    required this.title,
    required this.body,
    required this.deepLinkRoute,
    required this.isRead,
    required this.createdAt,
  });

  final String id;
  final String category; // ATTENDANCE, FAULT, LEAVE, VISIT, LEAD, SYSTEM
  final String title;
  final String? body;
  final String? deepLinkRoute;
  final bool isRead;
  final DateTime createdAt;

  NotificationModel copyWith({bool? isRead}) {
    return NotificationModel(
      id: id,
      category: category,
      title: title,
      body: body,
      deepLinkRoute: deepLinkRoute,
      isRead: isRead ?? this.isRead,
      createdAt: createdAt,
    );
  }

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    return NotificationModel(
      id: (json['id'] as String?) ?? '',
      category: (json['category'] as String?) ?? 'SYSTEM',
      title: (json['title'] as String?) ?? '',
      body: json['body'] as String?,
      deepLinkRoute: json['deepLinkRoute'] as String?,
      isRead: (json['isRead'] as bool?) ?? false,
      createdAt:
          DateTime.tryParse((json['createdAt'] as String?) ?? '') ??
              DateTime.now(),
    );
  }
}
