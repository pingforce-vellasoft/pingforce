import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

// ─────────────────────────────────────────────────────────────────────────────
// CONNECTIVITY SERVICE  (AUDIT §13 — offline mode UX)
// ─────────────────────────────────────────────────────────────────────────────
//
// Abstracts network detection so screens never import connectivity_plus
// directly. Replace _checkRealConnectivity() with the actual
// connectivity_plus implementation when the package is added.
//
// Usage:
//   final isOnline = ref.watch(isOnlineProvider);
//   final connectivity = ref.watch(connectivityProvider);

// ── Connectivity status enum ───────────────────────────────────────────────

enum ConnectivityStatus {
  online,
  offline,
  unknown,
}

// ── Connectivity state ─────────────────────────────────────────────────────

class ConnectivityState {
  const ConnectivityState({
    required this.status,
    this.lastOnlineAt,
    this.connectionType, // 'wifi' | 'mobile' | 'ethernet' | null
  });

  final ConnectivityStatus status;
  final DateTime? lastOnlineAt;
  final String? connectionType;

  bool get isOnline => status == ConnectivityStatus.online;
  bool get isOffline => status == ConnectivityStatus.offline;

  ConnectivityState copyWith({
    ConnectivityStatus? status,
    DateTime? lastOnlineAt,
    String? connectionType,
  }) {
    return ConnectivityState(
      status: status ?? this.status,
      lastOnlineAt: lastOnlineAt ?? this.lastOnlineAt,
      connectionType: connectionType ?? this.connectionType,
    );
  }

  @override
  String toString() =>
      'ConnectivityState(status: $status, type: $connectionType)';

  // Value equality so an unchanged connectivity poll does NOT emit a "new"
  // state every 15s. Without this, each poll builds a fresh object that
  // Riverpod treats as changed, rebuilding the whole shell + dashboard on a
  // timer (the app "blinks"). `lastOnlineAt` is deliberately excluded — it
  // ticks every poll and would defeat the purpose; only status + type matter
  // to the UI.
  @override
  bool operator ==(Object other) =>
      other is ConnectivityState &&
      other.status == status &&
      other.connectionType == connectionType;

  @override
  int get hashCode => Object.hash(status, connectionType);
}

// ── Connectivity Notifier ──────────────────────────────────────────────────

class ConnectivityNotifier extends Notifier<ConnectivityState> {
  // Re-check interval in seconds (poll as a backstop; the stream drives
  // transitions in real time — background tracking depends on prompt
  // offline→online flushes of buffered pings).
  static const _pollIntervalSec = 15;
  Timer? _pollTimer;
  StreamSubscription<List<ConnectivityResult>>? _sub;

  @override
  ConnectivityState build() {
    // Start monitoring on first build
    _startMonitoring();
    // Cleanup on dispose
    ref.onDispose(_stopMonitoring);
    return const ConnectivityState(status: ConnectivityStatus.unknown);
  }

  // ── Public API ─────────────────────────────────────────────────────────

  Future<void> checkNow() async {
    await _update();
  }

  // ── Internal ────────────────────────────────────────────────────────────

  void _startMonitoring() {
    // Real-time transitions via the platform stream, plus a slow poll as a
    // backstop (some OEMs miss stream events after a long doze).
    _sub = Connectivity().onConnectivityChanged.listen((results) {
      _applyResults(results);
    });
    _update();
    _pollTimer = Timer.periodic(
      const Duration(seconds: _pollIntervalSec),
      (_) => _update(),
    );
  }

  void _stopMonitoring() {
    _pollTimer?.cancel();
    _pollTimer = null;
    _sub?.cancel();
    _sub = null;
  }

  Future<void> _update() async {
    try {
      _applyResults(await Connectivity().checkConnectivity());
    } catch (_) {
      // Platform check failed — leave the last known state rather than
      // flapping the whole app offline on a transient plugin error.
    }
  }

  /// Maps a connectivity_plus result set to our state. `checkConnectivity`
  /// and the change stream both yield a `List<ConnectivityResult>` (v6+):
  /// online when any interface other than `none` is present.
  void _applyResults(List<ConnectivityResult> results) {
    final online = results.any((r) => r != ConnectivityResult.none);
    final previous = state;

    state = ConnectivityState(
      status: online ? ConnectivityStatus.online : ConnectivityStatus.offline,
      lastOnlineAt: online ? DateTime.now() : previous.lastOnlineAt,
      connectionType: online ? _typeLabel(results) : null,
    );
  }

  String _typeLabel(List<ConnectivityResult> results) {
    if (results.contains(ConnectivityResult.wifi)) return 'wifi';
    if (results.contains(ConnectivityResult.mobile)) return 'mobile';
    if (results.contains(ConnectivityResult.ethernet)) return 'ethernet';
    return 'other';
  }
}

// ── Providers ──────────────────────────────────────────────────────────────

/// Full connectivity state (status, type, last-online timestamp)
final connectivityProvider =
    NotifierProvider<ConnectivityNotifier, ConnectivityState>(
  ConnectivityNotifier.new,
);

/// Convenience: just true/false — use this in widgets that only need to
/// show/hide the offline banner.
final isOnlineProvider = Provider<bool>((ref) {
  return ref.watch(connectivityProvider).isOnline;
});

/// Convenience: only emits when connectivity *transitions* (online→offline
/// or offline→online). Use this to show NetworkRecoveryOverlay.
///
/// Event-driven: emits only when `connectivityProvider` actually changes.
/// (An earlier `while (true)` + `ref.watch` + 1s delay version re-ran the whole
/// stream on every emit and ticked forever, rebuilding listeners on a timer.)
final connectivityTransitionProvider =
    StreamProvider<ConnectivityStatus>((ref) {
  final controller = StreamController<ConnectivityStatus>();
  var previous = ref.read(connectivityProvider).status;

  final sub = ref.listen<ConnectivityState>(connectivityProvider, (_, next) {
    if (next.status != previous) {
      previous = next.status;
      controller.add(next.status);
    }
  });

  ref.onDispose(() {
    sub.close();
    controller.close();
  });

  return controller.stream;
});
