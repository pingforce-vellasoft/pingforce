import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../../domain/entities/attendance_session.dart';
import '../../domain/repositories/attendance_repository.dart';
import '../datasources/attendance_remote_data_source.dart';

class AttendanceRepositoryImpl implements AttendanceRepository {
  final AttendanceRemoteDataSource remoteDataSource;

  AttendanceRepositoryImpl({
    required this.remoteDataSource,
  });

  @override
  Future<Either<Failure, bool>> isDeviceRegistered() async {
    // In a real scenario, check secure storage to see if the private key exists
    return const Right(true); 
  }

  @override
  Future<Either<Failure, void>> registerDevice(String publicKey) async {
    try {
      await remoteDataSource.registerDevice(publicKey);
      return const Right(null);
    } catch (e) {
      return const Left(ServerFailure('Failed to register device'));
    }
  }

  @override
  Future<Either<Failure, AttendanceSession>> punch(
      double latitude, double longitude, String cryptographicSignature) async {
    try {
      final remoteSession = await remoteDataSource.punch(
        latitude,
        longitude,
        cryptographicSignature,
      );
      return Right(remoteSession);
    } catch (e) {
      return const Left(ServerFailure('Failed to record punch. Geofence violation or spoofing detected.'));
    }
  }
}
