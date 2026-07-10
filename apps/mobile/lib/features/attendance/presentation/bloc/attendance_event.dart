import 'package:equatable/equatable.dart';

abstract class AttendanceEvent extends Equatable {
  const AttendanceEvent();

  @override
  List<Object> get props => [];
}

class RegisterDeviceEvent extends AttendanceEvent {
  final String publicKey;
  const RegisterDeviceEvent({required this.publicKey});
  @override
  List<Object> get props => [publicKey];
}

class PunchEvent extends AttendanceEvent {
  final double latitude;
  final double longitude;
  final String cryptographicSignature;

  const PunchEvent({
    required this.latitude,
    required this.longitude,
    required this.cryptographicSignature,
  });

  @override
  List<Object> get props => [latitude, longitude, cryptographicSignature];
}
