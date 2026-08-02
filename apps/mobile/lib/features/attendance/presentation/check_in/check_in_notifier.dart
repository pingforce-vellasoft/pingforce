import 'dart:async';

import 'package:dartz/dartz.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';

import 'package:local_auth/local_auth.dart';

import '../../../../core/auth/auth_session.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/hardware/background_location_permission.dart';
import '../../../../core/hardware/device_identity.dart';
import '../../../../core/navigation/nav_destinations.dart';
import '../../../../core/network/connectivity_provider.dart';
import '../../../../core/sync/sync_provider.dart';
import '../../../../core/sync/sync_state.dart';
import '../../../../injection_container.dart';
import '../../../geofences/domain/entities/geofence.dart';
import '../../../geofences/domain/repositories/geofence_repository.dart';
import '../../../tracking/presentation/tracking_notifier.dart';
import '../../../../core/usecases/usecase.dart';
import '../../domain/usecases/get_today_query.dart';
import '../../domain/usecases/punch_command.dart' as punch_uc;
import 'check_in_state.dart';

// ─────────────────────────────────────────────────────────────────────────────
// CHECK-IN NOTIFIER  (CHECKIN_FLOW_SPEC.md §6 state machine)
//
// Drives the attendance screen through S1..S14. GPS permission, position
// acquisition, mock-location detection (geolocator) and the punch API call
// (PunchCommand via get_it) are real; shift/policy remain stubbed until the
// tenant-policy endpoint exists.
// ─────────────────────────────────────────────────────────────────────────────

final checkInNotifierProvider = NotifierProvider<CheckInNotifier, CheckInState>(
  CheckInNotifier.new,
);

class CheckInNotifier extends Notifier<CheckInState> {
  @override
  CheckInState build() => const CheckInState();

  /// Whether the signed-in account is a field role subject to background
  /// tracking. Office roles (manager, admin) check in but are neither prompted
  /// for background location nor tracked. Single gate for both the permission
  /// request and starting the tracking service.
  bool get _isFieldRole =>
      AppUserRoleX.fromRoleCode(AuthSession.instance.roleCode).isFieldRole;

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
      totalBreaksAllowed: 0,
      requiredHours: 9,
      isCurrentlyActive: true,
    );

    state = state.copyWith(
      policy: policy,
      shift: shift,
      isOnline: ref.read(isOnlineProvider),
    );

    // Restore any open session BEFORE acquiring GPS. Attendance state lives on
    // the server, not in this notifier — without this, re-opening the screen
    // (or restarting the app) showed a fresh check-in page to someone who was
    // already checked in, and let them open a second session.
    await refreshToday();

    await _acquireGps();
  }

  /// Loads today's snapshot and rehydrates the active session.
  ///
  /// Offline is not an error here: the cached/optimistic local session stays
  /// as-is and the screen carries on, since punches queue for later sync.
  Future<void> refreshToday() async {
    if (!ref.read(isOnlineProvider)) return;

    final result = await sl<GetTodayQuery>()(NoParams());

    // Snapshot unavailable (offline, server error): leave existing state
    // untouched rather than wrongly clearing an active session.
    final today = result.fold<AttendanceToday?>((_) => null, (t) => t);
    if (today == null) return;

    final remote = today.activeSession;

    if (remote == null) {
      // Server says no open session: the day is done (or never started).
      state = state.copyWith(
        today: today,
        activeSession: null,
        status: CheckInScreenStatus.readyToCheckIn,
        buttonMode: CheckInButtonMode.enabledNormal,
      );
      return;
    }

    // Re-resolve the check-in geofence from the coordinates the punch was
    // recorded at. On a cold start `state.activeSession` is null, so carrying
    // the id forward from it loses the zone — and `_isInsideCheckInFence`
    // treats a null id as "any fence will do", quietly turning the
    // same-location check-out rule off for the rest of the session.
    var geofenceId = state.activeSession?.checkInGeofenceId;
    var geofenceName = state.activeSession?.checkInGeofenceName;
    if (geofenceId == null &&
        remote.checkInLatitude != null &&
        remote.checkInLongitude != null) {
      final fence = await _fenceContaining(
        remote.checkInLatitude!,
        remote.checkInLongitude!,
      );
      geofenceId = fence?.id;
      geofenceName = fence?.name;
    }

    state = state.copyWith(
      today: today,
      activeSession: ActiveSession(
        sessionId: remote.id,
        checkInTime: remote.punchIn,
        shiftName: state.shift?.shiftName ?? 'Shift',
        checkInGeofenceId: geofenceId,
        checkInGeofenceName: geofenceName,
      ),
      status: CheckInScreenStatus.alreadyCheckedIn,
      buttonMode: CheckInButtonMode.alreadyCheckedIn,
    );

    // Resume background tracking for field roles — a restarted app must
    // not silently stop tracking an on-shift operator.
    if (_isFieldRole) {
      unawaited(ref.read(trackingProvider.notifier).start(remote.id));
    }
  }

  /// The tenant geofence containing the given point, or null if none does.
  Future<Geofence?> _fenceContaining(double latitude, double longitude) async {
    final result = await sl<GeofenceRepository>().getGeofences();
    final fences = result.getOrElse(() => const <Geofence>[]);

    final point = LatLng(latitude, longitude);
    const distance = Distance();

    for (final fence in fences) {
      final center = LatLng(fence.latitude, fence.longitude);
      if (distance.as(LengthUnit.Meter, point, center) <= fence.radiusMeters) {
        return fence;
      }
    }
    return null;
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

    // Background-tracking consent gate — field roles only. Field staff move
    // between sites and are tracked while on shift; office roles (manager,
    // admin) may still punch attendance but must never be prompted for
    // background location or tracked. Check-in starts the location foreground
    // service, so for field roles this is the in-context moment Play wants the
    // "Allow all the time" request made — behind our prominent disclosure.
    // Declining does not block check-in; only durable background route tracking
    // is unavailable. Also ensures the Android 13+ notification grant the
    // service needs.
    if (_isFieldRole) {
      await BackgroundLocationPermission.ensureNotifications();
      if (!context.mounted) return;
      await BackgroundLocationPermission.ensure(context);
    }

    state = state.copyWith(
      status: CheckInScreenStatus.submitting,
      buttonMode: CheckInButtonMode.submitting,
    );

    // Offline path (OFFLINE_SYNC.md §6): no connectivity → save locally,
    // queue for sync, and show optimistic success flagged as offline.
    if (!ref.read(isOnlineProvider)) {
      await _enqueueOfflinePunch(location);
      // Track the on-shift operator even for an offline check-in — pings buffer
      // in the sync queue and upload on reconnect.
      final offlineSessionId = state.activeSession?.sessionId;
      if (offlineSessionId != null && _isFieldRole) {
        unawaited(ref.read(trackingProvider.notifier).start(offlineSessionId));
      }
      return;
    }

    // Real punch via the clean-architecture data layer. Signature payload is
    // accepted as-is server-side until device-key signing lands (Phase 5b).
    final params = punch_uc.PunchParams(
      latitude: location.latitude,
      longitude: location.longitude,
      cryptographicSignature: 'gps:${location.timestamp.toIso8601String()}',
    );

    final result = await sl<punch_uc.PunchCommand>()(params);

    // A device-trust failure used to trigger a silent re-register + retry. That
    // was the client half of self-service rebinding: any handset could claim
    // the employee's binding on a failed punch and immediately punch from it.
    // Binding now happens once at onboarding, and moving it needs an
    // admin-approved change request — so an untrusted device is surfaced to the
    // employee, never resolved behind their back.
    if (result.isLeft() && _isUntrustedDeviceFailure(result)) {
      state = state.copyWith(
        status: CheckInScreenStatus.error,
        buttonMode: CheckInButtonMode.error,
        errorMessage:
            'This device is not registered to your account. Request a device '
            'change from your profile to punch from this handset.',
        // The screen keys the "Request device change" action off this code —
        // matching the message text would break on any wording change.
        errorCode: 'UNTRUSTED_DEVICE',
      );
      return;
    }

    // No work location assigned. Unlike standing outside a geofence, this is
    // not something the employee can walk off — retrying or moving will fail
    // identically until an admin assigns them a geofence, so the message says
    // that rather than implying a location problem.
    if (result.isLeft() && _isNoGeofenceAssignedFailure(result)) {
      state = state.copyWith(
        status: CheckInScreenStatus.error,
        buttonMode: CheckInButtonMode.error,
        errorMessage:
            'No work location is assigned to your account, so attendance '
            'cannot be recorded. Ask your administrator to assign you to a '
            'geofence.',
        errorCode: 'GEOFENCE-001',
      );
      return;
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
        // The punch endpoint toggles: a returned session carrying a punchOut
        // is a check-OUT, not a check-in. Treat it as a completed session so
        // the UI clears the active session and stops tracking instead of
        // faking a fresh check-in.
        if (session.punchOut != null) {
          state = state.copyWith(
            status: CheckInScreenStatus.readyToCheckIn,
            buttonMode: CheckInButtonMode.enabledNormal,
            activeSession: null,
          );
          unawaited(ref.read(trackingProvider.notifier).stop());
          // Pull the closed session into today's history and totals.
          unawaited(refreshToday());
          return;
        }

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
            checkInGeofenceId: state.geofence?.id,
            checkInGeofenceName: state.geofence?.name,
          ),
        );
        // Begin background location tracking for the on-shift operator —
        // field roles only. Office roles punch in without being tracked.
        if (_isFieldRole) {
          unawaited(ref.read(trackingProvider.notifier).start(session.id));
        }
        unawaited(refreshToday());
      },
    );
  }

  /// True when the punch was refused because this handset is not the one bound
  /// to the account — the API returns errorCode `UNTRUSTED_DEVICE` (or
  /// `DEVICE-007` when nothing is bound at all), which the repository maps to
  /// [UntrustedDeviceFailure]. The message check is a fallback for failures
  /// raised outside that mapping. Resolving it needs an admin-approved device
  /// change; the client must never re-bind on its own.
  bool _isUntrustedDeviceFailure(Either<Failure, dynamic> result) {
    return result.fold(
      (failure) =>
          failure is UntrustedDeviceFailure ||
          failure.message.toLowerCase().contains('untrusted device'),
      (_) => false,
    );
  }

  /// True when the punch was refused because the employee holds no geofence
  /// assignment at all — API errorCode `GEOFENCE-001`, mapped by the
  /// repository to [NoGeofenceAssignedFailure]. Only an admin can resolve it,
  /// so the screen must not suggest moving closer to a zone.
  bool _isNoGeofenceAssignedFailure(Either<Failure, dynamic> result) {
    return result.fold(
      (failure) => failure is NoGeofenceAssignedFailure,
      (_) => false,
    );
  }

  /// Prompts fingerprint / face authentication. Returns true only on success.
  /// On failure or unavailable hardware the screen returns to its ready state
  /// with an error message so the user can retry.
  Future<bool> _verifyBiometric() async {
    state = state.copyWith(isProcessingBiometric: true, errorMessage: null);
    try {
      final localAuth = sl<LocalAuthentication>();
      final canCheck =
          await localAuth.canCheckBiometrics ||
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

    ref
        .read(syncProvider.notifier)
        .enqueue(
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
        checkInGeofenceId: state.geofence?.id,
        checkInGeofenceName: state.geofence?.name,
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

  /// Check-out must happen inside the SAME geofence the employee checked in
  /// from. If they have drifted out of that zone the punch is refused with a
  /// message naming the zone — the only override is admin force-checkout from
  /// the tenant portal (POST /attendance/manual-checkout).
  Future<void> initiateCheckOut() async {
    final session = state.activeSession;
    if (session == null || state.isCheckingOut) return;

    state = state.copyWith(isCheckingOut: true, checkOutError: null);

    // Re-acquire the current position for the check-out punch.
    final location = await _readCurrentLocation();
    if (location == null) {
      state = state.copyWith(
        isCheckingOut: false,
        checkOutError: 'Could not determine your location. Try again.',
      );
      return;
    }

    // Mock-location hard block on check-out too.
    if (location.isMockLocation &&
        (state.policy?.mockLocationPolicy ?? 'BLOCK') == 'BLOCK') {
      state = state.copyWith(
        isCheckingOut: false,
        checkOutError: 'Simulated location detected. Check-out blocked.',
      );
      return;
    }

    // Same-location rule: verify still inside the check-in geofence.
    final inside = await _isInsideCheckInFence(session, location);
    if (!inside) {
      final zone = session.checkInGeofenceName;
      state = state.copyWith(
        isCheckingOut: false,
        checkOutError: zone != null
            ? 'You must be inside "$zone" (where you checked in) to check '
                  'out. If you are working off-site, ask your admin to check '
                  'you out from the tenant portal.'
            : 'You must be at your check-in location to check out. Otherwise '
                  'ask your admin to check you out from the tenant portal.',
      );
      return;
    }

    // Biometric gate on check-out as well.
    final authed = await _verifyBiometric();
    if (!authed) {
      state = state.copyWith(isCheckingOut: false);
      return;
    }

    // Offline check-out → queue the punch; the server toggles in/out.
    if (!ref.read(isOnlineProvider)) {
      await _enqueueOfflinePunch(location);
      state = state.copyWith(isCheckingOut: false, activeSession: null);
      unawaited(ref.read(trackingProvider.notifier).stop());
      return;
    }

    final params = punch_uc.PunchParams(
      latitude: location.latitude,
      longitude: location.longitude,
      cryptographicSignature: 'gps:${location.timestamp.toIso8601String()}',
    );
    final result = await sl<punch_uc.PunchCommand>()(params);

    result.fold(
      (failure) => state = state.copyWith(
        isCheckingOut: false,
        checkOutError: failure.message,
      ),
      (_) {
        state = state.copyWith(
          isCheckingOut: false,
          activeSession: null,
          status: CheckInScreenStatus.readyToCheckIn,
          buttonMode: CheckInButtonMode.enabledNormal,
        );
        unawaited(ref.read(trackingProvider.notifier).stop());
      },
    );
  }

  /// Re-evaluates the tenant geofences and returns whether [location] is inside
  /// the specific zone the session was checked in from (falls back to any zone
  /// when the check-in fence id is unknown, e.g. an offline check-in).
  Future<bool> _isInsideCheckInFence(
    ActiveSession session,
    GpsLocation location,
  ) async {
    final result = await sl<GeofenceRepository>().getGeofences();
    final fences = result.getOrElse(() => const <Geofence>[]);
    if (fences.isEmpty) return false;

    final userPoint = LatLng(location.latitude, location.longitude);
    const distance = Distance();
    final fenceId = session.checkInGeofenceId;

    for (final fence in fences) {
      if (fenceId != null && fenceId.isNotEmpty && fence.id != fenceId) {
        continue;
      }
      final center = LatLng(fence.latitude, fence.longitude);
      final metres = distance.as(LengthUnit.Meter, userPoint, center);
      if (metres - fence.radiusMeters <= 0) return true;
    }
    return false;
  }

  /// Reads the current GPS position, mapped to [GpsLocation]. Returns null on
  /// permission denial or timeout.
  Future<GpsLocation?> _readCurrentLocation() async {
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      return null;
    }
    try {
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 20),
        ),
      );
      return GpsLocation(
        latitude: position.latitude,
        longitude: position.longitude,
        accuracyMeters: position.accuracy,
        timestamp: position.timestamp,
        isMockLocation: position.isMocked,
        altitude: position.altitude,
        speed: position.speed,
      );
    } catch (_) {
      return null;
    }
  }
}
