import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../entities/attendance_session.dart';

abstract class AttendanceRepository {
  /// Checks if the device is registered for the current user.
  Future<Either<Failure, bool>> isDeviceRegistered();

  /// Registers the device's public key with the backend.
  Future<Either<Failure, void>> registerDevice(String publicKey);

  /// Performs a Geofenced + Biometric Punch (In or Out).
  Future<Either<Failure, AttendanceSession>> punch(
    double latitude, 
    double longitude, 
    String cryptographicSignature,
  );
}
