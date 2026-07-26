import 'dart:async';

import 'package:battery_plus/battery_plus.dart';
import 'package:geolocator/geolocator.dart';

import '../../../core/hardware/device_identity.dart';
import '../../../injection_container.dart';

/// A single background location fix, ready to be turned into a sync payload.
class LocationPing {
  const LocationPing({
    required this.clientRef,
    required this.latitude,
    required this.longitude,
    required this.capturedAt,
    this.accuracy,
    this.speed,
    this.batteryLevel,
    this.provider,
  });

  final String clientRef;
  final double latitude;
  final double longitude;
  final DateTime capturedAt;
  final double? accuracy;
  final double? speed;
  final int? batteryLevel;
  final String? provider;

  /// Matches the API LocationPingDto contract exactly.
  Map<String, dynamic> toPayload() => {
        'clientRef': clientRef,
        'latitude': latitude,
        'longitude': longitude,
        'capturedAt': capturedAt.toIso8601String(),
        if (accuracy != null) 'accuracy': accuracy,
        if (speed != null) 'speed': speed,
        if (batteryLevel != null) 'batteryLevel': batteryLevel,
        if (provider != null) 'provider': provider,
      };
}

/// Owns background field-operator location capture. Takes ONE fix per
/// [interval] via a periodic timer + [Geolocator.getCurrentPosition], then
/// hands it to [onPing]. It does NOT touch the sync queue directly — the
/// controller wires [onPing] to the queue so this class stays testable and
/// isolate-safe.
///
/// Battery: a periodic single-shot fix lets the GPS chip sleep between
/// captures. The earlier design used [Geolocator.getPositionStream] with
/// `LocationAccuracy.high`, which keeps the GPS radio powered continuously for
/// the whole shift and then discards all but one fix per interval — full drain
/// for ten-minute data. The timer model draws power only during each brief fix.
/// Why background capture could not produce a fix. Mirrors the API's
/// TRACKING_GAP_REASONS.
enum TrackingFailureReason {
  /// The user switched location services off device-wide.
  locationDisabled,

  /// Location permission was revoked after the session started.
  permissionDenied,

  /// A fix simply did not arrive in time — usually indoors or a cold start.
  /// Transient: does NOT open a tracking gap on its own.
  fixTimeout,
}

class LocationTrackingService {
  LocationTrackingService({Duration? interval})
      : _interval = interval ?? const Duration(minutes: 10);

  final Duration _interval;
  final Battery _battery = Battery();

  Timer? _timer;
  bool _capturing = false;

  /// Consecutive transient timeouts. A single indoor miss is normal; a run of
  /// them means capture is effectively down and is escalated to a gap.
  int _consecutiveTimeouts = 0;
  static const int _timeoutsBeforeGap = 3;
  // Device id is stable for the process — resolve once at start, not per fix,
  // to avoid a secure-storage read every interval.
  String? _deviceId;
  void Function(LocationPing ping)? _onPing;
  void Function(TrackingFailureReason reason, int? batteryLevel)? _onFailure;
  void Function()? _onRecovered;

  /// True while capture is known to be unavailable, so the gap is reported
  /// once rather than on every tick.
  bool _inFailureState = false;

  bool get isRunning => _timer != null;

  /// Starts periodic capture. Fires one fix immediately, then one per
  /// [interval]. Idempotent — a second call while running is a no-op.
  /// [onFailure] fires when capture is genuinely unavailable (location off,
  /// permission revoked, or repeated timeouts) and [onRecovered] when a fix
  /// succeeds again after such a spell — together they bracket a tracking gap.
  Future<void> start({
    required void Function(LocationPing ping) onPing,
    void Function(TrackingFailureReason reason, int? batteryLevel)? onFailure,
    void Function()? onRecovered,
  }) async {
    if (_timer != null) return;
    _onPing = onPing;
    _onFailure = onFailure;
    _onRecovered = onRecovered;
    _deviceId = await sl<DeviceIdentity>().getOrCreate();

    await _capture();
    _timer = Timer.periodic(_interval, (_) => _capture());
  }

  Future<void> stop() async {
    _timer?.cancel();
    _timer = null;
    _onPing = null;
    _onFailure = null;
    _onRecovered = null;
    _deviceId = null;
    _capturing = false;
    _consecutiveTimeouts = 0;
    _inFailureState = false;
  }

  Future<void> _capture() async {
    // Guard against overlap: a slow fix must not stack onto the next tick.
    if (_capturing) return;
    _capturing = true;
    try {
      // Check the service and permission before asking for a fix: both fail as
      // generic exceptions otherwise, and "the employee switched location off"
      // must be distinguishable from "the fix timed out indoors".
      if (!await Geolocator.isLocationServiceEnabled()) {
        await _reportFailure(TrackingFailureReason.locationDisabled);
        return;
      }
      final permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        await _reportFailure(TrackingFailureReason.permissionDenied);
        return;
      }

      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          // Bound the fix so a cold GPS lock can't hang the timer indefinitely.
          timeLimit: Duration(seconds: 30),
        ),
      );

      final now = DateTime.now();

      int? battery;
      try {
        battery = await _battery.batteryLevel;
      } catch (_) {
        battery = null; // battery read is best-effort
      }

      final ping = LocationPing(
        // clientRef scopes to device + capture instant so retried uploads dedupe.
        clientRef: 'ping-$_deviceId-${now.microsecondsSinceEpoch}',
        latitude: pos.latitude,
        longitude: pos.longitude,
        capturedAt: now,
        accuracy: pos.accuracy,
        speed: pos.speed,
        batteryLevel: battery,
        provider: pos.isMocked ? 'mock' : 'gps',
      );
      _onPing?.call(ping);

      // A successful fix ends any gap that was open.
      _consecutiveTimeouts = 0;
      if (_inFailureState) {
        _inFailureState = false;
        _onRecovered?.call();
      }
    } catch (_) {
      // A timeout is usually transient (indoors, cold start). Only a sustained
      // run of them means capture is actually down — otherwise every building
      // an operator walks into would open a gap.
      _consecutiveTimeouts++;
      if (_consecutiveTimeouts >= _timeoutsBeforeGap) {
        await _reportFailure(TrackingFailureReason.fixTimeout);
      }
    } finally {
      _capturing = false;
    }
  }

  /// Reports a capture failure once per spell, with the battery level so an
  /// admin reviewing a low-battery exemption has the evidence.
  Future<void> _reportFailure(TrackingFailureReason reason) async {
    if (_inFailureState) return;
    _inFailureState = true;

    int? battery;
    try {
      battery = await _battery.batteryLevel;
    } catch (_) {
      battery = null;
    }

    _onFailure?.call(reason, battery);
  }
}
