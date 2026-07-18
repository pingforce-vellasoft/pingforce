import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/navigation/nav_destinations.dart';
import '../../../core/theme/theme.dart';
import '../../auth/presentation/current_user_provider.dart';
import 'dashboard_state.dart';
import 'dashboard_notifier.dart';
import 'geofence_nudge_provider.dart';
import 'widgets/attendance_hero_card.dart';
import 'widgets/dashboard_widgets.dart';

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD SCREEN  (DASHBOARD_SPEC.md)
// ─────────────────────────────────────────────────────────────────────────────

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen>
    with WidgetsBindingObserver {
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(dashboardNotifierProvider.notifier).load();
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _scrollController.dispose();
    super.dispose();
  }

  // Refresh on app resume (DASHBOARD_SPEC.md §8)
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      ref.read(dashboardNotifierProvider.notifier).refresh();
    }
  }

  // ── Build ──────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(dashboardNotifierProvider);

    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      body: RefreshIndicator(
        color: Theme.of(context).colorScheme.primary,
        strokeWidth: 2.5,
        onRefresh: () => ref.read(dashboardNotifierProvider.notifier).refresh(),
        child: CustomScrollView(
          controller: _scrollController,
          physics: const BouncingScrollPhysics(
            parent: AlwaysScrollableScrollPhysics(),
          ),
          slivers: [
            // ── Sliver App Bar (collapses on scroll) ──────────────────────
            _buildSliverAppBar(context, state),

            // ── Offline Banner ────────────────────────────────────────────
            if (!state.isOnline)
              SliverToBoxAdapter(child: _buildOfflineBanner(context)),

            // ── Sync status bar ───────────────────────────────────────────
            if (state.syncInfo.pendingCount > 0 ||
                state.syncInfo.status == SyncStatus.syncing)
              SliverToBoxAdapter(
                child: Padding(
                  padding: AppSpacing.screenPaddingH,
                  child: SyncStatusBar(
                    syncInfo: state.syncInfo,
                    onSyncNow: () =>
                        ref.read(dashboardNotifierProvider.notifier).syncNow(),
                  ),
                ),
              ),

            // ── Geofence setup reminder (admin + attendance enabled) ──────
            SliverToBoxAdapter(child: _buildGeofenceNudge(context)),

            // ── Main content ──────────────────────────────────────────────
            SliverPadding(
              padding: EdgeInsets.fromLTRB(
                AppSpacing.screenHorizontal,
                AppSpacing.space4,
                AppSpacing.screenHorizontal,
                AppSpacing.space20,
              ),
              sliver: SliverList.list(
                children: _buildContent(context, state),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Sliver App Bar ─────────────────────────────────────────────────────────

  SliverAppBar _buildSliverAppBar(BuildContext context, DashboardState state) {
    return SliverAppBar(
      pinned: true,
      floating: false,
      snap: false,
      expandedHeight: 100,
      backgroundColor: Theme.of(context).colorScheme.surfaceContainerLow,
      surfaceTintColor: Colors.transparent,
      elevation: AppElevation.flat,
      scrolledUnderElevation: AppElevation.level1,
      flexibleSpace: FlexibleSpaceBar(
        collapseMode: CollapseMode.pin,
        background: Padding(
          padding: EdgeInsets.only(
            left: AppSpacing.screenHorizontal,
            right: AppSpacing.screenHorizontal,
            top: MediaQuery.of(context).padding.top + AppSpacing.space2,
          ),
          child: DashboardHeader(
            state: state,
            onAvatarTap: () => ref
                .read(dashboardNotifierProvider.notifier)
                .goToProfile(context),
          ),
        ),
      ),
      actions: [
        // Notification bell
        Semantics(
          label: state.unreadNotifications > 0
              ? 'Notifications, ${state.unreadNotifications} unread'
              : 'Notifications',
          button: true,
          child: IconButton(
            icon: Badge(
              isLabelVisible: state.unreadNotifications > 0,
              label: Text(
                state.unreadNotifications > 99
                    ? '99+'
                    : '${state.unreadNotifications}',
              ),
              child: Icon(
                state.unreadNotifications > 0
                    ? Icons.notifications_rounded
                    : Icons.notifications_outlined,
                color: Theme.of(context).colorScheme.onSurface,
              ),
            ),
            onPressed: () =>
                ref.read(dashboardNotifierProvider.notifier).openNotifications(context),
          ),
        ),
        const SizedBox(width: AppSpacing.space1),
      ],
    );
  }

  // ── Offline banner ─────────────────────────────────────────────────────────

  Widget _buildOfflineBanner(BuildContext context) {
    return Container(
      height: 40,
      color: PingForceColors.offlineBannerBg,
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.space4),
      child: Row(
        children: [
          const Icon(Icons.cloud_off_rounded,
              size: AppIconSize.sm, color: PingForceColors.offlineBannerFg),
          AppSpacing.iconGapBox,
          Expanded(
            child: Text(
              'Offline · Showing cached data',
              style: AppTypography.labelMedium
                  .copyWith(color: PingForceColors.offlineBannerFg),
            ),
          ),
        ],
      ),
    );
  }

  // ── Geofence setup reminder ─────────────────────────────────────────────────
  //
  // Shown only to tenant admins while the attendance module is enabled. Mobile
  // has no in-app geofence management, so this points admins to the web portal
  // and is permanently dismissible per tenant (no live geofence count here).
  Widget _buildGeofenceNudge(BuildContext context) {
    final user = ref.watch(currentUserProvider).valueOrNull;
    if (user == null || !user.isAttendanceEnabled) {
      return const SizedBox.shrink();
    }
    if (AppUserRoleX.fromRoleCode(user.role) != AppUserRole.admin) {
      return const SizedBox.shrink();
    }

    // Read the (async) dismissal flag; watch the provider so a dismiss rebuilds.
    ref.watch(geofenceNudgeDismissalProvider);
    final dismissal = ref.read(geofenceNudgeDismissalProvider.notifier);

    return FutureBuilder<bool>(
      future: dismissal.isDismissed(user.tenantId),
      builder: (context, snapshot) {
        if (snapshot.data != true) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const SizedBox.shrink();
          }
          return _GeofenceNudgeBanner(
            onDismiss: () => dismissal.dismiss(user.tenantId),
          );
        }
        return const SizedBox.shrink();
      },
    );
  }

  // ── Main content list ──────────────────────────────────────────────────────

  List<Widget> _buildContent(BuildContext context, DashboardState state) {
    final widgets = <Widget>[];

    // ── Attendance Hero Card ─────────────────────────────────────────────
    widgets.add(AttendanceHeroCard(
      data: state.attendanceHero,
      isLoading: state.isLoading,
      onCheckIn: () =>
          ref.read(dashboardNotifierProvider.notifier).goToAttendance(context),
      onCheckOut: () =>
          ref.read(dashboardNotifierProvider.notifier).goToAttendance(context),
      onBreak: () =>
          ref.read(dashboardNotifierProvider.notifier).goToAttendance(context),
      onResume: () =>
          ref.read(dashboardNotifierProvider.notifier).goToAttendance(context),
      onViewDetails: () =>
          ref.read(dashboardNotifierProvider.notifier).goToAttendanceHistory(context),
      onRequestCorrection: () =>
          ref.read(dashboardNotifierProvider.notifier).goToCorrection(context),
    ));

    widgets.add(AppSpacing.sectionGapBox);

    // ── Manager: Team Status Card ────────────────────────────────────────
    if ((state.user?.isManager ?? false) && state.teamStatus != null) {
      widgets.add(TeamStatusCard(
        teamStatus: state.teamStatus!,
        isLoading: state.isLoading,
        onViewAll: () =>
            ref.read(dashboardNotifierProvider.notifier).goToTeam(context),
      ));
      widgets.add(AppSpacing.sectionGapBox);
    }

    // ── KPI Cards Row ───────────────────────────────────────────────────
    if (state.kpiCards.isNotEmpty || state.isLoading) {
      widgets.add(KpiCardsRow(
        cards: state.kpiCards,
        isLoading: state.isLoading,
        onCardTap: (card) =>
            ref.read(dashboardNotifierProvider.notifier).onKpiCardTap(context, card),
      ));
      widgets.add(AppSpacing.sectionGapBox);
    }

    // ── Quick Actions Grid ───────────────────────────────────────────────
    if (state.quickActions.isNotEmpty || state.isLoading) {
      widgets.add(_SectionHeader(
        title: 'Quick Actions',
        onSeeAll: null, // no "see all" for actions
      ));
      widgets.add(const SizedBox(height: AppSpacing.space3));
      widgets.add(QuickActionsGrid(
        actions: state.quickActions,
        isLoading: state.isLoading,
        onActionTap: (action) =>
            ref.read(dashboardNotifierProvider.notifier).onQuickActionTap(context, action),
      ));
      widgets.add(AppSpacing.sectionGapBox);
    }

    // ── Today's Activity Feed ────────────────────────────────────────────
    widgets.add(_SectionHeader(
      title: "Today's Activity",
      onSeeAll: state.hasMoreFeed
          ? () => ref
              .read(dashboardNotifierProvider.notifier)
              .goToActivityFeed(context)
          : null,
    ));
    widgets.add(const SizedBox(height: AppSpacing.space3));
    widgets.add(ActivityFeedSection(
      items: state.activityFeed,
      isLoading: state.isLoading,
      onItemTap: (item) =>
          ref.read(dashboardNotifierProvider.notifier).onActivityItemTap(context, item),
    ));

    return widgets;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GEOFENCE SETUP NUDGE BANNER
// ─────────────────────────────────────────────────────────────────────────────

class _GeofenceNudgeBanner extends StatelessWidget {
  const _GeofenceNudgeBanner({required this.onDismiss});

  final VoidCallback onDismiss;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: EdgeInsets.fromLTRB(
        AppSpacing.screenHorizontal,
        AppSpacing.space3,
        AppSpacing.screenHorizontal,
        0,
      ),
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.space4),
        decoration: BoxDecoration(
          color: scheme.tertiaryContainer.withValues(alpha: 0.4),
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: Border.all(color: scheme.tertiary.withValues(alpha: 0.5)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(
              Icons.location_off_rounded,
              size: AppIconSize.md,
              color: scheme.tertiary,
            ),
            AppSpacing.iconGapBox,
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Set up a geofence first',
                    style: AppTypography.titleSmall.copyWith(
                      color: scheme.onSurface,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.space1),
                  Text(
                    'The attendance module is enabled. Configure at least one '
                    'geofence in the web admin portal before adding employees, '
                    'so their check-ins can be validated.',
                    style: AppTypography.bodySmall.copyWith(
                      color: scheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
            IconButton(
              icon: const Icon(Icons.close_rounded),
              iconSize: AppIconSize.sm,
              color: scheme.onSurfaceVariant,
              tooltip: 'Dismiss',
              onPressed: onDismiss,
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION HEADER  — "Title" + optional "See All →" link
// ─────────────────────────────────────────────────────────────────────────────

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title, this.onSeeAll});

  final String title;
  final VoidCallback? onSeeAll;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(
            title,
            style: AppTypography.titleMedium.copyWith(
              color: Theme.of(context).colorScheme.onSurface,
            ),
          ),
        ),
        if (onSeeAll != null)
          TextButton(
            onPressed: onSeeAll,
            style: TextButton.styleFrom(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.space2,
                vertical: AppSpacing.space1,
              ),
              minimumSize: const Size(48, 32),
            ),
            child: Text(
              'See All',
              style: AppTypography.labelMedium.copyWith(
                color: Theme.of(context).colorScheme.primary,
              ),
            ),
          ),
      ],
    );
  }
}
