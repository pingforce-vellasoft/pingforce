import 'dart:convert';
import 'package:dartz/dartz.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../../../core/error/failures.dart';
import '../../domain/entities/user.dart';
import '../../domain/repositories/auth_repository.dart';
import '../datasources/auth_remote_data_source.dart';
import '../models/user_model.dart';

class AuthRepositoryImpl implements AuthRepository {
  final AuthRemoteDataSource remoteDataSource;
  final FlutterSecureStorage secureStorage;

  AuthRepositoryImpl({
    required this.remoteDataSource,
    required this.secureStorage,
  });

  @override
  Future<Either<Failure, User>> login(String email, String password, String tenantCode) async {
    try {
      final responseData = await remoteDataSource.login(email, password, tenantCode);
      return _processAuthResponse(responseData);
    } catch (e) {
      return const Left(ServerFailure('Invalid email or password.'));
    }
  }

  @override
  Future<Either<Failure, User>> signup(
    String email,
    String password,
  ) async {
    try {
      final responseData = await remoteDataSource.signup(email, password);
      return _processAuthResponse(responseData);
    } catch (e) {
      return Left(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Either<Failure, User>> googleAuth(String idToken) async {
    try {
      final responseData = await remoteDataSource.googleAuth(idToken);
      return _processAuthResponse(responseData);
    } catch (e) {
      return const Left(ServerFailure('Google Authentication failed.'));
    }
  }

  Future<Either<Failure, User>> _processAuthResponse(Map<String, dynamic> responseData) async {
    final token = responseData['access_token'] ?? responseData['accessToken'];
    final userData = responseData['user'];
    
    if (token == null || userData == null) {
      return const Left(ServerFailure('Invalid server response: Missing token or user data'));
    }

    // Securely store token (Hardness)
    await secureStorage.write(key: 'jwt_token', value: token);
    
    final user = UserModel.fromJson(userData);
    
    // Cache user info securely
    await secureStorage.write(key: 'user_cache', value: jsonEncode(userData));
    
    // Save tenant code separately so it persists even if user logs out (for auto-filling)
    if (user.tenantCode != 'SYSTEM') {
      await secureStorage.write(key: 'tenant_code', value: user.tenantCode);
    }

    return Right(user);
  }

  @override
  Future<Either<Failure, User?>> getCachedUser() async {
    try {
      final userCache = await secureStorage.read(key: 'user_cache');
      if (userCache != null) {
        return Right(UserModel.fromJson(jsonDecode(userCache)));
      }
      return const Right(null);
    } catch (e) {
      return const Left(CacheFailure('Failed to load user cache'));
    }
  }

  @override
  Future<Either<Failure, void>> logout() async {
    try {
      await secureStorage.delete(key: 'jwt_token');
      await secureStorage.delete(key: 'user_cache');
      return const Right(null);
    } catch (e) {
      return const Left(CacheFailure('Failed to logout cleanly'));
    }
  }

  @override
  Future<Either<Failure, void>> onboardTenant(Map<String, dynamic> data) async {
    try {
      await remoteDataSource.onboardTenant(data);
      
      // Update cached user to isOnboarded = true
      final userCache = await secureStorage.read(key: 'user_cache');
      if (userCache != null) {
        final userData = jsonDecode(userCache) as Map<String, dynamic>;
        userData['isOnboarded'] = true;
        await secureStorage.write(key: 'user_cache', value: jsonEncode(userData));
      }
      return const Right(null);
    } catch (e) {
      return Left(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Either<Failure, void>> requestPasswordReset(
    String email,
    String tenantCode,
  ) async {
    try {
      await remoteDataSource.requestPasswordReset(email, tenantCode);
      return const Right(null);
    } catch (e) {
      return const Left(ServerFailure('Could not send the code. Try again.'));
    }
  }

  @override
  Future<Either<Failure, void>> confirmPasswordReset(
    String email,
    String tenantCode,
    String otp,
    String newPassword,
  ) async {
    try {
      await remoteDataSource.confirmPasswordReset(
        email,
        tenantCode,
        otp,
        newPassword,
      );
      return const Right(null);
    } catch (e) {
      return const Left(
        ServerFailure('Invalid or expired code, or the password is too weak.'),
      );
    }
  }
}
