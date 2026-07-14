import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';

import 'core/navigation/app_router.dart';
import 'core/theme/theme.dart';
import 'injection_container.dart' as di;

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize local DB for offline caching & optimization
  await Hive.initFlutter();
  
  // Setup Dependency Injection (Service Locator)
  await di.init();
  
  runApp(const ProviderScope(child: PingForceApp()));
}

class PingForceApp extends ConsumerWidget {
  const PingForceApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'PingForce',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: ThemeMode.system,
      routerConfig: router,
    );
  }
}
