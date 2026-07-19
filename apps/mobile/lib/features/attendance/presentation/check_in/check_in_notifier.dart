import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';

import 'package:local_auth/local_auth.dart';

import '../../../../core/hardware/device_identity.dart';
import '../../../../core/network/connectivity_provider.dart';
import '../../../../core/sync/sync_provider.dart';
import '../../../../core/sync/sync_state.dart';
import '../../../../injection_container.dart';
import '../../../geofences/domain/entities/geofence.dart';
import '../../../geofences/domain/repositories/geofence_repository.dart';
import '../../domain/usecases/punch_command.dart' as punch_uc;
import '../../domain/usecases/register_device_command.dart';
import 'check_in_state.dart';

// ─────────────────────────────────────────────────────────────────────────────
// CHECK-IN NOTIFIER  (CHECKIN_FLOW_SPEC.md §6 state machine)
//
// Drives the attendance screen through S1..S14. GPS permission, position
// acquisition, mock-location detection (geolocator) and the punch API call
// (PunchCommand via get_it) are real; shift/policy remain stubbed until the
// tenant-policy endpoint exists.
// ─────────────────────────────────────────────────────────────────────────────

final checkInNotifierProvider =
    NotifierProvider<CheckInNotifier, CheckInState>(CheckInNotifier.new);

class CheckInNotifier extends Notifier<CheckInState> {
  @override
  CheckInState build() => const CheckInState();

  // ── S1: initialise shift + policy + GPS ────────────────────────────────────

  Future<void> initialise() async {
    state = const CheckInState(status: CheckInScreenStatus.initializing);

    // TODO(phase-2): load shift + policy from the attendance repository.
    final policy = const TenantCheckInPolicy();
    final shift = ShiftInfo(
      shiftCode: 'GEN',
      shiftName: 'General Shift',
      startTime: '09:00',
      endTime: '18:00',
      gracePeriodMinutes: 15,
      totalBreaksAllowed: 2,
      requiredHours: 9,
      isCurrentlyActive: true,
    );

    state = state.copyWith(
      policy: policy,
      shift: shift,
      isOnline: ref.read(isOnlineProvider),
    );

    await _acquireGps();
  }

  Future<void> _acquireGps() async {
    // Permission flow (S8)
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      state = state.copyWith(
        status: CheckInScreenStatus.gpsPermissionRequired,
        buttonMode: CheckInButtonMode.disabled,
      );
      return;
    }

    // S2: acquiring
    state = state.copyWith(
      status: CheckInScreenStatus.gpsAcquiring,
      buttonMode: CheckInButtonMode.loading,
    );

    try {
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 20),
        ),
      );

      final location = GpsLocation(
        latitude: position.latitude,
        longitude: position.longitude,
        accuracyMeters: position.accuracy,
        timestamp: position.timestamp,
        isMockLocation: position.isMocked,
        altitude: position.altitude,
        speed: position.speed,
      );

      // S14: mock location hard block
      if (location.isMockLocation &&
          (state.policy?.mockLocationPolicy ?? 'BLOCK') == 'BLOCK') {
        state = state.copyWith(
          location: location,
          isMockLocationDetected: true,
          status: CheckInScreenStatus.mockLocationDetected,
          buttonMode: CheckInButtonMode.disabled,
        );
        return;
      }

      final accuracyLevel = _classifyAccuracy(position.accuracy);
      final threshold = state.policy?.accuracyThresholdMeters ?? 50.0;

      // S3: poor accuracy
      if (position.accuracy > threshold &&
          !(state.policy?.allowLowAccuracy ?? false)) {
        state = state.copyWith(
          location: location,
          gpsAccuracy: accuracyLevel,
          status: CheckInScreenStatus.gpsPoor,
          buttonMode: CheckInButtonMode.disabled,
        );
        return;
      }

      // Fetch tenant geofences (admin-configured) and evaluate containment.
      await _evaluateGeofence(location, accuracyLevel);
    } catch (_) {
      state = state.copyWith(
        status: CheckInScreenStatus.error,
        buttonMode: CheckInButtonMode.error,
        errorMessage: 'Could not determine your location. Try again.',
        errorCode: 'GPS_TIMEOUT',
      );
    }
  }

  GpsAccuracyLevel _classifyAccuracy(double meters) {
    if (meters < 10) return GpsAccuracyLevel.excellent;
    if (meters < 25) return GpsAccuracyLevel.good;
    if (meters < 50) return GpsAccuracyLevel.fair;
    return GpsAccuracyLevel.poor;
  }

  // ── Geofence evaluation (Feature: 3-part geofenced check-in) ────────────────
  //
  // 1. No geofence configured by tenant  → notConfigured (ask admin to set up).
  // 2. Configured but user is outside     → outsideGeofence (name the zone).
  // 3. Configured and user is inside       → readyToCheckIn (biometric unlock
  //    is then required in onCheckInTap before the punch is submitted).
  Future<void> _evaluateGeofence(
    GpsLocation location,
    GpsAccuracyLevel accuracyLevel,
  ) async {
    final userPoint = LatLng(location.latitude, location.longitude);

    final result = await sl<GeofenceRepository>().getGeofences();

    final fences = result.getOrElse(() => const <Geofence>[]);

    // State 1 — tenant has not configured any geofence / go-location yet.
    if (fences.isEmpty) {
      state = state.copyWith(
        location: location,
        gpsAccuracy: accuracyLevel,
        geofence: null,
        geofenceStatus: GeofenceStatus.notConfigured,
        nearestGeofenceName: null,
        status: CheckInScreenStatus.geofenceNotConfigured,
        buttonMode: CheckInButtonMode.disabled,
      );
      return;
    }

    // Find the containing fence, else the nearest one (for the message).
    const distance = Distance();
    Geofence? containing;
    Geofence? nearest;
    double nearestGap = double.infinity; // metres outside the nearest boundary

    for (final fence in fences) {
      final center = LatLng(fence.latitude, fence.longitude);
      final metres = distance.as(LengthUnit.Meter, userPoint, center);
      final gap = metres - fence.radiusMeters;
      if (gap <= 0) {
        containing = fence;
        break;
      }
      if (gap < nearestGap) {
        nearestGap = gap;
        nearest = fence;
      }
    }

    // State 2 — configured, but the employee is outside every zone.
    if (containing == null) {
      final fence = nearest!;
      state = state.copyWith(
        location: location,
        gpsAccuracy: accuracyLevel,
        geofence: GeofenceInfo(
          id: fence.id,
          name: fence.name,
          center: LatLng(fence.latitude, fence.longitude),
          radiusMeters: fence.radiusMeters.toDouble(),
          status: GeofenceStatus.outside,
          distanceToFence: nearestGap,
        ),
        geofenceStatus: GeofenceStatus.outside,
        nearestGeofenceName: fence.name,
        status: CheckInScreenStatus.outsideGeofence,
        buttonMode: CheckInButtonMode.disabled,
      );
      return;
    }

    // State 3 — inside the zone: allow check-in via biometric.
    state = state.copyWith(
      location: location,
      gpsAccuracy: accuracyLevel,
      geofence: GeofenceInfo(
        id: containing.id,
        name: containing.name,
        center: LatLng(containing.latitude, containing.longitude),
        radiusMeters: containing.radiusMeters.toDouble(),
        status: GeofenceStatus.inside,
      ),
      geofenceStatus: GeofenceStatus.inside,
      nearestGeofenceName: containing.name,
      status: CheckInScreenStatus.readyToCheckIn,
      buttonMode: CheckInButtonMode.enabledBiometric,
    );
  }

  // ── S11/S12: submit check-in ───────────────────────────────────────────────

  Future<void> onCheckInTap(BuildContext context) async {
    if (state.isCheckInBlocked ||
        state.status == CheckInScreenStatus.submitting) {
      return;
    }

    final location = state.location;
    if (location == null) {
      state = state.copyWith(
        status: CheckInScreenStatus.error,
        buttonMode: CheckInButtonMode.error,
        errorMessage: 'Location unavailable. Try again.',
      );
      return;
    }

    // Biometric gate: inside the geofence, check-in requires fingerprint / face
    // verification before the punch is submitted.
    final authed = await _verifyBiometric();
    if (!authed) return;

    state = state.copyWith(
      status: CheckInScreenStatus.submitting,
      buttonMode: CheckInButtonMode.submitting,
    );

    // Offline path (OFFLINE_SYNC.md §6): no connectivity → save locally,
    // queue for sync, and show optimistic success flagged as offline.
    if (!ref.read(isOnlineProvider)) {
      await _enqueueOfflinePunch(location);
      return;
    }

    // Real punch via the clean-architecture data layer. Signature payload is
    // accepted as-is server-side until device-key signing lands (Phase 5b).
    final params = punch_uc.PunchParams(
      latitude: location.latitude,
      longitude: location.longitude,
      cryptographicSignature: 'gps:${location.timestamp.toIso8601String()}',
    );

    var result = await sl<punch_uc.PunchCommand>()(params);

    // First punch on a fresh install fails with an untrusted device —
    // register this device once, then retry.
    if (result.isLeft()) {
      final registered = await sl<RegisterDeviceCommand>()(
        const RegisterDeviceParams(publicKey: 'mobile-client'),
      );
      if (registered.isRight()) {
        result = await sl<punch_uc.PunchCommand>()(params);
      }
    }

    result.fold(
      (failure) {
        state = state.copyWith(
          status: CheckInScreenStatus.error,
          buttonMode: CheckInButtonMode.error,
          errorMessage: failure.message,
        );
      },
      (session) {
        state = state.copyWith(
          status: CheckInScreenStatus.success,
          buttonMode: CheckInButtonMode.success,
          showSuccessOverlay: true,
          checkInResult: CheckInResult(
            attendanceId: session.id,
            checkInTime: session.punchIn,
            shiftName: state.shift?.shiftName ?? 'Shift',
            branchName: 'Main Branch',
            isOffline: !state.isOnline,
          ),
          activeSession: ActiveSession(
            sessionId: session.id,
            checkInTime: session.punchIn,
            shiftName: state.shift?.shiftName ?? 'Shift',
          ),
        );
      },
    );
  }

  /// Prompts fingerprint / face authentication. Returns true only on success.
  /// On failure or unavailable hardware the screen returns to its ready state
  /// with an error message so the user can retry.
  Future<bool> _verifyBiometric() async {
    state = state.copyWith(isProcessingBiometric: true, errorMessage: null);
    try {
      final localAuth = sl<LocalAuthentication>();
      final canCheck = await localAuth.canCheckBiometrics ||
          await localAuth.isDeviceSupported();
      if (!canCheck) {
        state = state.copyWith(
          isProcessingBiometric: false,
          status: CheckInScreenStatus.error,
          buttonMode: CheckInButtonMode.error,
          errorMessage: 'Biometrics unavailable on this device.',
        );
        return false;
      }

      final didAuth = await localAuth.authenticate(
        localizedReason: 'Verify your identity to check in',
        options: const AuthenticationOptions(stickyAuth: true),
      );

      if (didAuth) {
        state = state.copyWith(isProcessingBiometric: false);
        return true;
      }

      state = state.copyWith(
        isProcessingBiometric: false,
        status: CheckInScreenStatus.readyToCheckIn,
        buttonMode: CheckInButtonMode.enabledBiometric,
        errorMessage: 'Identity not verified. Try again.',
      );
      return false;
    } catch (_) {
      state = state.copyWith(
        isProcessingBiometric: false,
        status: CheckInScreenStatus.readyToCheckIn,
        buttonMode: CheckInButtonMode.enabledBiometric,
        errorMessage: 'Biometric verification failed. Try again.',
      );
      return false;
    }
  }

  /// LOCAL_SAVE → QUEUE CREATED (OFFLINE_SYNC.md §6): stores the punch in the
  /// Hive-backed sync queue; SyncNotifier drains it when connectivity returns.
  Future<void> _enqueueOfflinePunch(GpsLocation location) async {
    final now = DateTime.now();
    final clientRef = 'punch-${now.microsecondsSinceEpoch}';
    final deviceId = await sl<DeviceIdentity>().getOrCreate();

    ref.read(syncProvider.notifier).enqueue(
          SyncQueueItem(
            id: clientRef,
            module: SyncItemModule.attendance,
            entityId: clientRef,
            operationType: 'create',
            description: 'Offline attendance punch',
            queuedAt: now,
            payload: {
              'clientRef': clientRef,
              'deviceId': deviceId,
              'latitude': location.latitude,
              'longitude': location.longitude,
              'signature': 'gps:${now.toIso8601String()}',
              'timestamp': now.toIso8601String(),
            },
          ),
        );

    state = state.copyWith(
      status: CheckInScreenStatus.success,
      buttonMode: CheckInButtonMode.success,
      showSuccessOverlay: true,
      checkInResult: CheckInResult(
        attendanceId: clientRef,
        checkInTime: now,
        shiftName: state.shift?.shiftName ?? 'Shift',
        branchName: 'Main Branch',
        isOffline: true,
      ),
      activeSession: ActiveSession(
        sessionId: clientRef,
        checkInTime: now,
        shiftName: state.shift?.shiftName ?? 'Shift',
      ),
    );
  }

  void dismissSuccess() {
    state = state.copyWith(
      showSuccessOverlay: false,
      status: CheckInScreenStatus.alreadyCheckedIn,
      buttonMode: CheckInButtonMode.alreadyCheckedIn,
    );
  }

  // ── S6: active session actions ─────────────────────────────────────────────

  Future<void> startBreak() async {
    final session = state.activeSession;
    if (session == null) return;
    // TODO(phase-2): call break API.
    state = state.copyWith(
      activeSession: session.copyWith(
        isOnBreak: !session.isOnBreak,
        lastBreakStart: session.isOnBreak ? session.lastBreakStart : DateTime.now(),
        breaksTaken:
            session.isOnBreak ? session.breaksTaken : (session.breaksTaken ?? 0) + 1,
      ),
    );
  }

  Future<void> initiateCheckOut() async {
    // TODO(phase-2): execute check-out PunchCommand.
    state = state.copyWith(
      activeSession: null,
      status: CheckInScreenStatus.readyToCheckIn,
      buttonMode: CheckInButtonMode.enabledNormal,
    );
  }
}
