import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';

import '../../../../core/hardware/device_identity.dart';
import '../../../../core/network/connectivity_provider.dart';
import '../../../../core/sync/sync_provider.dart';
import '../../../../core/sync/sync_state.dart';
import '../../../../injection_container.dart';
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

      // TODO(phase-2): fetch tenant geofence + evaluate containment via the
      // attendance repository. Until then geofence is reported unconfigured.
      state = state.copyWith(
        location: location,
        gpsAccuracy: accuracyLevel,
        geofence: GeofenceInfo(
          id: 'unconfigured',
          name: 'No geofence configured',
          center: LatLng(position.latitude, position.longitude),
          radiusMeters: 0,
          status: GeofenceStatus.notConfigured,
        ),
        geofenceStatus: GeofenceStatus.notConfigured,
        status: CheckInScreenStatus.readyToCheckIn,
        buttonMode: CheckInButtonMode.enabledNormal,
      );
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
