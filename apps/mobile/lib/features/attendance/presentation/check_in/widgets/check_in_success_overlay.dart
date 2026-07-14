import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';

import '../../../../../core/theme/theme.dart';
import '../check_in_state.dart';

// ─────────────────────────────────────────────────────────────────────────────
// CHECK-IN SUCCESS OVERLAY  (CHECKIN_FLOW_SPEC.md §10 S12)
// ─────────────────────────────────────────────────────────────────────────────
//
// This widget renders as a full-screen overlay that slides up from the bottom
// of the screen after a successful check-in. It is NOT a separate route —
// it overlays the [AttendanceScreen] via a Stack.
//
// Sequence:
//  1. Overlay slides up from bottom (350ms, emphasized easing)
//  2. Lottie checkmark plays (600ms) — uses placeholder AnimatedCheck in
//     this impl since Lottie asset is project-specific
//  3. Text content fades in after checkmark (200ms, decelerate)
//  4. Auto-dismisses after 3s countdown

class CheckInSuccessOverlay extends StatefulWidget {
  const CheckInSuccessOverlay({
    super.key,
    required this.result,
    required this.onDismiss,
  });

  final CheckInResult result;
  final VoidCallback onDismiss;

  @override
  State<CheckInSuccessOverlay> createState() => _CheckInSuccessOverlayState();
}

class _CheckInSuccessOverlayState extends State<CheckInSuccessOverlay>
    with TickerProviderStateMixin {
  // Slide-up animation for the overlay panel
  late final AnimationController _slideController;
  late final Animation<Offset> _slideAnimation;

  // Fade-in for text content (after checkmark)
  late final AnimationController _textFadeController;
  late final Animation<double> _textFadeAnimation;

  // Checkmark draw animation (simulates Lottie)
  late final AnimationController _checkController;
  late final Animation<double> _checkAnimation;

  // Auto-dismiss countdown
  late Timer _countdownTimer;
  int _countdownSeconds = 3;

  @override
  void initState() {
    super.initState();

    // 1. Slide-up overlay (350ms)
    _slideController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 350),
    );
    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, 1.0),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _slideController,
      curve: AppEasing.emphasized,
    ));

    // 2. Checkmark animation (600ms)
    _checkController = AnimationController(
      vsync: this,
      duration: AppDurations.verySlow, // 600ms
    );
    _checkAnimation = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _checkController, curve: AppEasing.decelerate),
    );

    // 3. Text fade in (200ms, starts after checkmark)
    _textFadeController = AnimationController(
      vsync: this,
      duration: AppDurations.normal, // 200ms
    );
    _textFadeAnimation = CurvedAnimation(
      parent: _textFadeController,
      curve: AppEasing.decelerate,
    );

    // Kick off sequence
    _runAnimationSequence();
    _startCountdown();

    // Accessibility: announce success
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final time = _formatTime(widget.result.checkInTime);
      SemanticsService.announce(
        'Check-in successful at $time',
        TextDirection.ltr,
      );
    });
  }

  Future<void> _runAnimationSequence() async {
    await _slideController.forward();       // Slide up: 350ms
    await _checkController.forward();       // Checkmark: 600ms
    await _textFadeController.forward();    // Text: 200ms
  }

  void _startCountdown() {
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      setState(() => _countdownSeconds--);
      if (_countdownSeconds <= 0) {
        timer.cancel();
        _dismiss();
      }
    });
  }

  void _dismiss() {
    _slideController.reverse().then((_) {
      if (mounted) widget.onDismiss();
    });
  }

  @override
  void dispose() {
    _countdownTimer.cancel();
    _slideController.dispose();
    _textFadeController.dispose();
    _checkController.dispose();
    super.dispose();
  }

  // ── Build ──────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return SlideTransition(
      position: _slideAnimation,
      child: Material(
        color: Theme.of(context)
            .colorScheme
            .surfaceContainerLowest
            .withOpacity(0.97),
        child: SafeArea(
          child: Padding(
            padding: AppSpacing.screenPaddingAll,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // ── Animated checkmark ───────────────────────────────────
                _AnimatedCheckmark(animation: _checkAnimation),

                AppSpacing.sectionGapBox,

                // ── Title ────────────────────────────────────────────────
                FadeTransition(
                  opacity: _textFadeAnimation,
                  child: Text(
                    "You're Checked In!",
                    style: AppTypography.headlineMedium.copyWith(
                      color: Theme.of(context).colorScheme.onSurface,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),

                AppSpacing.smallGapBox,

                // ── Time & status ────────────────────────────────────────
                FadeTransition(
                  opacity: _textFadeAnimation,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        _formatTime(widget.result.checkInTime),
                        style: AppTypography.titleSmall.copyWith(
                          color: Theme.of(context).colorScheme.primary,
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.space2,
                        ),
                        child: Text(
                          '·',
                          style: AppTypography.titleSmall.copyWith(
                            color:
                                Theme.of(context).colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ),
                      Text(
                        widget.result.isLate
                            ? 'Late ${widget.result.minutesLate}m'
                            : 'On Time',
                        style: AppTypography.titleSmall.copyWith(
                          color: widget.result.isLate
                              ? PingForceColors.statusWarning
                              : PingForceColors.statusSuccess,
                        ),
                      ),
                    ],
                  ),
                ),

                AppSpacing.smallGapBox,

                // ── Shift & branch ───────────────────────────────────────
                FadeTransition(
                  opacity: _textFadeAnimation,
                  child: Text(
                    '${widget.result.shiftName} · ${widget.result.branchName}',
                    style: AppTypography.bodyMedium.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),

                AppSpacing.space2.toSizedBox,

                // ── GPS verified / offline badge ─────────────────────────
                FadeTransition(
                  opacity: _textFadeAnimation,
                  child: widget.result.isOffline
                      ? _StatusBadge(
                          icon: Icons.cloud_off_rounded,
                          label: 'Saved Offline · Will sync when connected',
                          color: PingForceColors.statusInfo,
                        )
                      : const _StatusBadge(
                          icon: Icons.gps_fixed_rounded,
                          label: 'GPS Verified',
                          color: PingForceColors.statusSuccess,
                        ),
                ),

                const Spacer(),

                // ── Divider ──────────────────────────────────────────────
                const Divider(),

                AppSpacing.smallGapBox,

                // ── Actions ──────────────────────────────────────────────
                FadeTransition(
                  opacity: _textFadeAnimation,
                  child: TextButton(
                    onPressed: _dismiss,
                    child: const Text('View Attendance Details'),
                  ),
                ),

                AppSpacing.space2.toSizedBox,

                // ── Auto-dismiss countdown ───────────────────────────────
                FadeTransition(
                  opacity: _textFadeAnimation,
                  child: Text(
                    'Returning to dashboard in $_countdownSeconds...',
                    style: AppTypography.labelSmall.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                ),

                AppSpacing.mediumGapBox,
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _formatTime(DateTime dt) {
    final hour = dt.hour > 12 ? dt.hour - 12 : dt.hour;
    final min = dt.minute.toString().padLeft(2, '0');
    final amPm = dt.hour >= 12 ? 'PM' : 'AM';
    return '$hour:$min $amPm';
  }
}

// ── Helper extension ──────────────────────────────────────────────────────────

extension _DoubleX on double {
  SizedBox get toSizedBox => SizedBox(height: this);
}

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATED CHECKMARK  (simulates Lottie — replace with lottie package)
// ─────────────────────────────────────────────────────────────────────────────

class _AnimatedCheckmark extends StatelessWidget {
  const _AnimatedCheckmark({required this.animation});

  final Animation<double> animation;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: animation,
      builder: (_, __) {
        return Stack(
          alignment: Alignment.center,
          children: [
            // Outer circle grows in
            Transform.scale(
              scale: animation.value,
              child: Container(
                width: 160,
                height: 160,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: PingForceColors.statusSuccessContainer,
                ),
              ),
            ),
            // Inner circle
            Transform.scale(
              scale: animation.value,
              child: Container(
                width: 120,
                height: 120,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: PingForceColors.statusSuccess,
                ),
                child: Icon(
                  Icons.check_rounded,
                  color: PingForceColors.statusOnSuccess,
                  size: 64 * animation.value,
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS BADGE  — small icon + label chip in overlay
// ─────────────────────────────────────────────────────────────────────────────

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({
    required this.icon,
    required this.label,
    required this.color,
  });

  final IconData icon;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.space3,
        vertical: AppSpacing.space1,
      ),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: AppRadius.pillAll,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: AppIconSize.xs, color: color),
          AppSpacing.iconGapBox,
          Text(
            label,
            style: AppTypography.labelSmall.copyWith(color: color),
          ),
        ],
      ),
    );
  }
}
