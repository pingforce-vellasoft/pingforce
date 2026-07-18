import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../injection_container.dart';
import '../data/models/notification_model.dart';
import '../domain/repositories/notification_repository.dart';

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION STATE
// ─────────────────────────────────────────────────────────────────────────────

class NotificationState {
  const NotificationState({
    this.isLoading = true,
    this.errorMessage,
    this.items = const [],
  });

  final bool isLoading;
  final String? errorMessage;
  final List<NotificationModel> items;

  int get unreadCount => items.where((n) => !n.isRead).length;

  NotificationState copyWith({
    bool? isLoading,
    String? errorMessage,
    bool clearError = false,
    List<NotificationModel>? items,
  }) {
    return NotificationState(
      isLoading: isLoading ?? this.isLoading,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      items: items ?? this.items,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION NOTIFIER
// ─────────────────────────────────────────────────────────────────────────────

final notificationNotifierProvider =
    NotifierProvider<NotificationNotifier, NotificationState>(
  NotificationNotifier.new,
);

class NotificationNotifier extends Notifier<NotificationState> {
  NotificationRepository get _repo => sl<NotificationRepository>();

  @override
  NotificationState build() => const NotificationState();

  Future<void> load() async {
    state = state.copyWith(isLoading: true, clearError: true);
    final result = await _repo.list();
    result.fold(
      (f) => state = state.copyWith(isLoading: false, errorMessage: f.message),
      (items) => state = state.copyWith(
        isLoading: false,
        items: items,
        clearError: true,
      ),
    );
  }

  Future<void> refresh() => load();

  /// Optimistically mark one read, then persist. Reverts on failure.
  Future<void> markRead(String id) async {
    final matches = state.items.where((n) => n.id == id);
    if (matches.isEmpty || matches.first.isRead) return;

    state = state.copyWith(items: _patch(id, isRead: true));
    final result = await _repo.markRead(id);
    result.fold(
      (_) => state = state.copyWith(items: _patch(id, isRead: false)),
      (_) {},
    );
  }

  /// Optimistically mark all read, persist, revert on failure.
  Future<void> markAllRead() async {
    if (state.unreadCount == 0) return;
    final previous = state.items;
    state = state.copyWith(
      items: state.items.map((n) => n.copyWith(isRead: true)).toList(),
    );
    final result = await _repo.markAllRead();
    result.fold((_) => state = state.copyWith(items: previous), (_) {});
  }

  List<NotificationModel> _patch(String id, {required bool isRead}) {
    return state.items
        .map((n) => n.id == id ? n.copyWith(isRead: isRead) : n)
        .toList();
  }
}
