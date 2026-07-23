import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:get_it/get_it.dart';

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

  // Optimistic: `unknown` counts as online. The notifier starts in `unknown`
  // on every build (and rebuilds when its provider is re-created), so treating
  // it as offline flashed the offline banner on the first frame of every
  // rebuild until the async platform check returned.
  bool get isOnline => status != ConnectivityStatus.offline;
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

  // How long an interface-down reading must persist before we call the app
  // offline. connectivity_plus emits a transient `[none]` during WiFi↔mobile
  // handoffs, VPN toggles and doze wakeups; without this the app flapped
  // offline/online several times a minute on a healthy connection.
  static const _offlineDebounce = Duration(seconds: 3);

  Timer? _pollTimer;
  Timer? _offlineTimer;
  StreamSubscription<List<ConnectivityResult>>? _sub;
  bool _disposed = false;

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
    _disposed = true;
    _pollTimer?.cancel();
    _pollTimer = null;
    _offlineTimer?.cancel();
    _offlineTimer = null;
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

  // ── Reachability probe ──────────────────────────────────────────────────
  //
  // connectivity_plus reports the *interface*, not whether anything is
  // actually reachable: a captive-portal WiFi, a dead AP or an unroutable
  // mobile session all still read as `wifi`/`mobile`. The probe hits the
  // unauthenticated health endpoint to confirm the link really carries
  // traffic before we trust it.
  //
  // Cost control: only runs when the answer can change something — when the
  // interface says down (confirm before going offline) or when we are already
  // offline (detect recovery). A healthy online state is left alone, so the
  // 15s poll does not turn into a 15s network request.

  static const _probeTimeout = Duration(seconds: 3);
  static const _probeMinInterval = Duration(seconds: 30);
  DateTime? _lastProbeAt;

  /// `true` if the API answered, `false` if it did not, `null` if the probe
  /// was skipped (rate-limited or no base URL configured) and the caller
  /// should fall back to the interface reading.
  Future<bool?> _probeReachable() async {
    final now = DateTime.now();
    if (_lastProbeAt != null && now.difference(_lastProbeAt!) < _probeMinInterval) {
      return null;
    }

    // Reuse the app's configured base URL, but issue the request on a bare
    // Dio: the shared instance carries TokenInterceptor, and a probe must
    // never trigger a token refresh or a logout.
    String? baseUrl;
    if (GetIt.instance.isRegistered<Dio>()) {
      final configured = GetIt.instance<Dio>().options.baseUrl;
      if (configured.isNotEmpty) baseUrl = configured;
    }
    if (baseUrl == null) return null;

    _lastProbeAt = now;
    try {
      final probe = Dio(BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: _probeTimeout,
        receiveTimeout: _probeTimeout,
        sendTimeout: _probeTimeout,
        // Any HTTP response proves the link works, even a 503 from a
        // degraded API. Only transport failures mean "unreachable".
        validateStatus: (_) => true,
      ));
      await probe.get<void>('/api/v1/health');
      return true;
    } on DioException {
      return false;
    } catch (_) {
      return false;
    }
  }

  /// Maps a connectivity_plus result set to our state. `checkConnectivity`
  /// and the change stream both yield a `List<ConnectivityResult>` (v6+):
  /// online when any interface other than `none` is present.
  ///
  /// Going online applies immediately (buffered pings should flush as soon as
  /// the link is back). Going offline is debounced by [_offlineDebounce] and
  /// then confirmed with a reachability probe, so neither a momentary `[none]`
  /// during a handoff nor a stale interface reading flips the whole app.
  void _applyResults(List<ConnectivityResult> results) {
    final linkUp = results.any((r) => r != ConnectivityResult.none);

    if (linkUp) {
      _offlineTimer?.cancel();
      _offlineTimer = null;

      if (state.isOffline) {
        // Interface came back but we last knew the network was dead — confirm
        // recovery before clearing the offline banner.
        _probeReachable().then((reachable) {
          if (reachable == false) return; // still unreachable, stay offline
          _setState(true, results);
        });
        return;
      }

      _setState(true, results);
      // Cheap background audit: catches captive portals and dead APs where
      // the interface stays up but nothing routes. Rate-limited internally.
      _probeReachable().then((reachable) {
        if (reachable == false) _setState(false, const []);
      });
      return;
    }

    // Already waiting on a pending offline confirmation — let it run out.
    if (_offlineTimer != null) return;
    _offlineTimer = Timer(_offlineDebounce, () async {
      _offlineTimer = null;
      // Interface says down. Probe anyway — some OEMs under-report during
      // doze. Only a confirmed failure (or a skipped probe) goes offline.
      final reachable = await _probeReachable();
      if (reachable == true) return;
      _setState(false, const []);
    });
  }

  void _setState(bool online, List<ConnectivityResult> results) {
    // Probe callbacks are async and can land after the provider is disposed;
    // writing `state` then throws.
    if (_disposed) return;
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
