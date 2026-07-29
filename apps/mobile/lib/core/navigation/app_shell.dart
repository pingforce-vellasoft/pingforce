import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../auth/auth_session.dart';
import '../../features/auth/presentation/current_user_provider.dart';
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

/// Key on the AppShell's Scaffold so inner screens (which have their own nested
/// Scaffolds) can open the shell's left navigation drawer. `Scaffold.of` from a
/// screen would resolve to that screen's own Scaffold, which has no drawer.
final appShellScaffoldKeyProvider =
    Provider<GlobalKey<ScaffoldState>>((_) => GlobalKey<ScaffoldState>());

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

    // `navigationShell.currentIndex` is a BRANCH index; the bottom nav needs the
    // POSITION of the destination that owns that branch. Translate so the right
    // tab is highlighted regardless of role (admin Reports ≠ branch 1, etc.).
    final currentBranch = widget.navigationShell.currentIndex;
    var selectedNavIndex = destinations.indexWhere(
      (d) => NavDestinations.branchIndexForRoute(d.rootRoute) == currentBranch,
    );
    if (selectedNavIndex < 0) selectedNavIndex = 0;

    final currentDest = destinations[selectedNavIndex];

    final fab = currentDest.fab;

    return Scaffold(
      key: ref.watch(appShellScaffoldKeyProvider),
      backgroundColor: Theme.of(context).colorScheme.surface,
      drawer: _AppDrawer(
        shellState: shellState,
        onNavigate: (route) => context.push(route),
      ),
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
        currentIndex: selectedNavIndex,
        onTap: _onNavTap,
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

    // Resolve the destination to its actual shell branch. The per-role nav lists
    // destinations positionally, but goBranch() needs the real branch index —
    // otherwise e.g. admin's "Reports"/"Settings" tabs land on the wrong branch.
    final branch = NavDestinations.branchIndexForRoute(dest.rootRoute);

    // Non-branch destinations (e.g. /settings) are modal routes over the shell.
    if (branch == null) {
      if (dest.rootRoute.isNotEmpty) context.push(dest.rootRoute);
      return;
    }

    // Branch 2 hosts five role-feature routes (/faults, /visits, /leads,
    // /team, /reports). goBranch(2) alone lands on the branch's DEFAULT
    // location — its first route, /faults — which the RouteGuard then bounces
    // home for any role lacking faults.view (e.g. a field employee whose tab is
    // Visits). So switch the branch AND navigate to the destination's own route
    // so the correct feature screen actually shows.
    if (branch == widget.navigationShell.currentIndex) {
      // Tap active tab → reset to this destination's root.
      widget.navigationShell.goBranch(branch, initialLocation: true);
      if (dest.rootRoute.isNotEmpty) context.go(dest.rootRoute);
    } else {
      widget.navigationShell.goBranch(branch);
      if (dest.rootRoute.isNotEmpty) context.go(dest.rootRoute);
    }
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
  });

  final List<NavDestination> destinations;
  final int currentIndex;
  final void Function(int, List<NavDestination>) onTap;

  @override
  Widget build(BuildContext context) {
    return NavigationBar(
      selectedIndex: currentIndex.clamp(0, destinations.length - 1),
      onDestinationSelected: (i) => onTap(i, destinations),
      animationDuration: AppDurations.normal,
      indicatorColor: Theme.of(context).colorScheme.primaryContainer,
      destinations: destinations.map((dest) {
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
// LEFT NAVIGATION DRAWER  (AUDIT §17 — secondary navigation)
// ─────────────────────────────────────────────────────────────────────────────
//
// Side menu opened from the dashboard app-bar menu icon. This is the ONLY
// secondary-navigation surface — it holds the RBAC-filtered secondary modules
// plus Profile (via the user header). Items the current role already has as a
// bottom-nav tab are filtered out, so nothing appears twice. Tapping an item
// closes the drawer and pushes its route.

class _AppDrawer extends ConsumerWidget {
  const _AppDrawer({required this.shellState, required this.onNavigate});

  final AppShellState shellState;
  final void Function(String route) onNavigate;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final scheme = Theme.of(context).colorScheme;
    final user = ref.watch(currentUserProvider).valueOrNull;
    final syncPending = ref.watch(syncPendingCountProvider);

    final items = NavDestinations.drawerItems(
      role: shellState.role,
      hasPermission: (key) =>
          NavDestinations.roleHasPermission(shellState.role, key),
      pendingSyncBadge: syncPending,
    );

    void go(String route) {
      Navigator.pop(context); // close drawer
      onNavigate(route);
    }

    return Drawer(
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── User header (tap → profile) ─────────────────────────────
            InkWell(
              onTap: () => go('/profile'),
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.space4),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 26,
                      backgroundColor: scheme.primaryContainer,
                      child: Text(
                        _initials(user?.name),
                        style: AppTypography.titleMedium.copyWith(
                          color: scheme.onPrimaryContainer,
                        ),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.space3),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            user?.name ?? 'Profile',
                            style: AppTypography.titleSmall
                                .copyWith(color: scheme.onSurface),
                            overflow: TextOverflow.ellipsis,
                          ),
                          Text(
                            shellState.role.label,
                            style: AppTypography.labelMedium
                                .copyWith(color: scheme.primary),
                          ),
                        ],
                      ),
                    ),
                    Icon(Icons.chevron_right_rounded,
                        color: scheme.onSurfaceVariant),
                  ],
                ),
              ),
            ),
            const Divider(height: 1),

            // ── Navigation items ─────────────────────────────────────────
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(
                    vertical: AppSpacing.space2),
                children: [
                  for (final dest in items)
                    ListTile(
                      leading: Icon(dest.icon, color: scheme.onSurfaceVariant),
                      title: Text(dest.label),
                      trailing: dest.hasBadge
                          ? Badge(
                              label: Text(dest.badgeLabel),
                              backgroundColor: scheme.error,
                              textColor: scheme.onError,
                            )
                          : null,
                      onTap: () => go(dest.rootRoute),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _initials(String? name) {
    if (name == null || name.trim().isEmpty) return '?';
    final parts = name.trim().split(RegExp(r'\s+'));
    final first = parts.first.isNotEmpty ? parts.first[0] : '';
    final last = parts.length > 1 && parts.last.isNotEmpty ? parts.last[0] : '';
    final combined = '$first$last';
    return combined.isEmpty ? '?' : combined.toUpperCase();
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

/// The gate-chain inputs, snapshotted at one point in time.
///
/// Exists so the redirect decision is a pure function of explicit state rather
/// than of `AuthSession.instance` + `GoRouterState`, neither of which a unit
/// test can easily fabricate. `RouteGuard.redirect` reads the live session into
/// one of these and delegates; tests construct them directly.
@immutable
class GateState {
  const GateState({
    required this.location,
    required this.isAuthenticated,
    this.mustChangePassword = false,
    this.isOnboarded = false,
    this.deviceBound = true,
    this.permissionsFlowSeen = false,
    this.roleCode,
  });

  /// `GoRouterState.matchedLocation` — the route being navigated to.
  final String location;
  final bool isAuthenticated;
  final bool mustChangePassword;
  final bool isOnboarded;
  final bool deviceBound;
  final bool permissionsFlowSeen;
  final String? roleCode;

  /// Snapshots the live singleton for the route being entered.
  factory GateState.fromSession(String location) {
    final session = AuthSession.instance;
    return GateState(
      location: location,
      isAuthenticated: session.isAuthenticated,
      mustChangePassword: session.mustChangePassword,
      isOnboarded: session.isOnboarded,
      deviceBound: session.deviceBound,
      permissionsFlowSeen: session.permissionsFlowSeen,
      roleCode: session.roleCode,
    );
  }

  @override
  String toString() => 'loc=$location authed=$isAuthenticated '
      'mustChangePw=$mustChangePassword onboarded=$isOnboarded '
      'deviceBound=$deviceBound permsSeen=$permissionsFlowSeen '
      'role=$roleCode';
}

class RouteGuard {
  RouteGuard._();

  static String? redirect(BuildContext context, GoRouterState state) {
    final gates = GateState.fromSession(state.matchedLocation);

    // Gate diagnostics — makes a post-login stall visible in `flutter logs`.
    // The app parks on the first gate whose condition holds; without this the
    // stuck gate is invisible (gate screens issue no API calls).
    if (kDebugMode) {
      debugPrint('[RouteGuard] $gates');
    }

    return resolve(gates);
  }

  /// The gate chain itself — pure, so `test/navigation/route_guard_test.dart`
  /// can assert the ordering (which gate wins when several conditions hold at
  /// once) without a widget tree, a router, or secure storage.
  ///
  /// Returns the destination to redirect to, or null to allow the navigation.
  static String? resolve(GateState gates) {
    // These checks must run in order — first match wins.
    final location = gates.location;

    // 1. Auth guard — redirect unauthenticated users to login
    final isAuthenticated = gates.isAuthenticated;

    final isOnChangePassword = location == '/auth/change-password';
    final isOnProfileSetup = location == '/auth/profile-setup';
    final isOnDeviceBinding = location == '/auth/device-binding';
    // The forced change-password, profile-setup and device-binding screens are
    // authenticated routes despite their /auth prefix, so exclude them from the
    // auth-route bounce below — otherwise gate 1 bounces them to /home and the
    // gate that sent the user there bounces straight back (redirect loop).
    final isOnGatedAuthRoute =
        isOnChangePassword || isOnProfileSetup || isOnDeviceBinding;
    final isOnAuthRoute =
        (location.startsWith('/auth') && !isOnGatedAuthRoute) ||
            location == '/splash';
    if (!isAuthenticated && !isOnAuthRoute && !isOnGatedAuthRoute) {
      return _gate('/auth/login', 'not-authenticated');
    }
    if (isAuthenticated && isOnAuthRoute) {
      return '/home';
    }

    // 1b. Forced password change — an admin-provisioned temporary password
    // must be rotated before the rest of the app is reachable.
    if (isAuthenticated && gates.mustChangePassword && !isOnChangePassword) {
      return _gate('/auth/change-password', 'must-change-password');
    }

    // 1c. First-login profile setup — an account with no profile yet must
    // complete it (and, for a tenant owner, company + branding) before the
    // rest of the app is reachable. Runs after 1b so a temporary password is
    // always rotated first.
    //
    // Skipped while 1b is still outstanding. Ordering alone is not enough:
    // 1b stands down once the user is parked on /auth/change-password, so
    // without this 1c would pull them to /auth/profile-setup, where 1b fires
    // again and sends them back — an infinite
    // (/auth/change-password => /auth/profile-setup) loop.
    if (isAuthenticated &&
        !gates.mustChangePassword &&
        !gates.isOnboarded &&
        !isOnProfileSetup) {
      return _gate('/auth/profile-setup', 'not-onboarded');
    }

    // 1c-bis. Device binding — an employee is bound to one handset, and only an
    // admin can move that binding, so the binding has to exist before the app
    // (and attendance) is reachable. Runs after profile setup so the employee
    // record exists, and before the permissions flow so a device is on file
    // before any location capture starts.
    //
    // The change-request screen is exempt: an employee whose binding was
    // revoked, or who is on a replacement handset, reaches the app on a device
    // that is not bound and must be able to ask for one.
    final isOnDeviceChangeRequest = location == '/device/change-request';
    if (isAuthenticated &&
        !gates.mustChangePassword &&
        gates.isOnboarded &&
        !gates.deviceBound &&
        !isOnDeviceBinding &&
        !isOnDeviceChangeRequest) {
      return _gate('/auth/device-binding', 'device-not-bound');
    }

    // 1d. Permissions flow — after the account is fully set up, show the
    // location + notification permissions flow once per device. Skippable, so
    // it records "seen" not "granted"; the in-context check-in gate re-requests
    // background location later behind its Play disclosure. Gated on isOnboarded
    // so it runs only after profile setup, never in front of it.
    // Skipped while the device-binding gate is still outstanding: 1c-bis lets
    // the user sit on the binding/change-request screens, so pulling them to
    // /permissions from there would bounce straight back through 1c-bis
    // (/auth/device-binding => /permissions => /auth/device-binding).
    final isOnPermissions = location == '/permissions';
    if (isAuthenticated &&
        !gates.mustChangePassword &&
        gates.isOnboarded &&
        gates.deviceBound &&
        !gates.permissionsFlowSeen &&
        !isOnPermissions) {
      return _gate('/permissions', 'permissions-flow-not-seen');
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
          NavDestinations.permissionKeyForRoute(location);
      if (requiredPermission != null) {
        final role = AppUserRoleX.fromRoleCode(gates.roleCode);
        if (!NavDestinations.roleHasPermission(role, requiredPermission)) {
          return _gate('/home', 'role-missing-permission:$requiredPermission');
        }
      }
    }

    // 6. No specific redirect needed
    return null;
  }

  /// Logs (debug only) the gate that fired and its destination, then returns the
  /// destination unchanged. Central place so every redirect is traceable.
  static String _gate(String destination, String reason) {
    if (kDebugMode) {
      debugPrint('[RouteGuard] → $destination  (reason: $reason)');
    }
    return destination;
  }

  // ── Session-backed checks ─────────────────────────────────────────────────

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
