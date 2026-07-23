import 'package:flutter/material.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'nav_destinations.freezed.dart';

// ─────────────────────────────────────────────────────────────────────────────
// NAVIGATION DESTINATIONS  (AUDIT §17)
// ─────────────────────────────────────────────────────────────────────────────
//
// Single source of truth for:
//   • Bottom nav items (max 5, role-driven)
//   • "More" drawer / sheet items
//   • Badge count providers per destination
//   • Route paths per destination
//   • RBAC permission keys per destination
//   • FAB configuration per destination
//
// Role → Bottom Nav mapping:
//
//  Field Employee:   [Home] [Attendance] [Visits]
//  Field Technician: [Home] [Attendance] [Faults]
//  Sales Rep:        [Home] [Attendance] [Leads]
//  Manager:          [Home] [Team]       [Reports]
//  Admin:            [Home] [Reports]    [Settings]
//
// Secondary modules (Leave, Documents, Announcements, Sync Monitor, Settings)
// live ONLY in the left navigation drawer, opened from the dashboard's
// hamburger. There is no "More" bottom-nav tab or "More" sheet — that was a
// second entry point to the exact same list. Anything already reachable as a
// bottom-nav tab for the current role is filtered out of the drawer, so a role
// never sees the same destination twice.

// ── App User Role ──────────────────────────────────────────────────────────

enum AppUserRole {
  fieldEmployee,
  fieldTechnician,
  salesRep,
  manager,
  admin,
}

extension AppUserRoleX on AppUserRole {
  String get label => switch (this) {
        AppUserRole.fieldEmployee => 'Employee',
        AppUserRole.fieldTechnician => 'Technician',
        AppUserRole.salesRep => 'Sales Rep',
        AppUserRole.manager => 'Manager',
        AppUserRole.admin => 'Admin',
      };

  /// Maps a backend RBAC role code (JWT `role` claim / `user.role`) to the
  /// mobile shell's navigation role. The API's built-in system roles are
  /// `ADMIN_MANAGER`, `EMPLOYEE_FIELD_STAFF` and `CUSTOMER`; custom tenant
  /// roles fall back to the least-privileged field-employee layout so a new
  /// role never accidentally exposes admin nav. Super admins never reach the
  /// mobile app (the API rejects them), so they are not mapped here.
  static AppUserRole fromRoleCode(String? roleCode) {
    final code = (roleCode ?? '').toUpperCase();
    if (code == 'ADMIN_MANAGER' || code.startsWith('ADMIN')) {
      return AppUserRole.admin;
    }
    if (code.contains('MANAGER')) return AppUserRole.manager;
    if (code.contains('SALES')) return AppUserRole.salesRep;
    if (code.contains('TECHNICIAN')) return AppUserRole.fieldTechnician;
    // EMPLOYEE_FIELD_STAFF, CUSTOMER and any unknown/custom role.
    return AppUserRole.fieldEmployee;
  }
}

// ── Destination ID ─────────────────────────────────────────────────────────

enum NavDestinationId {
  home,
  attendance,
  visits,
  faults,
  leads,
  team,
  reports,
  settings,
  // More-drawer only
  notifications,
  profile,
  syncMonitor,
  leave,
  documents,
  announcements,
}

// ── FAB Action per destination ─────────────────────────────────────────────

@freezed
class DestinationFabConfig with _$DestinationFabConfig {
  const factory DestinationFabConfig({
    required String tooltip,
    required IconData icon,
    required String route,
    @Default(false) bool isSpeedDial,
    @Default([]) List<SpeedDialItem> speedDialItems,
  }) = _DestinationFabConfig;
}

@freezed
class SpeedDialItem with _$SpeedDialItem {
  const factory SpeedDialItem({
    required String tooltip,
    required IconData icon,
    required String route,
  }) = _SpeedDialItem;
}

// ── Single destination model ───────────────────────────────────────────────

@freezed
class NavDestination with _$NavDestination {
  const factory NavDestination({
    required NavDestinationId id,
    required String label,
    required IconData icon,
    required IconData selectedIcon,
    required String rootRoute,
    required String permissionKey, // RBAC key to check
    @Default(false) bool showInBottomNav,
    @Default(false) bool showInMoreSheet,
    @Default(0) int badgeCount,
    DestinationFabConfig? fab,
  }) = _NavDestination;

  const NavDestination._();

  bool get hasBadge => badgeCount > 0;

  String get badgeLabel =>
      badgeCount > 99 ? '99+' : '$badgeCount';
}

// ─────────────────────────────────────────────────────────────────────────────
// DESTINATION DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

class NavDestinations {
  NavDestinations._();

  // ── All destinations with their config ────────────────────────────────────

  static NavDestination home({int badgeCount = 0}) => NavDestination(
        id: NavDestinationId.home,
        label: 'Home',
        icon: Icons.home_outlined,
        selectedIcon: Icons.home_rounded,
        rootRoute: '/home',
        permissionKey: 'home.view',
        showInBottomNav: true,
        badgeCount: badgeCount,
        // No FAB on Home. The dashboard's Quick Actions grid already offers
        // /faults/new, /visits/new and friends, and it is role-aware — the
        // speed-dial that used to live here duplicated those same routes on the
        // same screen (and offered "Add Lead" to roles that cannot see leads).
      );

  static NavDestination attendance({int badgeCount = 0}) => NavDestination(
        id: NavDestinationId.attendance,
        label: 'Attendance',
        icon: Icons.fingerprint_outlined,
        selectedIcon: Icons.fingerprint_rounded,
        rootRoute: '/attendance',
        permissionKey: 'attendance.view',
        showInBottomNav: true,
        badgeCount: badgeCount,
        fab: const DestinationFabConfig(
          tooltip: 'Check In',
          icon: Icons.login_rounded,
          route: '/attendance/check-in',
        ),
      );

  static NavDestination visits({int badgeCount = 0}) => NavDestination(
        id: NavDestinationId.visits,
        label: 'Visits',
        icon: Icons.route_outlined,
        selectedIcon: Icons.route_rounded,
        rootRoute: '/visits',
        permissionKey: 'visits.view',
        showInBottomNav: true,
        badgeCount: badgeCount,
        fab: const DestinationFabConfig(
          tooltip: 'New Visit',
          icon: Icons.add_location_alt_rounded,
          route: '/visits/new',
        ),
      );

  static NavDestination faults({int badgeCount = 0}) => NavDestination(
        id: NavDestinationId.faults,
        label: 'Faults',
        icon: Icons.build_circle_outlined,
        selectedIcon: Icons.build_circle_rounded,
        rootRoute: '/faults',
        permissionKey: 'faults.view',
        showInBottomNav: true,
        badgeCount: badgeCount,
        fab: const DestinationFabConfig(
          tooltip: 'Report Fault',
          icon: Icons.add_rounded,
          route: '/faults/new',
        ),
      );

  static NavDestination leads({int badgeCount = 0}) => NavDestination(
        id: NavDestinationId.leads,
        label: 'Leads',
        icon: Icons.person_search_outlined,
        selectedIcon: Icons.person_search_rounded,
        rootRoute: '/leads',
        permissionKey: 'leads.view',
        showInBottomNav: true,
        badgeCount: badgeCount,
        fab: const DestinationFabConfig(
          tooltip: 'New Lead',
          icon: Icons.person_add_rounded,
          route: '/leads/new',
        ),
      );

  static NavDestination team({int badgeCount = 0}) => NavDestination(
        id: NavDestinationId.team,
        label: 'Team',
        icon: Icons.groups_outlined,
        selectedIcon: Icons.groups_rounded,
        rootRoute: '/team',
        permissionKey: 'team.view',
        showInBottomNav: true,
        badgeCount: badgeCount,
      );

  static NavDestination reports({int badgeCount = 0}) => NavDestination(
        id: NavDestinationId.reports,
        label: 'Reports',
        icon: Icons.bar_chart_outlined,
        selectedIcon: Icons.bar_chart_rounded,
        rootRoute: '/reports',
        permissionKey: 'reports.view',
        showInBottomNav: true,
        badgeCount: badgeCount,
      );

  // ── More-sheet only destinations ──────────────────────────────────────────

  static NavDestination settings() => const NavDestination(
        id: NavDestinationId.settings,
        label: 'Settings',
        icon: Icons.settings_outlined,
        selectedIcon: Icons.settings_rounded,
        rootRoute: '/settings',
        permissionKey: 'settings.view',
        showInMoreSheet: true,
      );

  static NavDestination notifications({int badgeCount = 0}) => NavDestination(
        id: NavDestinationId.notifications,
        label: 'Notifications',
        icon: Icons.notifications_outlined,
        selectedIcon: Icons.notifications_rounded,
        rootRoute: '/notifications',
        permissionKey: 'notifications.view',
        showInMoreSheet: true,
        badgeCount: badgeCount,
      );

  static NavDestination profile() => const NavDestination(
        id: NavDestinationId.profile,
        label: 'Profile',
        icon: Icons.person_outline_rounded,
        selectedIcon: Icons.person_rounded,
        rootRoute: '/profile',
        permissionKey: 'profile.view',
        showInMoreSheet: true,
      );

  static NavDestination syncMonitor({int badgeCount = 0}) => NavDestination(
        id: NavDestinationId.syncMonitor,
        label: 'Sync Monitor',
        icon: Icons.sync_outlined,
        selectedIcon: Icons.sync_rounded,
        rootRoute: '/sync',
        permissionKey: 'sync.view',
        showInMoreSheet: true,
        badgeCount: badgeCount,
      );

  static NavDestination leave() => const NavDestination(
        id: NavDestinationId.leave,
        label: 'Leave',
        icon: Icons.event_busy_outlined,
        selectedIcon: Icons.event_busy_rounded,
        rootRoute: '/leave',
        permissionKey: 'leave.view',
        showInMoreSheet: true,
      );

  /// DISABLED — the Documents screen is a UI shell with stub data and no
  /// backing API module, so it is kept out of the drawer and blocked by
  /// `RouteGuard` (see `_routePermissionKeys`). Do not re-add this to
  /// `drawerItems` until the backend documents module ships.
  static NavDestination documents() => const NavDestination(
        id: NavDestinationId.documents,
        label: 'Documents',
        icon: Icons.folder_outlined,
        selectedIcon: Icons.folder_rounded,
        rootRoute: '/documents',
        permissionKey: 'documents.view',
        showInMoreSheet: true,
      );

  static NavDestination announcements({int badgeCount = 0}) => NavDestination(
        id: NavDestinationId.announcements,
        label: 'Announcements',
        icon: Icons.campaign_outlined,
        selectedIcon: Icons.campaign_rounded,
        rootRoute: '/announcements',
        permissionKey: 'announcements.view',
        showInMoreSheet: true,
        badgeCount: badgeCount,
      );

  // ─────────────────────────────────────────────────────────────────────────
  // ROLE → BOTTOM NAV CONFIGURATION
  // ─────────────────────────────────────────────────────────────────────────

  static List<NavDestination> bottomNavFor({
    required AppUserRole role,
    int notificationBadge = 0,
    int pendingSyncBadge = 0,
    int faultBadge = 0,
    int visitBadge = 0,
    int leadBadge = 0,
  }) {
    return switch (role) {
      AppUserRole.fieldEmployee => [
          home(),
          attendance(),
          visits(badgeCount: visitBadge),
        ],
      AppUserRole.fieldTechnician => [
          home(),
          attendance(),
          faults(badgeCount: faultBadge),
        ],
      AppUserRole.salesRep => [
          home(),
          attendance(),
          leads(badgeCount: leadBadge),
        ],
      AppUserRole.manager => [
          home(),
          team(),
          reports(),
        ],
      AppUserRole.admin => [
          home(),
          reports(),
          settings(),
        ],
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DRAWER CONFIGURATION  (left navigation drawer — the only secondary menu)
  // ─────────────────────────────────────────────────────────────────────────

  /// Items to show in the left navigation drawer, filtered by RBAC and by what
  /// the role already has as a bottom-nav tab.
  ///
  /// Excluded by design:
  ///   • Notifications — lives on the dashboard's app-bar bell
  ///   • Profile       — opens from the drawer's own user header / dashboard avatar
  ///   • Reports       — a bottom-nav tab for the roles that can see it
  ///   • Settings      — dropped for admins, who have it as a bottom-nav tab
  static List<NavDestination> drawerItems({
    required AppUserRole role,
    required bool Function(String permissionKey) hasPermission,
    int pendingSyncBadge = 0,
  }) {
    final tabRoutes = bottomNavFor(role: role).map((d) => d.rootRoute).toSet();
    final all = [
      leave(),
      announcements(),
      syncMonitor(badgeCount: pendingSyncBadge),
      settings(),
    ];
    return all
        .where((d) =>
            hasPermission(d.permissionKey) && !tabRoutes.contains(d.rootRoute))
        .toList();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ROLE → PERMISSION SET  (route-level RBAC)
  // ─────────────────────────────────────────────────────────────────────────
  //
  // The bottom nav and "More" sheet only *hide* items a role should not see.
  // On their own they do not stop a user reaching a screen via deep link,
  // push notification, invite link, or a stale `context.go(...)`. The API
  // enforces per-endpoint RBAC so data stays safe, but the mobile UI must not
  // let the wrong role land on a screen that then fails or shows empty state.
  //
  // `permissionsFor` is the single source of truth for what each role may
  // reach. It drives both the "More" sheet filter and `RouteGuard`.

  /// Permission keys granted to every authenticated role regardless of type —
  /// the always-available shell surfaces.
  static const Set<String> _commonPermissions = {
    'home.view',
    'attendance.view',
    'notifications.view',
    'profile.view',
    'settings.view',
    'sync.view',
    'leave.view',
    'announcements.view',
  };

  /// The full set of RBAC permission keys a role may access.
  static Set<String> permissionsFor(AppUserRole role) {
    final roleSpecific = switch (role) {
      AppUserRole.fieldEmployee => const {'visits.view'},
      AppUserRole.fieldTechnician => const {'faults.view'},
      AppUserRole.salesRep => const {'leads.view'},
      AppUserRole.manager => const {'team.view', 'reports.view'},
      AppUserRole.admin => const {
          'team.view',
          'reports.view',
          'leads.view',
          'faults.view',
          'visits.view',
        },
    };
    return {..._commonPermissions, ...roleSpecific};
  }

  /// Whether `role` may see the destination behind `permissionKey`. An empty
  /// key (e.g. the "More" sentinel) is always allowed.
  static bool roleHasPermission(AppUserRole role, String permissionKey) {
    if (permissionKey.isEmpty) return true;
    return permissionsFor(role).contains(permissionKey);
  }

  // ── Route → permission key mapping (for RouteGuard) ────────────────────────
  //
  // Maps a matched GoRouter location to the permission key that gates it. Only
  // role-gated feature roots appear here; auth/utility/common routes are not
  // listed and are therefore never bounced by role.

  static const Map<String, String> _routePermissionKeys = {
    '/visits': 'visits.view',
    '/faults': 'faults.view',
    '/leads': 'leads.view',
    '/team': 'team.view',
    '/reports': 'reports.view',
    // No role carries 'documents.view', so this bounces every /documents
    // deep link home until the module is re-enabled.
    '/documents': 'documents.view',
  };

  /// The permission key gating `location`, or null if the route is not
  /// role-restricted. Matches on path prefix so child routes (`/faults/new`,
  /// `/faults/:id`) inherit their parent's gate.
  static String? permissionKeyForRoute(String location) {
    for (final entry in _routePermissionKeys.entries) {
      if (location == entry.key || location.startsWith('${entry.key}/')) {
        return entry.value;
      }
    }
    return null;
  }

  // ── Bottom-nav root route → StatefulShell branch index ─────────────────────
  //
  // The GoRouter `StatefulShellRoute` branches (see app_router.dart) are, in
  // order: 0 = /home, 1 = /attendance, 2 = the shared role-feature branch
  // (/faults, /visits, /leads, /team, /reports all live here), 3 = /more.
  //
  // `goBranch(i)` takes a BRANCH index, but the per-role bottom nav lists
  // destinations in POSITION order, and those two only line up for the default
  // role. This map lets the shell translate a tapped destination's rootRoute to
  // the branch it actually belongs to, so e.g. an admin's "Reports" tab lands
  // on /reports (branch 2) instead of /attendance (branch 1).
  //
  // Routes NOT listed here (e.g. /settings) are not shell branches — they are
  // modal routes pushed over the shell, and the shell handles them via push().
  static const Map<String, int> _rootRouteBranchIndex = {
    '/home': 0,
    '/attendance': 1,
    '/faults': 2,
    '/visits': 2,
    '/leads': 2,
    '/team': 2,
    '/reports': 2,
  };

  /// The shell branch index that owns [rootRoute], or null when the route is a
  /// modal (non-branch) route that must be pushed instead of switched to.
  static int? branchIndexForRoute(String rootRoute) =>
      _rootRouteBranchIndex[rootRoute];
}
