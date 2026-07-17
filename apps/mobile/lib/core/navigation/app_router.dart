import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../navigation/app_shell.dart';
import '../../features/splash/splash_screen.dart';
import '../../features/splash/tenant_resolution_screen.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/auth/presentation/forgot_password_screen.dart';
import '../../features/auth/presentation/biometric_screen.dart';
import '../../features/onboarding/onboarding_screen.dart';
import '../../features/onboarding/permissions_flow_screen.dart';
import '../../features/system/system_screens.dart';
import '../../features/leave/leave_screen.dart';
import '../../features/documents/document_screen.dart';
import '../../features/dashboard/presentation/dashboard_screen.dart';
import '../../features/attendance/presentation/check_in/attendance_screen.dart';
import '../../features/faults/presentation/fault_list_screen.dart';
import '../../features/faults/presentation/fault_detail_screen.dart';
import '../../features/visits/presentation/visit_list_screen.dart';
import '../../features/sync/sync_monitor_screen.dart';
import '../../features/network_map/presentation/network_map_screen.dart';

// ─────────────────────────────────────────────────────────────────────────────
// APP ROUTER  (AUDIT §17 — GoRouter configuration)
// ─────────────────────────────────────────────────────────────────────────────
//
// Route tree:
//
//   /splash                   → SplashScreen
//   /auth/login               → LoginScreen
//   /auth/login/:step         → LoginScreen (step = tenant | credentials | biometric)
//   /auth/forgot-password     → ForgotPasswordScreen
//   /auth/otp                 → OtpScreen
//   /auth/session-expired     → SessionExpiredScreen
//   /maintenance              → MaintenanceModeScreen
//   /update-required          → AppUpdateScreen
//
//   (Shell)
//   /home                     → DashboardScreen
//   /attendance               → AttendanceScreen
//   /attendance/history       → AttendanceHistoryScreen
//   /attendance/correction    → CorrectionRequestScreen
//   /faults                   → FaultListScreen
//   /faults/new               → CreateFaultScreen
//   /faults/:id               → FaultDetailScreen
//   /faults/:id/attempts/new  → CreateAttemptScreen
//   /visits                   → VisitListScreen
//   /visits/new               → CreateVisitScreen
//   /visits/:id               → VisitDetailScreen
//   /leads                    → LeadListScreen
//   /leads/new                → CreateLeadScreen
//   /leads/:id                → LeadDetailScreen
//   /reports                  → ReportsDashboardScreen
//   /reports/:id              → ReportDetailScreen
//   /team                     → TeamDashboardScreen
//
//   (Modal — pushed over shell)
//   /notifications            → NotificationCenterScreen
//   /profile                  → ProfileScreen
//   /settings                 → SettingsScreen
//   /sync                     → SyncMonitorScreen
//   /leave                    → LeaveScreen
//   /documents                → DocumentsScreen
//   /announcements            → AnnouncementsScreen
//   /qr-scanner               → QrScannerScreen
//   /signature-pad            → SignaturePadScreen

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/splash',
    debugLogDiagnostics: true,
    redirect: RouteGuard.redirect,

    routes: [
      // ── Pre-auth routes ────────────────────────────────────────────────
      GoRoute(
        path: '/splash',
        name: 'splash',
        builder: (context, state) => const SplashScreen(),
      ),

      GoRoute(
        path: '/tenant-resolution',
        name: 'tenant-resolution',
        builder: (context, state) => const TenantResolutionScreen(),
      ),

      GoRoute(
        path: '/onboarding',
        name: 'onboarding',
        builder: (context, state) => const OnboardingScreen(),
      ),

      GoRoute(
        path: '/permissions',
        name: 'permissions',
        builder: (context, state) => const PermissionsFlowScreen(),
      ),

      GoRoute(
        path: '/auth/login',
        name: 'login',
        builder: (context, state) => const LoginScreen(),
      ),

      GoRoute(
        path: '/auth/biometric',
        name: 'biometric',
        builder: (context, state) => const BiometricScreen(),
      ),

      GoRoute(
        path: '/auth/forgot-password',
        name: 'forgot-password',
        builder: (context, state) => const ForgotPasswordScreen(),
      ),

      GoRoute(
        path: '/auth/session-expired',
        name: 'session-expired',
        builder: (context, state) => const SessionExpiredScreen(),
      ),

      GoRoute(
        path: '/device-registration',
        name: 'device-registration',
        builder: (context, state) => const DeviceRegistrationScreen(),
      ),

      GoRoute(
        path: '/maintenance',
        name: 'maintenance',
        builder: (context, state) => const MaintenanceModeScreen(),
      ),

      // ── Connection Map (3.7) — tenant admins and permitted employees ──
      GoRoute(
        path: '/network-map',
        name: 'network-map',
        builder: (context, state) => const NetworkMapScreen(),
      ),

      GoRoute(
        path: '/update-required',
        name: 'update-required',
        builder: (context, state) => const AppUpdateRequiredScreen(),
      ),

      // ── Shell (authenticated + bottom nav) ─────────────────────────────
      StatefulShellRoute.indexedStack(
        builder: (context, state, shell) => AppShell(navigationShell: shell),
        branches: [
          // Branch 0 — Home / Dashboard
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/home',
                name: 'home',
                builder: (context, state) => const DashboardScreen(),
              ),
            ],
          ),

          // Branch 1 — Attendance
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/attendance',
                name: 'attendance',
                builder: (context, state) => const AttendanceScreen(),
                routes: [
                  GoRoute(
                    path: 'history',
                    name: 'attendance-history',
                    builder: (context, state) =>
                        const _PlaceholderScreen(name: 'Attendance History'),
                  ),
                  GoRoute(
                    path: 'check-in',
                    name: 'check-in',
                    builder: (context, state) => const AttendanceScreen(),
                  ),
                  GoRoute(
                    path: 'correction',
                    name: 'correction-request',
                    builder: (context, state) =>
                        const _PlaceholderScreen(name: 'Correction Request'),
                  ),
                ],
              ),
            ],
          ),

          // Branch 2 — Role-specific (Faults | Visits | Leads | Team | Reports)
          // Faults branch (Technician role)
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/faults',
                name: 'faults',
                builder: (context, state) => const FaultListScreen(),
                routes: [
                  GoRoute(
                    path: 'new',
                    name: 'create-fault',
                    builder: (context, state) =>
                        const _PlaceholderScreen(name: 'Create Fault'),
                  ),
                  GoRoute(
                    path: ':faultId',
                    name: 'fault-detail',
                    builder: (context, state) {
                      final id = state.pathParameters['faultId']!;
                      return FaultDetailScreen(faultId: id);
                    },
                    routes: [
                      GoRoute(
                        path: 'attempts/new',
                        name: 'create-attempt',
                        builder: (context, state) =>
                            const _PlaceholderScreen(name: 'Add Attempt'),
                      ),
                    ],
                  ),
                ],
              ),
              // Visits (Employee role)
              GoRoute(
                path: '/visits',
                name: 'visits',
                builder: (context, state) => const VisitListScreen(),
                routes: [
                  GoRoute(
                    path: 'new',
                    name: 'create-visit',
                    builder: (context, state) =>
                        const _PlaceholderScreen(name: 'Create Visit'),
                  ),
                  GoRoute(
                    path: ':visitId',
                    name: 'visit-detail',
                    builder: (context, state) {
                      final id = state.pathParameters['visitId']!;
                      return _PlaceholderScreen(name: 'Visit $id');
                    },
                  ),
                ],
              ),
              // Leads (Sales role)
              GoRoute(
                path: '/leads',
                name: 'leads',
                builder: (context, state) =>
                    const _PlaceholderScreen(name: 'Lead List'),
                routes: [
                  GoRoute(
                    path: 'new',
                    name: 'create-lead',
                    builder: (context, state) =>
                        const _PlaceholderScreen(name: 'Create Lead'),
                  ),
                  GoRoute(
                    path: ':leadId',
                    name: 'lead-detail',
                    builder: (context, state) {
                      final id = state.pathParameters['leadId']!;
                      return _PlaceholderScreen(name: 'Lead $id');
                    },
                  ),
                ],
              ),
              // Team (Manager role)
              GoRoute(
                path: '/team',
                name: 'team',
                builder: (context, state) =>
                    const _PlaceholderScreen(name: 'Team Dashboard'),
              ),
              // Reports (Admin / Manager role)
              GoRoute(
                path: '/reports',
                name: 'reports',
                builder: (context, state) =>
                    const _PlaceholderScreen(name: 'Reports'),
                routes: [
                  GoRoute(
                    path: ':reportId',
                    name: 'report-detail',
                    builder: (context, state) {
                      final id = state.pathParameters['reportId']!;
                      return _PlaceholderScreen(name: 'Report $id');
                    },
                  ),
                ],
              ),
            ],
          ),

          // Branch 3 — More (sentinel branch, never directly shown)
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/more',
                name: 'more',
                redirect: (_, _) => '/home', // More opens a sheet, not a route
              ),
            ],
          ),
        ],
      ),

      // ── Modal routes (pushed over the shell) ───────────────────────────

      GoRoute(
        path: '/notifications',
        name: 'notifications',
        builder: (context, state) =>
            const _PlaceholderScreen(name: 'Notifications'),
      ),

      GoRoute(
        path: '/notifications/:id',
        name: 'notification-detail',
        builder: (context, state) {
          final id = state.pathParameters['id']!;
          return _PlaceholderScreen(name: 'Notification $id');
        },
      ),

      GoRoute(
        path: '/profile',
        name: 'profile',
        builder: (context, state) =>
            const _PlaceholderScreen(name: 'Profile'),
        routes: [
          GoRoute(
            path: 'change-password',
            name: 'change-password',
            builder: (context, state) =>
                const _PlaceholderScreen(name: 'Change Password'),
          ),
          GoRoute(
            path: 'sessions',
            name: 'active-sessions',
            builder: (context, state) =>
                const _PlaceholderScreen(name: 'Active Sessions'),
          ),
          GoRoute(
            path: 'login-history',
            name: 'login-history',
            builder: (context, state) =>
                const _PlaceholderScreen(name: 'Login History'),
          ),
        ],
      ),

      GoRoute(
        path: '/settings',
        name: 'settings',
        builder: (context, state) =>
            const _PlaceholderScreen(name: 'Settings'),
      ),

      GoRoute(
        path: '/sync',
        name: 'sync-monitor',
        builder: (context, state) => const SyncMonitorScreen(),
      ),

      GoRoute(
        path: '/leave',
        name: 'leave',
        builder: (context, state) => const LeaveScreen(),
      ),

      GoRoute(
        path: '/documents',
        name: 'documents',
        builder: (context, state) => const DocumentListScreen(),
      ),

      GoRoute(
        path: '/announcements',
        name: 'announcements',
        builder: (context, state) =>
            const _PlaceholderScreen(name: 'Announcements'),
        routes: [
          GoRoute(
            path: ':id',
            name: 'announcement-detail',
            builder: (context, state) {
              final id = state.pathParameters['id']!;
              return _PlaceholderScreen(name: 'Announcement $id');
            },
          ),
        ],
      ),

      // ── Utility screens (reusable across modules) ──────────────────────

      GoRoute(
        path: '/qr-scanner',
        name: 'qr-scanner',
        builder: (context, state) =>
            const _PlaceholderScreen(name: 'QR Scanner'),
      ),

      GoRoute(
        path: '/signature-pad',
        name: 'signature-pad',
        builder: (context, state) =>
            const _PlaceholderScreen(name: 'Signature Pad'),
      ),

      GoRoute(
        path: '/quick-action',
        name: 'quick-action',
        builder: (context, state) =>
            const _PlaceholderScreen(name: 'Quick Action'),
      ),
    ],

    // ── Error route (404) ─────────────────────────────────────────────────
    errorBuilder: (context, state) => Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline_rounded, size: 64),
            const SizedBox(height: 16),
            Text('Page not found', style: Theme.of(context).textTheme.titleLarge),
            Text(state.error?.message ?? state.uri.toString()),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: () => context.go('/home'),
              child: const Text('Go Home'),
            ),
          ],
        ),
      ),
    ),
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// PLACEHOLDER SCREEN  — used during development before real screens are wired
// ─────────────────────────────────────────────────────────────────────────────

class _PlaceholderScreen extends StatelessWidget {
  const _PlaceholderScreen({required this.name});
  final String name;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(name)),
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.construction_rounded,
              size: 64,
              color: Theme.of(context).colorScheme.primary,
            ),
            const SizedBox(height: 16),
            Text(
              name,
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Text(
              'Screen under development',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color:
                        Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}
