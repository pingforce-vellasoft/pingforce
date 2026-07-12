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
  Future<Either<Failure, User>> login(String email, String password) async {
    try {
      final responseData = await remoteDataSource.login(email, password);
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
    final token = responseData['access_token'];
    
    // Create a mock user model since our backend only returns the token for now
    // In Sprint 4/5 we should modify the backend to return user details with the token
    final userData = responseData['user'] ?? {
      'id': 'temp_id',
      'email': 'user@example.com',
      'firstName': 'PingForce',
      'lastName': 'User',
      'role': 'EMPLOYEE_FIELD_STAFF',
      'tenantId': 'temp_tenant'
    };
    
    if (token == null) return const Left(ServerFailure('Invalid server response'));

    // Securely store token (Hardness)
    await secureStorage.write(key: 'jwt_token', value: token);
    
    final user = UserModel.fromJson(userData);
    
    // Cache user info securely
    await secureStorage.write(key: 'user_cache', value: jsonEncode(userData));

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
}
