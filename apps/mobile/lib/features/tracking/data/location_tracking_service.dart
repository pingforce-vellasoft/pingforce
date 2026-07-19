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

/// Owns the raw location stream for background field-operator tracking. It
/// throttles the OS position stream to one fix per [interval] and hands each
/// fix to [onPing]. It does NOT touch the sync queue directly — the controller
/// wires [onPing] to the queue so this class stays testable and isolate-safe.
class LocationTrackingService {
  LocationTrackingService({Duration? interval})
      : _interval = interval ?? const Duration(seconds: 60);

  final Duration _interval;
  final Battery _battery = Battery();

  StreamSubscription<Position>? _sub;
  DateTime? _lastEmit;
  void Function(LocationPing ping)? _onPing;

  bool get isRunning => _sub != null;

  /// Begins listening to the OS location stream. A distance filter plus a time
  /// throttle keep it near one fix/minute without spinning the GPS when the
  /// operator is stationary.
  void start({required void Function(LocationPing ping) onPing}) {
    if (_sub != null) return;
    _onPing = onPing;
    _lastEmit = null;

    const settings = LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 25,
    );
    _sub = Geolocator.getPositionStream(locationSettings: settings)
        .listen(_onPosition, onError: (_) {/* transient GPS error — skip */});
  }

  Future<void> stop() async {
    await _sub?.cancel();
    _sub = null;
    _onPing = null;
    _lastEmit = null;
  }

  Future<void> _onPosition(Position pos) async {
    final now = DateTime.now();
    // Time throttle: the distance filter can still fire faster than we want
    // when the operator is moving; cap uploads to one per interval.
    if (_lastEmit != null && now.difference(_lastEmit!) < _interval) return;
    _lastEmit = now;

    int? battery;
    try {
      battery = await _battery.batteryLevel;
    } catch (_) {
      battery = null; // battery read is best-effort
    }

    final deviceId = await sl<DeviceIdentity>().getOrCreate();
    final ping = LocationPing(
      // clientRef scopes to device + capture instant so retried uploads dedupe.
      clientRef: 'ping-$deviceId-${now.microsecondsSinceEpoch}',
      latitude: pos.latitude,
      longitude: pos.longitude,
      capturedAt: now,
      accuracy: pos.accuracy,
      speed: pos.speed,
      batteryLevel: battery,
      provider: pos.isMocked ? 'mock' : 'gps',
    );
    _onPing?.call(ping);
  }
}
