import 'package:dartz/dartz.dart';
import 'package:dio/dio.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/hardware/device_identity.dart';
import '../../../../core/hardware/device_signing_key.dart';
import '../../../devices/data/devices_remote_data_source.dart';
import '../../domain/entities/attendance_policy.dart';
import '../../domain/entities/attendance_session.dart';
import '../../domain/entities/attendance_today.dart';
import '../../domain/repositories/attendance_repository.dart';
import '../datasources/attendance_remote_data_source.dart';

class AttendanceRepositoryImpl implements AttendanceRepository {
  final AttendanceRemoteDataSource remoteDataSource;
  final DeviceIdentity deviceIdentity;
  final DeviceSigningKey deviceSigningKey;
  final DevicesRemoteDataSource devicesRemoteDataSource;
  bool _signingKeyPrepared = false;

  AttendanceRepositoryImpl({
    required this.remoteDataSource,
    required this.deviceIdentity,
    required this.deviceSigningKey,
    required this.devicesRemoteDataSource,
  });

  /// Turns a thrown error into a Failure that says what actually went wrong.
  ///
  /// The API returns `{ message }` (or `{ message: [...] }` from the global
  /// ValidationPipe) on 4xx, so a refused punch already carries a precise
  /// reason — geofence violation, spoofed location, debounce window, invalid
  /// state transition. Surfacing it verbatim beats guessing: the previous
  /// blanket "geofence violation or spoofing detected" was reported for every
  /// failure including timeouts and 500s, which made real faults undiagnosable.
  Failure _mapError(Object e, String fallback) {
    if (e is DioException) {
      switch (e.type) {
        case DioExceptionType.connectionTimeout:
        case DioExceptionType.sendTimeout:
        case DioExceptionType.receiveTimeout:
          return const NetworkFailure(
            'The server took too long to respond. Check your connection and try again.',
          );
        case DioExceptionType.connectionError:
          return const NetworkFailure(
            'Cannot reach the server. Check your internet connection.',
          );
        default:
          break;
      }

      final status = e.response?.statusCode;
      final data = e.response?.data;

      String? serverMessage;
      String? errorCode;
      if (data is Map<String, dynamic>) {
        final message = data['message'];
        if (message is String && message.isNotEmpty) {
          serverMessage = message;
        } else if (message is List && message.isNotEmpty) {
          serverMessage = message.join('\n');
        }
        final code = data['errorCode'];
        if (code is String && code.isNotEmpty) errorCode = code;
      } else if (data is String && data.isNotEmpty) {
        serverMessage = data;
      }

      // Device-trust refusal gets its own Failure type so the screen can offer
      // the device-change route. Keyed on the server's stable `errorCode`; the
      // status+message match is a fallback for older API builds that predate
      // the code, since matching human-readable text breaks whenever the
      // wording or the error body shape changes.
      //
      // DEVICE-007 (nothing bound to the account) lands here too: both end at
      // the same place for the employee — this handset cannot punch until an
      // admin binds it.
      final isUntrustedDevice =
          errorCode == 'UNTRUSTED_DEVICE' ||
          errorCode == 'DEVICE-007' ||
          (status == 401 &&
              (serverMessage ?? '').toLowerCase().contains('untrusted device'));
      if (isUntrustedDevice) {
        return UntrustedDeviceFailure(
          serverMessage ?? 'This device is not registered.',
        );
      }

      // No geofence assigned to this employee. Typed separately from a normal
      // geofence rejection because the remedy is different: the employee
      // cannot fix it by moving, only an admin assigning them a work location
      // can, so the screen must not tell them to walk closer.
      if (errorCode == 'GEOFENCE-001') {
        return NoGeofenceAssignedFailure(
          serverMessage ??
              'No work location is assigned to your account. Contact your administrator.',
        );
      }

      // Auth failures are checked before the server message: NestJS always
      // sets `message`, and on a 401 that message is the bare "Unauthorized",
      // which tells the employee nothing. Returning the actionable sign-in
      // text here is the point of this branch — ordering it after the generic
      // message passthrough made it unreachable.
      if (status == 401 || status == 403) {
        return const ServerFailure(
          'You are not authorised to perform this action. Sign in again.',
        );
      }

      if (serverMessage != null) {
        return ServerFailure(serverMessage);
      }

      if (status != null && status >= 500) {
        return const ServerFailure(
          'The server encountered an error. Please try again shortly.',
        );
      }
    }

    return ServerFailure(fallback);
  }

  @override
  Future<Either<Failure, bool>> isDeviceRegistered() async {
    try {
      final result = await devicesRemoteDataSource.getMyDevice();
      return Right(result['device'] != null);
    } catch (e) {
      return Left(_mapError(e, 'Could not verify this device binding.'));
    }
  }

  @override
  Future<Either<Failure, void>> prepareDeviceSigning() async {
    if (_signingKeyPrepared) return const Right(null);
    try {
      final deviceId = await deviceIdentity.getOrCreate();
      final publicKey = await deviceSigningKey.publicKey();
      await devicesRemoteDataSource.upgradeSigningKey(deviceId, publicKey);
      _signingKeyPrepared = true;
      return const Right(null);
    } catch (e) {
      return Left(_mapError(e, 'Could not prepare secure attendance signing.'));
    }
  }

  @override
  Future<Either<Failure, AttendancePolicy>> getPolicy() async {
    try {
      final json = await remoteDataSource.getPolicy();
      return Right(
        AttendancePolicy(
          gpsRequired: json['gpsRequired'] as bool? ?? true,
          geofenceEnabled: json['geofenceEnabled'] as bool? ?? true,
          geofencePolicy: json['geofencePolicy'] as String? ?? 'BLOCK',
          biometricRequired: json['biometricRequired'] as bool? ?? false,
          allowLowAccuracy: json['allowLowAccuracy'] as bool? ?? false,
          accuracyThresholdMeters:
              (json['accuracyThresholdMeters'] as num?)?.toDouble() ?? 50,
          allowOfflineCheckIn: json['allowOfflineCheckIn'] as bool? ?? true,
          checkInMethods: (json['checkInMethods'] as List<dynamic>? ?? const [])
              .whereType<String>()
              .toList(growable: false),
          mockLocationPolicy: json['mockLocationPolicy'] as String? ?? 'BLOCK',
        ),
      );
    } catch (e) {
      return Left(_mapError(e, 'Could not load the attendance policy.'));
    }
  }

  @override
  Future<Either<Failure, AttendanceSession>> punch(
    double latitude,
    double longitude,
    double accuracy,
    bool isMockLocation,
    bool biometricVerified,
  ) async {
    try {
      final prepared = await prepareDeviceSigning();
      final signingFailure = prepared.fold<Failure?>(
        (failure) => failure,
        (_) => null,
      );
      if (signingFailure != null) return Left(signingFailure);
      final deviceId = await deviceIdentity.getOrCreate();
      final timestamp = DateTime.now().toUtc();
      final signature = await deviceSigningKey.signPunch(
        deviceId: deviceId,
        timestamp: timestamp,
        latitude: latitude,
        longitude: longitude,
        accuracy: accuracy,
        isMockLocation: isMockLocation,
        biometricVerified: biometricVerified,
      );
      final remoteSession = await remoteDataSource.punch(
        deviceId,
        timestamp,
        latitude,
        longitude,
        accuracy,
        isMockLocation,
        biometricVerified,
        signature,
      );
      return Right(remoteSession);
    } catch (e) {
      return Left(_mapError(e, 'Failed to record punch. Please try again.'));
    }
  }

  @override
  Future<Either<Failure, AttendanceToday>> getToday() async {
    try {
      return Right(await remoteDataSource.getToday());
    } catch (e) {
      return Left(_mapError(e, 'Could not load today\'s attendance.'));
    }
  }
}
