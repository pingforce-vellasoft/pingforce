import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'features/auth/presentation/bloc/auth_bloc.dart';
import 'features/auth/presentation/bloc/auth_event.dart';
import 'features/auth/presentation/bloc/auth_state.dart';
import 'features/auth/presentation/pages/login_screen.dart';
import 'injection_container.dart' as di;

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize local DB for O(1) reads (DSA optimization)
  await Hive.initFlutter();
  
  // Setup Dependency Injection (Service Locator)
  await di.init();
  
  runApp(const PingForceApp());
}

class PingForceApp extends StatelessWidget {
  const PingForceApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider(
          create: (_) => di.sl<AuthBloc>()..add(CheckAuthStatus()),
        ),
        BlocProvider(
          create: (_) => di.sl<AttendanceBloc>(),
        ),
      ],
      child: MaterialApp(
        title: 'PingForce',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          brightness: Brightness.dark,
          scaffoldBackgroundColor: const Color(0xFF0F172A), // Slate 900
          colorScheme: const ColorScheme.dark(
            primary: Color(0xFF6366F1), // Indigo 500
            secondary: Color(0xFF22C55E), // Green 500
            surface: Color(0xFF1E293B), // Slate 800
          ),
          fontFamily: 'Inter',
          useMaterial3: true,
        ),
        home: BlocBuilder<AuthBloc, AuthState>(
          builder: (context, state) {
            if (state is Authenticated) {
              return const PunchDashboardScreen();
            } else if (state is Unauthenticated || state is AuthError) {
              return const LoginScreen();
            }
            return const Scaffold(body: Center(child: CircularProgressIndicator()));
          },
        ),
      ),
    );
  }
}
