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
      
      final token = responseData['access_token'];
      final userData = responseData['user'];
      
      if (token == null) return const Left(ServerFailure('Invalid server response'));

      // Securely store token (Hardness)
      await secureStorage.write(key: 'jwt_token', value: token);
      
      final user = UserModel.fromJson(userData);
      
      // Cache user info securely
      await secureStorage.write(key: 'user_cache', value: jsonEncode(userData));

      return Right(user);
    } catch (e) {
      return const Left(ServerFailure('Invalid email or password.'));
    }
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
}
