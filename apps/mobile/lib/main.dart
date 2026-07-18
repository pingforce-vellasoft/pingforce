import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';

import 'core/navigation/app_router.dart';
import 'core/navigation/deep_link_service.dart';
import 'core/notifications/push_notifications_service.dart';
import 'core/theme/theme.dart';
import 'injection_container.dart' as di;

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize local DB for offline caching & optimization
  await Hive.initFlutter();

  // Setup Dependency Injection (Service Locator)
  await di.init();

  // Firebase / FCM — fail-soft, never blocks boot
  await di.sl<PushNotificationsService>().initialize();

  runApp(const ProviderScope(child: PingForceApp()));
}

class PingForceApp extends ConsumerStatefulWidget {
  const PingForceApp({super.key});

  @override
  ConsumerState<PingForceApp> createState() => _PingForceAppState();
}

class _PingForceAppState extends ConsumerState<PingForceApp> {
  @override
  void initState() {
    super.initState();
    // Start listening for the invite deep link once the router exists. Handled
    // after the first frame so any launch link routes over a mounted navigator.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final router = ref.read(routerProvider);
      ref.read(deepLinkServiceProvider(router)).init();
    });
  }

  @override
  Widget build(BuildContext context) {
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
