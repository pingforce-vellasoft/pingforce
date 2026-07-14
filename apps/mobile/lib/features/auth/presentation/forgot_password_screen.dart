import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/theme.dart';
import 'auth_state.dart';
import 'auth_notifier.dart';
import 'login_screen.dart' show _AuthErrorBanner, _LoadingButton;

// ─────────────────────────────────────────────────────────────────────────────
// FORGOT PASSWORD SCREEN  (AUDIT §3.2 — Forgot Password Flow)
// ─────────────────────────────────────────────────────────────────────────────
//
// 3-step flow on a single screen (IndexedStack transitions):
//
//   Step 0 — Identifier entry: email or mobile number
//             Channel selector: email vs SMS
//             → "Send OTP" button
//
//   Step 1 — OTP entry: 6 auto-advancing text boxes
//             Countdown timer (60s)
//             "Resend" enabled after countdown
//             → auto-submits when all 6 digits entered
//
//   Step 2 — New password + confirm:
//             Password strength indicator (4 levels)
//             Show/hide toggles on both fields
//             → "Reset Password" button
//             → success state with go-to-login CTA
//
// Audit gaps covered:
//   ✅ Triggered as separate screen (pushed via GoRouter)
//   ✅ OTP delivery channel selection (email vs SMS chip selector)
//   ✅ 6-digit OTP input with auto-advance and auto-submit
//   ✅ Countdown timer with resend logic
//   ✅ New password + confirm password screen
//   ✅ Password strength indicator

class ForgotPasswordScreen extends ConsumerWidget {
  const ForgotPasswordScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(forgotPasswordProvider);

    // Determine which step to show
    final step = !state.otpSent
        ? 0
        : !state.otpVerified
            ? 1
            : !state.isComplete
                ? 2
                : 3; // success

    return Scaffold(
      resizeToAvoidBottomInset: true,
      appBar: AppBar(
        title: Text(_stepTitle(step)),
        leading: step == 0
            ? null
            : IconButton(
                icon: const Icon(Icons.arrow_back_rounded),
                onPressed: () {
                  if (step == 1) {
                    ref
                        .read(forgotPasswordProvider.notifier)
                        .onIdentifierChanged(state.identifier);
                    // Go back to step 0 by resetting otpSent
                    // Handled via state — just let user go back in nav
                  }
                  context.pop();
                },
              ),
        // Step progress indicator in the app bar
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(4),
          child: LinearProgressIndicator(
            value: (step + 1) / 4,
            backgroundColor:
                Theme.of(context).colorScheme.surfaceContainerHigh,
            color: Theme.of(context).colorScheme.primary,
          ),
        ),
      ),
      body: SafeArea(
        child: GestureDetector(
          onTap: () => FocusScope.of(context).unfocus(),
          child: AnimatedSwitcher(
            duration: AppDurations.normal,
            transitionBuilder: (child, anim) => SlideTransition(
              position: Tween<Offset>(
                begin: const Offset(1, 0),
                end: Offset.zero,
              ).animate(CurvedAnimation(
                parent: anim,
                curve: AppEasing.standard,
              )),
              child: child,
            ),
            child: switch (step) {
              0 => _IdentifierStep(key: const ValueKey(0), state: state),
              1 => _OtpStep(key: const ValueKey(1), state: state),
              2 => _NewPasswordStep(key: const ValueKey(2), state: state),
              _ => _SuccessStep(key: const ValueKey(3)),
            },
          ),
        ),
      ),
    );
  }

  String _stepTitle(int step) => switch (step) {
        0 => 'Forgot Password',
        1 => 'Enter OTP',
        2 => 'New Password',
        _ => 'Password Reset',
      };
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 0 — IDENTIFIER + CHANNEL
// ─────────────────────────────────────────────────────────────────────────────

class _IdentifierStep extends ConsumerWidget {
  const _IdentifierStep({super.key, required this.state});
  final ForgotPasswordState state;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifier = ref.read(forgotPasswordProvider.notifier);

    return SingleChildScrollView(
      padding: AppSpacing.screenPaddingAll,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: AppSpacing.space5),

          // Icon
          Center(
            child: Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Theme.of(context).colorScheme.primaryContainer,
              ),
              child: Icon(
                Icons.lock_reset_rounded,
                size: AppIconSize.lg,
                color: Theme.of(context).colorScheme.primary,
              ),
            ),
          ),

          const SizedBox(height: AppSpacing.space4),

          Text(
            'Reset your password',
            textAlign: TextAlign.center,
            style: AppTypography.titleLarge.copyWith(
              color: Theme.of(context).colorScheme.onSurface,
            ),
          ),
          const SizedBox(height: AppSpacing.space1),
          Text(
            'We\'ll send a one-time code to verify your identity.',
            textAlign: TextAlign.center,
            style: AppTypography.bodyMedium.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),

          const SizedBox(height: AppSpacing.space6),

          // Channel selector chips
          Text(
            'Send code via',
            style: AppTypography.labelMedium.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: AppSpacing.space2),
          Row(
            children: [
              _ChannelChip(
                label: 'Email',
                icon: Icons.email_outlined,
                selected: state.channel == OtpChannel.email,
                onTap: () => notifier.selectChannel(OtpChannel.email),
              ),
              const SizedBox(width: AppSpacing.space3),
              _ChannelChip(
                label: 'SMS',
                icon: Icons.sms_outlined,
                selected: state.channel == OtpChannel.sms,
                onTap: () => notifier.selectChannel(OtpChannel.sms),
              ),
            ],
          ),

          const SizedBox(height: AppSpacing.space4),

          // Identifier field
          TextField(
            keyboardType: state.channel == OtpChannel.email
                ? TextInputType.emailAddress
                : TextInputType.phone,
            textInputAction: TextInputAction.done,
            onChanged: notifier.onIdentifierChanged,
            decoration: InputDecoration(
              labelText: state.channel == OtpChannel.email
                  ? 'Email address'
                  : 'Mobile number',
              prefixIcon: Icon(
                state.channel == OtpChannel.email
                    ? Icons.email_outlined
                    : Icons.phone_outlined,
              ),
              errorText: state.identifierError,
            ),
          ),

          const SizedBox(height: AppSpacing.space6),

          if (state.authError != AuthErrorCode.none)
            Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.space3),
              child: _SimpleErrorBanner(message: state.authError.message),
            ),

          _LoadingButton(
            isLoading: state.isLoading,
            label: 'Send Code',
            onPressed: state.canSendOtp ? notifier.sendOtp : null,
          ),
        ],
      ),
    );
  }
}

class _ChannelChip extends StatelessWidget {
  const _ChannelChip({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: AppDurations.fast,
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: selected
                ? Theme.of(context).colorScheme.primaryContainer
                : Theme.of(context).colorScheme.surfaceContainerLow,
            borderRadius: AppRadius.mdAll,
            border: Border.all(
              color: selected
                  ? Theme.of(context).colorScheme.primary
                  : Theme.of(context).colorScheme.outlineVariant,
              width: selected ? 1.5 : 1,
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                icon,
                color: selected
                    ? Theme.of(context).colorScheme.primary
                    : Theme.of(context).colorScheme.onSurfaceVariant,
              ),
              const SizedBox(height: 4),
              Text(
                label,
                style: AppTypography.labelMedium.copyWith(
                  color: selected
                      ? Theme.of(context).colorScheme.primary
                      : Theme.of(context).colorScheme.onSurfaceVariant,
                  fontWeight:
                      selected ? FontWeight.w600 : FontWeight.normal,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 — OTP ENTRY
// ─────────────────────────────────────────────────────────────────────────────

class _OtpStep extends ConsumerStatefulWidget {
  const _OtpStep({super.key, required this.state});
  final ForgotPasswordState state;

  @override
  ConsumerState<_OtpStep> createState() => _OtpStepState();
}

class _OtpStepState extends ConsumerState<_OtpStep> {
  final List<TextEditingController> _ctrls =
      List.generate(6, (_) => TextEditingController());
  final List<FocusNode> _focuses =
      List.generate(6, (_) => FocusNode());

  @override
  void dispose() {
    for (final c in _ctrls) c.dispose();
    for (final f in _focuses) f.dispose();
    super.dispose();
  }

  void _onDigitChanged(int index, String value) {
    if (value.length > 1) {
      // Handle paste: distribute across boxes
      final digits = value.replaceAll(RegExp(r'\D'), '');
      for (int i = 0; i < digits.length && i < 6; i++) {
        _ctrls[i].text = digits[i];
      }
      _focuses[5].requestFocus();
      _notifyChange();
      return;
    }

    if (value.isNotEmpty && index < 5) {
      _focuses[index + 1].requestFocus();
    }
    _notifyChange();
  }

  void _onKeyEvent(int index, KeyEvent event) {
    if (event is KeyDownEvent &&
        event.logicalKey == LogicalKeyboardKey.backspace &&
        _ctrls[index].text.isEmpty &&
        index > 0) {
      _focuses[index - 1].requestFocus();
    }
  }

  void _notifyChange() {
    final otp = _ctrls.map((c) => c.text).join();
    ref.read(forgotPasswordProvider.notifier).onOtpChanged(otp);
  }

  @override
  Widget build(BuildContext context) {
    final state = widget.state;
    final notifier = ref.read(forgotPasswordProvider.notifier);

    return SingleChildScrollView(
      padding: AppSpacing.screenPaddingAll,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: AppSpacing.space5),

          Center(
            child: Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Theme.of(context).colorScheme.primaryContainer,
              ),
              child: Icon(
                Icons.mark_email_read_outlined,
                size: AppIconSize.lg,
                color: Theme.of(context).colorScheme.primary,
              ),
            ),
          ),

          const SizedBox(height: AppSpacing.space4),

          Text(
            'Check your ${state.channel == OtpChannel.email ? 'inbox' : 'messages'}',
            textAlign: TextAlign.center,
            style: AppTypography.titleLarge,
          ),

          const SizedBox(height: AppSpacing.space1),

          Text(
            'A 6-digit code was sent to ${_masked(state.identifier, state.channel)}',
            textAlign: TextAlign.center,
            style: AppTypography.bodyMedium.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),

          const SizedBox(height: AppSpacing.space6),

          // ── 6-box OTP input ──────────────────────────────────────────
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(6, (i) {
              return Padding(
                padding: EdgeInsets.only(right: i < 5 ? 8 : 0),
                child: SizedBox(
                  width: 48,
                  height: 56,
                  child: KeyboardListener(
                    focusNode: FocusNode(),
                    onKeyEvent: (e) => _onKeyEvent(i, e),
                    child: TextField(
                      controller: _ctrls[i],
                      focusNode: _focuses[i],
                      textAlign: TextAlign.center,
                      keyboardType: TextInputType.number,
                      inputFormatters: [
                        LengthLimitingTextInputFormatter(1),
                        FilteringTextInputFormatter.digitsOnly,
                      ],
                      onChanged: (v) => _onDigitChanged(i, v),
                      decoration: InputDecoration(
                        counterText: '',
                        errorText: null,
                        contentPadding: EdgeInsets.zero,
                        enabledBorder: OutlineInputBorder(
                          borderRadius: AppRadius.mdAll,
                          borderSide: BorderSide(
                            color: Theme.of(context).colorScheme.outline,
                          ),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: AppRadius.mdAll,
                          borderSide: BorderSide(
                            color: Theme.of(context).colorScheme.primary,
                            width: 2,
                          ),
                        ),
                      ),
                      style: AppTypography.headlineSmall.copyWith(
                        color: Theme.of(context).colorScheme.onSurface,
                      ),
                    ),
                  ),
                ),
              );
            }),
          ),

          // OTP error
          if (state.otpError != null) ...[
            const SizedBox(height: AppSpacing.space2),
            Text(
              state.otpError!,
              textAlign: TextAlign.center,
              style: AppTypography.bodySmall.copyWith(
                color: Theme.of(context).colorScheme.error,
              ),
            ),
          ],

          const SizedBox(height: AppSpacing.space5),

          // ── Countdown + Resend ────────────────────────────────────────
          Center(
            child: state.canResend
                ? TextButton(
                    onPressed: notifier.resendOtp,
                    child: const Text('Resend Code'),
                  )
                : Text(
                    'Resend in ${state.countdownSeconds}s',
                    style: AppTypography.labelMedium.copyWith(
                      color:
                          Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
          ),

          const SizedBox(height: AppSpacing.space5),

          _LoadingButton(
            isLoading: state.isLoading,
            label: 'Verify Code',
            onPressed: state.canVerifyOtp && !state.isLoading
                ? notifier.verifyOtp
                : null,
          ),
        ],
      ),
    );
  }

  String _masked(String identifier, OtpChannel channel) {
    if (channel == OtpChannel.email) {
      final parts = identifier.split('@');
      if (parts.length != 2) return identifier;
      final name = parts[0];
      final domain = parts[1];
      return '${name.substring(0, name.length.clamp(2, 3))}***@$domain';
    } else {
      // Phone: show last 4 digits
      if (identifier.length <= 4) return identifier;
      return '****${identifier.substring(identifier.length - 4)}';
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2 — NEW PASSWORD
// ─────────────────────────────────────────────────────────────────────────────

class _NewPasswordStep extends ConsumerWidget {
  const _NewPasswordStep({super.key, required this.state});
  final ForgotPasswordState state;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifier = ref.read(forgotPasswordProvider.notifier);

    return SingleChildScrollView(
      padding: AppSpacing.screenPaddingAll,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: AppSpacing.space4),

          Text(
            'Create a new password',
            style: AppTypography.titleLarge,
          ),
          const SizedBox(height: AppSpacing.space1),
          Text(
            'Your password must be at least 8 characters.',
            style: AppTypography.bodyMedium.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),

          const SizedBox(height: AppSpacing.space5),

          // ── New password ──────────────────────────────────────────────
          TextField(
            obscureText: !state.isNewPasswordVisible,
            textInputAction: TextInputAction.next,
            onChanged: notifier.onNewPasswordChanged,
            decoration: InputDecoration(
              labelText: 'New Password',
              prefixIcon: const Icon(Icons.lock_outline_rounded),
              errorText: state.passwordError,
              suffixIcon: IconButton(
                icon: Icon(
                  state.isNewPasswordVisible
                      ? Icons.visibility_off_outlined
                      : Icons.visibility_outlined,
                ),
                onPressed: notifier.toggleNewPasswordVisibility,
              ),
            ),
          ),

          // ── Password strength bar ─────────────────────────────────────
          if (state.newPassword.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.space2),
            _PasswordStrengthBar(strength: state.passwordStrength),
          ],

          const SizedBox(height: AppSpacing.space4),

          // ── Confirm password ──────────────────────────────────────────
          TextField(
            obscureText: !state.isConfirmPasswordVisible,
            textInputAction: TextInputAction.done,
            onChanged: notifier.onConfirmPasswordChanged,
            decoration: InputDecoration(
              labelText: 'Confirm Password',
              prefixIcon: const Icon(Icons.lock_outline_rounded),
              errorText: state.confirmPasswordError,
              suffixIcon: IconButton(
                icon: Icon(
                  state.isConfirmPasswordVisible
                      ? Icons.visibility_off_outlined
                      : Icons.visibility_outlined,
                ),
                onPressed: notifier.toggleConfirmPasswordVisibility,
              ),
            ),
          ),

          if (state.confirmPassword.isNotEmpty &&
              state.passwordsMatch &&
              state.confirmPasswordError == null) ...[
            const SizedBox(height: AppSpacing.space2),
            Row(
              children: [
                Icon(
                  Icons.check_circle_rounded,
                  size: AppIconSize.sm,
                  color: PingForceColors.statusSuccess,
                ),
                const SizedBox(width: AppSpacing.space1),
                Text(
                  'Passwords match',
                  style: AppTypography.labelSmall.copyWith(
                    color: PingForceColors.statusSuccess,
                  ),
                ),
              ],
            ),
          ],

          const SizedBox(height: AppSpacing.space6),

          _LoadingButton(
            isLoading: state.isLoading,
            label: 'Reset Password',
            onPressed: state.canSubmitNewPassword && !state.isLoading
                ? notifier.submitNewPassword
                : null,
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUCCESS STEP
// ─────────────────────────────────────────────────────────────────────────────

class _SuccessStep extends StatelessWidget {
  const _SuccessStep({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: AppSpacing.screenPaddingAll,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: PingForceColors.statusSuccessContainer,
              ),
              child: Icon(
                Icons.check_rounded,
                size: AppIconSize.xl,
                color: PingForceColors.statusSuccess,
              ),
            ),
            const SizedBox(height: AppSpacing.space5),
            Text(
              'Password Reset!',
              style: AppTypography.headlineSmall.copyWith(
                color: Theme.of(context).colorScheme.onSurface,
              ),
            ),
            const SizedBox(height: AppSpacing.space2),
            Text(
              'Your password has been updated successfully. You can now sign in with your new password.',
              textAlign: TextAlign.center,
              style: AppTypography.bodyMedium.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: AppSpacing.space8),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () => context.go('/auth/login'),
                child: const Text('Back to Sign In'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PASSWORD STRENGTH BAR
// ─────────────────────────────────────────────────────────────────────────────

class _PasswordStrengthBar extends StatelessWidget {
  const _PasswordStrengthBar({required this.strength});
  final PasswordStrength strength;

  @override
  Widget build(BuildContext context) {
    final color = switch (strength) {
      PasswordStrength.weak => PingForceColors.statusCritical,
      PasswordStrength.fair => PingForceColors.statusWarning,
      PasswordStrength.strong => PingForceColors.statusSuccess,
      PasswordStrength.veryStrong => PingForceColors.statusSuccess,
      PasswordStrength.empty => Colors.transparent,
    };

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: List.generate(4, (i) {
            final filled = strength.progress >= (i + 1) / 4;
            return Expanded(
              child: Container(
                height: 4,
                margin: EdgeInsets.only(right: i < 3 ? 4 : 0),
                decoration: BoxDecoration(
                  color: filled
                      ? color
                      : Theme.of(context).colorScheme.surfaceContainerHigh,
                  borderRadius: AppRadius.pillAll,
                ),
              ),
            );
          }),
        ),
        const SizedBox(height: 4),
        Text(
          strength.label,
          style: AppTypography.labelSmall.copyWith(color: color),
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SIMPLE ERROR BANNER  (no shake, used in forgot-password flow)
// ─────────────────────────────────────────────────────────────────────────────

class _SimpleErrorBanner extends StatelessWidget {
  const _SimpleErrorBanner({required this.message});
  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.space3),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.errorContainer,
        borderRadius: AppRadius.mdAll,
      ),
      child: Row(
        children: [
          Icon(Icons.error_outline_rounded,
              size: AppIconSize.sm,
              color: Theme.of(context).colorScheme.onErrorContainer),
          const SizedBox(width: AppSpacing.space2),
          Expanded(
            child: Text(
              message,
              style: AppTypography.bodySmall.copyWith(
                color: Theme.of(context).colorScheme.onErrorContainer,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
