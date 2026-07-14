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
//  Field Employee:   [Home] [Attendance] [Visits]  [More]
//  Field Technician: [Home] [Attendance] [Faults]  [More]
//  Sales Rep:        [Home] [Attendance] [Leads]   [More]
//  Manager:          [Home] [Team]       [Reports] [More]
//  Admin:            [Home] [Reports]   [Settings] [More]
//
// "More" sheet always contains:
//   Notifications, Reports, Profile, Settings, Sync Monitor,
//   Leave, Documents (filtered by RBAC)

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
        fab: const DestinationFabConfig(
          tooltip: 'Quick Action',
          icon: Icons.add_rounded,
          route: '/quick-action',
          isSpeedDial: true,
          speedDialItems: [
            SpeedDialItem(
              tooltip: 'Report Fault',
              icon: Icons.build_circle_rounded,
              route: '/faults/new',
            ),
            SpeedDialItem(
              tooltip: 'Log Visit',
              icon: Icons.location_on_rounded,
              route: '/visits/new',
            ),
            SpeedDialItem(
              tooltip: 'Add Lead',
              icon: Icons.person_add_rounded,
              route: '/leads/new',
            ),
          ],
        ),
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
        showInMoreSheet: true,
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
    final more = _moreDestination(
      notificationBadge: notificationBadge,
      pendingSyncBadge: pendingSyncBadge,
    );

    return switch (role) {
      AppUserRole.fieldEmployee => [
          home(),
          attendance(),
          visits(badgeCount: visitBadge),
          more,
        ],
      AppUserRole.fieldTechnician => [
          home(),
          attendance(),
          faults(badgeCount: faultBadge),
          more,
        ],
      AppUserRole.salesRep => [
          home(),
          attendance(),
          leads(badgeCount: leadBadge),
          more,
        ],
      AppUserRole.manager => [
          home(),
          team(),
          reports(),
          more,
        ],
      AppUserRole.admin => [
          home(),
          reports(),
          settings(),
          more,
        ],
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // "MORE" SHEET CONFIGURATION  (always last in bottom nav)
  // ─────────────────────────────────────────────────────────────────────────

  static NavDestination _moreDestination({
    int notificationBadge = 0,
    int pendingSyncBadge = 0,
  }) {
    final totalBadge = notificationBadge + pendingSyncBadge;
    return NavDestination(
      id: NavDestinationId.notifications, // sentinel — "More" is not a real route
      label: 'More',
      icon: Icons.grid_view_outlined,
      selectedIcon: Icons.grid_view_rounded,
      rootRoute: '', // handled by sheet, not a route
      permissionKey: '',
      showInBottomNav: true,
      badgeCount: totalBadge,
    );
  }

  /// All items to show in the "More" bottom sheet, filtered by RBAC.
  /// Pass a permission-check callback.
  static List<NavDestination> moreSheetItems({
    required bool Function(String permissionKey) hasPermission,
    int notificationBadge = 0,
    int pendingSyncBadge = 0,
  }) {
    final all = [
      notifications(badgeCount: notificationBadge),
      reports(),
      leave(),
      documents(),
      announcements(),
      syncMonitor(badgeCount: pendingSyncBadge),
      profile(),
      settings(),
    ];
    return all.where((d) => hasPermission(d.permissionKey)).toList();
  }
}
