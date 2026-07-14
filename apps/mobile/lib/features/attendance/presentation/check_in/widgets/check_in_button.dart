import 'package:flutter/material.dart';

import '../../../../../core/theme/theme.dart';
import '../check_in_state.dart';

// ─────────────────────────────────────────────────────────────────────────────
// CHECK-IN BUTTON  (CHECKIN_FLOW_SPEC.md §5.5)
// ─────────────────────────────────────────────────────────────────────────────

class CheckInButton extends StatefulWidget {
  const CheckInButton({
    super.key,
    required this.mode,
    this.onTap,
  });

  final CheckInButtonMode mode;
  final VoidCallback? onTap;

  @override
  State<CheckInButton> createState() => _CheckInButtonState();
}

class _CheckInButtonState extends State<CheckInButton>
    with SingleTickerProviderStateMixin {
  // Scale animation for tap feedback (CHECKIN_FLOW_SPEC.md §5.5)
  late final AnimationController _scaleController;
  late final Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _scaleController = AnimationController(
      vsync: this,
      duration: AppDurations.fast, // 100ms
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.96).animate(
      CurvedAnimation(parent: _scaleController, curve: AppEasing.accelerate),
    );
  }

  @override
  void dispose() {
    _scaleController.dispose();
    super.dispose();
  }

  // ── Build ──────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final config = _buttonConfig(context, widget.mode);

    return Semantics(
      label: config.semanticLabel,
      button: true,
      enabled: config.isEnabled,
      child: ScaleTransition(
        scale: _scaleAnimation,
        child: GestureDetector(
          onTapDown: config.isEnabled ? (_) => _scaleController.forward() : null,
          onTapUp: config.isEnabled
              ? (_) {
                  _scaleController.reverse();
                  widget.onTap?.call();
                }
              : null,
          onTapCancel: () => _scaleController.reverse(),
          child: AnimatedContainer(
            duration: AppDurations.normal, // 200ms — state change
            curve: AppEasing.standard,
            height: 56,
            decoration: BoxDecoration(
              color: config.backgroundColor,
              borderRadius: AppRadius.pillAll,
              boxShadow: config.isEnabled
                  ? AppElevation.shadowForLevel(1)
                  : [],
            ),
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                borderRadius: AppRadius.pillAll,
                splashFactory: InkSparkle.splashFactory,
                onTap: null, // Handled by GestureDetector above
                child: Padding(
                  padding: AppSpacing.buttonPaddingAll,
                  child: _buildContent(context, config),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildContent(BuildContext context, _ButtonConfig config) {
    if (widget.mode == CheckInButtonMode.submitting) {
      return Center(
        child: SizedBox(
          width: 20,
          height: 20,
          child: CircularProgressIndicator(
            strokeWidth: 2,
            color: config.foregroundColor,
          ),
        ),
      );
    }

    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (config.icon != null) ...[
          Icon(config.icon, size: AppIconSize.md, color: config.foregroundColor),
          AppSpacing.iconGapBox,
        ],
        Text(
          config.label,
          style: AppTypography.labelLarge.copyWith(
            color: config.foregroundColor,
          ),
        ),
      ],
    );
  }

  // ── Button config by mode ──────────────────────────────────────────────────

  _ButtonConfig _buttonConfig(BuildContext context, CheckInButtonMode mode) {
    final cs = Theme.of(context).colorScheme;

    return switch (mode) {
      // Loading / Initializing
      CheckInButtonMode.loading => _ButtonConfig(
          label: 'Checking requirements...',
          icon: Icons.sync_rounded,
          backgroundColor: cs.surfaceContainerHigh,
          foregroundColor: cs.onSurfaceVariant.withValues(alpha: 0.38),
          isEnabled: false,
          semanticLabel: 'Checking requirements, please wait',
        ),

      // GPS Acquiring
      CheckInButtonMode.disabled when _isGpsAcquiring => _ButtonConfig(
          label: 'Acquiring GPS...',
          icon: Icons.gps_not_fixed_rounded,
          backgroundColor: cs.surfaceContainerHigh,
          foregroundColor: cs.onSurfaceVariant.withValues(alpha: 0.38),
          isEnabled: false,
          semanticLabel: 'Acquiring GPS signal, please wait',
        ),

      // Hard disabled
      CheckInButtonMode.disabled => _ButtonConfig(
          label: _disabledLabel,
          icon: _disabledIcon,
          backgroundColor: cs.surfaceContainerHigh,
          foregroundColor: cs.onSurfaceVariant.withValues(alpha: 0.38),
          isEnabled: false,
          semanticLabel: _disabledLabel,
        ),

      // Ready — normal
      CheckInButtonMode.enabledNormal => _ButtonConfig(
          label: 'Check In',
          icon: Icons.login_rounded,
          backgroundColor: cs.primary,
          foregroundColor: cs.onPrimary,
          isEnabled: true,
          semanticLabel: 'Check in for your shift',
        ),

      // Offline
      CheckInButtonMode.enabledOffline => _ButtonConfig(
          label: 'Check In (Offline)',
          icon: Icons.cloud_off_rounded,
          backgroundColor: cs.secondary,
          foregroundColor: cs.onSecondary,
          isEnabled: true,
          semanticLabel: 'Check in offline. Will sync when connected.',
        ),

      // Override (poor GPS / outside fence allowed)
      CheckInButtonMode.enabledOverride => _ButtonConfig(
          label: 'Check In Anyway',
          icon: Icons.warning_amber_rounded,
          backgroundColor: PingForceColors.statusWarning,
          foregroundColor: PingForceColors.statusOnWarning,
          isEnabled: true,
          semanticLabel: 'Check in with GPS warning. Attendance may be flagged.',
        ),

      // Already checked in
      CheckInButtonMode.alreadyCheckedIn => _ButtonConfig(
          label: "You're Checked In",
          icon: Icons.check_circle_rounded,
          backgroundColor: cs.tertiaryContainer,
          foregroundColor: cs.onTertiaryContainer,
          isEnabled: false,
          semanticLabel: 'You are already checked in',
        ),

      // Submitting
      CheckInButtonMode.submitting => _ButtonConfig(
          label: '',
          icon: null,
          backgroundColor: cs.primary.withValues(alpha: 0.80),
          foregroundColor: cs.onPrimary,
          isEnabled: false,
          semanticLabel: 'Submitting check-in, please wait',
        ),

      // Success
      CheckInButtonMode.success => _ButtonConfig(
          label: 'Checked In ✓',
          icon: null,
          backgroundColor: PingForceColors.statusSuccess,
          foregroundColor: PingForceColors.statusOnSuccess,
          isEnabled: false,
          semanticLabel: 'Check-in successful',
        ),

      // Error
      CheckInButtonMode.error => _ButtonConfig(
          label: 'Try Again',
          icon: Icons.refresh_rounded,
          backgroundColor: cs.errorContainer,
          foregroundColor: cs.onErrorContainer,
          isEnabled: true,
          semanticLabel: 'Check-in failed. Tap to try again.',
        ),
    };
  }

  bool get _isGpsAcquiring => true; // TODO: derive from parent state

  String get _disabledLabel => 'Outside Boundary'; // Placeholder

  IconData get _disabledIcon => Icons.location_off_rounded;
}

// ─────────────────────────────────────────────────────────────────────────────
// BUTTON CONFIG VALUE OBJECT
// ─────────────────────────────────────────────────────────────────────────────

class _ButtonConfig {
  const _ButtonConfig({
    required this.label,
    required this.backgroundColor,
    required this.foregroundColor,
    required this.isEnabled,
    required this.semanticLabel,
    this.icon,
  });

  final String label;
  final IconData? icon;
  final Color backgroundColor;
  final Color foregroundColor;
  final bool isEnabled;
  final String semanticLabel;
}
