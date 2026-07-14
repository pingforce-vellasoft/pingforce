import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/theme.dart';
import 'auth_state.dart';
import 'auth_notifier.dart';
import 'widgets/auth_widgets.dart';

// ─────────────────────────────────────────────────────────────────────────────
// BIOMETRIC UNLOCK SCREEN  (AUDIT §3.3 — Biometric Unlock)
// ─────────────────────────────────────────────────────────────────────────────
//
// Shown when:
//   • User has previously enrolled biometrics AND enabled "Remember Device"
//   • Session has expired but device is still registered
//
// Covers all 3 audit gaps:
//   ✅ Custom overlay (not just system sheet) — branded, animated fingerprint
//   ✅ Fallback to password when biometric fails or user taps "Use Password"
//   ✅ "Use a different account" option
//
// UX flow:
//   1. Screen appears with fingerprint / face animation
//   2. Auto-prompts biometric scan after 600ms
//   3. On failure → shake + error message + retry
//   4. After 3 failures → "Use Password Instead" prominently shown
//   5. "Use a different account" → goes back to step 1 of login

class BiometricScreen extends ConsumerStatefulWidget {
  const BiometricScreen({super.key});

  @override
  ConsumerState<BiometricScreen> createState() => _BiometricScreenState();
}

class _BiometricScreenState extends ConsumerState<BiometricScreen>
    with TickerProviderStateMixin {
  // ── Icon pulse animation ───────────────────────────────────────────────
  late final AnimationController _pulseCtrl;
  late final Animation<double> _pulseScale;
  late final Animation<double> _pulseOpacity;

  // ── Shake on failure ───────────────────────────────────────────────────
  late final AnimationController _shakeCtrl;
  late final Animation<double> _shakeOffset;

  int _failureCount = 0;
  bool _isScanning = false;
  String? _failureMessage;

  static const int _maxFailures = 3;

  @override
  void initState() {
    super.initState();

    _pulseCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);

    _pulseScale = Tween<double>(begin: 1.0, end: 1.12).animate(
      CurvedAnimation(parent: _pulseCtrl, curve: Curves.easeInOut),
    );
    _pulseOpacity = Tween<double>(begin: 0.3, end: 0.7).animate(
      CurvedAnimation(parent: _pulseCtrl, curve: Curves.easeInOut),
    );

    _shakeCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );
    _shakeOffset = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _shakeCtrl, curve: Curves.elasticOut),
    );

    // Auto-prompt after 600ms
    Future<void>.delayed(const Duration(milliseconds: 600), () {
      if (mounted) _authenticate();
    });
  }

  @override
  void dispose() {
    _pulseCtrl.dispose();
    _shakeCtrl.dispose();
    super.dispose();
  }

  Future<void> _authenticate() async {
    setState(() {
      _isScanning = true;
      _failureMessage = null;
    });

    await Future<void>.delayed(const Duration(milliseconds: 1000));

    if (!mounted) return;

    // TODO: local_auth.authenticate(localizedReason: 'Sign in to PingForce')
    // Simulated: always fails for demonstration purposes
    _onBiometricFailure('Fingerprint not recognized. Try again.');
  }

  void _onBiometricFailure(String message) {
    setState(() {
      _isScanning = false;
      _failureCount++;
      _failureMessage = message;
    });
    _shakeCtrl.forward(from: 0);
    _pulseCtrl.stop();
  }

  void _onBiometricSuccess() {
    _pulseCtrl.stop();
    context.go('/home');
  }

  void _goToPasswordFallback() {
    // Go to credentials step (step 2 of login)
    context.go('/auth/login?step=credentials');
  }

  void _useDifferentAccount() {
    context.go('/auth/login?step=tenant');
  }

  @override
  Widget build(BuildContext context) {
    final showPasswordFallback = _failureCount >= _maxFailures;

    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      body: SafeArea(
        child: Padding(
          padding: AppSpacing.screenPaddingAll,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: AppSpacing.space6),

              // ── Brand header ─────────────────────────────────────────
              Center(
                child: Column(
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: Theme.of(context).colorScheme.primaryContainer,
                      ),
                      child: Icon(
                        Icons.bolt_rounded,
                        color: Theme.of(context).colorScheme.primary,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.space2),
                    Text(
                      'PingForce',
                      style: AppTypography.titleMedium.copyWith(
                        color: Theme.of(context).colorScheme.onSurface,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: AppSpacing.space8),

              // ── Biometric icon with pulse ─────────────────────────────
              Center(
                child: AnimatedBuilder(
                  animation: _pulseCtrl,
                  builder: (_, child) => Stack(
                    alignment: Alignment.center,
                    children: [
                      // Outer pulse ring
                      AnimatedBuilder(
                        animation: _pulseOpacity,
                        builder: (_, __) => Transform.scale(
                          scale: _pulseScale.value,
                          child: Container(
                            width: 128,
                            height: 128,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: Theme.of(context)
                                  .colorScheme
                                  .primary
                                  .withOpacity(_pulseOpacity.value * 0.15),
                              border: Border.all(
                                color: Theme.of(context)
                                    .colorScheme
                                    .primary
                                    .withOpacity(_pulseOpacity.value),
                                width: 1.5,
                              ),
                            ),
                          ),
                        ),
                      ),
                      // Inner icon
                      AnimatedBuilder(
                        animation: _shakeOffset,
                        builder: (_, inner) => Transform.translate(
                          offset: Offset(
                            _shakeOffset.value *
                                8 *
                                (_shakeOffset.value < 0.5 ? -1 : 1),
                            0,
                          ),
                          child: inner,
                        ),
                        child: Container(
                          width: 96,
                          height: 96,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: Theme.of(context)
                                .colorScheme
                                .primaryContainer,
                            boxShadow: AppElevation.shadowForLevel(3),
                          ),
                          child: Icon(
                            Icons.fingerprint_rounded,
                            size: 56,
                            color: _failureCount > 0
                                ? Theme.of(context).colorScheme.error
                                : Theme.of(context).colorScheme.primary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: AppSpacing.space6),

              // ── Status text ───────────────────────────────────────────
              AnimatedSwitcher(
                duration: AppDurations.fast,
                child: Text(
                  key: ValueKey(_isScanning
                      ? 'scanning'
                      : _failureMessage ?? 'tap'),
                  _isScanning
                      ? 'Scanning…'
                      : _failureMessage ?? 'Touch the fingerprint sensor',
                  textAlign: TextAlign.center,
                  style: AppTypography.bodyLarge.copyWith(
                    color: _failureMessage != null
                        ? Theme.of(context).colorScheme.error
                        : Theme.of(context).colorScheme.onSurface,
                  ),
                ),
              ),

              const Spacer(),

              // ── "Try again" / "Use Password" after failures ───────────
              if (!_isScanning) ...[
                if (!showPasswordFallback) ...[
                  Center(
                    child: TextButton.icon(
                      onPressed: _authenticate,
                      icon: const Icon(Icons.refresh_rounded),
                      label: const Text('Try Again'),
                    ),
                  ),
                ] else ...[
                  // After 3 failures — prominently show password fallback
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      onPressed: _goToPasswordFallback,
                      icon: const Icon(Icons.lock_open_rounded),
                      label: const Text('Use Password Instead'),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.space2),
                  Center(
                    child: TextButton(
                      onPressed: _authenticate,
                      child: const Text('Try Biometrics Again'),
                    ),
                  ),
                ],
              ],

              const SizedBox(height: AppSpacing.space4),

              // ── Divider ───────────────────────────────────────────────
              Row(
                children: [
                  Expanded(child: Divider(
                    color: Theme.of(context).colorScheme.outlineVariant,
                  )),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    child: Text(
                      'or',
                      style: AppTypography.labelSmall.copyWith(
                        color:
                            Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ),
                  Expanded(child: Divider(
                    color: Theme.of(context).colorScheme.outlineVariant,
                  )),
                ],
              ),

              const SizedBox(height: AppSpacing.space3),

              // ── Use a different account ────────────────────────────────
              Center(
                child: TextButton(
                  onPressed: _useDifferentAccount,
                  child: Text(
                    'Use a different account',
                    style: AppTypography.labelMedium.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                ),
              ),

              const SizedBox(height: AppSpacing.space5),
            ],
          ),
        ),
      ),
    );
  }
}
