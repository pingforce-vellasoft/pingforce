import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:permission_handler/permission_handler.dart';

import '../../../core/auth/auth_session.dart';
import '../../../core/hardware/background_location_permission.dart';
import '../../../core/navigation/nav_destinations.dart';
import '../../../core/theme/theme.dart';
import '../../../injection_container.dart';

// ─────────────────────────────────────────────────────────────────────────────
// PERMISSIONS FLOW SCREEN  (AUDIT §20 — Missing Screens)
// ─────────────────────────────────────────────────────────────────────────────
//
// Shown after tenant resolution and authentication, before the home screen,
// if any critical permissions are not yet granted.
//
// Permissions covered (in priority order):
//   1. Location (GPS) — CRITICAL: required for check-in
//   2. Camera        — HIGH: required for selfie check-in, document capture
//   3. Notifications — HIGH: required for alerts and reminders
//   4. Storage       — MEDIUM: required for document download
//   5. Microphone    — LOW: required for voice notes (if feature flag enabled)
//
// UX design:
//   • One permission per screen (full-screen, focused)
//   • Explains WHY the permission is needed (not just what)
//   • "Allow" → triggers native permission dialog
//   • "Not Now" → skips this permission, continues flow
//   • "Can't continue without GPS" warning for critical permissions
//   • Denied state shows system settings deep-link
//   • Progress bar shows how many steps remain

// ── Permission definition ──────────────────────────────────────────────────

enum AppPermission {
  location,
  camera,
  notifications,
  storage,
  microphone,
}

extension AppPermissionX on AppPermission {
  String get title => switch (this) {
        AppPermission.location => 'Location Access',
        AppPermission.camera => 'Camera Access',
        AppPermission.notifications => 'Push Notifications',
        AppPermission.storage => 'Storage Access',
        AppPermission.microphone => 'Microphone Access',
      };

  String get subtitle => switch (this) {
        AppPermission.location =>
          'GPS location is needed to verify your attendance check-ins and log visit sites accurately.',
        AppPermission.camera =>
          'Camera access lets you take a selfie for check-in verification and capture photos for fault reports.',
        AppPermission.notifications =>
          'Stay on top of your work with real-time alerts for new faults, shift reminders, and approvals.',
        AppPermission.storage =>
          'Required to download and view documents, reports, and attachments offline.',
        AppPermission.microphone =>
          'Record voice notes directly on fault reports and visit logs for faster documentation.',
      };

  String get benefit => switch (this) {
        AppPermission.location => 'Enables GPS check-in & visit tracking',
        AppPermission.camera => 'Enables photo evidence & selfie verification',
        AppPermission.notifications => 'Never miss a fault alert or update',
        AppPermission.storage => 'View files and reports offline',
        AppPermission.microphone => 'Voice notes on fault reports',
      };

  IconData get icon => switch (this) {
        AppPermission.location => Icons.location_on_rounded,
        AppPermission.camera => Icons.camera_alt_rounded,
        AppPermission.notifications => Icons.notifications_rounded,
        AppPermission.storage => Icons.folder_rounded,
        AppPermission.microphone => Icons.mic_rounded,
      };

  bool get isCritical => switch (this) {
        AppPermission.location => true,
        _ => false,
      };

  Color get accentColor => switch (this) {
        AppPermission.location => const Color(0xFF1565C0),
        AppPermission.camera => const Color(0xFF6A1B9A),
        AppPermission.notifications => const Color(0xFFBF360C),
        AppPermission.storage => const Color(0xFF2E7D32),
        AppPermission.microphone => const Color(0xFF00695C),
      };
}

// ── Permission status ──────────────────────────────────────────────────────

enum PermissionGrantStatus { unknown, granted, denied, permanentlyDenied }

// ── State ──────────────────────────────────────────────────────────────────

class _PermState {
  final AppPermission permission;
  final PermissionGrantStatus status;
  final bool isRequesting;

  const _PermState({
    required this.permission,
    this.status = PermissionGrantStatus.unknown,
    this.isRequesting = false,
  });

  _PermState copyWith({
    PermissionGrantStatus? status,
    bool? isRequesting,
  }) =>
      _PermState(
        permission: permission,
        status: status ?? this.status,
        isRequesting: isRequesting ?? this.isRequesting,
      );
}

// ─────────────────────────────────────────────────────────────────────────────
// PERMISSIONS FLOW SCREEN
// ─────────────────────────────────────────────────────────────────────────────

class PermissionsFlowScreen extends StatefulWidget {
  const PermissionsFlowScreen({
    super.key,
    // Only request permissions the app actually uses and declares in the
    // manifest. Camera, storage and microphone are not requested: the features
    // behind them (photo capture, offline document download, voice notes) are
    // not implemented yet and the permissions are not declared, so requesting
    // them returns permanentlyDenied and dead-ends onboarding. Add each back
    // here together with its manifest entry when its feature ships.
    this.permissions = const [
      AppPermission.location,
      AppPermission.notifications,
    ],
  });

  /// Which permissions to request (injected by tenant config or feature flags)
  final List<AppPermission> permissions;

  @override
  State<PermissionsFlowScreen> createState() => _PermissionsFlowScreenState();
}

class _PermissionsFlowScreenState extends State<PermissionsFlowScreen>
    with TickerProviderStateMixin {
  int _currentIndex = 0;
  final List<_PermState> _states = [];

  late final AnimationController _entryCtrl;
  late final Animation<double> _entryFade;
  late final Animation<Offset> _entrySlide;

  @override
  void initState() {
    super.initState();
    // Location (GPS) is only requested for field roles — they are the only
    // logins that check in / are tracked. Office roles (manager, admin) never
    // do geolocation attendance, so drop the Location step for them entirely
    // rather than prompting for a permission the app will never use.
    final isFieldRole =
        AppUserRoleX.fromRoleCode(AuthSession.instance.roleCode).isFieldRole;
    final scoped = widget.permissions.where(
      (p) => p != AppPermission.location || isFieldRole,
    );
    _states.addAll(
      scoped.map((p) => _PermState(permission: p)),
    );
    _entryCtrl = AnimationController(
      vsync: this,
      duration: AppDurations.normal,
    )..forward();

    _entryFade = CurvedAnimation(parent: _entryCtrl, curve: Curves.easeOut);
    _entrySlide = Tween<Offset>(
      begin: const Offset(0, 0.08),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _entryCtrl, curve: Curves.easeOut));

    // No permissions to request for this role/config (e.g. a non-field role
    // whose only configured permission is Location, filtered out above). The
    // card-based UI indexes _states[_currentIndex] and divides by
    // _states.length, so an empty list would RangeError to a blank screen and
    // never mark the flow seen — trapping the user on /permissions forever.
    // Mark it seen and continue straight to home instead.
    if (_states.isEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) unawaited(_finishAndGoHome());
      });
    }
  }

  @override
  void dispose() {
    _entryCtrl.dispose();
    super.dispose();
  }

  /// Field roles are subject to background tracking; office roles (manager,
  /// admin) are not and so are never shown the "Allow all the time" prompt.
  bool get _isFieldRole =>
      AppUserRoleX.fromRoleCode(AuthSession.instance.roleCode).isFieldRole;

  AppPermission get _current => _states[_currentIndex].permission;
  _PermState get _currentState => _states[_currentIndex];

  /// Maps an app permission to its OS permission(s). Location returns two: the
  /// foreground grant, then background ("Allow all the time") — Android 11+
  /// requires requesting background separately, only after foreground is held.
  List<Permission> _osPermissions(AppPermission p) => switch (p) {
        AppPermission.location => [
            Permission.locationWhenInUse,
            Permission.locationAlways,
          ],
        AppPermission.camera => [Permission.camera],
        AppPermission.notifications => [Permission.notification],
        AppPermission.storage => [Permission.storage],
        AppPermission.microphone => [Permission.microphone],
      };

  PermissionGrantStatus _mapStatus(PermissionStatus s) {
    if (s.isGranted || s.isLimited) return PermissionGrantStatus.granted;
    if (s.isPermanentlyDenied || s.isRestricted) {
      return PermissionGrantStatus.permanentlyDenied;
    }
    return PermissionGrantStatus.denied;
  }

  Future<void> _requestPermission() async {
    setState(() {
      _states[_currentIndex] =
          _currentState.copyWith(isRequesting: true);
    });

    final perms = _osPermissions(_current);

    // Request the primary (foreground) permission first.
    final result = _mapStatus(await perms.first.request());

    // For location, escalate to background only if foreground was granted.
    // A denied "Allow all the time" still leaves foreground tracking usable,
    // so we don't downgrade the overall result on background denial.
    //
    // Google Play policy requires a prominent in-app disclosure shown BEFORE
    // the background-location system dialog, describing background collection
    // in its own right and allowing the user to decline. Requesting
    // locationAlways without it is grounds for rejection.
    // Escalate to background location only for field roles — office roles
    // (manager, admin) are never tracked, so they must not see the "Allow all
    // the time" prompt here. Field roles get the shared acquisition path, which
    // shows the Play prominent disclosure before the OS dialog (same helper the
    // in-context check-in gate uses, so the disclosure text stays single-sourced).
    if (result == PermissionGrantStatus.granted &&
        perms.length > 1 &&
        _isFieldRole) {
      if (!mounted) return;
      await BackgroundLocationPermission.ensure(context);
    }

    if (!mounted) return;

    setState(() {
      _states[_currentIndex] = _currentState.copyWith(
        isRequesting: false,
        status: result,
      );
    });

    await Future<void>.delayed(const Duration(milliseconds: 400));
    if (mounted && result == PermissionGrantStatus.granted) _advance();
  }

  void _skipPermission() {
    if (_current.isCritical) {
      // Show warning dialog for critical permissions
      _showCriticalWarning();
      return;
    }
    setState(() {
      _states[_currentIndex] =
          _currentState.copyWith(status: PermissionGrantStatus.denied);
    });
    _advance();
  }

  void _advance() {
    if (_currentIndex < _states.length - 1) {
      setState(() => _currentIndex++);
      _entryCtrl.forward(from: 0);
    } else {
      // All permissions processed — record the flow as seen (device-local) so
      // the router does not bounce back here, then go home. Marking happens
      // regardless of grant outcome: this flow is skippable and the check-in
      // gate re-requests background location in-context later.
      unawaited(_finishAndGoHome());
    }
  }

  Future<void> _finishAndGoHome() async {
    await AuthSession.instance
        .markPermissionsFlowSeen(sl<FlutterSecureStorage>());
    if (!mounted) return;
    context.go('/home');
  }

  void _openSettings() {
    unawaited(openAppSettings());
  }

  void _showCriticalWarning() {
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        icon: Icon(
          Icons.warning_amber_rounded,
          color: Theme.of(context).colorScheme.error,
          size: 36,
        ),
        title: const Text('GPS is Required'),
        content: const Text(
          'Location access is required for GPS check-in verification. '
          'Without it, you won\'t be able to clock in or log site visits.\n\n'
          'You can enable it later in Settings.',
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              setState(() {
                _states[_currentIndex] = _currentState.copyWith(
                    status: PermissionGrantStatus.denied);
              });
              _advance();
            },
            child: const Text('Skip Anyway'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.pop(ctx);
              _requestPermission();
            },
            child: const Text('Allow GPS'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Empty flow (handled in initState → _finishAndGoHome): render a neutral
    // placeholder for the one frame before the post-frame redirect fires, rather
    // than indexing an empty _states list.
    if (_states.isEmpty) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final isDenied =
        _currentState.status == PermissionGrantStatus.permanentlyDenied;

    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      body: SafeArea(
        child: Column(
          children: [
            // ── Progress bar ─────────────────────────────────────────────
            LinearProgressIndicator(
              value: (_currentIndex + 1) / _states.length,
              minHeight: 4,
              backgroundColor:
                  Theme.of(context).colorScheme.surfaceContainerHigh,
              color: _current.accentColor,
            ),

            Expanded(
              child: FadeTransition(
                opacity: _entryFade,
                child: SlideTransition(
                  position: _entrySlide,
                  child: Padding(
                    padding: AppSpacing.screenPaddingAll,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const SizedBox(height: AppSpacing.space6),

                        // ── Step counter ────────────────────────────────
                        Text(
                          'Step ${_currentIndex + 1} of ${_states.length}',
                          style: AppTypography.labelMedium.copyWith(
                            color: Theme.of(context)
                                .colorScheme
                                .onSurfaceVariant,
                          ),
                        ),

                        const SizedBox(height: AppSpacing.space5),

                        // ── Permission icon ─────────────────────────────
                        Center(
                          child: Container(
                            width: 96,
                            height: 96,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: _current.accentColor.withValues(alpha: 0.12),
                              border: Border.all(
                                color:
                                    _current.accentColor.withValues(alpha: 0.3),
                                width: 1.5,
                              ),
                            ),
                            child: Icon(
                              _current.icon,
                              size: AppIconSize.xl + 8,
                              color: _current.accentColor,
                            ),
                          ),
                        ),

                        const SizedBox(height: AppSpacing.space5),

                        // ── Title ───────────────────────────────────────
                        Text(
                          _current.title,
                          textAlign: TextAlign.center,
                          style: AppTypography.headlineSmall.copyWith(
                            color:
                                Theme.of(context).colorScheme.onSurface,
                          ),
                        ),

                        const SizedBox(height: AppSpacing.space3),

                        // ── Explanation ─────────────────────────────────
                        Text(
                          _current.subtitle,
                          textAlign: TextAlign.center,
                          style: AppTypography.bodyLarge.copyWith(
                            color: Theme.of(context)
                                .colorScheme
                                .onSurfaceVariant,
                            height: 1.5,
                          ),
                        ),

                        const SizedBox(height: AppSpacing.space4),

                        // ── Benefit chip ─────────────────────────────────
                        Center(
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 14,
                              vertical: 6,
                            ),
                            decoration: BoxDecoration(
                              color:
                                  _current.accentColor.withValues(alpha: 0.10),
                              borderRadius: AppRadius.pillAll,
                              border: Border.all(
                                color: _current.accentColor.withValues(alpha: 0.3),
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.check_circle_outline_rounded,
                                  size: 16,
                                  color: _current.accentColor,
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  _current.benefit,
                                  style: AppTypography.labelMedium.copyWith(
                                    color: _current.accentColor,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),

                        const Spacer(),

                        // ── Permanently denied state ─────────────────────
                        if (isDenied) ...[
                          _DeniedBanner(
                            permission: _current,
                            onOpenSettings: _openSettings,
                          ),
                          const SizedBox(height: AppSpacing.space3),
                        ],

                        // ── Granted state ────────────────────────────────
                        if (_currentState.status ==
                            PermissionGrantStatus.granted) ...[
                          Container(
                            padding: const EdgeInsets.all(AppSpacing.space3),
                            decoration: BoxDecoration(
                              color: PingForceColors.statusSuccessContainer,
                              borderRadius: AppRadius.mdAll,
                            ),
                            child: Row(
                              children: [
                                const Icon(
                                  Icons.check_circle_rounded,
                                  color: PingForceColors.statusSuccess,
                                ),
                                const SizedBox(width: AppSpacing.space2),
                                Text(
                                  '${_current.title} allowed ✓',
                                  style: AppTypography.labelMedium.copyWith(
                                    color: PingForceColors.statusSuccess,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: AppSpacing.space3),
                        ],

                        // ── Primary CTA ──────────────────────────────────
                        if (_currentState.status !=
                            PermissionGrantStatus.granted) ...[
                          SizedBox(
                            height: 52,
                            child: FilledButton.icon(
                              style: FilledButton.styleFrom(
                                backgroundColor: _current.accentColor,
                              ),
                              onPressed: _currentState.isRequesting
                                  ? null
                                  : isDenied
                                      ? _openSettings
                                      : _requestPermission,
                              icon: _currentState.isRequesting
                                  ? SizedBox(
                                      width: 18,
                                      height: 18,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: Colors.white,
                                      ),
                                    )
                                  : Icon(
                                      isDenied
                                          ? Icons.settings_rounded
                                          : _current.icon,
                                    ),
                              label: Text(
                                _currentState.isRequesting
                                    ? 'Requesting…'
                                    : isDenied
                                        ? 'Open Settings'
                                        : 'Allow ${_current.title}',
                              ),
                            ),
                          ),

                          const SizedBox(height: AppSpacing.space2),

                          // Not Now / Skip
                          if (!_current.isCritical || isDenied)
                            Center(
                              child: TextButton(
                                onPressed: _currentState.isRequesting
                                    ? null
                                    : _skipPermission,
                                child: Text(
                                  _current.isCritical
                                      ? 'Continue without GPS'
                                      : 'Not now',
                                  style: AppTypography.labelMedium.copyWith(
                                    color: Theme.of(context)
                                        .colorScheme
                                        .onSurfaceVariant,
                                  ),
                                ),
                              ),
                            )
                          else
                            Center(
                              child: TextButton(
                                onPressed: _currentState.isRequesting
                                    ? null
                                    : _skipPermission,
                                child: const Text('Not now'),
                              ),
                            ),
                        ],

                        const SizedBox(height: AppSpacing.space4),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Denied banner ──────────────────────────────────────────────────────────

class _DeniedBanner extends StatelessWidget {
  const _DeniedBanner({
    required this.permission,
    required this.onOpenSettings,
  });
  final AppPermission permission;
  final VoidCallback onOpenSettings;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.space3),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.errorContainer,
        borderRadius: AppRadius.mdAll,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.block_rounded,
                size: AppIconSize.sm,
                color: Theme.of(context).colorScheme.onErrorContainer,
              ),
              const SizedBox(width: AppSpacing.space2),
              Text(
                'Permission Denied',
                style: AppTypography.labelMedium.copyWith(
                  color: Theme.of(context).colorScheme.onErrorContainer,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.space1),
          Text(
            'You previously denied ${permission.title}. '
            'Please enable it in your device settings.',
            style: AppTypography.bodySmall.copyWith(
              color: Theme.of(context)
                  .colorScheme
                  .onErrorContainer
                  .withValues(alpha: 0.85),
            ),
          ),
        ],
      ),
    );
  }
}
