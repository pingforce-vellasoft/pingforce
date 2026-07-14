import 'package:freezed_annotation/freezed_annotation.dart';

part 'dashboard_state.freezed.dart';

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD STATE  (DASHBOARD_SPEC.md §4)
// ─────────────────────────────────────────────────────────────────────────────

// ── Attendance hero state ──────────────────────────────────────────────────

enum AttendanceHeroStatus {
  notCheckedIn,
  working,
  onBreak,
  checkedOut,
  absent,
  noShift,
}

// ── KPI card model ─────────────────────────────────────────────────────────

enum KpiCardSeverity { normal, warning, critical }

/// A single tile in the horizontal KPI row.
@freezed
class KpiCard with _$KpiCard {
  const factory KpiCard({
    required String id,
    required String title,
    required String primaryValue,
    required String label,
    required String iconName,    // matches AppIcons token name
    String? secondaryLabel,
    String? trendLabel,
    @Default(false) bool trendUp,
    @Default(KpiCardSeverity.normal) KpiCardSeverity severity,
    String? route,              // navigation target on tap
  }) = _KpiCard;
}

// ── Quick action model ─────────────────────────────────────────────────────

@freezed
class QuickAction with _$QuickAction {
  const factory QuickAction({
    required String id,
    required String label,
    required String iconName,
    required String route,
    @Default(false) bool isHighlighted, // primary bg when urgent
    @Default(false) bool isUrgent,      // secondary bg
    String? requiredPermission,
    String? badgeCount,
  }) = _QuickAction;
}

// ── Activity feed item model ───────────────────────────────────────────────

enum ActivityType {
  checkIn,
  checkOut,
  breakStart,
  breakEnd,
  faultCreated,
  faultAssigned,
  faultResolved,
  faultOverdue,
  leadCreated,
  leadUpdated,
  leadWon,
  visitLogged,
  syncCompleted,
  notification,
}

@freezed
class ActivityFeedItem with _$ActivityFeedItem {
  const factory ActivityFeedItem({
    required String id,
    required ActivityType type,
    required String title,
    required DateTime timestamp,
    String? subtitle,
    String? route,            // deep link on tap
    @Default(false) bool isUnread,
  }) = _ActivityFeedItem;
}

// ── Today's attendance summary ─────────────────────────────────────────────

@freezed
class AttendanceHeroData with _$AttendanceHeroData {
  const factory AttendanceHeroData({
    @Default(AttendanceHeroStatus.notCheckedIn) AttendanceHeroStatus status,
    DateTime? checkInTime,
    DateTime? checkOutTime,
    DateTime? breakStartTime,
    String? shiftName,
    String? shiftStart,      // e.g. "09:00"
    String? shiftEnd,        // e.g. "18:00"
    int? totalShiftMinutes,
    int? gracePeriodMinutes,
    double? progressFraction,  // 0.0–1.0 for shift progress bar
    Duration? workingDuration,
    Duration? breakDuration,
    int? breaksTaken,
    bool? isLate,
    int? minutesLate,
    bool? isOnTime,
    String? totalOvertime,
  }) = _AttendanceHeroData;
}

// ── Team status (manager view) ─────────────────────────────────────────────

@freezed
class TeamMemberStatus with _$TeamMemberStatus {
  const factory TeamMemberStatus({
    required String userId,
    required String name,
    String? avatarUrl,
    required String initials,
    required String status,    // 'present' | 'absent' | 'late' | 'leave'
  }) = _TeamMemberStatus;
}

@freezed
class TeamStatusSummary with _$TeamStatusSummary {
  const factory TeamStatusSummary({
    required int total,
    required int present,
    required int absent,
    required int late,
    required int onLeave,
    @Default([]) List<TeamMemberStatus> members, // top 10 for avatars
  }) = _TeamStatusSummary;
}

// ── User info ──────────────────────────────────────────────────────────────

@freezed
class DashboardUserInfo with _$DashboardUserInfo {
  const factory DashboardUserInfo({
    required String userId,
    required String firstName,
    required String lastName,
    required String role,
    required String department,
    String? avatarUrl,
    @Default('') String initials,
    @Default(false) bool isManager,
  }) = _DashboardUserInfo;
}

// ── Sync status ────────────────────────────────────────────────────────────

enum SyncStatus { idle, syncing, pendingItems, allSynced, failed }

@freezed
class SyncInfo with _$SyncInfo {
  const factory SyncInfo({
    @Default(SyncStatus.idle) SyncStatus status,
    @Default(0) int pendingCount,
    DateTime? lastSyncTime,
    String? errorMessage,
  }) = _SyncInfo;
}

// ── Main dashboard state ───────────────────────────────────────────────────

@freezed
class DashboardState with _$DashboardState {
  const factory DashboardState({
    // Loading
    @Default(true) bool isLoading,
    @Default(false) bool isRefreshing,

    // Online / Offline
    @Default(true) bool isOnline,

    // User
    DashboardUserInfo? user,

    // Attendance hero
    AttendanceHeroData? attendanceHero,

    // KPI cards (ordered, RBAC-gated)
    @Default([]) List<KpiCard> kpiCards,

    // Quick actions (ordered, RBAC-gated)
    @Default([]) List<QuickAction> quickActions,

    // Activity feed
    @Default([]) List<ActivityFeedItem> activityFeed,
    @Default(false) bool isLoadingMoreFeed,
    @Default(false) bool hasMoreFeed,

    // Manager: team status
    TeamStatusSummary? teamStatus,

    // Sync
    @Default(SyncInfo()) SyncInfo syncInfo,

    // Notification count
    @Default(0) int unreadNotifications,

    // Error
    String? errorMessage,
  }) = _DashboardState;

  const DashboardState._();

  /// True if all primary data has loaded.
  bool get isReady => !isLoading && user != null;

  /// Returns a greeting based on current hour.
  String get greeting {
    final hour = DateTime.now().hour;
    if (hour >= 5 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 17) return 'Good Afternoon';
    if (hour >= 17 && hour < 21) return 'Good Evening';
    return 'Good Night';
  }

  /// Wave emoji for greeting.
  String get greetingEmoji {
    final hour = DateTime.now().hour;
    if (hour >= 5 && hour < 12) return '🌅';
    if (hour >= 12 && hour < 17) return '☀️';
    if (hour >= 17 && hour < 21) return '🌆';
    return '🌙';
  }

  /// Formatted today's date string.
  String get formattedDate {
    final now = DateTime.now();
    const weekdays = [
      'Monday', 'Tuesday', 'Wednesday', 'Thursday',
      'Friday', 'Saturday', 'Sunday'
    ];
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return '${weekdays[now.weekday - 1]}, ${now.day} ${months[now.month - 1]} ${now.year}';
  }
}
