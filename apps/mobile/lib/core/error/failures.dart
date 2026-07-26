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

/// The punch was refused because no geofence is assigned to this employee
/// (API `GEOFENCE-001`). Distinct from being outside a geofence: moving cannot
/// fix it, only an admin assigning a work location can, so the UI must offer
/// the "contact your administrator" path rather than "move closer".
class NoGeofenceAssignedFailure extends Failure {
  const NoGeofenceAssignedFailure(super.message);
}

/// An assignment was rejected because the employees already belong to another
/// geofence and the tenant allows only one per employee. Carries the
/// conflicting names so the caller can confirm a move and retry with
/// `reassign`.
class GeofenceConflictFailure extends Failure {
  final List<String> conflictDescriptions;

  const GeofenceConflictFailure(super.message, this.conflictDescriptions);

  @override
  List<Object> get props => [message, conflictDescriptions];
}
