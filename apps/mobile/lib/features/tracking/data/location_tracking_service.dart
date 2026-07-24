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
class LocationTrackingService {
  LocationTrackingService({Duration? interval})
      : _interval = interval ?? const Duration(minutes: 10);

  final Duration _interval;
  final Battery _battery = Battery();

  Timer? _timer;
  bool _capturing = false;
  // Device id is stable for the process — resolve once at start, not per fix,
  // to avoid a secure-storage read every interval.
  String? _deviceId;
  void Function(LocationPing ping)? _onPing;

  bool get isRunning => _timer != null;

  /// Starts periodic capture. Fires one fix immediately, then one per
  /// [interval]. Idempotent — a second call while running is a no-op.
  Future<void> start(
      {required void Function(LocationPing ping) onPing}) async {
    if (_timer != null) return;
    _onPing = onPing;
    _deviceId = await sl<DeviceIdentity>().getOrCreate();

    await _capture();
    _timer = Timer.periodic(_interval, (_) => _capture());
  }

  Future<void> stop() async {
    _timer?.cancel();
    _timer = null;
    _onPing = null;
    _deviceId = null;
    _capturing = false;
  }

  Future<void> _capture() async {
    // Guard against overlap: a slow fix must not stack onto the next tick.
    if (_capturing) return;
    _capturing = true;
    try {
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
    } catch (_) {
      // Transient GPS error / timeout — skip this tick, try again next interval.
    } finally {
      _capturing = false;
    }
  }
}
