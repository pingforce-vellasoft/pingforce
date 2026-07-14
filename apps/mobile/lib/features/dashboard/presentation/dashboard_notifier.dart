import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'dashboard_state.dart';

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD NOTIFIER  (stub — wire to real repositories)
// ─────────────────────────────────────────────────────────────────────────────

final dashboardNotifierProvider =
    NotifierProvider<DashboardNotifier, DashboardState>(
  DashboardNotifier.new,
);

class DashboardNotifier extends Notifier<DashboardState> {
  @override
  DashboardState build() => const DashboardState(isLoading: true);

  // ── Load ───────────────────────────────────────────────────────────────────

  Future<void> load() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      // TODO: inject repositories and fetch:
      //   1. Current user info
      //   2. Today's attendance session
      //   3. RBAC-gated KPI cards
      //   4. RBAC-gated quick actions
      //   5. Today's activity feed
      //   6. Team status (if manager)
      //   7. Notification count
      //   8. Sync queue status

      // ── Stub data ────────────────────────────────────────────────────────
      await Future<void>.delayed(const Duration(milliseconds: 500));

      state = state.copyWith(
        isLoading: false,
        isOnline: true,
        user: const DashboardUserInfo(
          userId: 'u001',
          firstName: 'Ahmed',
          lastName: 'Al-Rashid',
          role: 'Field Technician',
          department: 'Operations',
          initials: 'AA',
          isManager: false,
        ),
        attendanceHero: AttendanceHeroData(
          status: AttendanceHeroStatus.working,
          checkInTime: DateTime.now().subtract(const Duration(hours: 3, minutes: 22)),
          shiftName: 'Morning Shift',
          shiftStart: '09:00',
          shiftEnd: '18:00',
          totalShiftMinutes: 540,
          gracePeriodMinutes: 15,
          progressFraction: 0.42,
          breaksTaken: 1,
          isLate: false,
          isOnTime: true,
        ),
        kpiCards: const [
          KpiCard(
            id: 'attendance',
            title: 'Attendance',
            primaryValue: 'Present',
            label: 'Today',
            iconName: 'fingerprint',
            trendLabel: 'On Time',
            severity: KpiCardSeverity.normal,
            route: '/attendance',
          ),
          KpiCard(
            id: 'faults',
            title: 'Faults',
            primaryValue: '3',
            label: 'Open Faults',
            iconName: 'build_circle',
            secondaryLabel: '1 Overdue',
            trendLabel: '▲ 1 overdue',
            trendUp: false,
            severity: KpiCardSeverity.warning,
            route: '/faults',
          ),
          KpiCard(
            id: 'visits',
            title: 'GPS Visits',
            primaryValue: '2',
            label: 'Today',
            iconName: 'location_on',
            secondaryLabel: 'Next: 2:30 PM',
            trendLabel: '1 remaining',
            severity: KpiCardSeverity.normal,
            route: '/visits',
          ),
        ],
        quickActions: const [
          QuickAction(
            id: 'checkout',
            label: 'Check Out',
            iconName: 'logout',
            route: '/attendance',
            isUrgent: true,
          ),
          QuickAction(
            id: 'fault',
            label: 'Report Fault',
            iconName: 'report_problem',
            route: '/faults/new',
          ),
          QuickAction(
            id: 'visit',
            label: 'Log Visit',
            iconName: 'map',
            route: '/visits/new',
          ),
          QuickAction(
            id: 'lead',
            label: 'New Lead',
            iconName: 'person_add',
            route: '/leads/new',
          ),
        ],
        activityFeed: [
          ActivityFeedItem(
            id: 'a1',
            type: ActivityType.checkIn,
            title: 'Checked in at 09:05 AM',
            timestamp: DateTime.now().subtract(const Duration(hours: 3, minutes: 22)),
          ),
          ActivityFeedItem(
            id: 'a2',
            type: ActivityType.faultAssigned,
            title: 'Fault #1032 assigned to you',
            subtitle: 'AC Unit Failure — Building 4',
            timestamp: DateTime.now().subtract(const Duration(hours: 2)),
            route: '/faults/1032',
            isUnread: true,
          ),
          ActivityFeedItem(
            id: 'a3',
            type: ActivityType.breakEnd,
            title: 'Break ended at 12:45 PM',
            timestamp: DateTime.now().subtract(const Duration(hours: 1, minutes: 30)),
          ),
          ActivityFeedItem(
            id: 'a4',
            type: ActivityType.visitLogged,
            title: 'Visit logged at Client HQ',
            timestamp: DateTime.now().subtract(const Duration(minutes: 45)),
            route: '/visits/88',
          ),
        ],
        unreadNotifications: 3,
        syncInfo: const SyncInfo(
          status: SyncStatus.pendingItems,
          pendingCount: 2,
        ),
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Failed to load dashboard. Pull down to retry.',
      );
    }
  }

  // ── Refresh ────────────────────────────────────────────────────────────────

  Future<void> refresh() async {
    if (state.isRefreshing) return;
    state = state.copyWith(isRefreshing: true, errorMessage: null);
    await load();
    state = state.copyWith(isRefreshing: false);
  }

  // ── Navigation helpers ─────────────────────────────────────────────────────

  void goToAttendance(BuildContext context) {
    // TODO: context.push('/attendance');
  }

  void goToAttendanceHistory(BuildContext context) {
    // TODO: context.push('/attendance/history');
  }

  void goToTeam(BuildContext context) {
    // TODO: context.push('/team');
  }

  void onKpiCardTap(BuildContext context, KpiCard card) {
    // TODO: context.push(card.route ?? '/');
  }

  void onQuickActionTap(BuildContext context, QuickAction action) {
    // TODO: context.push(action.route);
  }

  void onActivityItemTap(BuildContext context, ActivityFeedItem item) {
    if (item.route != null) {
      // TODO: context.push(item.route!);
    }
  }

  void openNotifications(BuildContext context) {
    // TODO: context.push('/notifications');
  }

  void goToActivityFeed(BuildContext context) {
    // TODO: context.push('/activity');
  }
}
