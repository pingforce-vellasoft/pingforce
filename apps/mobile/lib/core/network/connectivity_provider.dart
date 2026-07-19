import 'dart:async';
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
  // Re-check interval in seconds (poll while offline to detect recovery)
  static const _pollIntervalSec = 15;
  Timer? _pollTimer;

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
    // TODO: Replace with connectivity_plus stream listener:
    //
    //   Connectivity().onConnectivityChanged.listen((result) {
    //     _update();
    //   });
    //
    // For now, we do an initial check and then poll.
    _update();
    _pollTimer = Timer.periodic(
      const Duration(seconds: _pollIntervalSec),
      (_) => _update(),
    );
  }

  void _stopMonitoring() {
    _pollTimer?.cancel();
    _pollTimer = null;
  }

  Future<void> _update() async {
    final (isOnline, type) = await _checkConnectivity();
    final previous = state;

    final newStatus =
        isOnline ? ConnectivityStatus.online : ConnectivityStatus.offline;

    state = ConnectivityState(
      status: newStatus,
      lastOnlineAt: isOnline ? DateTime.now() : previous.lastOnlineAt,
      connectionType: isOnline ? type : null,
    );
  }

  /// TODO: Replace stub with real connectivity_plus check.
  /// Install: flutter pub add connectivity_plus
  ///
  /// ```dart
  /// import 'package:connectivity_plus/connectivity_plus.dart';
  ///
  /// Future<(bool, String?)> _checkConnectivity() async {
  ///   final result = await Connectivity().checkConnectivity();
  ///   if (result == ConnectivityResult.none) return (false, null);
  ///   final type = switch (result) {
  ///     ConnectivityResult.wifi     => 'wifi',
  ///     ConnectivityResult.mobile   => 'mobile',
  ///     ConnectivityResult.ethernet => 'ethernet',
  ///     _                           => 'other',
  ///   };
  ///   return (true, type);
  /// }
  /// ```
  Future<(bool, String?)> _checkConnectivity() async {
    // Stub: assume online. Replace with real implementation above.
    await Future<void>.delayed(const Duration(milliseconds: 50));
    return (true, 'wifi');
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
final connectivityTransitionProvider =
    StreamProvider<ConnectivityStatus>((ref) async* {
  ConnectivityStatus? previous;
  while (true) {
    final current = ref.watch(connectivityProvider).status;
    if (previous != null && previous != current) {
      yield current;
    }
    previous = current;
    await Future<void>.delayed(const Duration(seconds: 1));
  }
});
