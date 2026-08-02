import 'package:get_it/get_it.dart';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:local_auth/local_auth.dart';

import 'features/attendance/data/datasources/attendance_remote_data_source.dart';
import 'features/attendance/data/repositories/attendance_repository_impl.dart';
import 'features/attendance/domain/repositories/attendance_repository.dart';
import 'features/attendance/domain/usecases/get_today_query.dart';
import 'features/attendance/domain/usecases/punch_command.dart';
import 'features/devices/data/devices_remote_data_source.dart';
import 'features/auth/data/datasources/auth_remote_data_source.dart';
import 'features/auth/data/repositories/auth_repository_impl.dart';
import 'features/auth/domain/repositories/auth_repository.dart';
import 'features/auth/domain/usecases/login_command.dart';
import 'features/auth/domain/usecases/signup_command.dart';
import 'features/auth/domain/usecases/google_auth_command.dart';
import 'features/auth/domain/usecases/onboard_tenant_command.dart';
import 'features/auth/domain/usecases/onboard_employee_command.dart';
import 'core/network/token_interceptor.dart';
import 'core/hardware/hardware_service.dart';
import 'core/hardware/hardware_service_impl.dart';
import 'core/hardware/device_identity.dart';
import 'core/notifications/push_notifications_service.dart';
import 'features/faults/data/faults_remote_data_source.dart';
import 'features/network_map/data/network_map_remote_data_source.dart';
import 'features/visits/data/visits_remote_data_source.dart';
import 'features/profile/data/profile_remote_data_source.dart';
import 'features/attendance/data/datasources/attendance_history_remote_data_source.dart';
import 'features/dashboard/data/datasources/dashboard_remote_data_source.dart';
import 'features/dashboard/data/repositories/dashboard_repository_impl.dart';
import 'features/dashboard/domain/repositories/dashboard_repository.dart';
import 'features/leave/data/datasources/leave_remote_data_source.dart';
import 'features/leave/data/repositories/leave_repository_impl.dart';
import 'features/leave/domain/repositories/leave_repository.dart';
import 'features/notifications/data/datasources/notification_remote_data_source.dart';
import 'features/notifications/data/repositories/notification_repository_impl.dart';
import 'features/notifications/domain/repositories/notification_repository.dart';
import 'features/attendance_admin/data/datasources/attendance_admin_remote_data_source.dart';
import 'features/attendance_admin/data/repositories/attendance_admin_repository_impl.dart';
import 'features/attendance_admin/domain/repositories/attendance_admin_repository.dart';
import 'features/customers/data/datasources/customer_remote_data_source.dart';
import 'features/customers/data/repositories/customer_repository_impl.dart';
import 'features/customers/domain/repositories/customer_repository.dart';
import 'features/devices/data/datasources/device_admin_remote_data_source.dart';
import 'features/devices/data/repositories/device_admin_repository_impl.dart';
import 'features/devices/domain/repositories/device_admin_repository.dart';
import 'features/employees/data/datasources/employee_remote_data_source.dart';
import 'features/employees/data/repositories/employee_repository_impl.dart';
import 'features/employees/domain/repositories/employee_repository.dart';
import 'features/geofences/data/datasources/geofence_remote_data_source.dart';
import 'features/geofences/data/repositories/geofence_repository_impl.dart';
import 'features/geofences/domain/repositories/geofence_repository.dart';
import 'features/tracking/data/datasources/tracking_remote_data_source.dart';
import 'features/tracking/data/location_tracking_service.dart';

final sl = GetIt.instance;

Future<void> init() async {
  // --- Core ---
  sl.registerLazySingleton(() => const FlutterSecureStorage());
  sl.registerLazySingleton(() => LocalAuthentication());
  sl.registerLazySingleton<HardwareService>(() => HardwareServiceImpl());
  sl.registerLazySingleton(() => DeviceIdentity(sl()));
  
  sl.registerLazySingleton(() {
    // Note: If testing locally, use 'http://10.0.2.2:3000' for emulator
    // Or run 'adb reverse tcp:3000 tcp:3000' and use 'http://localhost:3000'
    // For Production / Staging, use the real OCI Server IP (NGINX will forward this to 3000):
    const baseUrl = 'https://api.pingforce.in';
    final dio = Dio(BaseOptions(baseUrl: baseUrl));
    dio.interceptors.add(TokenInterceptor(secureStorage: sl(), baseUrl: baseUrl));
    return dio;
  });

  sl.registerLazySingleton(
    () => PushNotificationsService(dio: sl(), deviceIdentity: sl()),
  );

  // --- Features: Auth ---
  sl.registerLazySingleton(() => LoginCommand(sl()));
  sl.registerLazySingleton(() => SignupCommand(sl()));
  sl.registerLazySingleton(() => GoogleAuthCommand(sl()));
  sl.registerLazySingleton(() => OnboardTenantCommand(sl()));
  sl.registerLazySingleton(() => OnboardEmployeeCommand(sl()));
  sl.registerLazySingleton<AuthRepository>(
    () => AuthRepositoryImpl(remoteDataSource: sl(), secureStorage: sl()),
  );
  sl.registerLazySingleton<AuthRemoteDataSource>(
    () => AuthRemoteDataSourceImpl(dio: sl()),
  );

  // --- Features: Attendance ---
  // Use Cases
  sl.registerLazySingleton(() => PunchCommand(sl()));
  sl.registerLazySingleton(() => GetTodayQuery(sl()));

  // Repository
  sl.registerLazySingleton<DevicesRemoteDataSource>(
    () => DevicesRemoteDataSourceImpl(dio: sl()),
  );

  sl.registerLazySingleton<AttendanceRepository>(
    () => AttendanceRepositoryImpl(remoteDataSource: sl(), deviceIdentity: sl()),
  );

  // Data sources
  sl.registerLazySingleton<AttendanceRemoteDataSource>(
    () => AttendanceRemoteDataSourceImpl(dio: sl()),
  );

  // --- Features: Faults ---
  sl.registerLazySingleton<FaultsRemoteDataSource>(
    () => FaultsRemoteDataSourceImpl(dio: sl()),
  );

  // --- Features: Visits ---
  sl.registerLazySingleton<VisitsRemoteDataSource>(
    () => VisitsRemoteDataSourceImpl(dio: sl()),
  );

  // --- Features: Connection Map (3.7) ---
  sl.registerLazySingleton<NetworkMapRemoteDataSource>(
    () => NetworkMapRemoteDataSourceImpl(dio: sl()),
  );

  // --- Features: Profile ---
  sl.registerLazySingleton<ProfileRemoteDataSource>(
    () => ProfileRemoteDataSourceImpl(dio: sl()),
  );

  // --- Features: Attendance History ---
  sl.registerLazySingleton<AttendanceHistoryRemoteDataSource>(
    () => AttendanceHistoryRemoteDataSourceImpl(dio: sl()),
  );

  // --- Features: Dashboard (Home) ---
  sl.registerLazySingleton<DashboardRemoteDataSource>(
    () => DashboardRemoteDataSourceImpl(dio: sl()),
  );
  sl.registerLazySingleton<DashboardRepository>(
    () => DashboardRepositoryImpl(remoteDataSource: sl()),
  );

  // --- Features: Leave ---
  sl.registerLazySingleton<LeaveRemoteDataSource>(
    () => LeaveRemoteDataSourceImpl(dio: sl()),
  );
  sl.registerLazySingleton<LeaveRepository>(
    () => LeaveRepositoryImpl(remoteDataSource: sl()),
  );

  // --- Features: Notifications ---
  sl.registerLazySingleton<NotificationRemoteDataSource>(
    () => NotificationRemoteDataSourceImpl(dio: sl()),
  );
  sl.registerLazySingleton<NotificationRepository>(
    () => NotificationRepositoryImpl(remoteDataSource: sl()),
  );

  // --- Features: Geofences ---
  sl.registerLazySingleton<GeofenceRemoteDataSource>(
    () => GeofenceRemoteDataSourceImpl(dio: sl()),
  );
  sl.registerLazySingleton<GeofenceRepository>(
    () => GeofenceRepositoryImpl(remoteDataSource: sl()),
  );

  // --- Features: Employees (admin workforce management) ---
  sl.registerLazySingleton<EmployeeRemoteDataSource>(
    () => EmployeeRemoteDataSourceImpl(dio: sl()),
  );
  sl.registerLazySingleton<EmployeeRepository>(
    () => EmployeeRepositoryImpl(remoteDataSource: sl()),
  );

  // --- Features: Customers (admin account management) ---
  sl.registerLazySingleton<CustomerRemoteDataSource>(
    () => CustomerRemoteDataSourceImpl(dio: sl()),
  );
  sl.registerLazySingleton<CustomerRepository>(
    () => CustomerRepositoryImpl(remoteDataSource: sl()),
  );

  // --- Features: Device administration (admin-side binding management) ---
  sl.registerLazySingleton<DeviceAdminRemoteDataSource>(
    () => DeviceAdminRemoteDataSourceImpl(dio: sl()),
  );
  sl.registerLazySingleton<DeviceAdminRepository>(
    () => DeviceAdminRepositoryImpl(remoteDataSource: sl()),
  );

  // --- Features: Attendance admin (tenant-wide reporting) ---
  sl.registerLazySingleton<AttendanceAdminRemoteDataSource>(
    () => AttendanceAdminRemoteDataSourceImpl(dio: sl()),
  );
  sl.registerLazySingleton<AttendanceAdminRepository>(
    () => AttendanceAdminRepositoryImpl(remoteDataSource: sl()),
  );

  // --- Features: Tracking (background field-operator location) ---
  sl.registerLazySingleton<TrackingRemoteDataSource>(
    () => TrackingRemoteDataSourceImpl(dio: sl()),
  );
  // Factory: each tracking session owns a fresh stream subscription.
  sl.registerFactory(() => LocationTrackingService());
}
