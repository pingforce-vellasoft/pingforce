import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/navigation/nav_destinations.dart';
import '../../../core/network/connectivity_provider.dart';
import '../../../core/sync/sync_provider.dart';
import '../../../core/sync/sync_state.dart';
import '../../../injection_container.dart';
import '../../auth/domain/repositories/auth_repository.dart';
import '../data/models/dashboard_summary_model.dart';
import '../domain/repositories/dashboard_repository.dart';
import 'dashboard_state.dart';

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD NOTIFIER  (DASHBOARD_SPEC.md §4)
// ─────────────────────────────────────────────────────────────────────────────
//
// Composes the Home-screen state from three live sources:
//   1. GET /api/v1/dashboard/summary  (user, attendance hero, KPIs, feed)
//   2. connectivityProvider           (online/offline banner)
//   3. syncProvider                   (pending-sync bar)
// Quick actions are role-gated on the client — they map to fixed routes and
// carry no server data.

final dashboardNotifierProvider =
    NotifierProvider<DashboardNotifier, DashboardState>(DashboardNotifier.new);

class DashboardNotifier extends Notifier<DashboardState> {
  DashboardRepository get _repo => sl<DashboardRepository>();

  @override
  DashboardState build() {
    // React to connectivity + sync changes without a full reload.
    ref.listen(connectivityProvider, (_, next) {
      state = state.copyWith(isOnline: next.isOnline);
    });
    ref.listen(syncProvider, (_, next) {
      state = state.copyWith(syncInfo: _mapSync(next));
    });
    return const DashboardState(isLoading: true);
  }

  // ── Load ───────────────────────────────────────────────────────────────────

  Future<void> load() async {
    state = state.copyWith(isLoading: true, errorMessage: null);

    // Cached user carries role + attendance-enabled flags the dashboard summary
    // does not, used to gate admin-only quick actions (e.g. Geofences).
    final cached = await sl<AuthRepository>().getCachedUser();
    final user = cached.fold((_) => null, (u) => u);
    final isAdmin =
        user != null &&
        AppUserRoleX.fromRoleCode(user.role) == AppUserRole.admin;
    // Geolocation actions (visit logging) are field-employee only.
    final isFieldRole =
        user != null && AppUserRoleX.fromRoleCode(user.role).isFieldRole;
    final attendanceEnabled = user?.isAttendanceEnabled ?? false;

    final result = await _repo.getSummary();

    result.fold(
      (failure) {
        // Keep any previously loaded content on a network failure — the offline
        // banner (driven by connectivityProvider) already explains the state.
        state = state.copyWith(isLoading: false, errorMessage: failure.message);
      },
      (summary) {
        state = state.copyWith(
          isLoading: false,
          user: _mapUser(summary.user),
          attendanceHero: _mapAttendance(summary.attendance),
          kpiCards: _mapKpis(summary.kpiCards),
          quickActions: _buildQuickActions(
            summary,
            isAdmin: isAdmin,
            isFieldRole: isFieldRole,
            attendanceEnabled: attendanceEnabled,
          ),
          activityFeed: _mapActivity(summary.activityFeed),
          unreadNotifications: summary.unreadNotifications,
          errorMessage: null,
        );
      },
    );

    // Fold in the current connectivity + sync snapshots.
    state = state.copyWith(
      isOnline: ref.read(connectivityProvider).isOnline,
      syncInfo: _mapSync(ref.read(syncProvider)),
    );
  }

  // ── Refresh ────────────────────────────────────────────────────────────────

  Future<void> refresh() async {
    if (state.isRefreshing) return;
    state = state.copyWith(isRefreshing: true, errorMessage: null);
    await load();
    state = state.copyWith(isRefreshing: false);
  }

  /// Manually flush the offline sync queue ("Sync Now" button).
  Future<void> syncNow() async {
    await ref.read(syncProvider.notifier).syncNow();
  }

  // ── Mappers ──────────────────────────────────────────────────────────────

  DashboardUserInfo _mapUser(DashboardUserModel u) {
    final initials = _initials(u.firstName, u.lastName);
    return DashboardUserInfo(
      userId: u.userId,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      department: u.department ?? '',
      avatarUrl: u.avatarUrl,
      initials: initials,
      isManager: u.isManager,
    );
  }

  AttendanceHeroData _mapAttendance(DashboardAttendanceModel a) {
    final status = switch (a.status) {
      'working' => AttendanceHeroStatus.working,
      'checkedOut' => AttendanceHeroStatus.checkedOut,
      'notCheckedIn' => AttendanceHeroStatus.notCheckedIn,
      'absent' => AttendanceHeroStatus.absent,
      _ => AttendanceHeroStatus.noShift,
    };

    final worked = a.workedMinutes != null
        ? Duration(minutes: a.workedMinutes!)
        : null;

    // Progress across the shift = elapsed worked / total shift minutes.
    double? progress;
    if (a.workedMinutes != null &&
        a.totalShiftMinutes != null &&
        a.totalShiftMinutes! > 0) {
      progress = (a.workedMinutes! / a.totalShiftMinutes!).clamp(0.0, 1.0);
    }

    return AttendanceHeroData(
      status: status,
      checkInTime: a.checkInTime,
      checkOutTime: a.checkOutTime,
      shiftName: a.shiftName,
      shiftStart: a.shiftStart,
      shiftEnd: a.shiftEnd,
      totalShiftMinutes: a.totalShiftMinutes,
      gracePeriodMinutes: a.gracePeriodMinutes,
      progressFraction: progress,
      workingDuration: worked,
      totalOvertime: a.overtimeMinutes > 0
          ? _fmtMinutes(a.overtimeMinutes)
          : null,
      isLate: a.isLate,
      minutesLate: a.minutesLate,
      isOnTime: !a.isLate,
    );
  }

  static String _fmtMinutes(int minutes) {
    final h = minutes ~/ 60;
    final m = minutes % 60;
    return h > 0 ? '${h}h ${m}m' : '${m}m';
  }

  List<KpiCard> _mapKpis(List<DashboardKpiModel> cards) {
    return cards
        .map(
          (c) => KpiCard(
            id: c.id,
            title: c.title,
            primaryValue: c.primaryValue,
            label: c.label,
            iconName: c.iconName,
            secondaryLabel: c.secondaryLabel,
            severity: switch (c.severity) {
              'critical' => KpiCardSeverity.critical,
              'warning' => KpiCardSeverity.warning,
              _ => KpiCardSeverity.normal,
            },
            route: c.route,
          ),
        )
        .toList();
  }

  List<ActivityFeedItem> _mapActivity(List<DashboardActivityModel> items) {
    return items
        .map(
          (i) => ActivityFeedItem(
            id: i.id,
            type: _activityType(i.type),
            title: i.title,
            subtitle: i.subtitle,
            timestamp: i.timestamp,
            route: i.route,
          ),
        )
        .toList();
  }

  ActivityType _activityType(String type) {
    return switch (type) {
      'checkIn' => ActivityType.checkIn,
      'checkOut' => ActivityType.checkOut,
      'faultCreated' => ActivityType.faultCreated,
      'faultAssigned' => ActivityType.faultAssigned,
      'faultResolved' => ActivityType.faultResolved,
      'faultOverdue' => ActivityType.faultOverdue,
      'leadCreated' => ActivityType.leadCreated,
      'leadUpdated' => ActivityType.leadUpdated,
      'leadWon' => ActivityType.leadWon,
      'visitLogged' => ActivityType.visitLogged,
      'syncCompleted' => ActivityType.syncCompleted,
      _ => ActivityType.notification,
    };
  }

  /// Role-gated quick actions. The server does not send these; they are fixed
  /// routes shown based on the user's role and current attendance state.
  List<QuickAction> _buildQuickActions(
    DashboardSummaryModel summary, {
    bool isAdmin = false,
    bool isFieldRole = false,
    bool attendanceEnabled = false,
  }) {
    final actions = <QuickAction>[];

    // Admins with the attendance module enabled get a fast path to geofence
    // setup — they configure zones, they don't clock in.
    if (isAdmin && attendanceEnabled) {
      actions.add(
        const QuickAction(
          id: 'geofence',
          label: 'Geofences',
          iconName: 'add_location_alt',
          route: '/geofences',
          isHighlighted: true,
        ),
      );
    }

    // Workforce management shortcuts. These are the screens an admin opens
    // most, and the drawer is two taps away; the tiles make them one.
    if (isAdmin) {
      actions.addAll(const [
        QuickAction(
          id: 'employees',
          label: 'Employees',
          iconName: 'badge',
          route: '/employees',
        ),
        QuickAction(
          id: 'attendance-admin',
          label: 'Attendance',
          iconName: 'fact_check',
          route: '/attendance-admin',
        ),
        QuickAction(
          id: 'devices-admin',
          label: 'Devices',
          iconName: 'smartphone',
          route: '/devices',
        ),
        QuickAction(
          id: 'customers',
          label: 'Customers',
          iconName: 'groups',
          route: '/customers',
        ),
      ]);
    }

    // No Check In / Check Out tile here: the Attendance Hero Card sits directly
    // above this grid on the same screen and already exposes check-in,
    // check-out, break and resume. A tile duplicating it just competed with the
    // hero's primary button.

    actions.add(
      const QuickAction(
        id: 'fault',
        label: 'Report Fault',
        iconName: 'report_problem',
        route: '/faults/new',
      ),
    );

    // Log Visit is geolocation visit tracking — field-employee only. Non-field
    // roles have no visits.view, so RouteGuard would bounce the tap; hide it.
    if (isFieldRole) {
      actions.add(
        const QuickAction(
          id: 'visit',
          label: 'Log Visit',
          iconName: 'map',
          route: '/visits/new',
        ),
      );
    }

    actions.add(
      const QuickAction(
        id: 'network-map',
        label: 'Network Map',
        iconName: 'share_location',
        route: '/network-map',
      ),
    );

    return actions;
  }

  SyncInfo _mapSync(SyncState s) {
    final status = switch (s.status) {
      SyncQueueStatus.syncing => SyncStatus.syncing,
      SyncQueueStatus.pending => SyncStatus.pendingItems,
      SyncQueueStatus.completed => SyncStatus.allSynced,
      SyncQueueStatus.failed => SyncStatus.failed,
      SyncQueueStatus.conflict => SyncStatus.pendingItems,
      SyncQueueStatus.idle => SyncStatus.idle,
    };
    return SyncInfo(
      status: status,
      pendingCount: s.pendingCount,
      lastSyncTime: s.lastSyncedAt,
      errorMessage: s.lastErrorMessage,
    );
  }

  String _initials(String first, String last) {
    final f = first.isNotEmpty ? first[0] : '';
    final l = last.isNotEmpty ? last[0] : '';
    final combined = '$f$l'.trim();
    return combined.isEmpty ? '?' : combined.toUpperCase();
  }

  // ── Navigation helpers ─────────────────────────────────────────────────────

  void goToProfile(BuildContext context) {
    context.push('/profile');
  }

  void goToAttendance(BuildContext context) {
    context.go('/attendance');
  }

  void goToAttendanceHistory(BuildContext context) {
    context.push('/attendance/history');
  }

  void goToCorrection(BuildContext context) {
    context.push('/attendance/correction');
  }

  void goToTeam(BuildContext context) {
    context.push('/team');
  }

  void onKpiCardTap(BuildContext context, KpiCard card) {
    final route = card.route;
    if (route != null && route.isNotEmpty) {
      context.push(route);
    }
  }

  void onQuickActionTap(BuildContext context, QuickAction action) {
    context.push(action.route);
  }

  void onActivityItemTap(BuildContext context, ActivityFeedItem item) {
    final route = item.route;
    if (route != null && route.isNotEmpty) {
      context.push(route);
    }
  }

  void openNotifications(BuildContext context) {
    context.push('/notifications');
  }

  void goToActivityFeed(BuildContext context) {
    context.push('/notifications');
  }
}
