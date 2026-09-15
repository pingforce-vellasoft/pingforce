import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../entities/attendance_session.dart';
import '../entities/attendance_today.dart';
import '../entities/attendance_policy.dart';

abstract class AttendanceRepository {
  /// Checks if the device is registered for the current user.
  Future<Either<Failure, bool>> isDeviceRegistered();

  Future<Either<Failure, void>> prepareDeviceSigning();

  Future<Either<Failure, AttendancePolicy>> getPolicy();

  /// Registers this device's public key with the backend.

  /// Performs a Geofenced + Biometric Punch (In or Out).
  Future<Either<Failure, AttendanceSession>> punch(
    double latitude,
    double longitude,
    double accuracy,
    bool isMockLocation,
    bool biometricVerified,
  );

  /// Today's snapshot: any open session (so the screen can resume it), the
  /// day's punch history, totals and leave balances.
  Future<Either<Failure, AttendanceToday>> getToday();
}
