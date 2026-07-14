import 'package:flutter/material.dart';

import '../../../../core/theme/theme.dart';
import '../dashboard_state.dart';

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD HEADER  (DASHBOARD_SPEC.md §4.1)
// ─────────────────────────────────────────────────────────────────────────────

class DashboardHeader extends StatelessWidget {
  const DashboardHeader({super.key, required this.state});

  final DashboardState state;

  @override
  Widget build(BuildContext context) {
    final user = state.user;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        // ── Avatar ─────────────────────────────────────────────────────
        Semantics(
          label: 'Profile photo. Tap to open profile.',
          button: true,
          child: GestureDetector(
            onTap: () {
              // TODO: navigate to profile
            },
            child: _UserAvatar(
              avatarUrl: user?.avatarUrl,
              initials: user?.initials ?? '?',
              isLoading: state.isLoading,
            ),
          ),
        ),

        const SizedBox(width: AppSpacing.space3),

        // ── Greeting + date ─────────────────────────────────────────────
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              if (state.isLoading) ...[
                _SkeletonLine(width: 160, height: 16),
                const SizedBox(height: 4),
                _SkeletonLine(width: 120, height: 12),
              ] else ...[
                Semantics(
                  header: true,
                  child: RichText(
                    text: TextSpan(
                      style: AppTypography.titleMedium.copyWith(
                        color: Theme.of(context).colorScheme.onSurface,
                      ),
                      children: [
                        TextSpan(text: '${state.greeting}, '),
                        TextSpan(
                          text: user?.firstName ?? 'there',
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                        TextSpan(text: ' ${state.greetingEmoji}'),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  state.formattedDate,
                  style: AppTypography.bodySmall.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// USER AVATAR  — photo / initials / loading skeleton
// ─────────────────────────────────────────────────────────────────────────────

class _UserAvatar extends StatelessWidget {
  const _UserAvatar({
    required this.initials,
    this.avatarUrl,
    this.isLoading = false,
    this.radius = 22,
  });

  final String initials;
  final String? avatarUrl;
  final bool isLoading;
  final double radius;

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return Container(
        width: radius * 2,
        height: radius * 2,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: Theme.of(context).colorScheme.surfaceContainerHigh,
        ),
      );
    }

    if (avatarUrl != null && avatarUrl!.isNotEmpty) {
      return CircleAvatar(
        radius: radius,
        backgroundColor:
            Theme.of(context).colorScheme.primaryContainer,
        backgroundImage: NetworkImage(avatarUrl!),
        onBackgroundImageError: (_, __) {},
      );
    }

    return CircleAvatar(
      radius: radius,
      backgroundColor: Theme.of(context).colorScheme.primaryContainer,
      child: Text(
        initials.toUpperCase(),
        style: AppTypography.titleSmall.copyWith(
          color: Theme.of(context).colorScheme.onPrimaryContainer,
        ),
      ),
    );
  }
}

class _SkeletonLine extends StatelessWidget {
  const _SkeletonLine({required this.width, required this.height});
  final double width;
  final double height;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHigh,
        borderRadius: AppRadius.pillAll,
      ),
    );
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// KPI CARDS ROW  (DASHBOARD_SPEC.md §4.3)
// ─────────────────────────────────────────────────────────────────────────────

class KpiCardsRow extends StatelessWidget {
  const KpiCardsRow({
    super.key,
    required this.cards,
    required this.isLoading,
    required this.onCardTap,
  });

  final List<KpiCard> cards;
  final bool isLoading;
  final void Function(KpiCard) onCardTap;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 120,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: EdgeInsets.zero,
        physics: const BouncingScrollPhysics(),
        itemCount: isLoading ? 3 : cards.length,
        separatorBuilder: (_, __) =>
            const SizedBox(width: AppSpacing.cardMargin),
        itemBuilder: (context, index) {
          if (isLoading) return const _KpiCardSkeleton();
          final card = cards[index];
          return _KpiCardTile(
            card: card,
            animationDelay: Duration(milliseconds: 50 * index),
            onTap: () => onCardTap(card),
          );
        },
      ),
    );
  }
}

class _KpiCardTile extends StatefulWidget {
  const _KpiCardTile({
    required this.card,
    required this.animationDelay,
    required this.onTap,
  });
  final KpiCard card;
  final Duration animationDelay;
  final VoidCallback onTap;

  @override
  State<_KpiCardTile> createState() => _KpiCardTileState();
}

class _KpiCardTileState extends State<_KpiCardTile>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<Offset> _slideAnim;
  late final Animation<double> _fadeAnim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    _slideAnim = Tween<Offset>(
      begin: const Offset(0.3, 0),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _ctrl, curve: AppEasing.decelerate));
    _fadeAnim = CurvedAnimation(parent: _ctrl, curve: AppEasing.decelerate);

    // Stagger start
    Future.delayed(widget.animationDelay, () {
      if (mounted) _ctrl.forward();
    });
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SlideTransition(
      position: _slideAnim,
      child: FadeTransition(
        opacity: _fadeAnim,
        child: _buildCard(context),
      ),
    );
  }

  Widget _buildCard(BuildContext context) {
    final (bg, valueColor) = _colors(context, widget.card.severity);

    return Semantics(
      label: '${widget.card.title}: ${widget.card.primaryValue} ${widget.card.label}.'
          '${widget.card.trendLabel != null ? " ${widget.card.trendLabel}" : ""}',
      button: true,
      child: GestureDetector(
        onTap: widget.onTap,
        child: Container(
          width: 150,
          padding: const EdgeInsets.all(AppSpacing.space3),
          decoration: BoxDecoration(
            color: bg,
            borderRadius: AppRadius.lgAll,
            boxShadow: AppElevation.shadowForLevel(1),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _iconWidget(context, widget.card.iconName),
                  Icon(
                    Icons.arrow_forward_ios_rounded,
                    size: 12,
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ],
              ),
              const Spacer(),
              Text(
                widget.card.primaryValue,
                style: AppTypography.numericMedium.copyWith(color: valueColor),
              ),
              const SizedBox(height: 2),
              Text(
                widget.card.label,
                style: AppTypography.labelMedium.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              if (widget.card.trendLabel != null) ...[
                const SizedBox(height: 2),
                Text(
                  widget.card.trendLabel!,
                  style: AppTypography.labelSmall.copyWith(
                    color: widget.card.severity == KpiCardSeverity.critical
                        ? PingForceColors.statusCritical
                        : widget.card.severity == KpiCardSeverity.warning
                            ? PingForceColors.statusWarning
                            : Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  (Color, Color) _colors(BuildContext context, KpiCardSeverity severity) {
    return switch (severity) {
      KpiCardSeverity.critical => (
          PingForceColors.statusCriticalContainer,
          PingForceColors.statusCritical,
        ),
      KpiCardSeverity.warning => (
          PingForceColors.statusWarningContainer,
          PingForceColors.statusWarning,
        ),
      KpiCardSeverity.normal => (
          Theme.of(context).colorScheme.surfaceContainerLowest,
          Theme.of(context).colorScheme.primary,
        ),
    };
  }

  Widget _iconWidget(BuildContext context, String iconName) {
    // Map icon token names to Material Icons data
    final iconData = _iconMap[iconName] ?? Icons.circle_rounded;
    return Icon(
      iconData,
      size: AppIconSize.md,
      color: Theme.of(context).colorScheme.primary,
    );
  }

  static const _iconMap = <String, IconData>{
    'fingerprint': Icons.fingerprint_rounded,
    'groups': Icons.groups_rounded,
    'location_on': Icons.location_on_rounded,
    'build_circle': Icons.build_circle_rounded,
    'person_search': Icons.person_search_rounded,
    'bar_chart': Icons.bar_chart_rounded,
    'notifications': Icons.notifications_rounded,
  };
}

class _KpiCardSkeleton extends StatelessWidget {
  const _KpiCardSkeleton();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 150,
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHigh,
        borderRadius: AppRadius.lgAll,
      ),
    );
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// QUICK ACTIONS GRID  (DASHBOARD_SPEC.md §4.4)
// ─────────────────────────────────────────────────────────────────────────────

class QuickActionsGrid extends StatelessWidget {
  const QuickActionsGrid({
    super.key,
    required this.actions,
    required this.isLoading,
    required this.onActionTap,
  });

  final List<QuickAction> actions;
  final bool isLoading;
  final void Function(QuickAction) onActionTap;

  @override
  Widget build(BuildContext context) {
    final items = isLoading
        ? List.generate(4, (i) => null)
        : actions.take(8).toList();

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: AppSpacing.cardMargin,
        mainAxisSpacing: AppSpacing.cardMargin,
        childAspectRatio: 2.4,
      ),
      itemCount: items.length,
      itemBuilder: (context, index) {
        if (isLoading) return _QuickActionSkeleton();
        final action = actions[index];
        return _QuickActionCell(
          action: action,
          animationDelay: Duration(milliseconds: 30 * index),
          onTap: () => onActionTap(action),
        );
      },
    );
  }
}

class _QuickActionCell extends StatefulWidget {
  const _QuickActionCell({
    required this.action,
    required this.animationDelay,
    required this.onTap,
  });
  final QuickAction action;
  final Duration animationDelay;
  final VoidCallback onTap;

  @override
  State<_QuickActionCell> createState() => _QuickActionCellState();
}

class _QuickActionCellState extends State<_QuickActionCell>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _fadeAnim;
  bool _pressed = false;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 200),
    );
    _fadeAnim = CurvedAnimation(parent: _ctrl, curve: AppEasing.decelerate);
    Future.delayed(widget.animationDelay, () {
      if (mounted) _ctrl.forward();
    });
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bg = widget.action.isHighlighted
        ? Theme.of(context).colorScheme.primaryContainer
        : widget.action.isUrgent
            ? Theme.of(context).colorScheme.secondaryContainer
            : Theme.of(context).colorScheme.surfaceContainerLow;

    final iconColor = widget.action.isHighlighted || widget.action.isUrgent
        ? Theme.of(context).colorScheme.primary
        : Theme.of(context).colorScheme.primary;

    return FadeTransition(
      opacity: _fadeAnim,
      child: Semantics(
        label: widget.action.label,
        button: true,
        tooltip: widget.action.label,
        child: GestureDetector(
          onTapDown: (_) => setState(() => _pressed = true),
          onTapUp: (_) {
            setState(() => _pressed = false);
            widget.onTap();
          },
          onTapCancel: () => setState(() => _pressed = false),
          child: AnimatedScale(
            scale: _pressed ? 0.95 : 1.0,
            duration: const Duration(milliseconds: 100),
            curve: AppEasing.accelerate,
            child: Container(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.space3,
                vertical: AppSpacing.space2,
              ),
              decoration: BoxDecoration(
                color: bg,
                borderRadius: AppRadius.lgAll,
                border: Border.all(
                  color: Theme.of(context).colorScheme.outlineVariant,
                  width: 1,
                ),
              ),
              child: Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: iconColor.withOpacity(0.1),
                      borderRadius: AppRadius.smAll,
                    ),
                    child: Icon(
                      _iconData(widget.action.iconName),
                      size: AppIconSize.md,
                      color: iconColor,
                    ),
                  ),
                  const SizedBox(width: AppSpacing.space3),
                  Expanded(
                    child: Text(
                      widget.action.label,
                      style: AppTypography.labelMedium.copyWith(
                        color: Theme.of(context).colorScheme.onSurface,
                        fontWeight: widget.action.isHighlighted
                            ? FontWeight.w700
                            : FontWeight.w500,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  if (widget.action.badgeCount != null)
                    Badge(label: Text(widget.action.badgeCount!)),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  IconData _iconData(String name) {
    const map = <String, IconData>{
      'login': Icons.login_rounded,
      'logout': Icons.logout_rounded,
      'coffee': Icons.coffee_rounded,
      'report_problem': Icons.report_problem_rounded,
      'person_add': Icons.person_add_rounded,
      'groups': Icons.groups_rounded,
      'map': Icons.map_rounded,
      'event_busy': Icons.event_busy_rounded,
      'bar_chart': Icons.bar_chart_rounded,
      'folder': Icons.folder_rounded,
    };
    return map[name] ?? Icons.circle_rounded;
  }
}

class _QuickActionSkeleton extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHigh,
        borderRadius: AppRadius.lgAll,
      ),
    );
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// ACTIVITY FEED SECTION  (DASHBOARD_SPEC.md §4.5)
// ─────────────────────────────────────────────────────────────────────────────

class ActivityFeedSection extends StatelessWidget {
  const ActivityFeedSection({
    super.key,
    required this.items,
    required this.isLoading,
    required this.onItemTap,
  });

  final List<ActivityFeedItem> items;
  final bool isLoading;
  final void Function(ActivityFeedItem) onItemTap;

  @override
  Widget build(BuildContext context) {
    if (isLoading) return _buildSkeletons(context);
    if (items.isEmpty) return _buildEmptyState(context);
    return _buildList(context);
  }

  Widget _buildSkeletons(BuildContext context) {
    return Column(
      children: List.generate(
        4,
        (i) => Padding(
          padding: const EdgeInsets.only(bottom: AppSpacing.space3),
          child: Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Theme.of(context).colorScheme.surfaceContainerHigh,
                ),
              ),
              const SizedBox(width: AppSpacing.space3),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      height: 12,
                      width: 200,
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.surfaceContainerHigh,
                        borderRadius: AppRadius.pillAll,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Container(
                      height: 10,
                      width: 100,
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.surfaceContainerHigh,
                        borderRadius: AppRadius.pillAll,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return Column(
      children: [
        const SizedBox(height: AppSpacing.space8),
        Icon(
          Icons.inbox_rounded,
          size: AppIconSize.xl,
          color: Theme.of(context).colorScheme.onSurfaceVariant,
        ),
        const SizedBox(height: AppSpacing.space3),
        Text(
          'No activity today',
          style: AppTypography.titleSmall.copyWith(
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: AppSpacing.space1),
        Text(
          'Your actions will appear here',
          style: AppTypography.bodySmall.copyWith(
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: AppSpacing.space8),
      ],
    );
  }

  Widget _buildList(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerLowest,
        borderRadius: AppRadius.lgAll,
        boxShadow: AppElevation.shadowForLevel(1),
      ),
      child: Column(
        children: items.asMap().entries.map((entry) {
          final index = entry.key;
          final item = entry.value;
          return Column(
            children: [
              _ActivityFeedTile(
                item: item,
                onTap: () => onItemTap(item),
              ),
              if (index < items.length - 1)
                Divider(
                  height: 1,
                  indent: 56,
                  color: Theme.of(context).colorScheme.outlineVariant,
                ),
            ],
          );
        }).toList(),
      ),
    );
  }
}

class _ActivityFeedTile extends StatelessWidget {
  const _ActivityFeedTile({required this.item, required this.onTap});
  final ActivityFeedItem item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final (icon, iconBg, iconColor) = _iconConfig(context, item.type);

    return Semantics(
      label: '${item.title}. ${_relativeTime(item.timestamp)}',
      button: item.route != null,
      child: InkWell(
        onTap: item.route != null ? onTap : null,
        borderRadius: AppRadius.lgAll,
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.space4,
            vertical: AppSpacing.space3,
          ),
          child: Row(
            children: [
              // Icon bubble
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: iconBg,
                ),
                child: Icon(icon, size: AppIconSize.sm, color: iconColor),
              ),
              const SizedBox(width: AppSpacing.space3),
              // Text
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.title,
                      style: AppTypography.bodyMedium.copyWith(
                        color: Theme.of(context).colorScheme.onSurface,
                        fontWeight: item.isUnread ? FontWeight.w600 : FontWeight.w400,
                      ),
                    ),
                    if (item.subtitle != null)
                      Text(
                        item.subtitle!,
                        style: AppTypography.bodySmall.copyWith(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                      ),
                    Text(
                      _relativeTime(item.timestamp),
                      style: AppTypography.labelSmall.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              if (item.isUnread)
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                ),
              if (item.route != null)
                Icon(
                  Icons.chevron_right_rounded,
                  size: AppIconSize.sm,
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
            ],
          ),
        ),
      ),
    );
  }

  (IconData, Color, Color) _iconConfig(BuildContext context, ActivityType type) {
    return switch (type) {
      ActivityType.checkIn => (
          Icons.login_rounded,
          Theme.of(context).colorScheme.primaryContainer,
          Theme.of(context).colorScheme.primary,
        ),
      ActivityType.checkOut => (
          Icons.logout_rounded,
          Theme.of(context).colorScheme.surfaceContainerHigh,
          Theme.of(context).colorScheme.onSurfaceVariant,
        ),
      ActivityType.breakStart || ActivityType.breakEnd => (
          Icons.coffee_rounded,
          PingForceColors.statusWarningContainer,
          PingForceColors.statusWarning,
        ),
      ActivityType.faultCreated || ActivityType.faultAssigned => (
          Icons.build_circle_rounded,
          PingForceColors.statusWarningContainer,
          PingForceColors.statusWarning,
        ),
      ActivityType.faultResolved => (
          Icons.check_circle_rounded,
          PingForceColors.statusSuccessContainer,
          PingForceColors.statusSuccess,
        ),
      ActivityType.faultOverdue => (
          Icons.error_rounded,
          PingForceColors.statusCriticalContainer,
          PingForceColors.statusCritical,
        ),
      ActivityType.leadCreated || ActivityType.leadUpdated => (
          Icons.person_search_rounded,
          Theme.of(context).colorScheme.primaryContainer,
          Theme.of(context).colorScheme.primary,
        ),
      ActivityType.leadWon => (
          Icons.emoji_events_rounded,
          PingForceColors.statusSuccessContainer,
          PingForceColors.statusSuccess,
        ),
      ActivityType.visitLogged => (
          Icons.location_on_rounded,
          Theme.of(context).colorScheme.tertiaryContainer,
          Theme.of(context).colorScheme.tertiary,
        ),
      ActivityType.syncCompleted => (
          Icons.cloud_done_rounded,
          PingForceColors.statusSuccessContainer,
          PingForceColors.statusSuccess,
        ),
      ActivityType.notification => (
          Icons.notifications_rounded,
          Theme.of(context).colorScheme.primaryContainer,
          Theme.of(context).colorScheme.primary,
        ),
    };
  }

  String _relativeTime(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inSeconds < 60) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return 'Yesterday';
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// TEAM STATUS CARD  (DASHBOARD_SPEC.md §11 — Manager view)
// ─────────────────────────────────────────────────────────────────────────────

class TeamStatusCard extends StatelessWidget {
  const TeamStatusCard({
    super.key,
    required this.teamStatus,
    required this.isLoading,
    required this.onViewAll,
  });

  final TeamStatusSummary teamStatus;
  final bool isLoading;
  final VoidCallback onViewAll;

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return Container(
        height: 100,
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surfaceContainerHigh,
          borderRadius: AppRadius.lgAll,
        ),
      );
    }

    return Card(
      child: Padding(
        padding: AppSpacing.cardPaddingAll,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                Text(
                  'Team (${teamStatus.total} members)',
                  style: AppTypography.titleSmall.copyWith(
                    color: Theme.of(context).colorScheme.onSurface,
                  ),
                ),
                const Spacer(),
                TextButton(
                  onPressed: onViewAll,
                  style: TextButton.styleFrom(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.space2,
                    ),
                    minimumSize: const Size(48, 32),
                  ),
                  child: const Text('View All'),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.space3),

            // Avatar row
            if (teamStatus.members.isNotEmpty)
              _buildAvatarRow(context),

            const SizedBox(height: AppSpacing.space3),

            // Status counts
            Row(
              children: [
                _StatusCount(
                  count: teamStatus.present,
                  label: 'Present',
                  color: PingForceColors.statusSuccess,
                ),
                const SizedBox(width: AppSpacing.space4),
                _StatusCount(
                  count: teamStatus.late,
                  label: 'Late',
                  color: PingForceColors.statusWarning,
                ),
                const SizedBox(width: AppSpacing.space4),
                _StatusCount(
                  count: teamStatus.absent,
                  label: 'Absent',
                  color: PingForceColors.statusCritical,
                ),
                const SizedBox(width: AppSpacing.space4),
                _StatusCount(
                  count: teamStatus.onLeave,
                  label: 'Leave',
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAvatarRow(BuildContext context) {
    final displayMembers = teamStatus.members.take(10).toList();
    return SizedBox(
      height: 32,
      child: Stack(
        children: displayMembers.asMap().entries.map((e) {
          final member = e.value;
          final color = switch (member.status) {
            'present' => PingForceColors.statusSuccess,
            'late' => PingForceColors.statusWarning,
            'absent' => PingForceColors.statusCritical,
            _ => Theme.of(context).colorScheme.onSurfaceVariant,
          };
          return Positioned(
            left: e.key * 22.0,
            child: Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: color, width: 2),
                color: Theme.of(context).colorScheme.primaryContainer,
              ),
              child: Center(
                child: Text(
                  member.initials,
                  style: AppTypography.labelSmall.copyWith(
                    color: Theme.of(context).colorScheme.onPrimaryContainer,
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class _StatusCount extends StatelessWidget {
  const _StatusCount({
    required this.count,
    required this.label,
    required this.color,
  });
  final int count;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(shape: BoxShape.circle, color: color),
        ),
        const SizedBox(width: 4),
        Text(
          '$count $label',
          style: AppTypography.labelSmall.copyWith(
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// SYNC STATUS BAR  (DASHBOARD_SPEC.md §4.6)
// ─────────────────────────────────────────────────────────────────────────────

class SyncStatusBar extends StatefulWidget {
  const SyncStatusBar({super.key, required this.syncInfo});
  final SyncInfo syncInfo;

  @override
  State<SyncStatusBar> createState() => _SyncStatusBarState();
}

class _SyncStatusBarState extends State<SyncStatusBar>
    with SingleTickerProviderStateMixin {
  late final AnimationController _spinCtrl;

  @override
  void initState() {
    super.initState();
    _spinCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );
    if (widget.syncInfo.status == SyncStatus.syncing) {
      _spinCtrl.repeat();
    }
  }

  @override
  void didUpdateWidget(covariant SyncStatusBar oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.syncInfo.status == SyncStatus.syncing) {
      _spinCtrl.repeat();
    } else {
      _spinCtrl.stop();
    }
  }

  @override
  void dispose() {
    _spinCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isSyncing = widget.syncInfo.status == SyncStatus.syncing;
    final label = isSyncing
        ? 'Syncing...'
        : '${widget.syncInfo.pendingCount} record(s) pending sync';

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.space3,
        vertical: AppSpacing.space2,
      ),
      margin: const EdgeInsets.only(bottom: AppSpacing.space3),
      decoration: BoxDecoration(
        color: PingForceColors.statusInfoContainer,
        borderRadius: AppRadius.smAll,
      ),
      child: Row(
        children: [
          RotationTransition(
            turns: _spinCtrl,
            child: const Icon(
              Icons.sync_rounded,
              size: AppIconSize.sm,
              color: PingForceColors.statusInfo,
            ),
          ),
          AppSpacing.iconGapBox,
          Expanded(
            child: Text(
              label,
              style: AppTypography.labelMedium.copyWith(
                color: PingForceColors.statusInfo,
              ),
            ),
          ),
          if (!isSyncing && widget.syncInfo.pendingCount > 0)
            TextButton(
              onPressed: () {
                // TODO: trigger manual sync
              },
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.space2),
                minimumSize: const Size(48, 32),
                foregroundColor: PingForceColors.statusInfo,
              ),
              child: const Text('Sync Now'),
            ),
        ],
      ),
    );
  }
}
