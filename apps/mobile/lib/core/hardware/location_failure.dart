/// Why a location request could not be satisfied.
///
/// Callers branch on this to decide what recovery the user is offered:
/// [permissionDenied] can be re-requested in-app, [permissionDeniedForever]
/// and [serviceDisabled] can only be resolved in the OS settings screens.
enum LocationFailureKind {
  /// The OS location toggle (GPS) is off. Cannot be enabled programmatically —
  /// the user must flip it in system settings.
  serviceDisabled,

  /// Permission refused this time; the app may prompt again.
  permissionDenied,

  /// Permission refused permanently (or blocked by policy). Only the app
  /// settings screen can restore it.
  permissionDeniedForever,

  /// A fix could not be acquired in time and no cached position existed.
  unavailable,
}

/// Typed location error so the UI does not have to match on message strings.
class LocationFailure implements Exception {
  const LocationFailure(this.kind, this.message);

  final LocationFailureKind kind;
  final String message;

  @override
  String toString() => 'LocationFailure($kind): $message';
}
