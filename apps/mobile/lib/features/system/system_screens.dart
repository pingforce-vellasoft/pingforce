import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/theme.dart';

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM STATE SCREENS  (AUDIT §20 — Missing Screens)
// ─────────────────────────────────────────────────────────────────────────────
//
// This file covers 4 critical system-state screens:
//
//   1. SessionExpiredScreen    — AUTH-006, clear re-login CTA
//   2. DeviceRegistrationScreen— New device security enrollment
//   3. MaintenanceModeScreen   — Backend downtime with ETA
//   4. AppUpdateRequiredScreen — Force-update with store link

// ─────────────────────────────────────────────────────────────────────────────
// 1. SESSION EXPIRED SCREEN
// ─────────────────────────────────────────────────────────────────────────────

class SessionExpiredScreen extends StatelessWidget {
  const SessionExpiredScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      body: SafeArea(
        child: Padding(
          padding: AppSpacing.screenPaddingAll,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // ── Icon ──────────────────────────────────────────────────
              Center(
                child: Container(
                  width: 96,
                  height: 96,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Theme.of(context).colorScheme.errorContainer,
                  ),
                  child: Icon(
                    Icons.lock_clock_rounded,
                    size: 48,
                    color: Theme.of(context).colorScheme.onErrorContainer,
                  ),
                ),
              ),

              const SizedBox(height: AppSpacing.space5),

              Text(
                'Session Expired',
                textAlign: TextAlign.center,
                style: AppTypography.headlineSmall.copyWith(
                  color: Theme.of(context).colorScheme.onSurface,
                ),
              ),

              const SizedBox(height: AppSpacing.space2),

              Text(
                'Your session has timed out for security reasons. '
                'Please sign in again to continue.',
                textAlign: TextAlign.center,
                style: AppTypography.bodyLarge.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                  height: 1.5,
                ),
              ),

              const SizedBox(height: AppSpacing.space4),

              // ── Info chip ─────────────────────────────────────────────
              Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: Theme.of(context)
                        .colorScheme
                        .surfaceContainerHighest,
                    borderRadius: AppRadius.pillAll,
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.info_outline_rounded,
                        size: 14,
                        color:
                            Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        'Your data is safe — nothing was lost',
                        style: AppTypography.labelSmall.copyWith(
                          color: Theme.of(context)
                              .colorScheme
                              .onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: AppSpacing.space8),

              // ── Sign in again ─────────────────────────────────────────
              SizedBox(
                height: 52,
                child: FilledButton.icon(
                  onPressed: () => context.go('/auth/login'),
                  icon: const Icon(Icons.login_rounded),
                  label: const Text('Sign In Again'),
                ),
              ),

              const SizedBox(height: AppSpacing.space3),

              // ── Use biometrics shortcut ───────────────────────────────
              OutlinedButton.icon(
                onPressed: () => context.go('/auth/biometric'),
                icon: const Icon(Icons.fingerprint_rounded),
                label: const Text('Use Biometrics'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. DEVICE REGISTRATION SCREEN
// ─────────────────────────────────────────────────────────────────────────────

class DeviceRegistrationScreen extends StatefulWidget {
  const DeviceRegistrationScreen({super.key});

  @override
  State<DeviceRegistrationScreen> createState() =>
      _DeviceRegistrationScreenState();
}

class _DeviceRegistrationScreenState extends State<DeviceRegistrationScreen> {
  bool _registering = false;
  bool _biometricEnabled = false;
  bool _enrolled = false;
  String _deviceName = 'My Phone'; // TODO: detect real device name

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      appBar: AppBar(title: const Text('Register This Device')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: AppSpacing.screenPaddingAll,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // ── Device info card ──────────────────────────────────────
              Card(
                child: Padding(
                  padding: AppSpacing.cardPaddingAll,
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 56,
                            height: 56,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: Theme.of(context)
                                  .colorScheme
                                  .primaryContainer,
                            ),
                            child: Icon(
                              Icons.smartphone_rounded,
                              size: AppIconSize.lg,
                              color:
                                  Theme.of(context).colorScheme.primary,
                            ),
                          ),
                          const SizedBox(width: AppSpacing.space3),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  _deviceName,
                                  style: AppTypography.titleSmall,
                                ),
                                Text(
                                  'Android · Model XYZ',
                                  // TODO: DeviceInfoPlugin
                                  style: AppTypography.bodySmall.copyWith(
                                    color: Theme.of(context)
                                        .colorScheme
                                        .onSurfaceVariant,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          if (_enrolled)
                            Icon(
                              Icons.verified_rounded,
                              color: PingForceColors.statusSuccess,
                            ),
                        ],
                      ),

                      // Custom device name field
                      const SizedBox(height: AppSpacing.space4),
                      TextField(
                        decoration: const InputDecoration(
                          labelText: 'Device Name',
                          hintText: 'Give this device a name',
                          prefixIcon: Icon(Icons.edit_rounded),
                        ),
                        onChanged: (v) => setState(() => _deviceName = v),
                        controller: TextEditingController(text: _deviceName),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: AppSpacing.space4),

              // ── Security options ──────────────────────────────────────
              Card(
                child: Column(
                  children: [
                    SwitchListTile(
                      secondary: const Icon(Icons.fingerprint_rounded),
                      title: const Text('Enable Biometric Sign-In'),
                      subtitle: const Text(
                          'Use fingerprint or face to unlock the app'),
                      value: _biometricEnabled,
                      onChanged: (v) =>
                          setState(() => _biometricEnabled = v),
                    ),
                    const Divider(height: 1),
                    ListTile(
                      leading: const Icon(Icons.notifications_outlined),
                      title: const Text('Enable Push Notifications'),
                      subtitle: const Text(
                          'Receive alerts for faults, approvals and reminders'),
                      trailing: Icon(
                        Icons.chevron_right_rounded,
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                      onTap: () {}, // TODO: request notification permission
                    ),
                  ],
                ),
              ),

              const SizedBox(height: AppSpacing.space4),

              // ── Security notice ───────────────────────────────────────
              Container(
                padding: const EdgeInsets.all(AppSpacing.space3),
                decoration: BoxDecoration(
                  color:
                      Theme.of(context).colorScheme.surfaceContainerLow,
                  borderRadius: AppRadius.mdAll,
                  border: Border.all(
                    color:
                        Theme.of(context).colorScheme.outlineVariant,
                  ),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      Icons.security_rounded,
                      size: AppIconSize.sm,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                    const SizedBox(width: AppSpacing.space2),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Device Security',
                            style: AppTypography.labelMedium.copyWith(
                              color:
                                  Theme.of(context).colorScheme.primary,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Your administrator can remotely remove this device '
                            'from the system at any time. Registered devices '
                            'are logged in your account\'s security history.',
                            style: AppTypography.bodySmall.copyWith(
                              color: Theme.of(context)
                                  .colorScheme
                                  .onSurfaceVariant,
                              height: 1.4,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: AppSpacing.space6),

              // ── Register button ───────────────────────────────────────
              SizedBox(
                height: 52,
                child: FilledButton.icon(
                  onPressed: _registering ? null : _register,
                  icon: _registering
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.how_to_reg_rounded),
                  label:
                      Text(_registering ? 'Registering…' : 'Register Device'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _register() async {
    setState(() => _registering = true);
    // TODO: POST /api/v1/devices/register  { deviceId, deviceName, biometricEnabled }
    await Future<void>.delayed(const Duration(milliseconds: 1200));
    if (!mounted) return;
    setState(() {
      _registering = false;
      _enrolled = true;
    });
    await Future<void>.delayed(const Duration(milliseconds: 600));
    if (mounted) context.go('/home');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. MAINTENANCE MODE SCREEN
// ─────────────────────────────────────────────────────────────────────────────

class MaintenanceModeScreen extends StatelessWidget {
  const MaintenanceModeScreen({
    super.key,
    this.estimatedMinutes,
    this.message,
  });

  final int? estimatedMinutes;
  final String? message;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      body: SafeArea(
        child: Padding(
          padding: AppSpacing.screenPaddingAll,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // ── Animated icon ─────────────────────────────────────────
              Center(
                child: _PulsingIcon(
                  icon: Icons.build_rounded,
                  color: PingForceColors.statusWarning,
                  bgColor: PingForceColors.statusWarningContainer,
                ),
              ),

              const SizedBox(height: AppSpacing.space5),

              Text(
                'Scheduled Maintenance',
                textAlign: TextAlign.center,
                style: AppTypography.headlineSmall.copyWith(
                  color: Theme.of(context).colorScheme.onSurface,
                ),
              ),

              const SizedBox(height: AppSpacing.space2),

              Text(
                message ??
                    'We\'re making improvements to PingForce. '
                        'The app will be back shortly.',
                textAlign: TextAlign.center,
                style: AppTypography.bodyLarge.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                  height: 1.5,
                ),
              ),

              if (estimatedMinutes != null) ...[
                const SizedBox(height: AppSpacing.space4),
                Center(
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: PingForceColors.statusWarningContainer,
                      borderRadius: AppRadius.pillAll,
                    ),
                    child: Text(
                      'Estimated: ~$estimatedMinutes minutes',
                      style: AppTypography.labelMedium.copyWith(
                        color: PingForceColors.statusWarning,
                      ),
                    ),
                  ),
                ),
              ],

              const SizedBox(height: AppSpacing.space8),

              OutlinedButton.icon(
                onPressed: () {
                  // TODO: Re-check maintenance status
                },
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('Check Again'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. APP UPDATE REQUIRED SCREEN
// ─────────────────────────────────────────────────────────────────────────────

class AppUpdateRequiredScreen extends StatelessWidget {
  const AppUpdateRequiredScreen({
    super.key,
    this.currentVersion = '1.0.0',
    this.requiredVersion = '1.1.0',
    this.releaseNotes,
  });

  final String currentVersion;
  final String requiredVersion;
  final String? releaseNotes;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      body: SafeArea(
        child: Padding(
          padding: AppSpacing.screenPaddingAll,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // ── Icon ──────────────────────────────────────────────────
              Center(
                child: Container(
                  width: 96,
                  height: 96,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Theme.of(context).colorScheme.primaryContainer,
                  ),
                  child: Icon(
                    Icons.system_update_rounded,
                    size: 48,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                ),
              ),

              const SizedBox(height: AppSpacing.space5),

              Text(
                'Update Required',
                textAlign: TextAlign.center,
                style: AppTypography.headlineSmall.copyWith(
                  color: Theme.of(context).colorScheme.onSurface,
                ),
              ),

              const SizedBox(height: AppSpacing.space2),

              Text(
                'A new version of PingForce is required to continue. '
                'Please update the app to access the latest features and security fixes.',
                textAlign: TextAlign.center,
                style: AppTypography.bodyLarge.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                  height: 1.5,
                ),
              ),

              const SizedBox(height: AppSpacing.space4),

              // ── Version comparison card ────────────────────────────────
              Card(
                child: Padding(
                  padding: AppSpacing.cardPaddingAll,
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          children: [
                            Text(
                              'Current',
                              style: AppTypography.labelSmall.copyWith(
                                color: Theme.of(context)
                                    .colorScheme
                                    .onSurfaceVariant,
                              ),
                            ),
                            Text(
                              'v$currentVersion',
                              style: AppTypography.titleSmall.copyWith(
                                color: Theme.of(context)
                                    .colorScheme
                                    .onSurfaceVariant,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Icon(
                        Icons.arrow_forward_rounded,
                        color:
                            Theme.of(context).colorScheme.primary,
                      ),
                      Expanded(
                        child: Column(
                          children: [
                            Text(
                              'Required',
                              style: AppTypography.labelSmall.copyWith(
                                color: Theme.of(context).colorScheme.primary,
                              ),
                            ),
                            Text(
                              'v$requiredVersion',
                              style: AppTypography.titleSmall.copyWith(
                                color:
                                    Theme.of(context).colorScheme.primary,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // ── Release notes ─────────────────────────────────────────
              if (releaseNotes != null) ...[
                const SizedBox(height: AppSpacing.space3),
                Card(
                  child: Padding(
                    padding: AppSpacing.cardPaddingAll,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          "What's new in v$requiredVersion",
                          style: AppTypography.labelMedium.copyWith(
                            color:
                                Theme.of(context).colorScheme.onSurface,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.space2),
                        Text(
                          releaseNotes!,
                          style: AppTypography.bodySmall.copyWith(
                            color: Theme.of(context)
                                .colorScheme
                                .onSurfaceVariant,
                            height: 1.5,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],

              const SizedBox(height: AppSpacing.space8),

              // ── Update CTA ────────────────────────────────────────────
              SizedBox(
                height: 52,
                child: FilledButton.icon(
                  onPressed: _openStore,
                  icon: const Icon(Icons.open_in_new_rounded),
                  label: const Text('Update Now'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _openStore() {
    // TODO: url_launcher → play store / app store URL
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED: Pulsing icon widget
// ─────────────────────────────────────────────────────────────────────────────

class _PulsingIcon extends StatefulWidget {
  const _PulsingIcon({
    required this.icon,
    required this.color,
    required this.bgColor,
  });
  final IconData icon;
  final Color color;
  final Color bgColor;

  @override
  State<_PulsingIcon> createState() => _PulsingIconState();
}

class _PulsingIconState extends State<_PulsingIcon>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _scale;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);
    _scale = Tween<double>(begin: 0.92, end: 1.08).animate(
      CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ScaleTransition(
      scale: _scale,
      child: Container(
        width: 96,
        height: 96,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: widget.bgColor,
        ),
        child: Icon(widget.icon, size: 48, color: widget.color),
      ),
    );
  }
}
