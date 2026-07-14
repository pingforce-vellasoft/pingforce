import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'auth_state.dart';

// ─────────────────────────────────────────────────────────────────────────────
// AUTH NOTIFIER  (AUDIT §3 — Authentication Screens)
// ─────────────────────────────────────────────────────────────────────────────

final loginProvider =
    NotifierProvider<LoginNotifier, LoginState>(LoginNotifier.new);

class LoginNotifier extends Notifier<LoginState> {
  @override
  LoginState build() => const LoginState();

  // ── Step 1: Tenant code ────────────────────────────────────────────────

  void onTenantCodeChanged(String value) {
    state = state.copyWith(
      tenantCode: value,
      tenantCodeError: null,
      authError: AuthErrorCode.none,
    );
  }

  Future<void> submitTenantCode() async {
    if (!state.canSubmitTenantStep) {
      state = state.copyWith(
        tenantCodeError: 'Please enter your workspace code',
      );
      return;
    }

    state = state.copyWith(isLoading: true, authError: AuthErrorCode.none);

    try {
      // TODO: Call tenant resolution API
      await Future<void>.delayed(const Duration(milliseconds: 900));

      // Stub: resolve tenant name from code
      final resolved = _resolveTenantStub(state.tenantCode.trim());
      if (resolved == null) {
        state = state.copyWith(
          isLoading: false,
          authError: AuthErrorCode.invalidTenantCode,
        );
        return;
      }

      // ✅ Tenant resolved — advance to step 2 with branding
      state = state.copyWith(
        isLoading: false,
        step: LoginStep.credentials,
        resolvedTenantName: resolved,
        // Check if biometric is enrolled for this device
        isBiometricAvailable: await _checkBiometricAvailability(),
        isBiometricEnabled: await _checkBiometricEnrolled(),
      );
    } on Exception {
      state = state.copyWith(
        isLoading: false,
        authError: AuthErrorCode.networkError,
      );
    }
  }

  // ── Step 2: Credentials ────────────────────────────────────────────────

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
    String? usernameError;
    String? passwordError;

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

    if (usernameError != null || passwordError != null) {
      state = state.copyWith(
        usernameError: usernameError,
        passwordError: passwordError,
      );
      return;
    }

    state = state.copyWith(
      isLoading: true,
      authError: AuthErrorCode.none,
    );

    try {
      // TODO: POST /api/v1/auth/login
      await Future<void>.delayed(const Duration(milliseconds: 1200));

      // Stub: simulate success
      // On success → navigation handled by router auth listener
      state = state.copyWith(isLoading: false);
    } on Exception catch (e) {
      state = state.copyWith(
        isLoading: false,
        authError: _classifyAuthError(e.toString()),
      );
    }
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

  // ── Navigation back to step 1 ──────────────────────────────────────────

  void goBackToTenantStep() {
    state = state.copyWith(
      step: LoginStep.tenantCode,
      authError: AuthErrorCode.none,
      usernameError: null,
      passwordError: null,
    );
  }

  void dismissError() {
    state = state.copyWith(authError: AuthErrorCode.none);
  }

  // ── Private helpers ────────────────────────────────────────────────────

  String? _resolveTenantStub(String code) {
    // TODO: Replace with real API
    const map = {
      'ACME': 'ACME Corporation',
      'DEMO': 'Demo Workspace',
      'TEST': 'Test Workspace',
    };
    return map[code.toUpperCase()];
  }

  Future<bool> _checkBiometricAvailability() async {
    // TODO: local_auth.isDeviceSupported()
    return true;
  }

  Future<bool> _checkBiometricEnrolled() async {
    // TODO: local_auth.getAvailableBiometrics() + SharedPrefs flag
    return true;
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
  ForgotPasswordState build() => const ForgotPasswordState();

  @override
  void dispose() {
    _countdownTimer?.cancel();
    super.dispose();
  }

  // ── Step 1: Identifier ────────────────────────────────────────────────

  void onIdentifierChanged(String value) {
    state = state.copyWith(
      identifier: value,
      identifierError: null,
      authError: AuthErrorCode.none,
    );
  }

  void selectChannel(OtpChannel channel) {
    state = state.copyWith(channel: channel);
  }

  Future<void> sendOtp() async {
    if (!state.canSendOtp) {
      state = state.copyWith(
        identifierError: 'Enter a valid email or mobile number',
      );
      return;
    }

    state = state.copyWith(isLoading: true, authError: AuthErrorCode.none);
    try {
      // TODO: POST /api/v1/auth/forgot-password/send-otp
      await Future<void>.delayed(const Duration(milliseconds: 900));
      state = state.copyWith(
        isLoading: false,
        otpSent: true,
        countdownSeconds: 60,
        canResend: false,
      );
      _startCountdown();
    } on Exception {
      state = state.copyWith(
        isLoading: false,
        authError: AuthErrorCode.networkError,
      );
    }
  }

  // ── Step 2: OTP ────────────────────────────────────────────────────────

  void onOtpChanged(String value) {
    state = state.copyWith(otp: value, otpError: null);
    if (value.length == 6) verifyOtp();
  }

  Future<void> verifyOtp() async {
    state = state.copyWith(isLoading: true, otpError: null);
    try {
      // TODO: POST /api/v1/auth/forgot-password/verify-otp
      await Future<void>.delayed(const Duration(milliseconds: 700));
      state = state.copyWith(isLoading: false, otpVerified: true);
    } on Exception {
      state = state.copyWith(
        isLoading: false,
        otpError: 'Incorrect or expired code. Please try again.',
        otp: '',
      );
    }
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

    if (state.newPassword.length < 8) {
      passwordError = 'Password must be at least 8 characters';
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
    try {
      // TODO: POST /api/v1/auth/forgot-password/reset
      await Future<void>.delayed(const Duration(milliseconds: 1000));
      state = state.copyWith(isLoading: false, isComplete: true);
    } on Exception {
      state = state.copyWith(
        isLoading: false,
        authError: AuthErrorCode.serverError,
      );
    }
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
