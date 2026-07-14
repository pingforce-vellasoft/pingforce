// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'tenant_state.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
  'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models',
);

/// @nodoc
mixin _$TenantBranding {
  String get tenantName => throw _privateConstructorUsedError;
  String get tenantCode => throw _privateConstructorUsedError;
  String? get logoUrl =>
      throw _privateConstructorUsedError; // Remote URL for tenant logo
  String? get primaryColorHex =>
      throw _privateConstructorUsedError; // Override theme seed color
  String? get tagline =>
      throw _privateConstructorUsedError; // Custom tagline shown on splash
  bool get isWhiteLabel => throw _privateConstructorUsedError;

  /// Create a copy of TenantBranding
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $TenantBrandingCopyWith<TenantBranding> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $TenantBrandingCopyWith<$Res> {
  factory $TenantBrandingCopyWith(
    TenantBranding value,
    $Res Function(TenantBranding) then,
  ) = _$TenantBrandingCopyWithImpl<$Res, TenantBranding>;
  @useResult
  $Res call({
    String tenantName,
    String tenantCode,
    String? logoUrl,
    String? primaryColorHex,
    String? tagline,
    bool isWhiteLabel,
  });
}

/// @nodoc
class _$TenantBrandingCopyWithImpl<$Res, $Val extends TenantBranding>
    implements $TenantBrandingCopyWith<$Res> {
  _$TenantBrandingCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of TenantBranding
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? tenantName = null,
    Object? tenantCode = null,
    Object? logoUrl = freezed,
    Object? primaryColorHex = freezed,
    Object? tagline = freezed,
    Object? isWhiteLabel = null,
  }) {
    return _then(
      _value.copyWith(
            tenantName: null == tenantName
                ? _value.tenantName
                : tenantName // ignore: cast_nullable_to_non_nullable
                      as String,
            tenantCode: null == tenantCode
                ? _value.tenantCode
                : tenantCode // ignore: cast_nullable_to_non_nullable
                      as String,
            logoUrl: freezed == logoUrl
                ? _value.logoUrl
                : logoUrl // ignore: cast_nullable_to_non_nullable
                      as String?,
            primaryColorHex: freezed == primaryColorHex
                ? _value.primaryColorHex
                : primaryColorHex // ignore: cast_nullable_to_non_nullable
                      as String?,
            tagline: freezed == tagline
                ? _value.tagline
                : tagline // ignore: cast_nullable_to_non_nullable
                      as String?,
            isWhiteLabel: null == isWhiteLabel
                ? _value.isWhiteLabel
                : isWhiteLabel // ignore: cast_nullable_to_non_nullable
                      as bool,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$TenantBrandingImplCopyWith<$Res>
    implements $TenantBrandingCopyWith<$Res> {
  factory _$$TenantBrandingImplCopyWith(
    _$TenantBrandingImpl value,
    $Res Function(_$TenantBrandingImpl) then,
  ) = _$$TenantBrandingImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    String tenantName,
    String tenantCode,
    String? logoUrl,
    String? primaryColorHex,
    String? tagline,
    bool isWhiteLabel,
  });
}

/// @nodoc
class _$$TenantBrandingImplCopyWithImpl<$Res>
    extends _$TenantBrandingCopyWithImpl<$Res, _$TenantBrandingImpl>
    implements _$$TenantBrandingImplCopyWith<$Res> {
  _$$TenantBrandingImplCopyWithImpl(
    _$TenantBrandingImpl _value,
    $Res Function(_$TenantBrandingImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of TenantBranding
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? tenantName = null,
    Object? tenantCode = null,
    Object? logoUrl = freezed,
    Object? primaryColorHex = freezed,
    Object? tagline = freezed,
    Object? isWhiteLabel = null,
  }) {
    return _then(
      _$TenantBrandingImpl(
        tenantName: null == tenantName
            ? _value.tenantName
            : tenantName // ignore: cast_nullable_to_non_nullable
                  as String,
        tenantCode: null == tenantCode
            ? _value.tenantCode
            : tenantCode // ignore: cast_nullable_to_non_nullable
                  as String,
        logoUrl: freezed == logoUrl
            ? _value.logoUrl
            : logoUrl // ignore: cast_nullable_to_non_nullable
                  as String?,
        primaryColorHex: freezed == primaryColorHex
            ? _value.primaryColorHex
            : primaryColorHex // ignore: cast_nullable_to_non_nullable
                  as String?,
        tagline: freezed == tagline
            ? _value.tagline
            : tagline // ignore: cast_nullable_to_non_nullable
                  as String?,
        isWhiteLabel: null == isWhiteLabel
            ? _value.isWhiteLabel
            : isWhiteLabel // ignore: cast_nullable_to_non_nullable
                  as bool,
      ),
    );
  }
}

/// @nodoc

class _$TenantBrandingImpl implements _TenantBranding {
  const _$TenantBrandingImpl({
    required this.tenantName,
    required this.tenantCode,
    this.logoUrl,
    this.primaryColorHex,
    this.tagline,
    this.isWhiteLabel = false,
  });

  @override
  final String tenantName;
  @override
  final String tenantCode;
  @override
  final String? logoUrl;
  // Remote URL for tenant logo
  @override
  final String? primaryColorHex;
  // Override theme seed color
  @override
  final String? tagline;
  // Custom tagline shown on splash
  @override
  @JsonKey()
  final bool isWhiteLabel;

  @override
  String toString() {
    return 'TenantBranding(tenantName: $tenantName, tenantCode: $tenantCode, logoUrl: $logoUrl, primaryColorHex: $primaryColorHex, tagline: $tagline, isWhiteLabel: $isWhiteLabel)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$TenantBrandingImpl &&
            (identical(other.tenantName, tenantName) ||
                other.tenantName == tenantName) &&
            (identical(other.tenantCode, tenantCode) ||
                other.tenantCode == tenantCode) &&
            (identical(other.logoUrl, logoUrl) || other.logoUrl == logoUrl) &&
            (identical(other.primaryColorHex, primaryColorHex) ||
                other.primaryColorHex == primaryColorHex) &&
            (identical(other.tagline, tagline) || other.tagline == tagline) &&
            (identical(other.isWhiteLabel, isWhiteLabel) ||
                other.isWhiteLabel == isWhiteLabel));
  }

  @override
  int get hashCode => Object.hash(
    runtimeType,
    tenantName,
    tenantCode,
    logoUrl,
    primaryColorHex,
    tagline,
    isWhiteLabel,
  );

  /// Create a copy of TenantBranding
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$TenantBrandingImplCopyWith<_$TenantBrandingImpl> get copyWith =>
      _$$TenantBrandingImplCopyWithImpl<_$TenantBrandingImpl>(
        this,
        _$identity,
      );
}

abstract class _TenantBranding implements TenantBranding {
  const factory _TenantBranding({
    required final String tenantName,
    required final String tenantCode,
    final String? logoUrl,
    final String? primaryColorHex,
    final String? tagline,
    final bool isWhiteLabel,
  }) = _$TenantBrandingImpl;

  @override
  String get tenantName;
  @override
  String get tenantCode;
  @override
  String? get logoUrl; // Remote URL for tenant logo
  @override
  String? get primaryColorHex; // Override theme seed color
  @override
  String? get tagline; // Custom tagline shown on splash
  @override
  bool get isWhiteLabel;

  /// Create a copy of TenantBranding
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$TenantBrandingImplCopyWith<_$TenantBrandingImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
mixin _$TenantConfig {
  TenantBranding get branding => throw _privateConstructorUsedError;
  List<String> get enabledModules => throw _privateConstructorUsedError;
  Map<String, bool> get featureFlags => throw _privateConstructorUsedError;
  Map<String, dynamic> get settings => throw _privateConstructorUsedError;
  String? get supportEmail => throw _privateConstructorUsedError;
  String? get supportPhone => throw _privateConstructorUsedError;

  /// Create a copy of TenantConfig
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $TenantConfigCopyWith<TenantConfig> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $TenantConfigCopyWith<$Res> {
  factory $TenantConfigCopyWith(
    TenantConfig value,
    $Res Function(TenantConfig) then,
  ) = _$TenantConfigCopyWithImpl<$Res, TenantConfig>;
  @useResult
  $Res call({
    TenantBranding branding,
    List<String> enabledModules,
    Map<String, bool> featureFlags,
    Map<String, dynamic> settings,
    String? supportEmail,
    String? supportPhone,
  });

  $TenantBrandingCopyWith<$Res> get branding;
}

/// @nodoc
class _$TenantConfigCopyWithImpl<$Res, $Val extends TenantConfig>
    implements $TenantConfigCopyWith<$Res> {
  _$TenantConfigCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of TenantConfig
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? branding = null,
    Object? enabledModules = null,
    Object? featureFlags = null,
    Object? settings = null,
    Object? supportEmail = freezed,
    Object? supportPhone = freezed,
  }) {
    return _then(
      _value.copyWith(
            branding: null == branding
                ? _value.branding
                : branding // ignore: cast_nullable_to_non_nullable
                      as TenantBranding,
            enabledModules: null == enabledModules
                ? _value.enabledModules
                : enabledModules // ignore: cast_nullable_to_non_nullable
                      as List<String>,
            featureFlags: null == featureFlags
                ? _value.featureFlags
                : featureFlags // ignore: cast_nullable_to_non_nullable
                      as Map<String, bool>,
            settings: null == settings
                ? _value.settings
                : settings // ignore: cast_nullable_to_non_nullable
                      as Map<String, dynamic>,
            supportEmail: freezed == supportEmail
                ? _value.supportEmail
                : supportEmail // ignore: cast_nullable_to_non_nullable
                      as String?,
            supportPhone: freezed == supportPhone
                ? _value.supportPhone
                : supportPhone // ignore: cast_nullable_to_non_nullable
                      as String?,
          )
          as $Val,
    );
  }

  /// Create a copy of TenantConfig
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $TenantBrandingCopyWith<$Res> get branding {
    return $TenantBrandingCopyWith<$Res>(_value.branding, (value) {
      return _then(_value.copyWith(branding: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$TenantConfigImplCopyWith<$Res>
    implements $TenantConfigCopyWith<$Res> {
  factory _$$TenantConfigImplCopyWith(
    _$TenantConfigImpl value,
    $Res Function(_$TenantConfigImpl) then,
  ) = _$$TenantConfigImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    TenantBranding branding,
    List<String> enabledModules,
    Map<String, bool> featureFlags,
    Map<String, dynamic> settings,
    String? supportEmail,
    String? supportPhone,
  });

  @override
  $TenantBrandingCopyWith<$Res> get branding;
}

/// @nodoc
class _$$TenantConfigImplCopyWithImpl<$Res>
    extends _$TenantConfigCopyWithImpl<$Res, _$TenantConfigImpl>
    implements _$$TenantConfigImplCopyWith<$Res> {
  _$$TenantConfigImplCopyWithImpl(
    _$TenantConfigImpl _value,
    $Res Function(_$TenantConfigImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of TenantConfig
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? branding = null,
    Object? enabledModules = null,
    Object? featureFlags = null,
    Object? settings = null,
    Object? supportEmail = freezed,
    Object? supportPhone = freezed,
  }) {
    return _then(
      _$TenantConfigImpl(
        branding: null == branding
            ? _value.branding
            : branding // ignore: cast_nullable_to_non_nullable
                  as TenantBranding,
        enabledModules: null == enabledModules
            ? _value._enabledModules
            : enabledModules // ignore: cast_nullable_to_non_nullable
                  as List<String>,
        featureFlags: null == featureFlags
            ? _value._featureFlags
            : featureFlags // ignore: cast_nullable_to_non_nullable
                  as Map<String, bool>,
        settings: null == settings
            ? _value._settings
            : settings // ignore: cast_nullable_to_non_nullable
                  as Map<String, dynamic>,
        supportEmail: freezed == supportEmail
            ? _value.supportEmail
            : supportEmail // ignore: cast_nullable_to_non_nullable
                  as String?,
        supportPhone: freezed == supportPhone
            ? _value.supportPhone
            : supportPhone // ignore: cast_nullable_to_non_nullable
                  as String?,
      ),
    );
  }
}

/// @nodoc

class _$TenantConfigImpl extends _TenantConfig {
  const _$TenantConfigImpl({
    required this.branding,
    final List<String> enabledModules = const [],
    final Map<String, bool> featureFlags = const {},
    final Map<String, dynamic> settings = const {},
    this.supportEmail,
    this.supportPhone,
  }) : _enabledModules = enabledModules,
       _featureFlags = featureFlags,
       _settings = settings,
       super._();

  @override
  final TenantBranding branding;
  final List<String> _enabledModules;
  @override
  @JsonKey()
  List<String> get enabledModules {
    if (_enabledModules is EqualUnmodifiableListView) return _enabledModules;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_enabledModules);
  }

  final Map<String, bool> _featureFlags;
  @override
  @JsonKey()
  Map<String, bool> get featureFlags {
    if (_featureFlags is EqualUnmodifiableMapView) return _featureFlags;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(_featureFlags);
  }

  final Map<String, dynamic> _settings;
  @override
  @JsonKey()
  Map<String, dynamic> get settings {
    if (_settings is EqualUnmodifiableMapView) return _settings;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(_settings);
  }

  @override
  final String? supportEmail;
  @override
  final String? supportPhone;

  @override
  String toString() {
    return 'TenantConfig(branding: $branding, enabledModules: $enabledModules, featureFlags: $featureFlags, settings: $settings, supportEmail: $supportEmail, supportPhone: $supportPhone)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$TenantConfigImpl &&
            (identical(other.branding, branding) ||
                other.branding == branding) &&
            const DeepCollectionEquality().equals(
              other._enabledModules,
              _enabledModules,
            ) &&
            const DeepCollectionEquality().equals(
              other._featureFlags,
              _featureFlags,
            ) &&
            const DeepCollectionEquality().equals(other._settings, _settings) &&
            (identical(other.supportEmail, supportEmail) ||
                other.supportEmail == supportEmail) &&
            (identical(other.supportPhone, supportPhone) ||
                other.supportPhone == supportPhone));
  }

  @override
  int get hashCode => Object.hash(
    runtimeType,
    branding,
    const DeepCollectionEquality().hash(_enabledModules),
    const DeepCollectionEquality().hash(_featureFlags),
    const DeepCollectionEquality().hash(_settings),
    supportEmail,
    supportPhone,
  );

  /// Create a copy of TenantConfig
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$TenantConfigImplCopyWith<_$TenantConfigImpl> get copyWith =>
      _$$TenantConfigImplCopyWithImpl<_$TenantConfigImpl>(this, _$identity);
}

abstract class _TenantConfig extends TenantConfig {
  const factory _TenantConfig({
    required final TenantBranding branding,
    final List<String> enabledModules,
    final Map<String, bool> featureFlags,
    final Map<String, dynamic> settings,
    final String? supportEmail,
    final String? supportPhone,
  }) = _$TenantConfigImpl;
  const _TenantConfig._() : super._();

  @override
  TenantBranding get branding;
  @override
  List<String> get enabledModules;
  @override
  Map<String, bool> get featureFlags;
  @override
  Map<String, dynamic> get settings;
  @override
  String? get supportEmail;
  @override
  String? get supportPhone;

  /// Create a copy of TenantConfig
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$TenantConfigImplCopyWith<_$TenantConfigImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
mixin _$AppLaunchState {
  AppLaunchStep get step => throw _privateConstructorUsedError;
  TenantConfig? get tenantConfig => throw _privateConstructorUsedError;
  bool get isFirstLaunch => throw _privateConstructorUsedError;
  bool get isAuthenticated => throw _privateConstructorUsedError;
  String? get errorMessage => throw _privateConstructorUsedError;
  String? get errorCode => throw _privateConstructorUsedError;
  int get retryCount => throw _privateConstructorUsedError;

  /// Create a copy of AppLaunchState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $AppLaunchStateCopyWith<AppLaunchState> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $AppLaunchStateCopyWith<$Res> {
  factory $AppLaunchStateCopyWith(
    AppLaunchState value,
    $Res Function(AppLaunchState) then,
  ) = _$AppLaunchStateCopyWithImpl<$Res, AppLaunchState>;
  @useResult
  $Res call({
    AppLaunchStep step,
    TenantConfig? tenantConfig,
    bool isFirstLaunch,
    bool isAuthenticated,
    String? errorMessage,
    String? errorCode,
    int retryCount,
  });

  $TenantConfigCopyWith<$Res>? get tenantConfig;
}

/// @nodoc
class _$AppLaunchStateCopyWithImpl<$Res, $Val extends AppLaunchState>
    implements $AppLaunchStateCopyWith<$Res> {
  _$AppLaunchStateCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of AppLaunchState
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? step = null,
    Object? tenantConfig = freezed,
    Object? isFirstLaunch = null,
    Object? isAuthenticated = null,
    Object? errorMessage = freezed,
    Object? errorCode = freezed,
    Object? retryCount = null,
  }) {
    return _then(
      _value.copyWith(
            step: null == step
                ? _value.step
                : step // ignore: cast_nullable_to_non_nullable
                      as AppLaunchStep,
            tenantConfig: freezed == tenantConfig
                ? _value.tenantConfig
                : tenantConfig // ignore: cast_nullable_to_non_nullable
                      as TenantConfig?,
            isFirstLaunch: null == isFirstLaunch
                ? _value.isFirstLaunch
                : isFirstLaunch // ignore: cast_nullable_to_non_nullable
                      as bool,
            isAuthenticated: null == isAuthenticated
                ? _value.isAuthenticated
                : isAuthenticated // ignore: cast_nullable_to_non_nullable
                      as bool,
            errorMessage: freezed == errorMessage
                ? _value.errorMessage
                : errorMessage // ignore: cast_nullable_to_non_nullable
                      as String?,
            errorCode: freezed == errorCode
                ? _value.errorCode
                : errorCode // ignore: cast_nullable_to_non_nullable
                      as String?,
            retryCount: null == retryCount
                ? _value.retryCount
                : retryCount // ignore: cast_nullable_to_non_nullable
                      as int,
          )
          as $Val,
    );
  }

  /// Create a copy of AppLaunchState
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $TenantConfigCopyWith<$Res>? get tenantConfig {
    if (_value.tenantConfig == null) {
      return null;
    }

    return $TenantConfigCopyWith<$Res>(_value.tenantConfig!, (value) {
      return _then(_value.copyWith(tenantConfig: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$AppLaunchStateImplCopyWith<$Res>
    implements $AppLaunchStateCopyWith<$Res> {
  factory _$$AppLaunchStateImplCopyWith(
    _$AppLaunchStateImpl value,
    $Res Function(_$AppLaunchStateImpl) then,
  ) = _$$AppLaunchStateImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    AppLaunchStep step,
    TenantConfig? tenantConfig,
    bool isFirstLaunch,
    bool isAuthenticated,
    String? errorMessage,
    String? errorCode,
    int retryCount,
  });

  @override
  $TenantConfigCopyWith<$Res>? get tenantConfig;
}

/// @nodoc
class _$$AppLaunchStateImplCopyWithImpl<$Res>
    extends _$AppLaunchStateCopyWithImpl<$Res, _$AppLaunchStateImpl>
    implements _$$AppLaunchStateImplCopyWith<$Res> {
  _$$AppLaunchStateImplCopyWithImpl(
    _$AppLaunchStateImpl _value,
    $Res Function(_$AppLaunchStateImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of AppLaunchState
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? step = null,
    Object? tenantConfig = freezed,
    Object? isFirstLaunch = null,
    Object? isAuthenticated = null,
    Object? errorMessage = freezed,
    Object? errorCode = freezed,
    Object? retryCount = null,
  }) {
    return _then(
      _$AppLaunchStateImpl(
        step: null == step
            ? _value.step
            : step // ignore: cast_nullable_to_non_nullable
                  as AppLaunchStep,
        tenantConfig: freezed == tenantConfig
            ? _value.tenantConfig
            : tenantConfig // ignore: cast_nullable_to_non_nullable
                  as TenantConfig?,
        isFirstLaunch: null == isFirstLaunch
            ? _value.isFirstLaunch
            : isFirstLaunch // ignore: cast_nullable_to_non_nullable
                  as bool,
        isAuthenticated: null == isAuthenticated
            ? _value.isAuthenticated
            : isAuthenticated // ignore: cast_nullable_to_non_nullable
                  as bool,
        errorMessage: freezed == errorMessage
            ? _value.errorMessage
            : errorMessage // ignore: cast_nullable_to_non_nullable
                  as String?,
        errorCode: freezed == errorCode
            ? _value.errorCode
            : errorCode // ignore: cast_nullable_to_non_nullable
                  as String?,
        retryCount: null == retryCount
            ? _value.retryCount
            : retryCount // ignore: cast_nullable_to_non_nullable
                  as int,
      ),
    );
  }
}

/// @nodoc

class _$AppLaunchStateImpl extends _AppLaunchState {
  const _$AppLaunchStateImpl({
    this.step = AppLaunchStep.idle,
    this.tenantConfig,
    this.isFirstLaunch = false,
    this.isAuthenticated = false,
    this.errorMessage,
    this.errorCode,
    this.retryCount = 0,
  }) : super._();

  @override
  @JsonKey()
  final AppLaunchStep step;
  @override
  final TenantConfig? tenantConfig;
  @override
  @JsonKey()
  final bool isFirstLaunch;
  @override
  @JsonKey()
  final bool isAuthenticated;
  @override
  final String? errorMessage;
  @override
  final String? errorCode;
  @override
  @JsonKey()
  final int retryCount;

  @override
  String toString() {
    return 'AppLaunchState(step: $step, tenantConfig: $tenantConfig, isFirstLaunch: $isFirstLaunch, isAuthenticated: $isAuthenticated, errorMessage: $errorMessage, errorCode: $errorCode, retryCount: $retryCount)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$AppLaunchStateImpl &&
            (identical(other.step, step) || other.step == step) &&
            (identical(other.tenantConfig, tenantConfig) ||
                other.tenantConfig == tenantConfig) &&
            (identical(other.isFirstLaunch, isFirstLaunch) ||
                other.isFirstLaunch == isFirstLaunch) &&
            (identical(other.isAuthenticated, isAuthenticated) ||
                other.isAuthenticated == isAuthenticated) &&
            (identical(other.errorMessage, errorMessage) ||
                other.errorMessage == errorMessage) &&
            (identical(other.errorCode, errorCode) ||
                other.errorCode == errorCode) &&
            (identical(other.retryCount, retryCount) ||
                other.retryCount == retryCount));
  }

  @override
  int get hashCode => Object.hash(
    runtimeType,
    step,
    tenantConfig,
    isFirstLaunch,
    isAuthenticated,
    errorMessage,
    errorCode,
    retryCount,
  );

  /// Create a copy of AppLaunchState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$AppLaunchStateImplCopyWith<_$AppLaunchStateImpl> get copyWith =>
      _$$AppLaunchStateImplCopyWithImpl<_$AppLaunchStateImpl>(
        this,
        _$identity,
      );
}

abstract class _AppLaunchState extends AppLaunchState {
  const factory _AppLaunchState({
    final AppLaunchStep step,
    final TenantConfig? tenantConfig,
    final bool isFirstLaunch,
    final bool isAuthenticated,
    final String? errorMessage,
    final String? errorCode,
    final int retryCount,
  }) = _$AppLaunchStateImpl;
  const _AppLaunchState._() : super._();

  @override
  AppLaunchStep get step;
  @override
  TenantConfig? get tenantConfig;
  @override
  bool get isFirstLaunch;
  @override
  bool get isAuthenticated;
  @override
  String? get errorMessage;
  @override
  String? get errorCode;
  @override
  int get retryCount;

  /// Create a copy of AppLaunchState
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$AppLaunchStateImplCopyWith<_$AppLaunchStateImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
