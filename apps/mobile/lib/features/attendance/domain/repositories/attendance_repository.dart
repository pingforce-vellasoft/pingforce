import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../entities/attendance_session.dart';
import '../entities/attendance_today.dart';

abstract class AttendanceRepository {
  /// Checks if the device is registered for the current user.
  Future<Either<Failure, bool>> isDeviceRegistered();

  /// Registers this device's public key with the backend.

  /// Performs a Geofenced + Biometric Punch (In or Out).
  Future<Either<Failure, AttendanceSession>> punch(
    double latitude,
    double longitude,
    String cryptographicSignature,
  );

  /// Today's snapshot: any open session (so the screen can resume it), the
  /// day's punch history, totals and leave balances.
  Future<Either<Failure, AttendanceToday>> getToday();

  /// Starts a break on the open session (WORKING → ON_BREAK).
  Future<Either<Failure, void>> startBreak(String breakType);

  /// Ends the in-progress break (ON_BREAK → WORKING).
  Future<Either<Failure, void>> endBreak();
}
