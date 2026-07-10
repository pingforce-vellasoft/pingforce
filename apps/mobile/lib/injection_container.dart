import 'package:get_it/get_it.dart';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:local_auth/local_auth.dart';

import 'features/attendance/data/datasources/attendance_remote_data_source.dart';
import 'features/attendance/data/repositories/attendance_repository_impl.dart';
import 'features/attendance/domain/repositories/attendance_repository.dart';
import 'features/attendance/domain/usecases/punch_command.dart';
import 'features/attendance/domain/usecases/register_device_command.dart';
import 'features/attendance/presentation/bloc/attendance_bloc.dart';
import 'features/auth/data/datasources/auth_remote_data_source.dart';
import 'features/auth/data/repositories/auth_repository_impl.dart';
import 'features/auth/domain/repositories/auth_repository.dart';
import 'features/auth/domain/usecases/login_command.dart';
import 'features/auth/presentation/bloc/auth_bloc.dart';
import 'core/network/token_interceptor.dart';

final sl = GetIt.instance;

Future<void> init() async {
  // --- Core ---
  sl.registerLazySingleton(() => const FlutterSecureStorage());
  sl.registerLazySingleton(() => LocalAuthentication());
  
  sl.registerLazySingleton(() {
    final dio = Dio(BaseOptions(baseUrl: 'http://localhost:3000'));
    dio.interceptors.add(TokenInterceptor(secureStorage: sl()));
    return dio;
  });

  // --- Features: Auth ---
  sl.registerFactory(() => AuthBloc(
    loginCommand: sl(),
    authRepository: sl(),
  ));
  sl.registerLazySingleton(() => LoginCommand(sl()));
  sl.registerLazySingleton<AuthRepository>(
    () => AuthRepositoryImpl(remoteDataSource: sl(), secureStorage: sl()),
  );
  sl.registerLazySingleton<AuthRemoteDataSource>(
    () => AuthRemoteDataSourceImpl(dio: sl()),
  );

  // --- Features: Attendance ---
  // Bloc
  sl.registerFactory(() => AttendanceBloc(
    punchCommand: sl(),
    registerDeviceCommand: sl(),
  ));

  // Use Cases
  sl.registerLazySingleton(() => PunchCommand(sl()));
  sl.registerLazySingleton(() => RegisterDeviceCommand(sl()));

  // Repository
  sl.registerLazySingleton<AttendanceRepository>(
    () => AttendanceRepositoryImpl(remoteDataSource: sl()),
  );

  // Data sources
  sl.registerLazySingleton<AttendanceRemoteDataSource>(
    () => AttendanceRemoteDataSourceImpl(dio: sl()),
  );
}
