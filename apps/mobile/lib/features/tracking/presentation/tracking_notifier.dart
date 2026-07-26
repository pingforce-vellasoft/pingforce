import 'package:flutter/foundation.dart';
import 'dart:async';

import 'package:flutter_foreground_task/flutter_foreground_task.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/hardware/device_identity.dart';
import '../../../core/sync/sync_provider.dart';
import '../../../core/sync/sync_state.dart';
import '../../../injection_container.dart';
import '../data/datasources/tracking_remote_data_source.dart';
import '../data/location_tracking_service.dart';

// ─────────────────────────────────────────────────────────────────────────────
// TRACKING NOTIFIER
//
// Background field-operator tracking. Runs ONLY while an attendance session is
// active (start on check-in, stop on check-out). Keeps the app alive in the
// background via a location foreground service, captures a fix ~every 10 min, and
// enqueues each fix onto the shared offline sync queue (SyncProvider) — so
// batching, retry/jitter, Hive persistence and offline buffering are all reused.
// ─────────────────────────────────────────────────────────────────────────────

final trackingProvider =
    NotifierProvider<TrackingNotifier, TrackingState>(TrackingNotifier.new);

/// Convenience: is the operator currently being tracked (for a status chip).
final isTrackingProvider = Provider<bool>(
  (ref) => ref.watch(trackingProvider).isActive,
);

class TrackingState {
  const TrackingState({
    this.isActive = false,
    this.sessionId,
    this.lastPingAt,
    this.pingsQueued = 0,
    this.failureReason,
  });

  final bool isActive;
  final String? sessionId;
  final DateTime? lastPingAt;
  final int pingsQueued;

  /// Set while background capture is unavailable. Drives the in-app warning —
  /// the employee is told their location has stopped being shared rather than
  /// the tracking failing silently.
  final TrackingFailureReason? failureReason;

  TrackingState copyWith({
    bool? isActive,
    String? sessionId,
    DateTime? lastPingAt,
    int? pingsQueued,
    TrackingFailureReason? failureReason,
    bool clearFailure = false,
  }) =>
      TrackingState(
        isActive: isActive ?? this.isActive,
        sessionId: sessionId ?? this.sessionId,
        lastPingAt: lastPingAt ?? this.lastPingAt,
        pingsQueued: pingsQueued ?? this.pingsQueued,
        failureReason:
            clearFailure ? null : (failureReason ?? this.failureReason),
      );

  /// Employee-facing explanation. Deliberately says what to fix and never
  /// mentions exemptions — those are granted by an admin after verifying the
  /// hardware, not self-served from this banner.
  String? get failureMessage => switch (failureReason) {
        TrackingFailureReason.locationDisabled =>
          'Location is turned off. Your work location is not being shared — '
              'turn location on to keep your shift record accurate.',
        TrackingFailureReason.permissionDenied =>
          'Location permission was revoked. Re-enable it so your shift '
              'location keeps recording.',
        TrackingFailureReason.fixTimeout =>
          'Cannot get a location fix. Move somewhere with a clearer signal.',
        null => null,
      };
}

class TrackingNotifier extends Notifier<TrackingState> {
  LocationTrackingService? _service;

  @override
  TrackingState build() {
    ref.onDispose(() => _service?.stop());
    return const TrackingState();
  }

  /// Begin tracking for [sessionId]. Idempotent — a second call for the same
  /// session is a no-op so re-entry (app resume) can't stack services.
  Future<void> start(String sessionId) async {
    if (state.isActive && state.sessionId == sessionId) return;
    if (state.isActive) await stop();

    await _startForegroundService();

    _service = sl<LocationTrackingService>();
    // Fire-and-forget: the first fix runs in the background while the UI marks
    // tracking active immediately. Errors are swallowed inside the service.
    unawaited(_service!.start(
      onPing: _enqueuePing,
      onFailure: _onCaptureFailed,
      onRecovered: _onCaptureRecovered,
    ));
    state = state.copyWith(
      isActive: true,
      sessionId: sessionId,
      clearFailure: true,
    );
  }

  /// Records the gap server-side and surfaces the warning locally.
  ///
  /// The gap POST is best-effort: if it fails (offline, server down) the
  /// employee is still warned. Losing a gap record is preferable to letting a
  /// reporting call interfere with tracking.
  void _onCaptureFailed(TrackingFailureReason reason, int? batteryLevel) {
    state = state.copyWith(failureReason: reason);

    unawaited(() async {
      try {
        await sl<TrackingRemoteDataSource>().openTrackingGap(
          reason: switch (reason) {
            TrackingFailureReason.locationDisabled => 'LOCATION_DISABLED',
            TrackingFailureReason.permissionDenied => 'PERMISSION_DENIED',
            TrackingFailureReason.fixTimeout => 'FIX_TIMEOUT',
          },
          attendanceSessionId: state.sessionId,
          batteryLevel: batteryLevel,
          deviceId: await sl<DeviceIdentity>().getOrCreate(),
        );
      } catch (e) {
        debugPrint('Failed to record tracking gap: $e');
      }
    }());
  }

  void _onCaptureRecovered() {
    state = state.copyWith(clearFailure: true);
    unawaited(() async {
      try {
        await sl<TrackingRemoteDataSource>().closeTrackingGap();
      } catch (e) {
        debugPrint('Failed to close tracking gap: $e');
      }
    }());
  }

  Future<void> stop() async {
    // Close an open gap at check-out so it does not keep accruing duration
    // after the session ends.
    final hadFailure = state.failureReason != null;
    await _service?.stop();
    _service = null;
    await FlutterForegroundTask.stopService();
    if (hadFailure) {
      try {
        await sl<TrackingRemoteDataSource>().closeTrackingGap();
      } catch (e) {
        debugPrint('Failed to close tracking gap on stop: $e');
      }
    }
    state = const TrackingState();
  }

  void _enqueuePing(LocationPing ping) {
    ref.read(syncProvider.notifier).enqueue(
          SyncQueueItem(
            id: ping.clientRef,
            module: SyncItemModule.tracking,
            entityId: ping.clientRef,
            operationType: 'create',
            description: 'Field location ping',
            queuedAt: ping.capturedAt,
            payload: ping.toPayload(),
          ),
        );
    state = state.copyWith(
      lastPingAt: ping.capturedAt,
      pingsQueued: state.pingsQueued + 1,
    );
  }

  Future<void> _startForegroundService() async {
    FlutterForegroundTask.init(
      androidNotificationOptions: AndroidNotificationOptions(
        channelId: 'pingforce_tracking',
        channelName: 'Field tracking',
        channelDescription:
            'Shares your location with your team while you are checked in.',
        onlyAlertOnce: true,
      ),
      iosNotificationOptions: const IOSNotificationOptions(),
      foregroundTaskOptions: ForegroundTaskOptions(
        eventAction: ForegroundTaskEventAction.nothing(),
        autoRunOnBoot: false,
        allowWakeLock: true,
        allowWifiLock: false,
      ),
    );

    try {
      if (await FlutterForegroundTask.isRunningService) return;
      await FlutterForegroundTask.startService(
        notificationTitle: 'On shift — sharing location',
        notificationText: 'Your location is visible to your team until check-out.',
      );
    } catch (e) {
      // If the service can't start (e.g. permission denied on some OEMs), fall
      // back to foreground-only capture rather than crashing the check-in.
      debugPrint('Foreground tracking service failed to start: $e');
    }
  }
}
