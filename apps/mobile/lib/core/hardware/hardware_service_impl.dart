import 'package:geolocator/geolocator.dart';
import 'package:local_auth/local_auth.dart';
import 'hardware_service.dart';
import 'location_failure.dart';

class HardwareServiceImpl implements HardwareService {
  final LocalAuthentication auth = LocalAuthentication();

  @override
  Future<bool> authenticateUser(String reason) async {
    try {
      final bool canAuthenticateWithBiometrics = await auth.canCheckBiometrics;
      final bool canAuthenticate =
          canAuthenticateWithBiometrics || await auth.isDeviceSupported();

      if (!canAuthenticate) {
        return false; // Device doesn't support biometrics or PIN
      }

      return await auth.authenticate(
        localizedReason: reason,
        options: const AuthenticationOptions(
          stickyAuth: true,
          biometricOnly: false,
        ),
      );
    } catch (e) {
      return false;
    }
  }

  @override
  Future<bool> openLocationSettings() => Geolocator.openLocationSettings();

  @override
  Future<bool> openAppSettings() => Geolocator.openAppSettings();

  @override
  Future<bool> isLocationServiceEnabled() =>
      Geolocator.isLocationServiceEnabled();

  @override
  Future<Position> getCurrentLocation() async {
    // Permission is resolved before the service check: asking first means a
    // user with GPS switched off still gets the grant prompt, and the caller
    // can then send them straight to the location settings screen instead of
    // hitting two blockers in sequence.
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }

    if (permission == LocationPermission.deniedForever) {
      throw const LocationFailure(
        LocationFailureKind.permissionDeniedForever,
        'Location permission is permanently denied. Enable it in app settings.',
      );
    }
    if (permission == LocationPermission.denied) {
      throw const LocationFailure(
        LocationFailureKind.permissionDenied,
        'Location permission is required to capture this position.',
      );
    }

    if (!await Geolocator.isLocationServiceEnabled()) {
      throw const LocationFailure(
        LocationFailureKind.serviceDisabled,
        'Location services are turned off on this device.',
      );
    }

    try {
      // Bounded fix: an unbounded high-accuracy request keeps the GPS radio
      // hunting indefinitely indoors — battery drain + a hung UI
      return await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 15),
        ),
      );
    } on Exception {
      // Timed out — a recent cached fix beats failing the whole flow
      final lastKnown = await Geolocator.getLastKnownPosition();
      if (lastKnown != null) return lastKnown;
      throw const LocationFailure(
        LocationFailureKind.unavailable,
        'Could not get a location fix. Move to an open area and retry.',
      );
    }
  }
}
