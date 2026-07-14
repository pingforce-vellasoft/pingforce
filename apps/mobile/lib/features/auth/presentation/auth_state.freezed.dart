// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'auth_state.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
  'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models',
);

/// @nodoc
mixin _$LoginState {
  LoginStep get step => throw _privateConstructorUsedError;
  String get tenantCode => throw _privateConstructorUsedError;
  String get username => throw _privateConstructorUsedError;
  String get password => throw _privateConstructorUsedError;
  bool get isPasswordVisible => throw _privateConstructorUsedError;
  bool get rememberDevice => throw _privateConstructorUsedError;
  bool get isLoading => throw _privateConstructorUsedError;
  bool get isBiometricAvailable => throw _privateConstructorUsedError;
  bool get isBiometricEnabled =>
      throw _privateConstructorUsedError; // Validation
  String? get tenantCodeError =>
      throw _privateConstructorUsedError; // inline field-level error
  String? get usernameError => throw _privateConstructorUsedError;
  String? get passwordError =>
      throw _privateConstructorUsedError; // Auth error banner (AUTH-001 to AUTH-008)
  AuthErrorCode get authError =>
      throw _privateConstructorUsedError; // Tenant branding (revealed after step 1 resolves)
  String? get resolvedTenantName => throw _privateConstructorUsedError;
  String? get resolvedTenantLogoUrl => throw _privateConstructorUsedError;

  /// Create a copy of LoginState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $LoginStateCopyWith<LoginState> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $LoginStateCopyWith<$Res> {
  factory $LoginStateCopyWith(
    LoginState value,
    $Res Function(LoginState) then,
  ) = _$LoginStateCopyWithImpl<$Res, LoginState>;
  @useResult
  $Res call({
    LoginStep step,
    String tenantCode,
    String username,
    String password,
    bool isPasswordVisible,
    bool rememberDevice,
    bool isLoading,
    bool isBiometricAvailable,
    bool isBiometricEnabled,
    String? tenantCodeError,
    String? usernameError,
    String? passwordError,
    AuthErrorCode authError,
    String? resolvedTenantName,
    String? resolvedTenantLogoUrl,
  });
}

/// @nodoc
class _$LoginStateCopyWithImpl<$Res, $Val extends LoginState>
    implements $LoginStateCopyWith<$Res> {
  _$LoginStateCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of LoginState
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? step = null,
    Object? tenantCode = null,
    Object? username = null,
    Object? password = null,
    Object? isPasswordVisible = null,
    Object? rememberDevice = null,
    Object? isLoading = null,
    Object? isBiometricAvailable = null,
    Object? isBiometricEnabled = null,
    Object? tenantCodeError = freezed,
    Object? usernameError = freezed,
    Object? passwordError = freezed,
    Object? authError = null,
    Object? resolvedTenantName = freezed,
    Object? resolvedTenantLogoUrl = freezed,
  }) {
    return _then(
      _value.copyWith(
            step: null == step
                ? _value.step
                : step // ignore: cast_nullable_to_non_nullable
                      as LoginStep,
            tenantCode: null == tenantCode
                ? _value.tenantCode
                : tenantCode // ignore: cast_nullable_to_non_nullable
                      as String,
            username: null == username
                ? _value.username
                : username // ignore: cast_nullable_to_non_nullable
                      as String,
            password: null == password
                ? _value.password
                : password // ignore: cast_nullable_to_non_nullable
                      as String,
            isPasswordVisible: null == isPasswordVisible
                ? _value.isPasswordVisible
                : isPasswordVisible // ignore: cast_nullable_to_non_nullable
                      as bool,
            rememberDevice: null == rememberDevice
                ? _value.rememberDevice
                : rememberDevice // ignore: cast_nullable_to_non_nullable
                      as bool,
            isLoading: null == isLoading
                ? _value.isLoading
                : isLoading // ignore: cast_nullable_to_non_nullable
                      as bool,
            isBiometricAvailable: null == isBiometricAvailable
                ? _value.isBiometricAvailable
                : isBiometricAvailable // ignore: cast_nullable_to_non_nullable
                      as bool,
            isBiometricEnabled: null == isBiometricEnabled
                ? _value.isBiometricEnabled
                : isBiometricEnabled // ignore: cast_nullable_to_non_nullable
                      as bool,
            tenantCodeError: freezed == tenantCodeError
                ? _value.tenantCodeError
                : tenantCodeError // ignore: cast_nullable_to_non_nullable
                      as String?,
            usernameError: freezed == usernameError
                ? _value.usernameError
                : usernameError // ignore: cast_nullable_to_non_nullable
                      as String?,
            passwordError: freezed == passwordError
                ? _value.passwordError
                : passwordError // ignore: cast_nullable_to_non_nullable
                      as String?,
            authError: null == authError
                ? _value.authError
                : authError // ignore: cast_nullable_to_non_nullable
                      as AuthErrorCode,
            resolvedTenantName: freezed == resolvedTenantName
                ? _value.resolvedTenantName
                : resolvedTenantName // ignore: cast_nullable_to_non_nullable
                      as String?,
            resolvedTenantLogoUrl: freezed == resolvedTenantLogoUrl
                ? _value.resolvedTenantLogoUrl
                : resolvedTenantLogoUrl // ignore: cast_nullable_to_non_nullable
                      as String?,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$LoginStateImplCopyWith<$Res>
    implements $LoginStateCopyWith<$Res> {
  factory _$$LoginStateImplCopyWith(
    _$LoginStateImpl value,
    $Res Function(_$LoginStateImpl) then,
  ) = _$$LoginStateImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    LoginStep step,
    String tenantCode,
    String username,
    String password,
    bool isPasswordVisible,
    bool rememberDevice,
    bool isLoading,
    bool isBiometricAvailable,
    bool isBiometricEnabled,
    String? tenantCodeError,
    String? usernameError,
    String? passwordError,
    AuthErrorCode authError,
    String? resolvedTenantName,
    String? resolvedTenantLogoUrl,
  });
}

/// @nodoc
class _$$LoginStateImplCopyWithImpl<$Res>
    extends _$LoginStateCopyWithImpl<$Res, _$LoginStateImpl>
    implements _$$LoginStateImplCopyWith<$Res> {
  _$$LoginStateImplCopyWithImpl(
    _$LoginStateImpl _value,
    $Res Function(_$LoginStateImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of LoginState
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? step = null,
    Object? tenantCode = null,
    Object? username = null,
    Object? password = null,
    Object? isPasswordVisible = null,
    Object? rememberDevice = null,
    Object? isLoading = null,
    Object? isBiometricAvailable = null,
    Object? isBiometricEnabled = null,
    Object? tenantCodeError = freezed,
    Object? usernameError = freezed,
    Object? passwordError = freezed,
    Object? authError = null,
    Object? resolvedTenantName = freezed,
    Object? resolvedTenantLogoUrl = freezed,
  }) {
    return _then(
      _$LoginStateImpl(
        step: null == step
            ? _value.step
            : step // ignore: cast_nullable_to_non_nullable
                  as LoginStep,
        tenantCode: null == tenantCode
            ? _value.tenantCode
            : tenantCode // ignore: cast_nullable_to_non_nullable
                  as String,
        username: null == username
            ? _value.username
            : username // ignore: cast_nullable_to_non_nullable
                  as String,
        password: null == password
            ? _value.password
            : password // ignore: cast_nullable_to_non_nullable
                  as String,
        isPasswordVisible: null == isPasswordVisible
            ? _value.isPasswordVisible
            : isPasswordVisible // ignore: cast_nullable_to_non_nullable
                  as bool,
        rememberDevice: null == rememberDevice
            ? _value.rememberDevice
            : rememberDevice // ignore: cast_nullable_to_non_nullable
                  as bool,
        isLoading: null == isLoading
            ? _value.isLoading
            : isLoading // ignore: cast_nullable_to_non_nullable
                  as bool,
        isBiometricAvailable: null == isBiometricAvailable
            ? _value.isBiometricAvailable
            : isBiometricAvailable // ignore: cast_nullable_to_non_nullable
                  as bool,
        isBiometricEnabled: null == isBiometricEnabled
            ? _value.isBiometricEnabled
            : isBiometricEnabled // ignore: cast_nullable_to_non_nullable
                  as bool,
        tenantCodeError: freezed == tenantCodeError
            ? _value.tenantCodeError
            : tenantCodeError // ignore: cast_nullable_to_non_nullable
                  as String?,
        usernameError: freezed == usernameError
            ? _value.usernameError
            : usernameError // ignore: cast_nullable_to_non_nullable
                  as String?,
        passwordError: freezed == passwordError
            ? _value.passwordError
            : passwordError // ignore: cast_nullable_to_non_nullable
                  as String?,
        authError: null == authError
            ? _value.authError
            : authError // ignore: cast_nullable_to_non_nullable
                  as AuthErrorCode,
        resolvedTenantName: freezed == resolvedTenantName
            ? _value.resolvedTenantName
            : resolvedTenantName // ignore: cast_nullable_to_non_nullable
                  as String?,
        resolvedTenantLogoUrl: freezed == resolvedTenantLogoUrl
            ? _value.resolvedTenantLogoUrl
            : resolvedTenantLogoUrl // ignore: cast_nullable_to_non_nullable
                  as String?,
      ),
    );
  }
}

/// @nodoc

class _$LoginStateImpl extends _LoginState {
  const _$LoginStateImpl({
    this.step = LoginStep.tenantCode,
    this.tenantCode = '',
    this.username = '',
    this.password = '',
    this.isPasswordVisible = false,
    this.rememberDevice = false,
    this.isLoading = false,
    this.isBiometricAvailable = false,
    this.isBiometricEnabled = false,
    this.tenantCodeError,
    this.usernameError,
    this.passwordError,
    this.authError = AuthErrorCode.none,
    this.resolvedTenantName,
    this.resolvedTenantLogoUrl,
  }) : super._();

  @override
  @JsonKey()
  final LoginStep step;
  @override
  @JsonKey()
  final String tenantCode;
  @override
  @JsonKey()
  final String username;
  @override
  @JsonKey()
  final String password;
  @override
  @JsonKey()
  final bool isPasswordVisible;
  @override
  @JsonKey()
  final bool rememberDevice;
  @override
  @JsonKey()
  final bool isLoading;
  @override
  @JsonKey()
  final bool isBiometricAvailable;
  @override
  @JsonKey()
  final bool isBiometricEnabled;
  // Validation
  @override
  final String? tenantCodeError;
  // inline field-level error
  @override
  final String? usernameError;
  @override
  final String? passwordError;
  // Auth error banner (AUTH-001 to AUTH-008)
  @override
  @JsonKey()
  final AuthErrorCode authError;
  // Tenant branding (revealed after step 1 resolves)
  @override
  final String? resolvedTenantName;
  @override
  final String? resolvedTenantLogoUrl;

  @override
  String toString() {
    return 'LoginState(step: $step, tenantCode: $tenantCode, username: $username, password: $password, isPasswordVisible: $isPasswordVisible, rememberDevice: $rememberDevice, isLoading: $isLoading, isBiometricAvailable: $isBiometricAvailable, isBiometricEnabled: $isBiometricEnabled, tenantCodeError: $tenantCodeError, usernameError: $usernameError, passwordError: $passwordError, authError: $authError, resolvedTenantName: $resolvedTenantName, resolvedTenantLogoUrl: $resolvedTenantLogoUrl)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$LoginStateImpl &&
            (identical(other.step, step) || other.step == step) &&
            (identical(other.tenantCode, tenantCode) ||
                other.tenantCode == tenantCode) &&
            (identical(other.username, username) ||
                other.username == username) &&
            (identical(other.password, password) ||
                other.password == password) &&
            (identical(other.isPasswordVisible, isPasswordVisible) ||
                other.isPasswordVisible == isPasswordVisible) &&
            (identical(other.rememberDevice, rememberDevice) ||
                other.rememberDevice == rememberDevice) &&
            (identical(other.isLoading, isLoading) ||
                other.isLoading == isLoading) &&
            (identical(other.isBiometricAvailable, isBiometricAvailable) ||
                other.isBiometricAvailable == isBiometricAvailable) &&
            (identical(other.isBiometricEnabled, isBiometricEnabled) ||
                other.isBiometricEnabled == isBiometricEnabled) &&
            (identical(other.tenantCodeError, tenantCodeError) ||
                other.tenantCodeError == tenantCodeError) &&
            (identical(other.usernameError, usernameError) ||
                other.usernameError == usernameError) &&
            (identical(other.passwordError, passwordError) ||
                other.passwordError == passwordError) &&
            (identical(other.authError, authError) ||
                other.authError == authError) &&
            (identical(other.resolvedTenantName, resolvedTenantName) ||
                other.resolvedTenantName == resolvedTenantName) &&
            (identical(other.resolvedTenantLogoUrl, resolvedTenantLogoUrl) ||
                other.resolvedTenantLogoUrl == resolvedTenantLogoUrl));
  }

  @override
  int get hashCode => Object.hash(
    runtimeType,
    step,
    tenantCode,
    username,
    password,
    isPasswordVisible,
    rememberDevice,
    isLoading,
    isBiometricAvailable,
    isBiometricEnabled,
    tenantCodeError,
    usernameError,
    passwordError,
    authError,
    resolvedTenantName,
    resolvedTenantLogoUrl,
  );

  /// Create a copy of LoginState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$LoginStateImplCopyWith<_$LoginStateImpl> get copyWith =>
      _$$LoginStateImplCopyWithImpl<_$LoginStateImpl>(this, _$identity);
}

abstract class _LoginState extends LoginState {
  const factory _LoginState({
    final LoginStep step,
    final String tenantCode,
    final String username,
    final String password,
    final bool isPasswordVisible,
    final bool rememberDevice,
    final bool isLoading,
    final bool isBiometricAvailable,
    final bool isBiometricEnabled,
    final String? tenantCodeError,
    final String? usernameError,
    final String? passwordError,
    final AuthErrorCode authError,
    final String? resolvedTenantName,
    final String? resolvedTenantLogoUrl,
  }) = _$LoginStateImpl;
  const _LoginState._() : super._();

  @override
  LoginStep get step;
  @override
  String get tenantCode;
  @override
  String get username;
  @override
  String get password;
  @override
  bool get isPasswordVisible;
  @override
  bool get rememberDevice;
  @override
  bool get isLoading;
  @override
  bool get isBiometricAvailable;
  @override
  bool get isBiometricEnabled; // Validation
  @override
  String? get tenantCodeError; // inline field-level error
  @override
  String? get usernameError;
  @override
  String? get passwordError; // Auth error banner (AUTH-001 to AUTH-008)
  @override
  AuthErrorCode get authError; // Tenant branding (revealed after step 1 resolves)
  @override
  String? get resolvedTenantName;
  @override
  String? get resolvedTenantLogoUrl;

  /// Create a copy of LoginState
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$LoginStateImplCopyWith<_$LoginStateImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
mixin _$ForgotPasswordState {
  String get identifier => throw _privateConstructorUsedError; // email or phone
  OtpChannel get channel => throw _privateConstructorUsedError;
  String get otp => throw _privateConstructorUsedError; // 6-digit entered OTP
  String get newPassword => throw _privateConstructorUsedError;
  String get confirmPassword => throw _privateConstructorUsedError;
  bool get isLoading => throw _privateConstructorUsedError;
  bool get otpSent => throw _privateConstructorUsedError;
  bool get otpVerified => throw _privateConstructorUsedError;
  int get countdownSeconds => throw _privateConstructorUsedError;
  bool get canResend => throw _privateConstructorUsedError;
  PasswordStrength get passwordStrength => throw _privateConstructorUsedError;
  bool get isNewPasswordVisible => throw _privateConstructorUsedError;
  bool get isConfirmPasswordVisible => throw _privateConstructorUsedError;
  String? get identifierError => throw _privateConstructorUsedError;
  String? get otpError => throw _privateConstructorUsedError;
  String? get passwordError => throw _privateConstructorUsedError;
  String? get confirmPasswordError => throw _privateConstructorUsedError;
  AuthErrorCode get authError => throw _privateConstructorUsedError;
  bool get isComplete => throw _privateConstructorUsedError;

  /// Create a copy of ForgotPasswordState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $ForgotPasswordStateCopyWith<ForgotPasswordState> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ForgotPasswordStateCopyWith<$Res> {
  factory $ForgotPasswordStateCopyWith(
    ForgotPasswordState value,
    $Res Function(ForgotPasswordState) then,
  ) = _$ForgotPasswordStateCopyWithImpl<$Res, ForgotPasswordState>;
  @useResult
  $Res call({
    String identifier,
    OtpChannel channel,
    String otp,
    String newPassword,
    String confirmPassword,
    bool isLoading,
    bool otpSent,
    bool otpVerified,
    int countdownSeconds,
    bool canResend,
    PasswordStrength passwordStrength,
    bool isNewPasswordVisible,
    bool isConfirmPasswordVisible,
    String? identifierError,
    String? otpError,
    String? passwordError,
    String? confirmPasswordError,
    AuthErrorCode authError,
    bool isComplete,
  });
}

/// @nodoc
class _$ForgotPasswordStateCopyWithImpl<$Res, $Val extends ForgotPasswordState>
    implements $ForgotPasswordStateCopyWith<$Res> {
  _$ForgotPasswordStateCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of ForgotPasswordState
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? identifier = null,
    Object? channel = null,
    Object? otp = null,
    Object? newPassword = null,
    Object? confirmPassword = null,
    Object? isLoading = null,
    Object? otpSent = null,
    Object? otpVerified = null,
    Object? countdownSeconds = null,
    Object? canResend = null,
    Object? passwordStrength = null,
    Object? isNewPasswordVisible = null,
    Object? isConfirmPasswordVisible = null,
    Object? identifierError = freezed,
    Object? otpError = freezed,
    Object? passwordError = freezed,
    Object? confirmPasswordError = freezed,
    Object? authError = null,
    Object? isComplete = null,
  }) {
    return _then(
      _value.copyWith(
            identifier: null == identifier
                ? _value.identifier
                : identifier // ignore: cast_nullable_to_non_nullable
                      as String,
            channel: null == channel
                ? _value.channel
                : channel // ignore: cast_nullable_to_non_nullable
                      as OtpChannel,
            otp: null == otp
                ? _value.otp
                : otp // ignore: cast_nullable_to_non_nullable
                      as String,
            newPassword: null == newPassword
                ? _value.newPassword
                : newPassword // ignore: cast_nullable_to_non_nullable
                      as String,
            confirmPassword: null == confirmPassword
                ? _value.confirmPassword
                : confirmPassword // ignore: cast_nullable_to_non_nullable
                      as String,
            isLoading: null == isLoading
                ? _value.isLoading
                : isLoading // ignore: cast_nullable_to_non_nullable
                      as bool,
            otpSent: null == otpSent
                ? _value.otpSent
                : otpSent // ignore: cast_nullable_to_non_nullable
                      as bool,
            otpVerified: null == otpVerified
                ? _value.otpVerified
                : otpVerified // ignore: cast_nullable_to_non_nullable
                      as bool,
            countdownSeconds: null == countdownSeconds
                ? _value.countdownSeconds
                : countdownSeconds // ignore: cast_nullable_to_non_nullable
                      as int,
            canResend: null == canResend
                ? _value.canResend
                : canResend // ignore: cast_nullable_to_non_nullable
                      as bool,
            passwordStrength: null == passwordStrength
                ? _value.passwordStrength
                : passwordStrength // ignore: cast_nullable_to_non_nullable
                      as PasswordStrength,
            isNewPasswordVisible: null == isNewPasswordVisible
                ? _value.isNewPasswordVisible
                : isNewPasswordVisible // ignore: cast_nullable_to_non_nullable
                      as bool,
            isConfirmPasswordVisible: null == isConfirmPasswordVisible
                ? _value.isConfirmPasswordVisible
                : isConfirmPasswordVisible // ignore: cast_nullable_to_non_nullable
                      as bool,
            identifierError: freezed == identifierError
                ? _value.identifierError
                : identifierError // ignore: cast_nullable_to_non_nullable
                      as String?,
            otpError: freezed == otpError
                ? _value.otpError
                : otpError // ignore: cast_nullable_to_non_nullable
                      as String?,
            passwordError: freezed == passwordError
                ? _value.passwordError
                : passwordError // ignore: cast_nullable_to_non_nullable
                      as String?,
            confirmPasswordError: freezed == confirmPasswordError
                ? _value.confirmPasswordError
                : confirmPasswordError // ignore: cast_nullable_to_non_nullable
                      as String?,
            authError: null == authError
                ? _value.authError
                : authError // ignore: cast_nullable_to_non_nullable
                      as AuthErrorCode,
            isComplete: null == isComplete
                ? _value.isComplete
                : isComplete // ignore: cast_nullable_to_non_nullable
                      as bool,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$ForgotPasswordStateImplCopyWith<$Res>
    implements $ForgotPasswordStateCopyWith<$Res> {
  factory _$$ForgotPasswordStateImplCopyWith(
    _$ForgotPasswordStateImpl value,
    $Res Function(_$ForgotPasswordStateImpl) then,
  ) = _$$ForgotPasswordStateImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    String identifier,
    OtpChannel channel,
    String otp,
    String newPassword,
    String confirmPassword,
    bool isLoading,
    bool otpSent,
    bool otpVerified,
    int countdownSeconds,
    bool canResend,
    PasswordStrength passwordStrength,
    bool isNewPasswordVisible,
    bool isConfirmPasswordVisible,
    String? identifierError,
    String? otpError,
    String? passwordError,
    String? confirmPasswordError,
    AuthErrorCode authError,
    bool isComplete,
  });
}

/// @nodoc
class _$$ForgotPasswordStateImplCopyWithImpl<$Res>
    extends _$ForgotPasswordStateCopyWithImpl<$Res, _$ForgotPasswordStateImpl>
    implements _$$ForgotPasswordStateImplCopyWith<$Res> {
  _$$ForgotPasswordStateImplCopyWithImpl(
    _$ForgotPasswordStateImpl _value,
    $Res Function(_$ForgotPasswordStateImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of ForgotPasswordState
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? identifier = null,
    Object? channel = null,
    Object? otp = null,
    Object? newPassword = null,
    Object? confirmPassword = null,
    Object? isLoading = null,
    Object? otpSent = null,
    Object? otpVerified = null,
    Object? countdownSeconds = null,
    Object? canResend = null,
    Object? passwordStrength = null,
    Object? isNewPasswordVisible = null,
    Object? isConfirmPasswordVisible = null,
    Object? identifierError = freezed,
    Object? otpError = freezed,
    Object? passwordError = freezed,
    Object? confirmPasswordError = freezed,
    Object? authError = null,
    Object? isComplete = null,
  }) {
    return _then(
      _$ForgotPasswordStateImpl(
        identifier: null == identifier
            ? _value.identifier
            : identifier // ignore: cast_nullable_to_non_nullable
                  as String,
        channel: null == channel
            ? _value.channel
            : channel // ignore: cast_nullable_to_non_nullable
                  as OtpChannel,
        otp: null == otp
            ? _value.otp
            : otp // ignore: cast_nullable_to_non_nullable
                  as String,
        newPassword: null == newPassword
            ? _value.newPassword
            : newPassword // ignore: cast_nullable_to_non_nullable
                  as String,
        confirmPassword: null == confirmPassword
            ? _value.confirmPassword
            : confirmPassword // ignore: cast_nullable_to_non_nullable
                  as String,
        isLoading: null == isLoading
            ? _value.isLoading
            : isLoading // ignore: cast_nullable_to_non_nullable
                  as bool,
        otpSent: null == otpSent
            ? _value.otpSent
            : otpSent // ignore: cast_nullable_to_non_nullable
                  as bool,
        otpVerified: null == otpVerified
            ? _value.otpVerified
            : otpVerified // ignore: cast_nullable_to_non_nullable
                  as bool,
        countdownSeconds: null == countdownSeconds
            ? _value.countdownSeconds
            : countdownSeconds // ignore: cast_nullable_to_non_nullable
                  as int,
        canResend: null == canResend
            ? _value.canResend
            : canResend // ignore: cast_nullable_to_non_nullable
                  as bool,
        passwordStrength: null == passwordStrength
            ? _value.passwordStrength
            : passwordStrength // ignore: cast_nullable_to_non_nullable
                  as PasswordStrength,
        isNewPasswordVisible: null == isNewPasswordVisible
            ? _value.isNewPasswordVisible
            : isNewPasswordVisible // ignore: cast_nullable_to_non_nullable
                  as bool,
        isConfirmPasswordVisible: null == isConfirmPasswordVisible
            ? _value.isConfirmPasswordVisible
            : isConfirmPasswordVisible // ignore: cast_nullable_to_non_nullable
                  as bool,
        identifierError: freezed == identifierError
            ? _value.identifierError
            : identifierError // ignore: cast_nullable_to_non_nullable
                  as String?,
        otpError: freezed == otpError
            ? _value.otpError
            : otpError // ignore: cast_nullable_to_non_nullable
                  as String?,
        passwordError: freezed == passwordError
            ? _value.passwordError
            : passwordError // ignore: cast_nullable_to_non_nullable
                  as String?,
        confirmPasswordError: freezed == confirmPasswordError
            ? _value.confirmPasswordError
            : confirmPasswordError // ignore: cast_nullable_to_non_nullable
                  as String?,
        authError: null == authError
            ? _value.authError
            : authError // ignore: cast_nullable_to_non_nullable
                  as AuthErrorCode,
        isComplete: null == isComplete
            ? _value.isComplete
            : isComplete // ignore: cast_nullable_to_non_nullable
                  as bool,
      ),
    );
  }
}

/// @nodoc

class _$ForgotPasswordStateImpl extends _ForgotPasswordState {
  const _$ForgotPasswordStateImpl({
    this.identifier = '',
    this.channel = OtpChannel.email,
    this.otp = '',
    this.newPassword = '',
    this.confirmPassword = '',
    this.isLoading = false,
    this.otpSent = false,
    this.otpVerified = false,
    this.countdownSeconds = 60,
    this.canResend = false,
    this.passwordStrength = PasswordStrength.empty,
    this.isNewPasswordVisible = false,
    this.isConfirmPasswordVisible = false,
    this.identifierError,
    this.otpError,
    this.passwordError,
    this.confirmPasswordError,
    this.authError = AuthErrorCode.none,
    this.isComplete = false,
  }) : super._();

  @override
  @JsonKey()
  final String identifier;
  // email or phone
  @override
  @JsonKey()
  final OtpChannel channel;
  @override
  @JsonKey()
  final String otp;
  // 6-digit entered OTP
  @override
  @JsonKey()
  final String newPassword;
  @override
  @JsonKey()
  final String confirmPassword;
  @override
  @JsonKey()
  final bool isLoading;
  @override
  @JsonKey()
  final bool otpSent;
  @override
  @JsonKey()
  final bool otpVerified;
  @override
  @JsonKey()
  final int countdownSeconds;
  @override
  @JsonKey()
  final bool canResend;
  @override
  @JsonKey()
  final PasswordStrength passwordStrength;
  @override
  @JsonKey()
  final bool isNewPasswordVisible;
  @override
  @JsonKey()
  final bool isConfirmPasswordVisible;
  @override
  final String? identifierError;
  @override
  final String? otpError;
  @override
  final String? passwordError;
  @override
  final String? confirmPasswordError;
  @override
  @JsonKey()
  final AuthErrorCode authError;
  @override
  @JsonKey()
  final bool isComplete;

  @override
  String toString() {
    return 'ForgotPasswordState(identifier: $identifier, channel: $channel, otp: $otp, newPassword: $newPassword, confirmPassword: $confirmPassword, isLoading: $isLoading, otpSent: $otpSent, otpVerified: $otpVerified, countdownSeconds: $countdownSeconds, canResend: $canResend, passwordStrength: $passwordStrength, isNewPasswordVisible: $isNewPasswordVisible, isConfirmPasswordVisible: $isConfirmPasswordVisible, identifierError: $identifierError, otpError: $otpError, passwordError: $passwordError, confirmPasswordError: $confirmPasswordError, authError: $authError, isComplete: $isComplete)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ForgotPasswordStateImpl &&
            (identical(other.identifier, identifier) ||
                other.identifier == identifier) &&
            (identical(other.channel, channel) || other.channel == channel) &&
            (identical(other.otp, otp) || other.otp == otp) &&
            (identical(other.newPassword, newPassword) ||
                other.newPassword == newPassword) &&
            (identical(other.confirmPassword, confirmPassword) ||
                other.confirmPassword == confirmPassword) &&
            (identical(other.isLoading, isLoading) ||
                other.isLoading == isLoading) &&
            (identical(other.otpSent, otpSent) || other.otpSent == otpSent) &&
            (identical(other.otpVerified, otpVerified) ||
                other.otpVerified == otpVerified) &&
            (identical(other.countdownSeconds, countdownSeconds) ||
                other.countdownSeconds == countdownSeconds) &&
            (identical(other.canResend, canResend) ||
                other.canResend == canResend) &&
            (identical(other.passwordStrength, passwordStrength) ||
                other.passwordStrength == passwordStrength) &&
            (identical(other.isNewPasswordVisible, isNewPasswordVisible) ||
                other.isNewPasswordVisible == isNewPasswordVisible) &&
            (identical(
                  other.isConfirmPasswordVisible,
                  isConfirmPasswordVisible,
                ) ||
                other.isConfirmPasswordVisible == isConfirmPasswordVisible) &&
            (identical(other.identifierError, identifierError) ||
                other.identifierError == identifierError) &&
            (identical(other.otpError, otpError) ||
                other.otpError == otpError) &&
            (identical(other.passwordError, passwordError) ||
                other.passwordError == passwordError) &&
            (identical(other.confirmPasswordError, confirmPasswordError) ||
                other.confirmPasswordError == confirmPasswordError) &&
            (identical(other.authError, authError) ||
                other.authError == authError) &&
            (identical(other.isComplete, isComplete) ||
                other.isComplete == isComplete));
  }

  @override
  int get hashCode => Object.hashAll([
    runtimeType,
    identifier,
    channel,
    otp,
    newPassword,
    confirmPassword,
    isLoading,
    otpSent,
    otpVerified,
    countdownSeconds,
    canResend,
    passwordStrength,
    isNewPasswordVisible,
    isConfirmPasswordVisible,
    identifierError,
    otpError,
    passwordError,
    confirmPasswordError,
    authError,
    isComplete,
  ]);

  /// Create a copy of ForgotPasswordState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$ForgotPasswordStateImplCopyWith<_$ForgotPasswordStateImpl> get copyWith =>
      _$$ForgotPasswordStateImplCopyWithImpl<_$ForgotPasswordStateImpl>(
        this,
        _$identity,
      );
}

abstract class _ForgotPasswordState extends ForgotPasswordState {
  const factory _ForgotPasswordState({
    final String identifier,
    final OtpChannel channel,
    final String otp,
    final String newPassword,
    final String confirmPassword,
    final bool isLoading,
    final bool otpSent,
    final bool otpVerified,
    final int countdownSeconds,
    final bool canResend,
    final PasswordStrength passwordStrength,
    final bool isNewPasswordVisible,
    final bool isConfirmPasswordVisible,
    final String? identifierError,
    final String? otpError,
    final String? passwordError,
    final String? confirmPasswordError,
    final AuthErrorCode authError,
    final bool isComplete,
  }) = _$ForgotPasswordStateImpl;
  const _ForgotPasswordState._() : super._();

  @override
  String get identifier; // email or phone
  @override
  OtpChannel get channel;
  @override
  String get otp; // 6-digit entered OTP
  @override
  String get newPassword;
  @override
  String get confirmPassword;
  @override
  bool get isLoading;
  @override
  bool get otpSent;
  @override
  bool get otpVerified;
  @override
  int get countdownSeconds;
  @override
  bool get canResend;
  @override
  PasswordStrength get passwordStrength;
  @override
  bool get isNewPasswordVisible;
  @override
  bool get isConfirmPasswordVisible;
  @override
  String? get identifierError;
  @override
  String? get otpError;
  @override
  String? get passwordError;
  @override
  String? get confirmPasswordError;
  @override
  AuthErrorCode get authError;
  @override
  bool get isComplete;

  /// Create a copy of ForgotPasswordState
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$ForgotPasswordStateImplCopyWith<_$ForgotPasswordStateImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
