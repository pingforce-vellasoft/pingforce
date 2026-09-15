import 'package:equatable/equatable.dart';

class AttendancePolicy extends Equatable {
  const AttendancePolicy({
    required this.gpsRequired,
    required this.geofenceEnabled,
    required this.geofencePolicy,
    required this.biometricRequired,
    required this.allowLowAccuracy,
    required this.accuracyThresholdMeters,
    required this.allowOfflineCheckIn,
    required this.checkInMethods,
    required this.mockLocationPolicy,
  });

  final bool gpsRequired;
  final bool geofenceEnabled;
  final String geofencePolicy;
  final bool biometricRequired;
  final bool allowLowAccuracy;
  final double accuracyThresholdMeters;
  final bool allowOfflineCheckIn;
  final List<String> checkInMethods;
  final String mockLocationPolicy;

  @override
  List<Object> get props => [
    gpsRequired,
    geofenceEnabled,
    geofencePolicy,
    biometricRequired,
    allowLowAccuracy,
    accuracyThresholdMeters,
    allowOfflineCheckIn,
    checkInMethods,
    mockLocationPolicy,
  ];
}
