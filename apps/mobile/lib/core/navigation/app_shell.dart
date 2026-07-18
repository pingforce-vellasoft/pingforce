import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../auth/auth_session.dart';
import '../theme/theme.dart';
import '../sync/sync_provider.dart';
import '../network/connectivity_provider.dart';
import '../widgets/app_states.dart';
import 'nav_destinations.dart';

// ─────────────────────────────────────────────────────────────────────────────
// APP SHELL  (AUDIT §17 — Navigation & Information Architecture)
// ─────────────────────────────────────────────────────────────────────────────
//
// The AppShell is the root persistent layout of the authenticated app.
//
// It provides:
//   1. Dynamic RBAC-driven bottom navigation (max 5 items)
//   2. "More" bottom sheet for secondary modules
//   3. Animated badge counts (notifications, sync, faults, etc.)
//   4. Role-specific FAB (extended when idle, icon-only on scroll)
//   5. GoRouter StatefulShellRoute integration for tab state preservation
//   6. Consistent back-navigation (Android back collapses sheet → exits)
//   7. SyncStatusChip in implied App Bar (per-screen AppBars inherit)
//   8. Offline banner via OfflineAwareScaffold
//
// Usage in GoRouter:
//   StatefulShellRoute.indexedStack(
//     builder: (context, state, shell) =>
//         AppShell(navigationShell: shell),
//     branches: [...],
//   )

// ── Shell State ────────────────────────────────────────────────────────────

class AppShellState {
  const AppShellState({
    this.selectedIndex = 0,
    this.role = AppUserRole.fieldTechnician,
    this.notificationBadge = 0,
    this.faultBadge = 0,
    this.visitBadge = 0,
    this.leadBadge = 0,
  });

  final int selectedIndex;
  final AppUserRole role;
  final int notificationBadge;
  final int faultBadge;
  final int visitBadge;
  final int leadBadge;

  AppShellState copyWith({
    int? selectedIndex,
    AppUserRole? role,
    int? notificationBadge,
    int? faultBadge,
    int? visitBadge,
    int? leadBadge,
  }) =>
      AppShellState(
        selectedIndex: selectedIndex ?? this.selectedIndex,
        role: role ?? this.role,
        notificationBadge: notificationBadge ?? this.notificationBadge,
        faultBadge: faultBadge ?? this.faultBadge,
        visitBadge: visitBadge ?? this.visitBadge,
        leadBadge: leadBadge ?? this.leadBadge,
      );
}

final appShellProvider =
    NotifierProvider<AppShellNotifier, AppShellState>(AppShellNotifier.new);

class AppShellNotifier extends Notifier<AppShellState> {
  @override
  AppShellState build() =>
      AppShellState(role: AppUserRoleX.fromRoleCode(AuthSession.instance.roleCode));

  void setRole(AppUserRole role) => state = state.copyWith(role: role);

  /// Re-reads the authenticated user's role from the session. Called after a
  /// fresh login so the bottom nav reflects the newly signed-in role even if
  /// this notifier was already built during a previous (signed-out) session.
  void syncRoleFromSession() =>
      state = state.copyWith(
        role: AppUserRoleX.fromRoleCode(AuthSession.instance.roleCode),
      );

  void setNotificationBadge(int count) =>
      state = state.copyWith(notificationBadge: count);

  void setFaultBadge(int count) => state = state.copyWith(faultBadge: count);

  void setVisitBadge(int count) => state = state.copyWith(visitBadge: count);

  void setLeadBadge(int count) => state = state.copyWith(leadBadge: count);
}

// ─────────────────────────────────────────────────────────────────────────────
// APP SHELL WIDGET
// ─────────────────────────────────────────────────────────────────────────────

class AppShell extends ConsumerStatefulWidget {
  const AppShell({
    super.key,
    required this.navigationShell,
  });

  /// GoRouter StatefulNavigationShell — holds per-tab navigator stacks
  final StatefulNavigationShell navigationShell;

  @override
  ConsumerState<AppShell> createState() => _AppShellState();
}

class _AppShellState extends ConsumerState<AppShell>
    with TickerProviderStateMixin {
  // FAB: extended when at top, compact on scroll
  bool _fabExtended = true;
  final ScrollController _scrollCtrl = ScrollController();

  // Animation for nav-item badge scale
  late final AnimationController _badgeAnim;

  @override
  void initState() {
    super.initState();
    _badgeAnim = AnimationController(
      vsync: this,
      duration: AppDurations.fast,
    );
    _scrollCtrl.addListener(_onScroll);
  }

  void _onScroll() {
    final extended = _scrollCtrl.offset < 80;
    if (extended != _fabExtended) {
      setState(() => _fabExtended = extended);
    }
  }

  @override
  void dispose() {
    _badgeAnim.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final shellState = ref.watch(appShellProvider);
    final syncPending = ref.watch(syncPendingCountProvider);
    final isOnline = ref.watch(isOnlineProvider);

    final destinations = NavDestinations.bottomNavFor(
      role: shellState.role,
      notificationBadge: shellState.notificationBadge,
      pendingSyncBadge: syncPending,
      faultBadge: shellState.faultBadge,
      visitBadge: shellState.visitBadge,
      leadBadge: shellState.leadBadge,
    );

    final currentIndex = widget.navigationShell.currentIndex;
    final currentDest = currentIndex < destinations.length
        ? destinations[currentIndex]
        : destinations.first;

    final fab = currentDest.fab;

    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      body: Column(
        children: [
          // ── Global offline banner ─────────────────────────────────────
          AnimatedSize(
            duration: AppDurations.normal,
            curve: AppEasing.standard,
            child: isOnline
                ? const SizedBox.shrink()
                : AppOfflineBanner(
                    pendingCount: syncPending,
                    onSyncTap: null, // offline — tap does nothing
                  ),
          ),

          // ── Screen body ───────────────────────────────────────────────
          Expanded(child: widget.navigationShell),
        ],
      ),

      // ── Bottom Navigation ────────────────────────────────────────────
      bottomNavigationBar: _AppBottomNav(
        destinations: destinations,
        currentIndex: currentIndex,
        onTap: _onNavTap,
        onMoreTap: () => _showMoreSheet(context, shellState),
      ),

      // ── FAB (role-specific, collapses on scroll) ─────────────────────
      floatingActionButton: fab != null
          ? fab.isSpeedDial
              ? _SpeedDialFab(config: fab, extended: _fabExtended)
              : _SimpleFab(config: fab, extended: _fabExtended)
          : null,
      floatingActionButtonLocation:
          FloatingActionButtonLocation.endFloat,
    );
  }

  void _onNavTap(int index, List<NavDestination> destinations) {
    final dest = destinations[index];

    // "More" — opens sheet instead of navigating
    if (dest.id == NavDestinationId.notifications &&
        dest.label == 'More') {
      _showMoreSheet(
        context,
        ref.read(appShellProvider),
      );
      return;
    }

    if (index == widget.navigationShell.currentIndex) {
      // Tap active tab → scroll to top (pop to root)
      widget.navigationShell.goBranch(index, initialLocation: true);
    } else {
      widget.navigationShell.goBranch(index);
    }
  }

  void _showMoreSheet(BuildContext context, AppShellState shellState) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => _MoreSheet(
        shellState: shellState,
        onNavigate: (route) {
          Navigator.pop(ctx);
          context.push(route);
        },
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BOTTOM NAVIGATION BAR
// ─────────────────────────────────────────────────────────────────────────────

class _AppBottomNav extends StatelessWidget {
  const _AppBottomNav({
    required this.destinations,
    required this.currentIndex,
    required this.onTap,
    required this.onMoreTap,
  });

  final List<NavDestination> destinations;
  final int currentIndex;
  final void Function(int, List<NavDestination>) onTap;
  final VoidCallback onMoreTap;

  @override
  Widget build(BuildContext context) {
    return NavigationBar(
      selectedIndex: currentIndex.clamp(0, destinations.length - 1),
      onDestinationSelected: (i) => onTap(i, destinations),
      animationDuration: AppDurations.normal,
      indicatorColor: Theme.of(context).colorScheme.primaryContainer,
      destinations: destinations.map((dest) {
        // "More" tap is handled via onMoreTap, but we still render it
        return NavigationDestination(
          icon: _BadgedIcon(
            icon: Icon(dest.icon),
            badgeCount: dest.badgeCount,
            isSelected: false,
          ),
          selectedIcon: _BadgedIcon(
            icon: Icon(dest.selectedIcon),
            badgeCount: dest.badgeCount,
            isSelected: true,
          ),
          label: dest.label,
          tooltip: dest.label,
        );
      }).toList(),
    );
  }
}

// ── Badge icon ─────────────────────────────────────────────────────────────

class _BadgedIcon extends StatelessWidget {
  const _BadgedIcon({
    required this.icon,
    required this.badgeCount,
    required this.isSelected,
  });

  final Widget icon;
  final int badgeCount;
  final bool isSelected;

  @override
  Widget build(BuildContext context) {
    if (badgeCount <= 0) return icon;

    return Badge(
      label: Text(
        badgeCount > 99 ? '99+' : '$badgeCount',
        style: const TextStyle(fontSize: 9),
      ),
      backgroundColor: Theme.of(context).colorScheme.error,
      textColor: Theme.of(context).colorScheme.onError,
      child: icon,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// "MORE" BOTTOM SHEET
// ─────────────────────────────────────────────────────────────────────────────

class _MoreSheet extends ConsumerWidget {
  const _MoreSheet({
    required this.shellState,
    required this.onNavigate,
  });

  final AppShellState shellState;
  final void Function(String route) onNavigate;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final syncPending = ref.watch(syncPendingCountProvider);

    final items = NavDestinations.moreSheetItems(
      hasPermission: (key) =>
          NavDestinations.roleHasPermission(shellState.role, key),
      notificationBadge: shellState.notificationBadge,
      pendingSyncBadge: syncPending,
    );

    return DraggableScrollableSheet(
      initialChildSize: 0.55,
      maxChildSize: 0.9,
      minChildSize: 0.35,
      expand: false,
      builder: (ctx, scrollCtrl) {
        return Column(
          children: [
            // ── Handle ──────────────────────────────────────────────────
            const SizedBox(height: AppSpacing.space2),
            Center(
              child: Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.outlineVariant,
                  borderRadius: AppRadius.pillAll,
                ),
              ),
            ),

            // ── Header ──────────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.screenHorizontal,
                AppSpacing.space4,
                AppSpacing.screenHorizontal,
                AppSpacing.space2,
              ),
              child: Row(
                children: [
                  Text('More', style: AppTypography.titleMedium),
                  const Spacer(),
                  Text(
                    shellState.role.label,
                    style: AppTypography.labelMedium.copyWith(
                      color: Theme.of(context).colorScheme.primary,
                    ),
                  ),
                ],
              ),
            ),

            const Divider(height: 1),

            // ── Grid of items ────────────────────────────────────────────
            Expanded(
              child: GridView.builder(
                controller: scrollCtrl,
                padding: AppSpacing.screenPaddingAll,
                gridDelegate:
                    const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 3,
                  childAspectRatio: 1,
                  crossAxisSpacing: AppSpacing.space3,
                  mainAxisSpacing: AppSpacing.space3,
                ),
                itemCount: items.length,
                itemBuilder: (_, i) => _MoreSheetItem(
                  destination: items[i],
                  onTap: () => onNavigate(items[i].rootRoute),
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

class _MoreSheetItem extends StatefulWidget {
  const _MoreSheetItem({
    required this.destination,
    required this.onTap,
  });

  final NavDestination destination;
  final VoidCallback onTap;

  @override
  State<_MoreSheetItem> createState() => _MoreSheetItemState();
}

class _MoreSheetItemState extends State<_MoreSheetItem> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    final dest = widget.destination;

    return Semantics(
      label: dest.label + (dest.hasBadge ? ', ${dest.badgeLabel} unread' : ''),
      button: true,
      child: GestureDetector(
        onTapDown: (_) => setState(() => _pressed = true),
        onTapUp: (_) {
          setState(() => _pressed = false);
          widget.onTap();
        },
        onTapCancel: () => setState(() => _pressed = false),
        child: AnimatedScale(
          scale: _pressed ? 0.92 : 1.0,
          duration: const Duration(milliseconds: 100),
          child: Container(
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surfaceContainerLowest,
              borderRadius: AppRadius.lgAll,
              boxShadow: AppElevation.shadowForLevel(1),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Badge wrapped icon
                Badge(
                  isLabelVisible: dest.hasBadge,
                  label: Text(
                    dest.badgeLabel,
                    style: const TextStyle(fontSize: 9),
                  ),
                  backgroundColor: Theme.of(context).colorScheme.error,
                  textColor: Theme.of(context).colorScheme.onError,
                  child: Icon(
                    dest.icon,
                    size: AppIconSize.lg,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                ),
                const SizedBox(height: AppSpacing.space2),
                Text(
                  dest.label,
                  style: AppTypography.labelSmall.copyWith(
                    color: Theme.of(context).colorScheme.onSurface,
                  ),
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FAB VARIANTS
// ─────────────────────────────────────────────────────────────────────────────

/// Simple single-action FAB — collapses to icon-only on scroll
class _SimpleFab extends StatelessWidget {
  const _SimpleFab({required this.config, required this.extended});

  final DestinationFabConfig config;
  final bool extended;

  @override
  Widget build(BuildContext context) {
    return AnimatedSwitcher(
      duration: AppDurations.fast,
      transitionBuilder: (child, anim) => ScaleTransition(
        scale: anim,
        child: child,
      ),
      child: extended
          ? FloatingActionButton.extended(
              key: const ValueKey('extended-fab'),
              onPressed: () => context.push(config.route),
              icon: Icon(config.icon),
              label: Text(config.tooltip),
              tooltip: config.tooltip,
            )
          : FloatingActionButton(
              key: const ValueKey('compact-fab'),
              onPressed: () => context.push(config.route),
              tooltip: config.tooltip,
              child: Icon(config.icon),
            ),
    );
  }
}

/// Speed-dial FAB — expands to reveal multiple options
class _SpeedDialFab extends StatefulWidget {
  const _SpeedDialFab({required this.config, required this.extended});

  final DestinationFabConfig config;
  final bool extended;

  @override
  State<_SpeedDialFab> createState() => _SpeedDialFabState();
}

class _SpeedDialFabState extends State<_SpeedDialFab>
    with SingleTickerProviderStateMixin {
  bool _open = false;
  late final AnimationController _ctrl;
  late final Animation<double> _rotation;
  late final Animation<double> _opacity;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: AppDurations.normal,
    );
    _rotation = Tween<double>(begin: 0, end: 0.125).animate(
      CurvedAnimation(parent: _ctrl, curve: AppEasing.standard),
    );
    _opacity = CurvedAnimation(parent: _ctrl, curve: AppEasing.standard);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  void _toggle() {
    setState(() => _open = !_open);
    if (_open) {
      _ctrl.forward();
    } else {
      _ctrl.reverse();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        // ── Speed dial options (revealed on open) ─────────────────────
        FadeTransition(
          opacity: _opacity,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: widget.config.speedDialItems.map((item) {
              return Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.space3),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Label chip
                    AnimatedOpacity(
                      opacity: _open ? 1 : 0,
                      duration: AppDurations.fast,
                      child: Container(
                        margin: const EdgeInsets.only(right: AppSpacing.space2),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 5,
                        ),
                        decoration: BoxDecoration(
                          color: Theme.of(context).colorScheme.surface,
                          borderRadius: AppRadius.pillAll,
                          boxShadow: AppElevation.shadowForLevel(2),
                        ),
                        child: Text(
                          item.tooltip,
                          style: AppTypography.labelMedium.copyWith(
                            color: Theme.of(context).colorScheme.onSurface,
                          ),
                        ),
                      ),
                    ),
                    // Mini FAB
                    FloatingActionButton.small(
                      heroTag: item.route,
                      onPressed: () {
                        _toggle();
                        context.push(item.route);
                      },
                      tooltip: item.tooltip,
                      child: Icon(item.icon),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
        ),

        // ── Main FAB ──────────────────────────────────────────────────
        RotationTransition(
          turns: _rotation,
          child: widget.extended
              ? FloatingActionButton.extended(
                  heroTag: 'main-speed-dial',
                  onPressed: _toggle,
                  icon: Icon(widget.config.icon),
                  label: Text(_open ? 'Close' : widget.config.tooltip),
                )
              : FloatingActionButton(
                  heroTag: 'main-speed-dial-compact',
                  onPressed: _toggle,
                  tooltip: widget.config.tooltip,
                  child: AnimatedRotation(
                    turns: _open ? 0.125 : 0,
                    duration: AppDurations.normal,
                    child: Icon(widget.config.icon),
                  ),
                ),
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BACK NAVIGATION HANDLER  (AUDIT §17 — consistent back navigation)
// ─────────────────────────────────────────────────────────────────────────────
//
// Wrap any leaf screen with BackNavigationHandler to enforce:
//   - Android back closes open sheets/dialogs first
//   - Root tabs show an "exit app?" confirmation on double-back
//   - Non-root screens pop normally
//
// Usage:
//   return BackNavigationHandler(
//     isRootScreen: true,
//     child: OfflineAwareScaffold(...),
//   );

class BackNavigationHandler extends StatefulWidget {
  const BackNavigationHandler({
    super.key,
    required this.child,
    this.isRootScreen = false,
  });

  final Widget child;

  /// If true, a second back press within 2s shows exit confirmation
  final bool isRootScreen;

  @override
  State<BackNavigationHandler> createState() => _BackNavigationHandlerState();
}

class _BackNavigationHandlerState extends State<BackNavigationHandler> {
  DateTime? _lastBackPress;

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: !widget.isRootScreen,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) return;
        if (!widget.isRootScreen) return;

        final now = DateTime.now();
        final last = _lastBackPress;

        if (last != null && now.difference(last).inSeconds < 2) {
          // Second press within 2s → exit
          // TODO: SystemNavigator.pop();
          return;
        }

        _lastBackPress = now;
        AppSnackBar.showInfo(
          context,
          'Press back again to exit',
        );
      },
      child: widget.child,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE GUARD  (AUDIT §17 — route guards)
// ─────────────────────────────────────────────────────────────────────────────
//
// GoRouter redirect factory. Wire into GoRouter.redirect.
//
// Usage in router:
//   GoRouter(
//     redirect: RouteGuard.redirect,
//     ...
//   )

class RouteGuard {
  RouteGuard._();

  static String? redirect(BuildContext context, GoRouterState state) {
    // These checks must run in order — first match wins.

    // 1. Auth guard — redirect unauthenticated users to login
    final isAuthenticated = _isAuthenticated();
    final isOnChangePassword =
        state.matchedLocation == '/auth/change-password';
    // The forced change-password screen is an authenticated route despite its
    // /auth prefix, so exclude it from the auth-route bounce below.
    final isOnAuthRoute =
        (state.matchedLocation.startsWith('/auth') && !isOnChangePassword) ||
            state.matchedLocation == '/splash';
    if (!isAuthenticated && !isOnAuthRoute && !isOnChangePassword) {
      return '/auth/login';
    }
    if (isAuthenticated && isOnAuthRoute) {
      return '/home';
    }

    // 1b. Forced password change — an admin-provisioned temporary password
    // must be rotated before the rest of the app is reachable.
    if (isAuthenticated && _mustChangePassword() && !isOnChangePassword) {
      return '/auth/change-password';
    }

    // 2. Session expired
    if (_isSessionExpired()) {
      return '/auth/session-expired';
    }

    // 3. Maintenance mode
    if (_isMaintenanceMode()) {
      return '/maintenance';
    }

    // 4. Force update required
    if (_isUpdateRequired()) {
      return '/update-required';
    }

    // 5. Role-based route guard — an authenticated user who deep-links (push
    // notification, invite link, stale context.go) to a feature route their
    // role does not carry is bounced home. The bottom nav already hides the
    // tab; this closes the gap for routes reached without the nav.
    if (isAuthenticated) {
      final requiredPermission =
          NavDestinations.permissionKeyForRoute(state.matchedLocation);
      if (requiredPermission != null) {
        final role = AppUserRoleX.fromRoleCode(AuthSession.instance.roleCode);
        if (!NavDestinations.roleHasPermission(role, requiredPermission)) {
          return '/home';
        }
      }
    }

    // 6. No specific redirect needed
    return null;
  }

  // ── Session-backed checks ─────────────────────────────────────────────────

  static bool _isAuthenticated() {
    return AuthSession.instance.isAuthenticated;
  }

  static bool _mustChangePassword() {
    return AuthSession.instance.mustChangePassword;
  }

  static bool _isSessionExpired() {
    // TODO: ref.read(authProvider).isSessionExpired
    return false;
  }

  static bool _isMaintenanceMode() {
    // TODO: ref.read(tenantProvider).isInMaintenance
    return false;
  }

  static bool _isUpdateRequired() {
    // TODO: ref.read(appVersionProvider).updateRequired
    return false;
  }
}
