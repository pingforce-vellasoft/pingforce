import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:latlong2/latlong.dart';

part 'check_in_state.freezed.dart';

// ─────────────────────────────────────────────────────────────────────────────
// CHECK-IN SCREEN STATE  (maps to CHECKIN_FLOW_SPEC.md §6)
// ─────────────────────────────────────────────────────────────────────────────

/// All possible states of the Attendance Check-In screen.
/// Every state is mapped to a specific UI layout in [AttendanceScreen].
enum CheckInScreenStatus {
  /// S1 — Loading shift, policy, and initialising GPS.
  initializing,

  /// S2 — GPS enabled, waiting for first position fix.
  gpsAcquiring,

  /// S3 — GPS locked but accuracy exceeds threshold.
  gpsPoor,

  /// S4 — All validations pass; user is inside geofence.
  readyToCheckIn,

  /// S5 — GPS accurate but user is outside the geofence.
  outsideGeofence,

  /// S6 — Active attendance session already exists for today.
  alreadyCheckedIn,

  /// S7 — No network connection; offline check-in available.
  offline,

  /// S8 — GPS / Location permission not granted.
  gpsPermissionRequired,

  /// S9 — Tenant has not configured any geofence / go-location yet.
  geofenceNotConfigured,

  /// S11 — API submission in progress.
  submitting,

  /// S12 — Check-in recorded successfully.
  success,

  /// S13 — Validation or API error.
  error,

  /// S14 — Mock / spoofed location detected.
  mockLocationDetected,
}

/// GPS accuracy classification (DESIGN_TOKENS.md §3.6)
enum GpsAccuracyLevel {
  excellent, // < 10m
  good,      // 10–25m
  fair,      // 25–50m
  poor,      // > 50m
  unavailable,
}

extension GpsAccuracyLevelX on GpsAccuracyLevel {
  GpsAccuracyLevel fromAccuracy(double meters) {
    if (meters < 10) return GpsAccuracyLevel.excellent;
    if (meters < 25) return GpsAccuracyLevel.good;
    if (meters < 50) return GpsAccuracyLevel.fair;
    return GpsAccuracyLevel.poor;
  }

  String get label => switch (this) {
        GpsAccuracyLevel.excellent => 'Excellent',
        GpsAccuracyLevel.good => 'Good',
        GpsAccuracyLevel.fair => 'Fair',
        GpsAccuracyLevel.poor => 'Poor',
        GpsAccuracyLevel.unavailable => 'Unavailable',
      };
}

/// Geofence status for the current user position.
enum GeofenceStatus {
  unknown,
  inside,
  outside,
  notConfigured, // tenant has no geofence policy
}

/// What the Check-In button should do / show.
enum CheckInButtonMode {
  loading,          // Initializing / acquiring GPS
  disabled,         // Hard block (outside fence, mock detected, etc.)
  enabledNormal,    // All clear — check in
  enabledBiometric, // Inside geofence — check in via fingerprint / face
  enabledOffline,   // Offline mode enabled
  enabledOverride,  // Low GPS / outside fence — policy allows override
  alreadyCheckedIn, // Active session exists
  submitting,       // API call in progress
  success,          // Done
  error,            // Retry
}

// ─────────────────────────────────────────────────────────────────────────────
// DATA MODELS
// ─────────────────────────────────────────────────────────────────────────────

@freezed
class ShiftInfo with _$ShiftInfo {
  const factory ShiftInfo({
    required String shiftCode,
    required String shiftName,
    required String startTime,       // e.g. "09:00"
    required String endTime,         // e.g. "18:00"
    required int gracePeriodMinutes, // e.g. 15
    required int totalBreaksAllowed,
    required double requiredHours,
    @Default(false) bool isCurrentlyActive,
    @Default(false) bool isInGracePeriod,
    @Default(false) bool isLate,
    int? minutesLate,
    int? minutesEarlyCheckIn,
  }) = _ShiftInfo;
}

@freezed
class GeofenceInfo with _$GeofenceInfo {
  const factory GeofenceInfo({
    required String id,
    required String name,
    required LatLng center,
    required double radiusMeters,
    @Default(GeofenceStatus.unknown) GeofenceStatus status,
    double? distanceToFence, // meters to nearest fence boundary
  }) = _GeofenceInfo;
}

@freezed
class GpsLocation with _$GpsLocation {
  const factory GpsLocation({
    required double latitude,
    required double longitude,
    required double accuracyMeters,
    required DateTime timestamp,
    @Default(false) bool isMockLocation,
    double? altitude,
    double? speed,
  }) = _GpsLocation;
}

@freezed
class ActiveSession with _$ActiveSession {
  const factory ActiveSession({
    required String sessionId,
    required DateTime checkInTime,
    required String shiftName,
    int? breaksTaken,
    DateTime? lastBreakStart,
    @Default(false) bool isOnBreak,
  }) = _ActiveSession;
}

@freezed
class CheckInResult with _$CheckInResult {
  const factory CheckInResult({
    required String attendanceId,
    required DateTime checkInTime,
    required String shiftName,
    required String branchName,
    required bool isOffline,
    @Default(false) bool isLate,
    int? minutesLate,
  }) = _CheckInResult;
}

@freezed
class TenantCheckInPolicy with _$TenantCheckInPolicy {
  const factory TenantCheckInPolicy({
    @Default(true) bool gpsRequired,
    @Default(true) bool geofenceEnabled,
    @Default('BLOCK') String geofencePolicy,   // BLOCK | WARN | ALLOW
    @Default(false) bool biometricRequired,
    @Default(false) bool selfieRequired,
    @Default(false) bool allowLowAccuracy,
    @Default(50.0) double accuracyThresholdMeters,
    @Default(true) bool allowOfflineCheckIn,
    @Default(['GPS']) List<String> checkInMethods,
    @Default('BLOCK') String mockLocationPolicy, // BLOCK | WARN
  }) = _TenantCheckInPolicy;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN STATE  (Riverpod AsyncNotifier state)
// ─────────────────────────────────────────────────────────────────────────────

@freezed
class CheckInState with _$CheckInState {
  const factory CheckInState({
    @Default(CheckInScreenStatus.initializing) CheckInScreenStatus status,

    // Data
    ShiftInfo? shift,
    GpsLocation? location,
    GeofenceInfo? geofence,
    ActiveSession? activeSession,
    CheckInResult? checkInResult,
    TenantCheckInPolicy? policy,

    /// Name of the geofence the user is inside, or the nearest one when
    /// outside. Used to name the zone in status messages.
    String? nearestGeofenceName,

    // GPS
    @Default(GpsAccuracyLevel.unavailable) GpsAccuracyLevel gpsAccuracy,
    @Default(GeofenceStatus.unknown) GeofenceStatus geofenceStatus,
    @Default(false) bool isMockLocationDetected,
    @Default(false) bool isOnline,

    // UI helpers
    @Default(CheckInButtonMode.loading) CheckInButtonMode buttonMode,
    @Default(false) bool showSuccessOverlay,
    @Default(false) bool isProcessingBiometric,
    @Default(false) bool isCapturingSelfie,

    // Error
    String? errorMessage,
    String? errorCode,
  }) = _CheckInState;

  const CheckInState._();

  /// Derived: returns the distance string for outside-geofence display.
  String get distanceFromFenceText {
    final d = geofence?.distanceToFence;
    if (d == null) return '';
    if (d < 1000) return '${d.toStringAsFixed(0)}m from boundary';
    return '${(d / 1000).toStringAsFixed(1)}km from boundary';
  }

  /// Derived: is check-in action completely blocked?
  bool get isCheckInBlocked =>
      status == CheckInScreenStatus.mockLocationDetected ||
      status == CheckInScreenStatus.gpsPermissionRequired ||
      status == CheckInScreenStatus.geofenceNotConfigured ||
      status == CheckInScreenStatus.outsideGeofence;

  /// Derived: should the method selector be visible?
  bool get showMethodSelector =>
      (policy?.checkInMethods.length ?? 1) > 1 &&
      status != CheckInScreenStatus.initializing;
}
