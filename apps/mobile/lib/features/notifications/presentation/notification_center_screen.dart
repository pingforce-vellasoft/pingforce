import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/theme.dart';
import '../data/models/notification_model.dart';
import 'notification_notifier.dart';

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION CENTRE SCREEN  (mobile Home bell → /notifications)
// ─────────────────────────────────────────────────────────────────────────────

class NotificationCenterScreen extends ConsumerStatefulWidget {
  const NotificationCenterScreen({super.key});

  @override
  ConsumerState<NotificationCenterScreen> createState() =>
      _NotificationCenterScreenState();
}

class _NotificationCenterScreenState
    extends ConsumerState<NotificationCenterScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(notificationNotifierProvider.notifier).load();
    });
  }

  void _onTap(NotificationModel n) {
    ref.read(notificationNotifierProvider.notifier).markRead(n.id);
    final route = n.deepLinkRoute;
    if (route != null && route.isNotEmpty) {
      context.push(route);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(notificationNotifierProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          if (state.unreadCount > 0)
            TextButton(
              onPressed: () =>
                  ref.read(notificationNotifierProvider.notifier).markAllRead(),
              child: const Text('Mark all read'),
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () =>
            ref.read(notificationNotifierProvider.notifier).refresh(),
        child: _buildBody(context, state),
      ),
    );
  }

  Widget _buildBody(BuildContext context, NotificationState state) {
    if (state.isLoading && state.items.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (state.items.isEmpty) {
      // Wrap in a scroll view so pull-to-refresh works on the empty state.
      return ListView(
        children: [
          SizedBox(height: MediaQuery.of(context).size.height * 0.25),
          Icon(
            state.errorMessage != null
                ? Icons.error_outline_rounded
                : Icons.notifications_none_rounded,
            size: AppIconSize.xl,
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
          const SizedBox(height: AppSpacing.space3),
          Center(
            child: Text(
              state.errorMessage ?? 'No notifications yet',
              style: AppTypography.titleSmall.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.space1),
          Center(
            child: Text(
              state.errorMessage != null
                  ? 'Pull down to retry'
                  : "You're all caught up",
              style: AppTypography.bodySmall.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
          ),
        ],
      );
    }

    return ListView.separated(
      physics: const AlwaysScrollableScrollPhysics(),
      itemCount: state.items.length,
      separatorBuilder: (_, _) => Divider(
        height: 1,
        indent: 68,
        color: Theme.of(context).colorScheme.outlineVariant,
      ),
      itemBuilder: (_, i) =>
          _NotificationTile(item: state.items[i], onTap: () => _onTap(state.items[i])),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TILE
// ─────────────────────────────────────────────────────────────────────────────

class _NotificationTile extends StatelessWidget {
  const _NotificationTile({required this.item, required this.onTap});
  final NotificationModel item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final (icon, bg, fg) = _config(context, item.category);
    final hasRoute = item.deepLinkRoute != null &&
        item.deepLinkRoute!.isNotEmpty;

    return InkWell(
      onTap: onTap,
      child: Container(
        color: item.isRead
            ? null
            : Theme.of(context).colorScheme.primaryContainer.withValues(
                  alpha: 0.12,
                ),
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.space4,
          vertical: AppSpacing.space3,
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(shape: BoxShape.circle, color: bg),
              child: Icon(icon, size: AppIconSize.sm, color: fg),
            ),
            const SizedBox(width: AppSpacing.space3),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.title,
                    style: AppTypography.bodyMedium.copyWith(
                      color: Theme.of(context).colorScheme.onSurface,
                      fontWeight:
                          item.isRead ? FontWeight.w400 : FontWeight.w600,
                    ),
                  ),
                  if (item.body != null && item.body!.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(
                      item.body!,
                      style: AppTypography.bodySmall.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                  const SizedBox(height: 4),
                  Text(
                    _relativeTime(item.createdAt),
                    style: AppTypography.labelSmall.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
            if (!item.isRead)
              Container(
                margin: const EdgeInsets.only(top: 4, left: 4),
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Theme.of(context).colorScheme.primary,
                ),
              )
            else if (hasRoute)
              Icon(
                Icons.chevron_right_rounded,
                size: AppIconSize.sm,
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
          ],
        ),
      ),
    );
  }

  (IconData, Color, Color) _config(BuildContext context, String category) {
    return switch (category.toUpperCase()) {
      'FAULT' => (
          Icons.build_circle_rounded,
          PingForceColors.statusWarningContainer,
          PingForceColors.statusWarning,
        ),
      'LEAVE' => (
          Icons.event_available_rounded,
          Theme.of(context).colorScheme.primaryContainer,
          Theme.of(context).colorScheme.primary,
        ),
      'ATTENDANCE' => (
          Icons.fingerprint_rounded,
          PingForceColors.statusSuccessContainer,
          PingForceColors.statusSuccess,
        ),
      'VISIT' => (
          Icons.location_on_rounded,
          Theme.of(context).colorScheme.tertiaryContainer,
          Theme.of(context).colorScheme.tertiary,
        ),
      'LEAD' => (
          Icons.person_search_rounded,
          Theme.of(context).colorScheme.primaryContainer,
          Theme.of(context).colorScheme.primary,
        ),
      _ => (
          Icons.notifications_rounded,
          Theme.of(context).colorScheme.surfaceContainerHigh,
          Theme.of(context).colorScheme.onSurfaceVariant,
        ),
    };
  }

  String _relativeTime(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inSeconds < 60) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${dt.day}/${dt.month}/${dt.year}';
  }
}
