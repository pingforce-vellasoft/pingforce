import 'package:freezed_annotation/freezed_annotation.dart';

part 'auth_state.freezed.dart';

// ─────────────────────────────────────────────────────────────────────────────
// AUTH STATE  (AUDIT §3 — Authentication Screens)
// ─────────────────────────────────────────────────────────────────────────────

// ── Login steps ────────────────────────────────────────────────────────────

enum LoginStep {
  tenantCode,   // Step 1: Enter workspace code
  credentials,  // Step 2: Email/employee ID + password
}

// ── Auth error codes ───────────────────────────────────────────────────────
// Mirrors backend AUTH-001 through AUTH-008

enum AuthErrorCode {
  none,
  invalidTenantCode,    // AUTH-001: Workspace code not found
  tenantSuspended,      // AUTH-002: Workspace suspended
  invalidCredentials,   // AUTH-003: Wrong username or password
  accountLocked,        // AUTH-004: Too many failed attempts
  accountDisabled,      // AUTH-005: Account deactivated
  sessionExpired,       // AUTH-006: Token expired
  deviceNotRegistered,  // AUTH-007: Device not enrolled for this account
  mfaRequired,          // AUTH-008: Multi-factor required
  networkError,         // Network timeout / no connection
  serverError,          // 5xx
}

extension AuthErrorCodeX on AuthErrorCode {
  String get title => switch (this) {
        AuthErrorCode.none => '',
        AuthErrorCode.invalidTenantCode =>
          'Workspace Not Found',
        AuthErrorCode.tenantSuspended =>
          'Workspace Suspended',
        AuthErrorCode.invalidCredentials =>
          'Incorrect Credentials',
        AuthErrorCode.accountLocked =>
          'Account Locked',
        AuthErrorCode.accountDisabled =>
          'Account Disabled',
        AuthErrorCode.sessionExpired =>
          'Session Expired',
        AuthErrorCode.deviceNotRegistered =>
          'Device Not Registered',
        AuthErrorCode.mfaRequired =>
          'Verification Required',
        AuthErrorCode.networkError =>
          'Connection Problem',
        AuthErrorCode.serverError =>
          'Server Error',
      };

  String get message => switch (this) {
        AuthErrorCode.none => '',
        AuthErrorCode.invalidTenantCode =>
          'The workspace code you entered doesn\'t exist. Please check and try again.',
        AuthErrorCode.tenantSuspended =>
          'This workspace has been suspended. Contact your administrator.',
        AuthErrorCode.invalidCredentials =>
          'Your email or password is incorrect. Please try again.',
        AuthErrorCode.accountLocked =>
          'Your account is temporarily locked due to too many failed attempts. Try again in 15 minutes.',
        AuthErrorCode.accountDisabled =>
          'Your account has been disabled. Please contact your administrator.',
        AuthErrorCode.sessionExpired =>
          'Your session has expired. Please sign in again.',
        AuthErrorCode.deviceNotRegistered =>
          'This device is not registered for your account. Please register it first.',
        AuthErrorCode.mfaRequired =>
          'An additional verification step is required.',
        AuthErrorCode.networkError =>
          'Unable to connect. Please check your internet connection.',
        AuthErrorCode.serverError =>
          'A server error occurred. Please try again in a moment.',
      };

  bool get isCritical => switch (this) {
        AuthErrorCode.accountLocked ||
        AuthErrorCode.accountDisabled ||
        AuthErrorCode.tenantSuspended =>
          true,
        _ => false,
      };
}

// ── Password strength ──────────────────────────────────────────────────────

enum PasswordStrength { empty, weak, fair, strong, veryStrong }

extension PasswordStrengthX on PasswordStrength {
  String get label => switch (this) {
        PasswordStrength.empty => '',
        PasswordStrength.weak => 'Weak',
        PasswordStrength.fair => 'Fair',
        PasswordStrength.strong => 'Strong',
        PasswordStrength.veryStrong => 'Very Strong',
      };

  double get progress => switch (this) {
        PasswordStrength.empty => 0,
        PasswordStrength.weak => 0.25,
        PasswordStrength.fair => 0.5,
        PasswordStrength.strong => 0.75,
        PasswordStrength.veryStrong => 1.0,
      };
}

// ── OTP channel ────────────────────────────────────────────────────────────

enum OtpChannel { email, sms }

// ── Login state ────────────────────────────────────────────────────────────

@freezed
class LoginState with _$LoginState {
  const factory LoginState({
    @Default(LoginStep.tenantCode) LoginStep step,
    @Default('') String tenantCode,
    @Default('') String username,
    @Default('') String password,
    @Default(false) bool isPasswordVisible,
    @Default(false) bool rememberDevice,
    @Default(false) bool isLoading,
    @Default(false) bool isBiometricAvailable,
    @Default(false) bool isBiometricEnabled,
    // Validation
    String? tenantCodeError,  // inline field-level error
    String? usernameError,
    String? passwordError,
    // Auth error banner (AUTH-001 to AUTH-008)
    @Default(AuthErrorCode.none) AuthErrorCode authError,
    // Tenant branding (revealed after step 1 resolves)
    String? resolvedTenantName,
    String? resolvedTenantLogoUrl,
  }) = _LoginState;

  const LoginState._();

  bool get hasBanner =>
      authError != AuthErrorCode.none;
  bool get hasFieldErrors =>
      tenantCodeError != null ||
      usernameError != null ||
      passwordError != null;

  bool get canSubmitTenantStep =>
      tenantCode.trim().length >= 3;

  bool get canSubmitCredentials =>
      username.trim().isNotEmpty && password.length >= 6;
}

// ── Forgot password state ──────────────────────────────────────────────────

@freezed
class ForgotPasswordState with _$ForgotPasswordState {
  const factory ForgotPasswordState({
    @Default('') String identifier,   // email or phone
    @Default(OtpChannel.email) OtpChannel channel,
    @Default('') String otp,          // 6-digit entered OTP
    @Default('') String newPassword,
    @Default('') String confirmPassword,
    @Default(false) bool isLoading,
    @Default(false) bool otpSent,
    @Default(false) bool otpVerified,
    @Default(60) int countdownSeconds,
    @Default(false) bool canResend,
    @Default(PasswordStrength.empty) PasswordStrength passwordStrength,
    @Default(false) bool isNewPasswordVisible,
    @Default(false) bool isConfirmPasswordVisible,
    String? identifierError,
    String? otpError,
    String? passwordError,
    String? confirmPasswordError,
    @Default(AuthErrorCode.none) AuthErrorCode authError,
    @Default(false) bool isComplete,  // password reset successful
  }) = _ForgotPasswordState;

  const ForgotPasswordState._();

  bool get canSendOtp => identifier.trim().length >= 6;
  bool get canVerifyOtp => otp.length == 6;
  bool get passwordsMatch => newPassword == confirmPassword;
  bool get canSubmitNewPassword =>
      newPassword.length >= 8 &&
      passwordsMatch &&
      passwordStrength != PasswordStrength.weak;
}

// ── Password strength calculator ───────────────────────────────────────────

PasswordStrength calculatePasswordStrength(String password) {
  if (password.isEmpty) return PasswordStrength.empty;
  if (password.length < 6) return PasswordStrength.weak;

  int score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (RegExp(r'[A-Z]').hasMatch(password)) score++;
  if (RegExp(r'[0-9]').hasMatch(password)) score++;
  if (RegExp(r'[!@#\$%^&*(),.?":{}|<>]').hasMatch(password)) score++;

  return switch (score) {
    0 || 1 => PasswordStrength.weak,
    2 => PasswordStrength.fair,
    3 => PasswordStrength.strong,
    _ => PasswordStrength.veryStrong,
  };
}
