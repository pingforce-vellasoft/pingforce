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
import 'features/auth/domain/usecases/signup_command.dart';
import 'features/auth/domain/usecases/google_auth_command.dart';
import 'features/auth/presentation/bloc/auth_bloc.dart';
import 'core/network/token_interceptor.dart';
import 'core/hardware/hardware_service.dart';
import 'core/hardware/hardware_service_impl.dart';

final sl = GetIt.instance;

Future<void> init() async {
  // --- Core ---
  sl.registerLazySingleton(() => const FlutterSecureStorage());
  sl.registerLazySingleton(() => LocalAuthentication());
  sl.registerLazySingleton<HardwareService>(() => HardwareServiceImpl());
  
  sl.registerLazySingleton(() {
    // Note: If testing locally, use 'http://10.0.2.2:3000' for emulator
    // Or run 'adb reverse tcp:3000 tcp:3000' and use 'http://localhost:3000'
    // For Production / Staging, use the real OCI Server IP (NGINX will forward this to 3000):
    final dio = Dio(BaseOptions(baseUrl: 'http://140.245.248.107'));
    dio.interceptors.add(TokenInterceptor(secureStorage: sl()));
    return dio;
  });

  // --- Features: Auth ---
  sl.registerFactory(() => AuthBloc(
    loginCommand: sl(),
    signupCommand: sl(),
    googleAuthCommand: sl(),
    authRepository: sl(),
  ));
  sl.registerLazySingleton(() => LoginCommand(sl()));
  sl.registerLazySingleton(() => SignupCommand(sl()));
  sl.registerLazySingleton(() => GoogleAuthCommand(sl()));
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
