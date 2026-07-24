import 'package:flutter/foundation.dart';
import 'dart:async';

import 'package:flutter_foreground_task/flutter_foreground_task.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/sync/sync_provider.dart';
import '../../../core/sync/sync_state.dart';
import '../../../injection_container.dart';
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
  });

  final bool isActive;
  final String? sessionId;
  final DateTime? lastPingAt;
  final int pingsQueued;

  TrackingState copyWith({
    bool? isActive,
    String? sessionId,
    DateTime? lastPingAt,
    int? pingsQueued,
  }) =>
      TrackingState(
        isActive: isActive ?? this.isActive,
        sessionId: sessionId ?? this.sessionId,
        lastPingAt: lastPingAt ?? this.lastPingAt,
        pingsQueued: pingsQueued ?? this.pingsQueued,
      );
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
    unawaited(_service!.start(onPing: _enqueuePing));
    state = state.copyWith(isActive: true, sessionId: sessionId);
  }

  Future<void> stop() async {
    await _service?.stop();
    _service = null;
    await FlutterForegroundTask.stopService();
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
