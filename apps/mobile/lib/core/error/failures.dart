import 'package:equatable/equatable.dart';

abstract class Failure extends Equatable {
  final String message;

  const Failure(this.message);

  @override
  List<Object> get props => [message];
}

// General Failures
class ServerFailure extends Failure {
  const ServerFailure(super.message);
}

class CacheFailure extends Failure {
  const CacheFailure(super.message);
}

class NetworkFailure extends Failure {
  const NetworkFailure(super.message);
}

class BiometricFailure extends Failure {
  const BiometricFailure(super.message);
}

class LocationFailure extends Failure {
  const LocationFailure(super.message);
}

/// The punch was refused because this device is not registered/trusted.
/// Typed so the check-in flow can trigger register+retry without pattern
/// matching on server message text, which is not a stable contract.
class UntrustedDeviceFailure extends Failure {
  const UntrustedDeviceFailure(super.message);
}
