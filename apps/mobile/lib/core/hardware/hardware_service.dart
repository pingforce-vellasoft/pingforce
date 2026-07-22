import 'package:geolocator/geolocator.dart';

abstract class HardwareService {
  Future<bool> authenticateUser(String reason);

  /// Resolves permission (prompting when it has not been permanently refused),
  /// then returns a fix. Throws a `LocationFailure` describing which step
  /// blocked so the caller can offer the matching recovery.
  Future<Position> getCurrentLocation();

  /// Whether the OS location toggle is currently on.
  Future<bool> isLocationServiceEnabled();

  /// Opens the OS location settings screen. The location toggle cannot be
  /// flipped programmatically, so this is the only recovery for a disabled
  /// service. Returns whether the screen was opened.
  Future<bool> openLocationSettings();

  /// Opens this app's settings page — the only recovery once permission has
  /// been permanently denied. Returns whether the screen was opened.
  Future<bool> openAppSettings();
}
