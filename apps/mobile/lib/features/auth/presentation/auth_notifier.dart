import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:local_auth/local_auth.dart';

import '../../../core/auth/auth_session.dart';
import '../../../core/navigation/app_shell.dart';
import '../../../core/notifications/push_notifications_service.dart';
import '../../../injection_container.dart';
import '../domain/repositories/auth_repository.dart';
import '../domain/usecases/login_command.dart';
import 'auth_state.dart';

// ─────────────────────────────────────────────────────────────────────────────
// AUTH NOTIFIER  (AUDIT §3 — Authentication Screens)
// ─────────────────────────────────────────────────────────────────────────────

final loginProvider =
    NotifierProvider<LoginNotifier, LoginState>(LoginNotifier.new);

class LoginNotifier extends Notifier<LoginState> {
  @override
  LoginState build() {
    // Single-screen login has no tenant-code step to hang the biometric probe
    // off, so resolve availability once when the screen's provider is created.
    unawaited(_refreshBiometricState());
    return const LoginState();
  }

  Future<void> _refreshBiometricState() async {
    final available = await _checkBiometricAvailability();
    final enrolled = await _checkBiometricEnrolled();
    state = state.copyWith(
      isBiometricAvailable: available,
      isBiometricEnabled: enrolled,
    );
  }

  // ── Step 1: Tenant code ────────────────────────────────────────────────

  void onTenantCodeChanged(String value) {
    state = state.copyWith(
      tenantCode: value,
      tenantCodeError: null,
      authError: AuthErrorCode.none,
    );
  }

  /// Pre-fill the workspace from an invite deep link
  /// (`pingforce://invite?workspace=CODE&role=X`) so the admin only has to
  /// type their email + password.
  ///
  /// Idempotent: if the workspace already matches (e.g. a rebuild re-delivers
  /// the same link) it does nothing, so it won't stomp a code the user is
  /// mid-way through editing.
  void prefillFromInvite(String workspace, {String? role}) {
    final code = workspace.trim().toUpperCase();
    if (code.isEmpty) return;
    if (state.tenantCode.trim().toUpperCase() == code) return;
    state = state.copyWith(
      tenantCode: code,
      tenantCodeError: null,
      authError: AuthErrorCode.none,
      resolvedTenantName: code,
    );
  }

  // ── Credentials ────────────────────────────────────────────────────────

  void onUsernameChanged(String value) {
    state = state.copyWith(
      username: value,
      usernameError: null,
      authError: AuthErrorCode.none,
    );
  }

  void onPasswordChanged(String value) {
    state = state.copyWith(
      password: value,
      passwordError: null,
      authError: AuthErrorCode.none,
    );
  }

  void togglePasswordVisibility() {
    state = state.copyWith(isPasswordVisible: !state.isPasswordVisible);
  }

  void toggleRememberDevice() {
    state = state.copyWith(rememberDevice: !state.rememberDevice);
  }

  Future<void> submitLogin() async {
    // ── Field-level validation (real-time style, triggered on submit) ──
    String? tenantCodeError;
    String? usernameError;
    String? passwordError;

    if (state.tenantCode.trim().isEmpty) {
      tenantCodeError = 'Workspace code is required';
    } else if (state.tenantCode.trim().length < 3) {
      tenantCodeError = 'Workspace code must be at least 3 characters';
    }

    if (state.username.trim().isEmpty) {
      usernameError = 'Email or employee ID is required';
    } else if (!_isValidEmail(state.username) &&
        !_isValidEmployeeId(state.username)) {
      usernameError = 'Enter a valid email or employee ID';
    }

    if (state.password.isEmpty) {
      passwordError = 'Password is required';
    } else if (state.password.length < 6) {
      passwordError = 'Password must be at least 6 characters';
    }

    if (tenantCodeError != null ||
        usernameError != null ||
        passwordError != null) {
      state = state.copyWith(
        tenantCodeError: tenantCodeError,
        usernameError: usernameError,
        passwordError: passwordError,
      );
      return;
    }

    state = state.copyWith(
      isLoading: true,
      authError: AuthErrorCode.none,
    );

    // Real login via the clean-architecture data layer (stores JWT +
    // refresh token in secure storage on success).
    final result = await sl<LoginCommand>()(
      LoginParams(
        email: state.username.trim(),
        password: state.password,
        tenantCode: state.tenantCode.trim().toUpperCase(),
      ),
    );

    result.fold(
      (failure) {
        state = state.copyWith(
          isLoading: false,
          authError: _classifyAuthError(failure.message),
        );
      },
      (user) async {
        AuthSession.instance.signIn(
          roleCode: user.role,
          mustChangePassword: user.mustChangePassword,
          isOnboarded: user.isOnboarded,
        );
        // Point the shell's bottom-nav at the role we just signed in as (the
        // shell notifier may have been built during the signed-out session).
        ref.read(appShellProvider.notifier).syncRoleFromSession();
        // Register this device for push now that we're authenticated
        // (fire-and-forget — login must not wait on FCM)
        unawaited(sl<PushNotificationsService>().registerToken());
        if (state.rememberDevice) {
          // Enable biometric quick-unlock on this device next launch
          try {
            await sl<FlutterSecureStorage>()
                .write(key: 'biometric_enrolled', value: 'true');
          } catch (_) {}
        }
        state = state.copyWith(isLoading: false, isAuthenticated: true);
      },
    );
  }

  // ── Biometric ──────────────────────────────────────────────────────────

  Future<void> submitBiometric() async {
    state = state.copyWith(isLoading: true, authError: AuthErrorCode.none);
    try {
      // TODO: local_auth plugin authenticate()
      await Future<void>.delayed(const Duration(milliseconds: 600));
      state = state.copyWith(isLoading: false);
      // On success → router handles navigation
    } on Exception {
      state = state.copyWith(
        isLoading: false,
        authError: AuthErrorCode.invalidCredentials,
      );
    }
  }

  void dismissError() {
    state = state.copyWith(authError: AuthErrorCode.none);
  }

  // ── Private helpers ────────────────────────────────────────────────────

  Future<bool> _checkBiometricAvailability() async {
    try {
      return await sl<LocalAuthentication>().isDeviceSupported();
    } catch (_) {
      return false;
    }
  }

  Future<bool> _checkBiometricEnrolled() async {
    try {
      final flag =
          await sl<FlutterSecureStorage>().read(key: 'biometric_enrolled');
      return flag == 'true';
    } catch (_) {
      return false;
    }
  }

  bool _isValidEmail(String s) =>
      RegExp(r'^[\w.+-]+@[\w-]+\.[a-z]{2,}$', caseSensitive: false)
          .hasMatch(s);

  bool _isValidEmployeeId(String s) =>
      RegExp(r'^[A-Za-z0-9_-]{3,20}$').hasMatch(s);

  AuthErrorCode _classifyAuthError(String raw) {
    if (raw.contains('401') || raw.contains('invalid_credentials')) {
      return AuthErrorCode.invalidCredentials;
    }
    if (raw.contains('423') || raw.contains('locked')) {
      return AuthErrorCode.accountLocked;
    }
    if (raw.contains('403') || raw.contains('disabled')) {
      return AuthErrorCode.accountDisabled;
    }
    if (raw.contains('mfa') || raw.contains('otp_required')) {
      return AuthErrorCode.mfaRequired;
    }
    if (raw.contains('SocketException') || raw.contains('Timeout')) {
      return AuthErrorCode.networkError;
    }
    return AuthErrorCode.serverError;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FORGOT PASSWORD NOTIFIER
// ─────────────────────────────────────────────────────────────────────────────

final forgotPasswordProvider =
    NotifierProvider.autoDispose<ForgotPasswordNotifier, ForgotPasswordState>(
  ForgotPasswordNotifier.new,
);

class ForgotPasswordNotifier extends AutoDisposeNotifier<ForgotPasswordState> {
  Timer? _countdownTimer;

  @override
  ForgotPasswordState build() {
    ref.onDispose(() => _countdownTimer?.cancel());
    return const ForgotPasswordState();
  }

  // ── Step 1: Identifier ────────────────────────────────────────────────

  void onIdentifierChanged(String value) {
    state = state.copyWith(
      identifier: value,
      identifierError: null,
      authError: AuthErrorCode.none,
    );
  }

  Future<void> sendOtp() async {
    if (!state.canSendOtp) {
      state = state.copyWith(
        identifierError: 'Enter a valid email address',
      );
      return;
    }

    state = state.copyWith(isLoading: true, authError: AuthErrorCode.none);

    final tenantCode = await _storedTenantCode();
    if (tenantCode == null) {
      state = state.copyWith(
        isLoading: false,
        identifierError:
            'Workspace unknown on this device - sign in once first',
      );
      return;
    }

    final result = await sl<AuthRepository>().requestPasswordReset(
      state.identifier.trim(),
      tenantCode,
    );

    result.fold(
      (_) => state = state.copyWith(
        isLoading: false,
        authError: AuthErrorCode.networkError,
      ),
      (_) {
        state = state.copyWith(
          isLoading: false,
          otpSent: true,
          countdownSeconds: 60,
          canResend: false,
        );
        _startCountdown();
      },
    );
  }

  Future<String?> _storedTenantCode() async {
    try {
      return await sl<FlutterSecureStorage>().read(key: 'tenant_code');
    } catch (_) {
      return null;
    }
  }

  // ── Step 2: OTP ────────────────────────────────────────────────────────

  void onOtpChanged(String value) {
    state = state.copyWith(otp: value, otpError: null);
    if (value.length == 6) verifyOtp();
  }

  Future<void> verifyOtp() async {
    // The API validates the OTP atomically at the confirm step (single-use);
    // advance to the password step and surface any OTP error there.
    if (state.otp.length != 6) {
      state = state.copyWith(otpError: 'Enter the 6-digit code');
      return;
    }
    state = state.copyWith(isLoading: false, otpVerified: true);
  }

  Future<void> resendOtp() async {
    if (!state.canResend) return;
    await sendOtp();
  }

  // ── Step 3: New password ───────────────────────────────────────────────

  void onNewPasswordChanged(String value) {
    state = state.copyWith(
      newPassword: value,
      passwordError: null,
      passwordStrength: calculatePasswordStrength(value),
    );
  }

  void onConfirmPasswordChanged(String value) {
    state = state.copyWith(
      confirmPassword: value,
      confirmPasswordError: null,
    );
  }

  void toggleNewPasswordVisibility() {
    state =
        state.copyWith(isNewPasswordVisible: !state.isNewPasswordVisible);
  }

  void toggleConfirmPasswordVisibility() {
    state = state.copyWith(
      isConfirmPasswordVisible: !state.isConfirmPasswordVisible,
    );
  }

  Future<void> submitNewPassword() async {
    String? passwordError;
    String? confirmPasswordError;

    if (state.newPassword.length < 12) {
      passwordError = 'Password must be at least 12 characters';
    } else if (state.passwordStrength == PasswordStrength.weak) {
      passwordError = 'Password is too weak — add numbers or symbols';
    }

    if (!state.passwordsMatch) {
      confirmPasswordError = 'Passwords do not match';
    }

    if (passwordError != null || confirmPasswordError != null) {
      state = state.copyWith(
        passwordError: passwordError,
        confirmPasswordError: confirmPasswordError,
      );
      return;
    }

    state = state.copyWith(isLoading: true);

    // An empty workspace code would come back as a generic "Invalid code",
    // hiding the real cause behind an OTP error the user cannot act on.
    final tenantCode = await _storedTenantCode();
    if (tenantCode == null || tenantCode.trim().isEmpty) {
      state = state.copyWith(
        isLoading: false,
        passwordError:
            'Workspace unknown on this device - sign in once first',
      );
      return;
    }

    final result = await sl<AuthRepository>().confirmPasswordReset(
      state.identifier.trim(),
      tenantCode,
      state.otp,
      state.newPassword,
    );

    result.fold(
      (_) => state = state.copyWith(
        isLoading: false,
        otpVerified: false,
        otp: '',
        otpError: 'Incorrect or expired code. Please try again.',
      ),
      (_) => state = state.copyWith(isLoading: false, isComplete: true),
    );
  }

  // ── Countdown ──────────────────────────────────────────────────────────

  void _startCountdown() {
    _countdownTimer?.cancel();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      final remaining = state.countdownSeconds - 1;
      if (remaining <= 0) {
        _countdownTimer?.cancel();
        state = state.copyWith(countdownSeconds: 0, canResend: true);
      } else {
        state = state.copyWith(countdownSeconds: remaining);
      }
    });
  }
}
