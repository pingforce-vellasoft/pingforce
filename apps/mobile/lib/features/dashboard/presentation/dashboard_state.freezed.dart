// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'dashboard_state.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
  'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models',
);

/// @nodoc
mixin _$KpiCard {
  String get id => throw _privateConstructorUsedError;
  String get title => throw _privateConstructorUsedError;
  String get primaryValue => throw _privateConstructorUsedError;
  String get label => throw _privateConstructorUsedError;
  String get iconName =>
      throw _privateConstructorUsedError; // matches AppIcons token name
  String? get secondaryLabel => throw _privateConstructorUsedError;
  String? get trendLabel => throw _privateConstructorUsedError;
  bool get trendUp => throw _privateConstructorUsedError;
  KpiCardSeverity get severity => throw _privateConstructorUsedError;
  String? get route => throw _privateConstructorUsedError;

  /// Create a copy of KpiCard
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $KpiCardCopyWith<KpiCard> get copyWith => throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $KpiCardCopyWith<$Res> {
  factory $KpiCardCopyWith(KpiCard value, $Res Function(KpiCard) then) =
      _$KpiCardCopyWithImpl<$Res, KpiCard>;
  @useResult
  $Res call({
    String id,
    String title,
    String primaryValue,
    String label,
    String iconName,
    String? secondaryLabel,
    String? trendLabel,
    bool trendUp,
    KpiCardSeverity severity,
    String? route,
  });
}

/// @nodoc
class _$KpiCardCopyWithImpl<$Res, $Val extends KpiCard>
    implements $KpiCardCopyWith<$Res> {
  _$KpiCardCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of KpiCard
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? title = null,
    Object? primaryValue = null,
    Object? label = null,
    Object? iconName = null,
    Object? secondaryLabel = freezed,
    Object? trendLabel = freezed,
    Object? trendUp = null,
    Object? severity = null,
    Object? route = freezed,
  }) {
    return _then(
      _value.copyWith(
            id: null == id
                ? _value.id
                : id // ignore: cast_nullable_to_non_nullable
                      as String,
            title: null == title
                ? _value.title
                : title // ignore: cast_nullable_to_non_nullable
                      as String,
            primaryValue: null == primaryValue
                ? _value.primaryValue
                : primaryValue // ignore: cast_nullable_to_non_nullable
                      as String,
            label: null == label
                ? _value.label
                : label // ignore: cast_nullable_to_non_nullable
                      as String,
            iconName: null == iconName
                ? _value.iconName
                : iconName // ignore: cast_nullable_to_non_nullable
                      as String,
            secondaryLabel: freezed == secondaryLabel
                ? _value.secondaryLabel
                : secondaryLabel // ignore: cast_nullable_to_non_nullable
                      as String?,
            trendLabel: freezed == trendLabel
                ? _value.trendLabel
                : trendLabel // ignore: cast_nullable_to_non_nullable
                      as String?,
            trendUp: null == trendUp
                ? _value.trendUp
                : trendUp // ignore: cast_nullable_to_non_nullable
                      as bool,
            severity: null == severity
                ? _value.severity
                : severity // ignore: cast_nullable_to_non_nullable
                      as KpiCardSeverity,
            route: freezed == route
                ? _value.route
                : route // ignore: cast_nullable_to_non_nullable
                      as String?,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$KpiCardImplCopyWith<$Res> implements $KpiCardCopyWith<$Res> {
  factory _$$KpiCardImplCopyWith(
    _$KpiCardImpl value,
    $Res Function(_$KpiCardImpl) then,
  ) = __$$KpiCardImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    String id,
    String title,
    String primaryValue,
    String label,
    String iconName,
    String? secondaryLabel,
    String? trendLabel,
    bool trendUp,
    KpiCardSeverity severity,
    String? route,
  });
}

/// @nodoc
class __$$KpiCardImplCopyWithImpl<$Res>
    extends _$KpiCardCopyWithImpl<$Res, _$KpiCardImpl>
    implements _$$KpiCardImplCopyWith<$Res> {
  __$$KpiCardImplCopyWithImpl(
    _$KpiCardImpl _value,
    $Res Function(_$KpiCardImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of KpiCard
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? title = null,
    Object? primaryValue = null,
    Object? label = null,
    Object? iconName = null,
    Object? secondaryLabel = freezed,
    Object? trendLabel = freezed,
    Object? trendUp = null,
    Object? severity = null,
    Object? route = freezed,
  }) {
    return _then(
      _$KpiCardImpl(
        id: null == id
            ? _value.id
            : id // ignore: cast_nullable_to_non_nullable
                  as String,
        title: null == title
            ? _value.title
            : title // ignore: cast_nullable_to_non_nullable
                  as String,
        primaryValue: null == primaryValue
            ? _value.primaryValue
            : primaryValue // ignore: cast_nullable_to_non_nullable
                  as String,
        label: null == label
            ? _value.label
            : label // ignore: cast_nullable_to_non_nullable
                  as String,
        iconName: null == iconName
            ? _value.iconName
            : iconName // ignore: cast_nullable_to_non_nullable
                  as String,
        secondaryLabel: freezed == secondaryLabel
            ? _value.secondaryLabel
            : secondaryLabel // ignore: cast_nullable_to_non_nullable
                  as String?,
        trendLabel: freezed == trendLabel
            ? _value.trendLabel
            : trendLabel // ignore: cast_nullable_to_non_nullable
                  as String?,
        trendUp: null == trendUp
            ? _value.trendUp
            : trendUp // ignore: cast_nullable_to_non_nullable
                  as bool,
        severity: null == severity
            ? _value.severity
            : severity // ignore: cast_nullable_to_non_nullable
                  as KpiCardSeverity,
        route: freezed == route
            ? _value.route
            : route // ignore: cast_nullable_to_non_nullable
                  as String?,
      ),
    );
  }
}

/// @nodoc

class _$KpiCardImpl implements _KpiCard {
  const _$KpiCardImpl({
    required this.id,
    required this.title,
    required this.primaryValue,
    required this.label,
    required this.iconName,
    this.secondaryLabel,
    this.trendLabel,
    this.trendUp = false,
    this.severity = KpiCardSeverity.normal,
    this.route,
  });

  @override
  final String id;
  @override
  final String title;
  @override
  final String primaryValue;
  @override
  final String label;
  @override
  final String iconName;
  // matches AppIcons token name
  @override
  final String? secondaryLabel;
  @override
  final String? trendLabel;
  @override
  @JsonKey()
  final bool trendUp;
  @override
  @JsonKey()
  final KpiCardSeverity severity;
  @override
  final String? route;

  @override
  String toString() {
    return 'KpiCard(id: $id, title: $title, primaryValue: $primaryValue, label: $label, iconName: $iconName, secondaryLabel: $secondaryLabel, trendLabel: $trendLabel, trendUp: $trendUp, severity: $severity, route: $route)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$KpiCardImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.title, title) || other.title == title) &&
            (identical(other.primaryValue, primaryValue) ||
                other.primaryValue == primaryValue) &&
            (identical(other.label, label) || other.label == label) &&
            (identical(other.iconName, iconName) ||
                other.iconName == iconName) &&
            (identical(other.secondaryLabel, secondaryLabel) ||
                other.secondaryLabel == secondaryLabel) &&
            (identical(other.trendLabel, trendLabel) ||
                other.trendLabel == trendLabel) &&
            (identical(other.trendUp, trendUp) || other.trendUp == trendUp) &&
            (identical(other.severity, severity) ||
                other.severity == severity) &&
            (identical(other.route, route) || other.route == route));
  }

  @override
  int get hashCode => Object.hash(
    runtimeType,
    id,
    title,
    primaryValue,
    label,
    iconName,
    secondaryLabel,
    trendLabel,
    trendUp,
    severity,
    route,
  );

  /// Create a copy of KpiCard
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$KpiCardImplCopyWith<_$KpiCardImpl> get copyWith =>
      __$$KpiCardImplCopyWithImpl<_$KpiCardImpl>(this, _$identity);
}

abstract class _KpiCard implements KpiCard {
  const factory _KpiCard({
    required final String id,
    required final String title,
    required final String primaryValue,
    required final String label,
    required final String iconName,
    final String? secondaryLabel,
    final String? trendLabel,
    final bool trendUp,
    final KpiCardSeverity severity,
    final String? route,
  }) = _$KpiCardImpl;

  @override
  String get id;
  @override
  String get title;
  @override
  String get primaryValue;
  @override
  String get label;
  @override
  String get iconName; // matches AppIcons token name
  @override
  String? get secondaryLabel;
  @override
  String? get trendLabel;
  @override
  bool get trendUp;
  @override
  KpiCardSeverity get severity;
  @override
  String? get route;

  /// Create a copy of KpiCard
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$KpiCardImplCopyWith<_$KpiCardImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
mixin _$QuickAction {
  String get id => throw _privateConstructorUsedError;
  String get label => throw _privateConstructorUsedError;
  String get iconName => throw _privateConstructorUsedError;
  String get route => throw _privateConstructorUsedError;
  bool get isHighlighted =>
      throw _privateConstructorUsedError; // primary bg when urgent
  bool get isUrgent => throw _privateConstructorUsedError; // secondary bg
  String? get requiredPermission => throw _privateConstructorUsedError;
  String? get badgeCount => throw _privateConstructorUsedError;

  /// Create a copy of QuickAction
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $QuickActionCopyWith<QuickAction> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $QuickActionCopyWith<$Res> {
  factory $QuickActionCopyWith(
    QuickAction value,
    $Res Function(QuickAction) then,
  ) = _$QuickActionCopyWithImpl<$Res, QuickAction>;
  @useResult
  $Res call({
    String id,
    String label,
    String iconName,
    String route,
    bool isHighlighted,
    bool isUrgent,
    String? requiredPermission,
    String? badgeCount,
  });
}

/// @nodoc
class _$QuickActionCopyWithImpl<$Res, $Val extends QuickAction>
    implements $QuickActionCopyWith<$Res> {
  _$QuickActionCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of QuickAction
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? label = null,
    Object? iconName = null,
    Object? route = null,
    Object? isHighlighted = null,
    Object? isUrgent = null,
    Object? requiredPermission = freezed,
    Object? badgeCount = freezed,
  }) {
    return _then(
      _value.copyWith(
            id: null == id
                ? _value.id
                : id // ignore: cast_nullable_to_non_nullable
                      as String,
            label: null == label
                ? _value.label
                : label // ignore: cast_nullable_to_non_nullable
                      as String,
            iconName: null == iconName
                ? _value.iconName
                : iconName // ignore: cast_nullable_to_non_nullable
                      as String,
            route: null == route
                ? _value.route
                : route // ignore: cast_nullable_to_non_nullable
                      as String,
            isHighlighted: null == isHighlighted
                ? _value.isHighlighted
                : isHighlighted // ignore: cast_nullable_to_non_nullable
                      as bool,
            isUrgent: null == isUrgent
                ? _value.isUrgent
                : isUrgent // ignore: cast_nullable_to_non_nullable
                      as bool,
            requiredPermission: freezed == requiredPermission
                ? _value.requiredPermission
                : requiredPermission // ignore: cast_nullable_to_non_nullable
                      as String?,
            badgeCount: freezed == badgeCount
                ? _value.badgeCount
                : badgeCount // ignore: cast_nullable_to_non_nullable
                      as String?,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$QuickActionImplCopyWith<$Res>
    implements $QuickActionCopyWith<$Res> {
  factory _$$QuickActionImplCopyWith(
    _$QuickActionImpl value,
    $Res Function(_$QuickActionImpl) then,
  ) = __$$QuickActionImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    String id,
    String label,
    String iconName,
    String route,
    bool isHighlighted,
    bool isUrgent,
    String? requiredPermission,
    String? badgeCount,
  });
}

/// @nodoc
class __$$QuickActionImplCopyWithImpl<$Res>
    extends _$QuickActionCopyWithImpl<$Res, _$QuickActionImpl>
    implements _$$QuickActionImplCopyWith<$Res> {
  __$$QuickActionImplCopyWithImpl(
    _$QuickActionImpl _value,
    $Res Function(_$QuickActionImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of QuickAction
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? label = null,
    Object? iconName = null,
    Object? route = null,
    Object? isHighlighted = null,
    Object? isUrgent = null,
    Object? requiredPermission = freezed,
    Object? badgeCount = freezed,
  }) {
    return _then(
      _$QuickActionImpl(
        id: null == id
            ? _value.id
            : id // ignore: cast_nullable_to_non_nullable
                  as String,
        label: null == label
            ? _value.label
            : label // ignore: cast_nullable_to_non_nullable
                  as String,
        iconName: null == iconName
            ? _value.iconName
            : iconName // ignore: cast_nullable_to_non_nullable
                  as String,
        route: null == route
            ? _value.route
            : route // ignore: cast_nullable_to_non_nullable
                  as String,
        isHighlighted: null == isHighlighted
            ? _value.isHighlighted
            : isHighlighted // ignore: cast_nullable_to_non_nullable
                  as bool,
        isUrgent: null == isUrgent
            ? _value.isUrgent
            : isUrgent // ignore: cast_nullable_to_non_nullable
                  as bool,
        requiredPermission: freezed == requiredPermission
            ? _value.requiredPermission
            : requiredPermission // ignore: cast_nullable_to_non_nullable
                  as String?,
        badgeCount: freezed == badgeCount
            ? _value.badgeCount
            : badgeCount // ignore: cast_nullable_to_non_nullable
                  as String?,
      ),
    );
  }
}

/// @nodoc

class _$QuickActionImpl implements _QuickAction {
  const _$QuickActionImpl({
    required this.id,
    required this.label,
    required this.iconName,
    required this.route,
    this.isHighlighted = false,
    this.isUrgent = false,
    this.requiredPermission,
    this.badgeCount,
  });

  @override
  final String id;
  @override
  final String label;
  @override
  final String iconName;
  @override
  final String route;
  @override
  @JsonKey()
  final bool isHighlighted;
  // primary bg when urgent
  @override
  @JsonKey()
  final bool isUrgent;
  // secondary bg
  @override
  final String? requiredPermission;
  @override
  final String? badgeCount;

  @override
  String toString() {
    return 'QuickAction(id: $id, label: $label, iconName: $iconName, route: $route, isHighlighted: $isHighlighted, isUrgent: $isUrgent, requiredPermission: $requiredPermission, badgeCount: $badgeCount)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$QuickActionImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.label, label) || other.label == label) &&
            (identical(other.iconName, iconName) ||
                other.iconName == iconName) &&
            (identical(other.route, route) || other.route == route) &&
            (identical(other.isHighlighted, isHighlighted) ||
                other.isHighlighted == isHighlighted) &&
            (identical(other.isUrgent, isUrgent) ||
                other.isUrgent == isUrgent) &&
            (identical(other.requiredPermission, requiredPermission) ||
                other.requiredPermission == requiredPermission) &&
            (identical(other.badgeCount, badgeCount) ||
                other.badgeCount == badgeCount));
  }

  @override
  int get hashCode => Object.hash(
    runtimeType,
    id,
    label,
    iconName,
    route,
    isHighlighted,
    isUrgent,
    requiredPermission,
    badgeCount,
  );

  /// Create a copy of QuickAction
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$QuickActionImplCopyWith<_$QuickActionImpl> get copyWith =>
      __$$QuickActionImplCopyWithImpl<_$QuickActionImpl>(this, _$identity);
}

abstract class _QuickAction implements QuickAction {
  const factory _QuickAction({
    required final String id,
    required final String label,
    required final String iconName,
    required final String route,
    final bool isHighlighted,
    final bool isUrgent,
    final String? requiredPermission,
    final String? badgeCount,
  }) = _$QuickActionImpl;

  @override
  String get id;
  @override
  String get label;
  @override
  String get iconName;
  @override
  String get route;
  @override
  bool get isHighlighted; // primary bg when urgent
  @override
  bool get isUrgent; // secondary bg
  @override
  String? get requiredPermission;
  @override
  String? get badgeCount;

  /// Create a copy of QuickAction
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$QuickActionImplCopyWith<_$QuickActionImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
mixin _$ActivityFeedItem {
  String get id => throw _privateConstructorUsedError;
  ActivityType get type => throw _privateConstructorUsedError;
  String get title => throw _privateConstructorUsedError;
  DateTime get timestamp => throw _privateConstructorUsedError;
  String? get subtitle => throw _privateConstructorUsedError;
  String? get route => throw _privateConstructorUsedError; // deep link on tap
  bool get isUnread => throw _privateConstructorUsedError;

  /// Create a copy of ActivityFeedItem
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $ActivityFeedItemCopyWith<ActivityFeedItem> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ActivityFeedItemCopyWith<$Res> {
  factory $ActivityFeedItemCopyWith(
    ActivityFeedItem value,
    $Res Function(ActivityFeedItem) then,
  ) = _$ActivityFeedItemCopyWithImpl<$Res, ActivityFeedItem>;
  @useResult
  $Res call({
    String id,
    ActivityType type,
    String title,
    DateTime timestamp,
    String? subtitle,
    String? route,
    bool isUnread,
  });
}

/// @nodoc
class _$ActivityFeedItemCopyWithImpl<$Res, $Val extends ActivityFeedItem>
    implements $ActivityFeedItemCopyWith<$Res> {
  _$ActivityFeedItemCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of ActivityFeedItem
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? type = null,
    Object? title = null,
    Object? timestamp = null,
    Object? subtitle = freezed,
    Object? route = freezed,
    Object? isUnread = null,
  }) {
    return _then(
      _value.copyWith(
            id: null == id
                ? _value.id
                : id // ignore: cast_nullable_to_non_nullable
                      as String,
            type: null == type
                ? _value.type
                : type // ignore: cast_nullable_to_non_nullable
                      as ActivityType,
            title: null == title
                ? _value.title
                : title // ignore: cast_nullable_to_non_nullable
                      as String,
            timestamp: null == timestamp
                ? _value.timestamp
                : timestamp // ignore: cast_nullable_to_non_nullable
                      as DateTime,
            subtitle: freezed == subtitle
                ? _value.subtitle
                : subtitle // ignore: cast_nullable_to_non_nullable
                      as String?,
            route: freezed == route
                ? _value.route
                : route // ignore: cast_nullable_to_non_nullable
                      as String?,
            isUnread: null == isUnread
                ? _value.isUnread
                : isUnread // ignore: cast_nullable_to_non_nullable
                      as bool,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$ActivityFeedItemImplCopyWith<$Res>
    implements $ActivityFeedItemCopyWith<$Res> {
  factory _$$ActivityFeedItemImplCopyWith(
    _$ActivityFeedItemImpl value,
    $Res Function(_$ActivityFeedItemImpl) then,
  ) = __$$ActivityFeedItemImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    String id,
    ActivityType type,
    String title,
    DateTime timestamp,
    String? subtitle,
    String? route,
    bool isUnread,
  });
}

/// @nodoc
class __$$ActivityFeedItemImplCopyWithImpl<$Res>
    extends _$ActivityFeedItemCopyWithImpl<$Res, _$ActivityFeedItemImpl>
    implements _$$ActivityFeedItemImplCopyWith<$Res> {
  __$$ActivityFeedItemImplCopyWithImpl(
    _$ActivityFeedItemImpl _value,
    $Res Function(_$ActivityFeedItemImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of ActivityFeedItem
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? type = null,
    Object? title = null,
    Object? timestamp = null,
    Object? subtitle = freezed,
    Object? route = freezed,
    Object? isUnread = null,
  }) {
    return _then(
      _$ActivityFeedItemImpl(
        id: null == id
            ? _value.id
            : id // ignore: cast_nullable_to_non_nullable
                  as String,
        type: null == type
            ? _value.type
            : type // ignore: cast_nullable_to_non_nullable
                  as ActivityType,
        title: null == title
            ? _value.title
            : title // ignore: cast_nullable_to_non_nullable
                  as String,
        timestamp: null == timestamp
            ? _value.timestamp
            : timestamp // ignore: cast_nullable_to_non_nullable
                  as DateTime,
        subtitle: freezed == subtitle
            ? _value.subtitle
            : subtitle // ignore: cast_nullable_to_non_nullable
                  as String?,
        route: freezed == route
            ? _value.route
            : route // ignore: cast_nullable_to_non_nullable
                  as String?,
        isUnread: null == isUnread
            ? _value.isUnread
            : isUnread // ignore: cast_nullable_to_non_nullable
                  as bool,
      ),
    );
  }
}

/// @nodoc

class _$ActivityFeedItemImpl implements _ActivityFeedItem {
  const _$ActivityFeedItemImpl({
    required this.id,
    required this.type,
    required this.title,
    required this.timestamp,
    this.subtitle,
    this.route,
    this.isUnread = false,
  });

  @override
  final String id;
  @override
  final ActivityType type;
  @override
  final String title;
  @override
  final DateTime timestamp;
  @override
  final String? subtitle;
  @override
  final String? route;
  // deep link on tap
  @override
  @JsonKey()
  final bool isUnread;

  @override
  String toString() {
    return 'ActivityFeedItem(id: $id, type: $type, title: $title, timestamp: $timestamp, subtitle: $subtitle, route: $route, isUnread: $isUnread)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ActivityFeedItemImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.type, type) || other.type == type) &&
            (identical(other.title, title) || other.title == title) &&
            (identical(other.timestamp, timestamp) ||
                other.timestamp == timestamp) &&
            (identical(other.subtitle, subtitle) ||
                other.subtitle == subtitle) &&
            (identical(other.route, route) || other.route == route) &&
            (identical(other.isUnread, isUnread) ||
                other.isUnread == isUnread));
  }

  @override
  int get hashCode => Object.hash(
    runtimeType,
    id,
    type,
    title,
    timestamp,
    subtitle,
    route,
    isUnread,
  );

  /// Create a copy of ActivityFeedItem
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$ActivityFeedItemImplCopyWith<_$ActivityFeedItemImpl> get copyWith =>
      __$$ActivityFeedItemImplCopyWithImpl<_$ActivityFeedItemImpl>(
        this,
        _$identity,
      );
}

abstract class _ActivityFeedItem implements ActivityFeedItem {
  const factory _ActivityFeedItem({
    required final String id,
    required final ActivityType type,
    required final String title,
    required final DateTime timestamp,
    final String? subtitle,
    final String? route,
    final bool isUnread,
  }) = _$ActivityFeedItemImpl;

  @override
  String get id;
  @override
  ActivityType get type;
  @override
  String get title;
  @override
  DateTime get timestamp;
  @override
  String? get subtitle;
  @override
  String? get route; // deep link on tap
  @override
  bool get isUnread;

  /// Create a copy of ActivityFeedItem
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$ActivityFeedItemImplCopyWith<_$ActivityFeedItemImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
mixin _$AttendanceHeroData {
  AttendanceHeroStatus get status => throw _privateConstructorUsedError;
  DateTime? get checkInTime => throw _privateConstructorUsedError;
  DateTime? get checkOutTime => throw _privateConstructorUsedError;
  DateTime? get breakStartTime => throw _privateConstructorUsedError;
  String? get shiftName => throw _privateConstructorUsedError;
  String? get shiftStart => throw _privateConstructorUsedError; // e.g. "09:00"
  String? get shiftEnd => throw _privateConstructorUsedError; // e.g. "18:00"
  int? get totalShiftMinutes => throw _privateConstructorUsedError;
  int? get gracePeriodMinutes => throw _privateConstructorUsedError;
  double? get progressFraction =>
      throw _privateConstructorUsedError; // 0.0–1.0 for shift progress bar
  Duration? get workingDuration => throw _privateConstructorUsedError;
  Duration? get breakDuration => throw _privateConstructorUsedError;
  int? get breaksTaken => throw _privateConstructorUsedError;
  bool? get isLate => throw _privateConstructorUsedError;
  int? get minutesLate => throw _privateConstructorUsedError;
  bool? get isOnTime => throw _privateConstructorUsedError;
  String? get totalOvertime => throw _privateConstructorUsedError;

  /// Create a copy of AttendanceHeroData
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $AttendanceHeroDataCopyWith<AttendanceHeroData> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $AttendanceHeroDataCopyWith<$Res> {
  factory $AttendanceHeroDataCopyWith(
    AttendanceHeroData value,
    $Res Function(AttendanceHeroData) then,
  ) = _$AttendanceHeroDataCopyWithImpl<$Res, AttendanceHeroData>;
  @useResult
  $Res call({
    AttendanceHeroStatus status,
    DateTime? checkInTime,
    DateTime? checkOutTime,
    DateTime? breakStartTime,
    String? shiftName,
    String? shiftStart,
    String? shiftEnd,
    int? totalShiftMinutes,
    int? gracePeriodMinutes,
    double? progressFraction,
    Duration? workingDuration,
    Duration? breakDuration,
    int? breaksTaken,
    bool? isLate,
    int? minutesLate,
    bool? isOnTime,
    String? totalOvertime,
  });
}

/// @nodoc
class _$AttendanceHeroDataCopyWithImpl<$Res, $Val extends AttendanceHeroData>
    implements $AttendanceHeroDataCopyWith<$Res> {
  _$AttendanceHeroDataCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of AttendanceHeroData
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? status = null,
    Object? checkInTime = freezed,
    Object? checkOutTime = freezed,
    Object? breakStartTime = freezed,
    Object? shiftName = freezed,
    Object? shiftStart = freezed,
    Object? shiftEnd = freezed,
    Object? totalShiftMinutes = freezed,
    Object? gracePeriodMinutes = freezed,
    Object? progressFraction = freezed,
    Object? workingDuration = freezed,
    Object? breakDuration = freezed,
    Object? breaksTaken = freezed,
    Object? isLate = freezed,
    Object? minutesLate = freezed,
    Object? isOnTime = freezed,
    Object? totalOvertime = freezed,
  }) {
    return _then(
      _value.copyWith(
            status: null == status
                ? _value.status
                : status // ignore: cast_nullable_to_non_nullable
                      as AttendanceHeroStatus,
            checkInTime: freezed == checkInTime
                ? _value.checkInTime
                : checkInTime // ignore: cast_nullable_to_non_nullable
                      as DateTime?,
            checkOutTime: freezed == checkOutTime
                ? _value.checkOutTime
                : checkOutTime // ignore: cast_nullable_to_non_nullable
                      as DateTime?,
            breakStartTime: freezed == breakStartTime
                ? _value.breakStartTime
                : breakStartTime // ignore: cast_nullable_to_non_nullable
                      as DateTime?,
            shiftName: freezed == shiftName
                ? _value.shiftName
                : shiftName // ignore: cast_nullable_to_non_nullable
                      as String?,
            shiftStart: freezed == shiftStart
                ? _value.shiftStart
                : shiftStart // ignore: cast_nullable_to_non_nullable
                      as String?,
            shiftEnd: freezed == shiftEnd
                ? _value.shiftEnd
                : shiftEnd // ignore: cast_nullable_to_non_nullable
                      as String?,
            totalShiftMinutes: freezed == totalShiftMinutes
                ? _value.totalShiftMinutes
                : totalShiftMinutes // ignore: cast_nullable_to_non_nullable
                      as int?,
            gracePeriodMinutes: freezed == gracePeriodMinutes
                ? _value.gracePeriodMinutes
                : gracePeriodMinutes // ignore: cast_nullable_to_non_nullable
                      as int?,
            progressFraction: freezed == progressFraction
                ? _value.progressFraction
                : progressFraction // ignore: cast_nullable_to_non_nullable
                      as double?,
            workingDuration: freezed == workingDuration
                ? _value.workingDuration
                : workingDuration // ignore: cast_nullable_to_non_nullable
                      as Duration?,
            breakDuration: freezed == breakDuration
                ? _value.breakDuration
                : breakDuration // ignore: cast_nullable_to_non_nullable
                      as Duration?,
            breaksTaken: freezed == breaksTaken
                ? _value.breaksTaken
                : breaksTaken // ignore: cast_nullable_to_non_nullable
                      as int?,
            isLate: freezed == isLate
                ? _value.isLate
                : isLate // ignore: cast_nullable_to_non_nullable
                      as bool?,
            minutesLate: freezed == minutesLate
                ? _value.minutesLate
                : minutesLate // ignore: cast_nullable_to_non_nullable
                      as int?,
            isOnTime: freezed == isOnTime
                ? _value.isOnTime
                : isOnTime // ignore: cast_nullable_to_non_nullable
                      as bool?,
            totalOvertime: freezed == totalOvertime
                ? _value.totalOvertime
                : totalOvertime // ignore: cast_nullable_to_non_nullable
                      as String?,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$AttendanceHeroDataImplCopyWith<$Res>
    implements $AttendanceHeroDataCopyWith<$Res> {
  factory _$$AttendanceHeroDataImplCopyWith(
    _$AttendanceHeroDataImpl value,
    $Res Function(_$AttendanceHeroDataImpl) then,
  ) = __$$AttendanceHeroDataImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    AttendanceHeroStatus status,
    DateTime? checkInTime,
    DateTime? checkOutTime,
    DateTime? breakStartTime,
    String? shiftName,
    String? shiftStart,
    String? shiftEnd,
    int? totalShiftMinutes,
    int? gracePeriodMinutes,
    double? progressFraction,
    Duration? workingDuration,
    Duration? breakDuration,
    int? breaksTaken,
    bool? isLate,
    int? minutesLate,
    bool? isOnTime,
    String? totalOvertime,
  });
}

/// @nodoc
class __$$AttendanceHeroDataImplCopyWithImpl<$Res>
    extends _$AttendanceHeroDataCopyWithImpl<$Res, _$AttendanceHeroDataImpl>
    implements _$$AttendanceHeroDataImplCopyWith<$Res> {
  __$$AttendanceHeroDataImplCopyWithImpl(
    _$AttendanceHeroDataImpl _value,
    $Res Function(_$AttendanceHeroDataImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of AttendanceHeroData
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? status = null,
    Object? checkInTime = freezed,
    Object? checkOutTime = freezed,
    Object? breakStartTime = freezed,
    Object? shiftName = freezed,
    Object? shiftStart = freezed,
    Object? shiftEnd = freezed,
    Object? totalShiftMinutes = freezed,
    Object? gracePeriodMinutes = freezed,
    Object? progressFraction = freezed,
    Object? workingDuration = freezed,
    Object? breakDuration = freezed,
    Object? breaksTaken = freezed,
    Object? isLate = freezed,
    Object? minutesLate = freezed,
    Object? isOnTime = freezed,
    Object? totalOvertime = freezed,
  }) {
    return _then(
      _$AttendanceHeroDataImpl(
        status: null == status
            ? _value.status
            : status // ignore: cast_nullable_to_non_nullable
                  as AttendanceHeroStatus,
        checkInTime: freezed == checkInTime
            ? _value.checkInTime
            : checkInTime // ignore: cast_nullable_to_non_nullable
                  as DateTime?,
        checkOutTime: freezed == checkOutTime
            ? _value.checkOutTime
            : checkOutTime // ignore: cast_nullable_to_non_nullable
                  as DateTime?,
        breakStartTime: freezed == breakStartTime
            ? _value.breakStartTime
            : breakStartTime // ignore: cast_nullable_to_non_nullable
                  as DateTime?,
        shiftName: freezed == shiftName
            ? _value.shiftName
            : shiftName // ignore: cast_nullable_to_non_nullable
                  as String?,
        shiftStart: freezed == shiftStart
            ? _value.shiftStart
            : shiftStart // ignore: cast_nullable_to_non_nullable
                  as String?,
        shiftEnd: freezed == shiftEnd
            ? _value.shiftEnd
            : shiftEnd // ignore: cast_nullable_to_non_nullable
                  as String?,
        totalShiftMinutes: freezed == totalShiftMinutes
            ? _value.totalShiftMinutes
            : totalShiftMinutes // ignore: cast_nullable_to_non_nullable
                  as int?,
        gracePeriodMinutes: freezed == gracePeriodMinutes
            ? _value.gracePeriodMinutes
            : gracePeriodMinutes // ignore: cast_nullable_to_non_nullable
                  as int?,
        progressFraction: freezed == progressFraction
            ? _value.progressFraction
            : progressFraction // ignore: cast_nullable_to_non_nullable
                  as double?,
        workingDuration: freezed == workingDuration
            ? _value.workingDuration
            : workingDuration // ignore: cast_nullable_to_non_nullable
                  as Duration?,
        breakDuration: freezed == breakDuration
            ? _value.breakDuration
            : breakDuration // ignore: cast_nullable_to_non_nullable
                  as Duration?,
        breaksTaken: freezed == breaksTaken
            ? _value.breaksTaken
            : breaksTaken // ignore: cast_nullable_to_non_nullable
                  as int?,
        isLate: freezed == isLate
            ? _value.isLate
            : isLate // ignore: cast_nullable_to_non_nullable
                  as bool?,
        minutesLate: freezed == minutesLate
            ? _value.minutesLate
            : minutesLate // ignore: cast_nullable_to_non_nullable
                  as int?,
        isOnTime: freezed == isOnTime
            ? _value.isOnTime
            : isOnTime // ignore: cast_nullable_to_non_nullable
                  as bool?,
        totalOvertime: freezed == totalOvertime
            ? _value.totalOvertime
            : totalOvertime // ignore: cast_nullable_to_non_nullable
                  as String?,
      ),
    );
  }
}

/// @nodoc

class _$AttendanceHeroDataImpl implements _AttendanceHeroData {
  const _$AttendanceHeroDataImpl({
    this.status = AttendanceHeroStatus.notCheckedIn,
    this.checkInTime,
    this.checkOutTime,
    this.breakStartTime,
    this.shiftName,
    this.shiftStart,
    this.shiftEnd,
    this.totalShiftMinutes,
    this.gracePeriodMinutes,
    this.progressFraction,
    this.workingDuration,
    this.breakDuration,
    this.breaksTaken,
    this.isLate,
    this.minutesLate,
    this.isOnTime,
    this.totalOvertime,
  });

  @override
  @JsonKey()
  final AttendanceHeroStatus status;
  @override
  final DateTime? checkInTime;
  @override
  final DateTime? checkOutTime;
  @override
  final DateTime? breakStartTime;
  @override
  final String? shiftName;
  @override
  final String? shiftStart;
  // e.g. "09:00"
  @override
  final String? shiftEnd;
  // e.g. "18:00"
  @override
  final int? totalShiftMinutes;
  @override
  final int? gracePeriodMinutes;
  @override
  final double? progressFraction;
  // 0.0–1.0 for shift progress bar
  @override
  final Duration? workingDuration;
  @override
  final Duration? breakDuration;
  @override
  final int? breaksTaken;
  @override
  final bool? isLate;
  @override
  final int? minutesLate;
  @override
  final bool? isOnTime;
  @override
  final String? totalOvertime;

  @override
  String toString() {
    return 'AttendanceHeroData(status: $status, checkInTime: $checkInTime, checkOutTime: $checkOutTime, breakStartTime: $breakStartTime, shiftName: $shiftName, shiftStart: $shiftStart, shiftEnd: $shiftEnd, totalShiftMinutes: $totalShiftMinutes, gracePeriodMinutes: $gracePeriodMinutes, progressFraction: $progressFraction, workingDuration: $workingDuration, breakDuration: $breakDuration, breaksTaken: $breaksTaken, isLate: $isLate, minutesLate: $minutesLate, isOnTime: $isOnTime, totalOvertime: $totalOvertime)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$AttendanceHeroDataImpl &&
            (identical(other.status, status) || other.status == status) &&
            (identical(other.checkInTime, checkInTime) ||
                other.checkInTime == checkInTime) &&
            (identical(other.checkOutTime, checkOutTime) ||
                other.checkOutTime == checkOutTime) &&
            (identical(other.breakStartTime, breakStartTime) ||
                other.breakStartTime == breakStartTime) &&
            (identical(other.shiftName, shiftName) ||
                other.shiftName == shiftName) &&
            (identical(other.shiftStart, shiftStart) ||
                other.shiftStart == shiftStart) &&
            (identical(other.shiftEnd, shiftEnd) ||
                other.shiftEnd == shiftEnd) &&
            (identical(other.totalShiftMinutes, totalShiftMinutes) ||
                other.totalShiftMinutes == totalShiftMinutes) &&
            (identical(other.gracePeriodMinutes, gracePeriodMinutes) ||
                other.gracePeriodMinutes == gracePeriodMinutes) &&
            (identical(other.progressFraction, progressFraction) ||
                other.progressFraction == progressFraction) &&
            (identical(other.workingDuration, workingDuration) ||
                other.workingDuration == workingDuration) &&
            (identical(other.breakDuration, breakDuration) ||
                other.breakDuration == breakDuration) &&
            (identical(other.breaksTaken, breaksTaken) ||
                other.breaksTaken == breaksTaken) &&
            (identical(other.isLate, isLate) || other.isLate == isLate) &&
            (identical(other.minutesLate, minutesLate) ||
                other.minutesLate == minutesLate) &&
            (identical(other.isOnTime, isOnTime) ||
                other.isOnTime == isOnTime) &&
            (identical(other.totalOvertime, totalOvertime) ||
                other.totalOvertime == totalOvertime));
  }

  @override
  int get hashCode => Object.hash(
    runtimeType,
    status,
    checkInTime,
    checkOutTime,
    breakStartTime,
    shiftName,
    shiftStart,
    shiftEnd,
    totalShiftMinutes,
    gracePeriodMinutes,
    progressFraction,
    workingDuration,
    breakDuration,
    breaksTaken,
    isLate,
    minutesLate,
    isOnTime,
    totalOvertime,
  );

  /// Create a copy of AttendanceHeroData
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$AttendanceHeroDataImplCopyWith<_$AttendanceHeroDataImpl> get copyWith =>
      __$$AttendanceHeroDataImplCopyWithImpl<_$AttendanceHeroDataImpl>(
        this,
        _$identity,
      );
}

abstract class _AttendanceHeroData implements AttendanceHeroData {
  const factory _AttendanceHeroData({
    final AttendanceHeroStatus status,
    final DateTime? checkInTime,
    final DateTime? checkOutTime,
    final String? shiftName,
    final String? shiftStart,
    final String? shiftEnd,
    final int? totalShiftMinutes,
    final int? gracePeriodMinutes,
    final double? progressFraction,
    final Duration? workingDuration,
    final bool? isLate,
    final int? minutesLate,
    final bool? isOnTime,
    final String? totalOvertime,
  }) = _$AttendanceHeroDataImpl;

  @override
  AttendanceHeroStatus get status;
  @override
  DateTime? get checkInTime;
  @override
  DateTime? get checkOutTime;
  @override
  DateTime? get breakStartTime;
  @override
  String? get shiftName;
  @override
  String? get shiftStart; // e.g. "09:00"
  @override
  String? get shiftEnd; // e.g. "18:00"
  @override
  int? get totalShiftMinutes;
  @override
  int? get gracePeriodMinutes;
  @override
  double? get progressFraction; // 0.0–1.0 for shift progress bar
  @override
  Duration? get workingDuration;
  @override
  Duration? get breakDuration;
  @override
  int? get breaksTaken;
  @override
  bool? get isLate;
  @override
  int? get minutesLate;
  @override
  bool? get isOnTime;
  @override
  String? get totalOvertime;

  /// Create a copy of AttendanceHeroData
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$AttendanceHeroDataImplCopyWith<_$AttendanceHeroDataImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
mixin _$TeamMemberStatus {
  String get userId => throw _privateConstructorUsedError;
  String get name => throw _privateConstructorUsedError;
  String? get avatarUrl => throw _privateConstructorUsedError;
  String get initials => throw _privateConstructorUsedError;
  String get status => throw _privateConstructorUsedError;

  /// Create a copy of TeamMemberStatus
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $TeamMemberStatusCopyWith<TeamMemberStatus> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $TeamMemberStatusCopyWith<$Res> {
  factory $TeamMemberStatusCopyWith(
    TeamMemberStatus value,
    $Res Function(TeamMemberStatus) then,
  ) = _$TeamMemberStatusCopyWithImpl<$Res, TeamMemberStatus>;
  @useResult
  $Res call({
    String userId,
    String name,
    String? avatarUrl,
    String initials,
    String status,
  });
}

/// @nodoc
class _$TeamMemberStatusCopyWithImpl<$Res, $Val extends TeamMemberStatus>
    implements $TeamMemberStatusCopyWith<$Res> {
  _$TeamMemberStatusCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of TeamMemberStatus
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? userId = null,
    Object? name = null,
    Object? avatarUrl = freezed,
    Object? initials = null,
    Object? status = null,
  }) {
    return _then(
      _value.copyWith(
            userId: null == userId
                ? _value.userId
                : userId // ignore: cast_nullable_to_non_nullable
                      as String,
            name: null == name
                ? _value.name
                : name // ignore: cast_nullable_to_non_nullable
                      as String,
            avatarUrl: freezed == avatarUrl
                ? _value.avatarUrl
                : avatarUrl // ignore: cast_nullable_to_non_nullable
                      as String?,
            initials: null == initials
                ? _value.initials
                : initials // ignore: cast_nullable_to_non_nullable
                      as String,
            status: null == status
                ? _value.status
                : status // ignore: cast_nullable_to_non_nullable
                      as String,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$TeamMemberStatusImplCopyWith<$Res>
    implements $TeamMemberStatusCopyWith<$Res> {
  factory _$$TeamMemberStatusImplCopyWith(
    _$TeamMemberStatusImpl value,
    $Res Function(_$TeamMemberStatusImpl) then,
  ) = __$$TeamMemberStatusImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    String userId,
    String name,
    String? avatarUrl,
    String initials,
    String status,
  });
}

/// @nodoc
class __$$TeamMemberStatusImplCopyWithImpl<$Res>
    extends _$TeamMemberStatusCopyWithImpl<$Res, _$TeamMemberStatusImpl>
    implements _$$TeamMemberStatusImplCopyWith<$Res> {
  __$$TeamMemberStatusImplCopyWithImpl(
    _$TeamMemberStatusImpl _value,
    $Res Function(_$TeamMemberStatusImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of TeamMemberStatus
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? userId = null,
    Object? name = null,
    Object? avatarUrl = freezed,
    Object? initials = null,
    Object? status = null,
  }) {
    return _then(
      _$TeamMemberStatusImpl(
        userId: null == userId
            ? _value.userId
            : userId // ignore: cast_nullable_to_non_nullable
                  as String,
        name: null == name
            ? _value.name
            : name // ignore: cast_nullable_to_non_nullable
                  as String,
        avatarUrl: freezed == avatarUrl
            ? _value.avatarUrl
            : avatarUrl // ignore: cast_nullable_to_non_nullable
                  as String?,
        initials: null == initials
            ? _value.initials
            : initials // ignore: cast_nullable_to_non_nullable
                  as String,
        status: null == status
            ? _value.status
            : status // ignore: cast_nullable_to_non_nullable
                  as String,
      ),
    );
  }
}

/// @nodoc

class _$TeamMemberStatusImpl implements _TeamMemberStatus {
  const _$TeamMemberStatusImpl({
    required this.userId,
    required this.name,
    this.avatarUrl,
    required this.initials,
    required this.status,
  });

  @override
  final String userId;
  @override
  final String name;
  @override
  final String? avatarUrl;
  @override
  final String initials;
  @override
  final String status;

  @override
  String toString() {
    return 'TeamMemberStatus(userId: $userId, name: $name, avatarUrl: $avatarUrl, initials: $initials, status: $status)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$TeamMemberStatusImpl &&
            (identical(other.userId, userId) || other.userId == userId) &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.avatarUrl, avatarUrl) ||
                other.avatarUrl == avatarUrl) &&
            (identical(other.initials, initials) ||
                other.initials == initials) &&
            (identical(other.status, status) || other.status == status));
  }

  @override
  int get hashCode =>
      Object.hash(runtimeType, userId, name, avatarUrl, initials, status);

  /// Create a copy of TeamMemberStatus
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$TeamMemberStatusImplCopyWith<_$TeamMemberStatusImpl> get copyWith =>
      __$$TeamMemberStatusImplCopyWithImpl<_$TeamMemberStatusImpl>(
        this,
        _$identity,
      );
}

abstract class _TeamMemberStatus implements TeamMemberStatus {
  const factory _TeamMemberStatus({
    required final String userId,
    required final String name,
    final String? avatarUrl,
    required final String initials,
    required final String status,
  }) = _$TeamMemberStatusImpl;

  @override
  String get userId;
  @override
  String get name;
  @override
  String? get avatarUrl;
  @override
  String get initials;
  @override
  String get status;

  /// Create a copy of TeamMemberStatus
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$TeamMemberStatusImplCopyWith<_$TeamMemberStatusImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
mixin _$TeamStatusSummary {
  int get total => throw _privateConstructorUsedError;
  int get present => throw _privateConstructorUsedError;
  int get absent => throw _privateConstructorUsedError;
  int get late => throw _privateConstructorUsedError;
  int get onLeave => throw _privateConstructorUsedError;
  List<TeamMemberStatus> get members => throw _privateConstructorUsedError;

  /// Create a copy of TeamStatusSummary
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $TeamStatusSummaryCopyWith<TeamStatusSummary> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $TeamStatusSummaryCopyWith<$Res> {
  factory $TeamStatusSummaryCopyWith(
    TeamStatusSummary value,
    $Res Function(TeamStatusSummary) then,
  ) = _$TeamStatusSummaryCopyWithImpl<$Res, TeamStatusSummary>;
  @useResult
  $Res call({
    int total,
    int present,
    int absent,
    int late,
    int onLeave,
    List<TeamMemberStatus> members,
  });
}

/// @nodoc
class _$TeamStatusSummaryCopyWithImpl<$Res, $Val extends TeamStatusSummary>
    implements $TeamStatusSummaryCopyWith<$Res> {
  _$TeamStatusSummaryCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of TeamStatusSummary
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? total = null,
    Object? present = null,
    Object? absent = null,
    Object? late = null,
    Object? onLeave = null,
    Object? members = null,
  }) {
    return _then(
      _value.copyWith(
            total: null == total
                ? _value.total
                : total // ignore: cast_nullable_to_non_nullable
                      as int,
            present: null == present
                ? _value.present
                : present // ignore: cast_nullable_to_non_nullable
                      as int,
            absent: null == absent
                ? _value.absent
                : absent // ignore: cast_nullable_to_non_nullable
                      as int,
            late: null == late
                ? _value.late
                : late // ignore: cast_nullable_to_non_nullable
                      as int,
            onLeave: null == onLeave
                ? _value.onLeave
                : onLeave // ignore: cast_nullable_to_non_nullable
                      as int,
            members: null == members
                ? _value.members
                : members // ignore: cast_nullable_to_non_nullable
                      as List<TeamMemberStatus>,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$TeamStatusSummaryImplCopyWith<$Res>
    implements $TeamStatusSummaryCopyWith<$Res> {
  factory _$$TeamStatusSummaryImplCopyWith(
    _$TeamStatusSummaryImpl value,
    $Res Function(_$TeamStatusSummaryImpl) then,
  ) = __$$TeamStatusSummaryImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    int total,
    int present,
    int absent,
    int late,
    int onLeave,
    List<TeamMemberStatus> members,
  });
}

/// @nodoc
class __$$TeamStatusSummaryImplCopyWithImpl<$Res>
    extends _$TeamStatusSummaryCopyWithImpl<$Res, _$TeamStatusSummaryImpl>
    implements _$$TeamStatusSummaryImplCopyWith<$Res> {
  __$$TeamStatusSummaryImplCopyWithImpl(
    _$TeamStatusSummaryImpl _value,
    $Res Function(_$TeamStatusSummaryImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of TeamStatusSummary
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? total = null,
    Object? present = null,
    Object? absent = null,
    Object? late = null,
    Object? onLeave = null,
    Object? members = null,
  }) {
    return _then(
      _$TeamStatusSummaryImpl(
        total: null == total
            ? _value.total
            : total // ignore: cast_nullable_to_non_nullable
                  as int,
        present: null == present
            ? _value.present
            : present // ignore: cast_nullable_to_non_nullable
                  as int,
        absent: null == absent
            ? _value.absent
            : absent // ignore: cast_nullable_to_non_nullable
                  as int,
        late: null == late
            ? _value.late
            : late // ignore: cast_nullable_to_non_nullable
                  as int,
        onLeave: null == onLeave
            ? _value.onLeave
            : onLeave // ignore: cast_nullable_to_non_nullable
                  as int,
        members: null == members
            ? _value._members
            : members // ignore: cast_nullable_to_non_nullable
                  as List<TeamMemberStatus>,
      ),
    );
  }
}

/// @nodoc

class _$TeamStatusSummaryImpl implements _TeamStatusSummary {
  const _$TeamStatusSummaryImpl({
    required this.total,
    required this.present,
    required this.absent,
    required this.late,
    required this.onLeave,
    final List<TeamMemberStatus> members = const [],
  }) : _members = members;

  @override
  final int total;
  @override
  final int present;
  @override
  final int absent;
  @override
  final int late;
  @override
  final int onLeave;
  final List<TeamMemberStatus> _members;
  @override
  @JsonKey()
  List<TeamMemberStatus> get members {
    if (_members is EqualUnmodifiableListView) return _members;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_members);
  }

  @override
  String toString() {
    return 'TeamStatusSummary(total: $total, present: $present, absent: $absent, late: $late, onLeave: $onLeave, members: $members)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$TeamStatusSummaryImpl &&
            (identical(other.total, total) || other.total == total) &&
            (identical(other.present, present) || other.present == present) &&
            (identical(other.absent, absent) || other.absent == absent) &&
            (identical(other.late, late) || other.late == late) &&
            (identical(other.onLeave, onLeave) || other.onLeave == onLeave) &&
            const DeepCollectionEquality().equals(other._members, _members));
  }

  @override
  int get hashCode => Object.hash(
    runtimeType,
    total,
    present,
    absent,
    late,
    onLeave,
    const DeepCollectionEquality().hash(_members),
  );

  /// Create a copy of TeamStatusSummary
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$TeamStatusSummaryImplCopyWith<_$TeamStatusSummaryImpl> get copyWith =>
      __$$TeamStatusSummaryImplCopyWithImpl<_$TeamStatusSummaryImpl>(
        this,
        _$identity,
      );
}

abstract class _TeamStatusSummary implements TeamStatusSummary {
  const factory _TeamStatusSummary({
    required final int total,
    required final int present,
    required final int absent,
    required final int late,
    required final int onLeave,
    final List<TeamMemberStatus> members,
  }) = _$TeamStatusSummaryImpl;

  @override
  int get total;
  @override
  int get present;
  @override
  int get absent;
  @override
  int get late;
  @override
  int get onLeave;
  @override
  List<TeamMemberStatus> get members;

  /// Create a copy of TeamStatusSummary
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$TeamStatusSummaryImplCopyWith<_$TeamStatusSummaryImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
mixin _$DashboardUserInfo {
  String get userId => throw _privateConstructorUsedError;
  String get firstName => throw _privateConstructorUsedError;
  String get lastName => throw _privateConstructorUsedError;
  String get role => throw _privateConstructorUsedError;
  String get department => throw _privateConstructorUsedError;
  String? get avatarUrl => throw _privateConstructorUsedError;
  String get initials => throw _privateConstructorUsedError;
  bool get isManager => throw _privateConstructorUsedError;

  /// Create a copy of DashboardUserInfo
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $DashboardUserInfoCopyWith<DashboardUserInfo> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $DashboardUserInfoCopyWith<$Res> {
  factory $DashboardUserInfoCopyWith(
    DashboardUserInfo value,
    $Res Function(DashboardUserInfo) then,
  ) = _$DashboardUserInfoCopyWithImpl<$Res, DashboardUserInfo>;
  @useResult
  $Res call({
    String userId,
    String firstName,
    String lastName,
    String role,
    String department,
    String? avatarUrl,
    String initials,
    bool isManager,
  });
}

/// @nodoc
class _$DashboardUserInfoCopyWithImpl<$Res, $Val extends DashboardUserInfo>
    implements $DashboardUserInfoCopyWith<$Res> {
  _$DashboardUserInfoCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of DashboardUserInfo
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? userId = null,
    Object? firstName = null,
    Object? lastName = null,
    Object? role = null,
    Object? department = null,
    Object? avatarUrl = freezed,
    Object? initials = null,
    Object? isManager = null,
  }) {
    return _then(
      _value.copyWith(
            userId: null == userId
                ? _value.userId
                : userId // ignore: cast_nullable_to_non_nullable
                      as String,
            firstName: null == firstName
                ? _value.firstName
                : firstName // ignore: cast_nullable_to_non_nullable
                      as String,
            lastName: null == lastName
                ? _value.lastName
                : lastName // ignore: cast_nullable_to_non_nullable
                      as String,
            role: null == role
                ? _value.role
                : role // ignore: cast_nullable_to_non_nullable
                      as String,
            department: null == department
                ? _value.department
                : department // ignore: cast_nullable_to_non_nullable
                      as String,
            avatarUrl: freezed == avatarUrl
                ? _value.avatarUrl
                : avatarUrl // ignore: cast_nullable_to_non_nullable
                      as String?,
            initials: null == initials
                ? _value.initials
                : initials // ignore: cast_nullable_to_non_nullable
                      as String,
            isManager: null == isManager
                ? _value.isManager
                : isManager // ignore: cast_nullable_to_non_nullable
                      as bool,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$DashboardUserInfoImplCopyWith<$Res>
    implements $DashboardUserInfoCopyWith<$Res> {
  factory _$$DashboardUserInfoImplCopyWith(
    _$DashboardUserInfoImpl value,
    $Res Function(_$DashboardUserInfoImpl) then,
  ) = __$$DashboardUserInfoImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    String userId,
    String firstName,
    String lastName,
    String role,
    String department,
    String? avatarUrl,
    String initials,
    bool isManager,
  });
}

/// @nodoc
class __$$DashboardUserInfoImplCopyWithImpl<$Res>
    extends _$DashboardUserInfoCopyWithImpl<$Res, _$DashboardUserInfoImpl>
    implements _$$DashboardUserInfoImplCopyWith<$Res> {
  __$$DashboardUserInfoImplCopyWithImpl(
    _$DashboardUserInfoImpl _value,
    $Res Function(_$DashboardUserInfoImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of DashboardUserInfo
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? userId = null,
    Object? firstName = null,
    Object? lastName = null,
    Object? role = null,
    Object? department = null,
    Object? avatarUrl = freezed,
    Object? initials = null,
    Object? isManager = null,
  }) {
    return _then(
      _$DashboardUserInfoImpl(
        userId: null == userId
            ? _value.userId
            : userId // ignore: cast_nullable_to_non_nullable
                  as String,
        firstName: null == firstName
            ? _value.firstName
            : firstName // ignore: cast_nullable_to_non_nullable
                  as String,
        lastName: null == lastName
            ? _value.lastName
            : lastName // ignore: cast_nullable_to_non_nullable
                  as String,
        role: null == role
            ? _value.role
            : role // ignore: cast_nullable_to_non_nullable
                  as String,
        department: null == department
            ? _value.department
            : department // ignore: cast_nullable_to_non_nullable
                  as String,
        avatarUrl: freezed == avatarUrl
            ? _value.avatarUrl
            : avatarUrl // ignore: cast_nullable_to_non_nullable
                  as String?,
        initials: null == initials
            ? _value.initials
            : initials // ignore: cast_nullable_to_non_nullable
                  as String,
        isManager: null == isManager
            ? _value.isManager
            : isManager // ignore: cast_nullable_to_non_nullable
                  as bool,
      ),
    );
  }
}

/// @nodoc

class _$DashboardUserInfoImpl implements _DashboardUserInfo {
  const _$DashboardUserInfoImpl({
    required this.userId,
    required this.firstName,
    required this.lastName,
    required this.role,
    required this.department,
    this.avatarUrl,
    this.initials = '',
    this.isManager = false,
  });

  @override
  final String userId;
  @override
  final String firstName;
  @override
  final String lastName;
  @override
  final String role;
  @override
  final String department;
  @override
  final String? avatarUrl;
  @override
  @JsonKey()
  final String initials;
  @override
  @JsonKey()
  final bool isManager;

  @override
  String toString() {
    return 'DashboardUserInfo(userId: $userId, firstName: $firstName, lastName: $lastName, role: $role, department: $department, avatarUrl: $avatarUrl, initials: $initials, isManager: $isManager)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$DashboardUserInfoImpl &&
            (identical(other.userId, userId) || other.userId == userId) &&
            (identical(other.firstName, firstName) ||
                other.firstName == firstName) &&
            (identical(other.lastName, lastName) ||
                other.lastName == lastName) &&
            (identical(other.role, role) || other.role == role) &&
            (identical(other.department, department) ||
                other.department == department) &&
            (identical(other.avatarUrl, avatarUrl) ||
                other.avatarUrl == avatarUrl) &&
            (identical(other.initials, initials) ||
                other.initials == initials) &&
            (identical(other.isManager, isManager) ||
                other.isManager == isManager));
  }

  @override
  int get hashCode => Object.hash(
    runtimeType,
    userId,
    firstName,
    lastName,
    role,
    department,
    avatarUrl,
    initials,
    isManager,
  );

  /// Create a copy of DashboardUserInfo
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$DashboardUserInfoImplCopyWith<_$DashboardUserInfoImpl> get copyWith =>
      __$$DashboardUserInfoImplCopyWithImpl<_$DashboardUserInfoImpl>(
        this,
        _$identity,
      );
}

abstract class _DashboardUserInfo implements DashboardUserInfo {
  const factory _DashboardUserInfo({
    required final String userId,
    required final String firstName,
    required final String lastName,
    required final String role,
    required final String department,
    final String? avatarUrl,
    final String initials,
    final bool isManager,
  }) = _$DashboardUserInfoImpl;

  @override
  String get userId;
  @override
  String get firstName;
  @override
  String get lastName;
  @override
  String get role;
  @override
  String get department;
  @override
  String? get avatarUrl;
  @override
  String get initials;
  @override
  bool get isManager;

  /// Create a copy of DashboardUserInfo
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$DashboardUserInfoImplCopyWith<_$DashboardUserInfoImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
mixin _$SyncInfo {
  SyncStatus get status => throw _privateConstructorUsedError;
  int get pendingCount => throw _privateConstructorUsedError;
  DateTime? get lastSyncTime => throw _privateConstructorUsedError;
  String? get errorMessage => throw _privateConstructorUsedError;

  /// Create a copy of SyncInfo
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $SyncInfoCopyWith<SyncInfo> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $SyncInfoCopyWith<$Res> {
  factory $SyncInfoCopyWith(SyncInfo value, $Res Function(SyncInfo) then) =
      _$SyncInfoCopyWithImpl<$Res, SyncInfo>;
  @useResult
  $Res call({
    SyncStatus status,
    int pendingCount,
    DateTime? lastSyncTime,
    String? errorMessage,
  });
}

/// @nodoc
class _$SyncInfoCopyWithImpl<$Res, $Val extends SyncInfo>
    implements $SyncInfoCopyWith<$Res> {
  _$SyncInfoCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of SyncInfo
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? status = null,
    Object? pendingCount = null,
    Object? lastSyncTime = freezed,
    Object? errorMessage = freezed,
  }) {
    return _then(
      _value.copyWith(
            status: null == status
                ? _value.status
                : status // ignore: cast_nullable_to_non_nullable
                      as SyncStatus,
            pendingCount: null == pendingCount
                ? _value.pendingCount
                : pendingCount // ignore: cast_nullable_to_non_nullable
                      as int,
            lastSyncTime: freezed == lastSyncTime
                ? _value.lastSyncTime
                : lastSyncTime // ignore: cast_nullable_to_non_nullable
                      as DateTime?,
            errorMessage: freezed == errorMessage
                ? _value.errorMessage
                : errorMessage // ignore: cast_nullable_to_non_nullable
                      as String?,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$SyncInfoImplCopyWith<$Res>
    implements $SyncInfoCopyWith<$Res> {
  factory _$$SyncInfoImplCopyWith(
    _$SyncInfoImpl value,
    $Res Function(_$SyncInfoImpl) then,
  ) = __$$SyncInfoImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    SyncStatus status,
    int pendingCount,
    DateTime? lastSyncTime,
    String? errorMessage,
  });
}

/// @nodoc
class __$$SyncInfoImplCopyWithImpl<$Res>
    extends _$SyncInfoCopyWithImpl<$Res, _$SyncInfoImpl>
    implements _$$SyncInfoImplCopyWith<$Res> {
  __$$SyncInfoImplCopyWithImpl(
    _$SyncInfoImpl _value,
    $Res Function(_$SyncInfoImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of SyncInfo
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? status = null,
    Object? pendingCount = null,
    Object? lastSyncTime = freezed,
    Object? errorMessage = freezed,
  }) {
    return _then(
      _$SyncInfoImpl(
        status: null == status
            ? _value.status
            : status // ignore: cast_nullable_to_non_nullable
                  as SyncStatus,
        pendingCount: null == pendingCount
            ? _value.pendingCount
            : pendingCount // ignore: cast_nullable_to_non_nullable
                  as int,
        lastSyncTime: freezed == lastSyncTime
            ? _value.lastSyncTime
            : lastSyncTime // ignore: cast_nullable_to_non_nullable
                  as DateTime?,
        errorMessage: freezed == errorMessage
            ? _value.errorMessage
            : errorMessage // ignore: cast_nullable_to_non_nullable
                  as String?,
      ),
    );
  }
}

/// @nodoc

class _$SyncInfoImpl implements _SyncInfo {
  const _$SyncInfoImpl({
    this.status = SyncStatus.idle,
    this.pendingCount = 0,
    this.lastSyncTime,
    this.errorMessage,
  });

  @override
  @JsonKey()
  final SyncStatus status;
  @override
  @JsonKey()
  final int pendingCount;
  @override
  final DateTime? lastSyncTime;
  @override
  final String? errorMessage;

  @override
  String toString() {
    return 'SyncInfo(status: $status, pendingCount: $pendingCount, lastSyncTime: $lastSyncTime, errorMessage: $errorMessage)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$SyncInfoImpl &&
            (identical(other.status, status) || other.status == status) &&
            (identical(other.pendingCount, pendingCount) ||
                other.pendingCount == pendingCount) &&
            (identical(other.lastSyncTime, lastSyncTime) ||
                other.lastSyncTime == lastSyncTime) &&
            (identical(other.errorMessage, errorMessage) ||
                other.errorMessage == errorMessage));
  }

  @override
  int get hashCode => Object.hash(
    runtimeType,
    status,
    pendingCount,
    lastSyncTime,
    errorMessage,
  );

  /// Create a copy of SyncInfo
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$SyncInfoImplCopyWith<_$SyncInfoImpl> get copyWith =>
      __$$SyncInfoImplCopyWithImpl<_$SyncInfoImpl>(this, _$identity);
}

abstract class _SyncInfo implements SyncInfo {
  const factory _SyncInfo({
    final SyncStatus status,
    final int pendingCount,
    final DateTime? lastSyncTime,
    final String? errorMessage,
  }) = _$SyncInfoImpl;

  @override
  SyncStatus get status;
  @override
  int get pendingCount;
  @override
  DateTime? get lastSyncTime;
  @override
  String? get errorMessage;

  /// Create a copy of SyncInfo
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$SyncInfoImplCopyWith<_$SyncInfoImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
mixin _$DashboardState {
  // Loading
  bool get isLoading => throw _privateConstructorUsedError;
  bool get isRefreshing =>
      throw _privateConstructorUsedError; // Online / Offline
  bool get isOnline => throw _privateConstructorUsedError; // User
  DashboardUserInfo? get user =>
      throw _privateConstructorUsedError; // Attendance hero
  AttendanceHeroData? get attendanceHero => throw _privateConstructorUsedError;

  /// A break start/end triggered from the hero card is in flight.
  bool get isAttendanceActionInFlight => throw _privateConstructorUsedError;

  /// Message shown when an inline attendance action is refused.
  String? get attendanceActionError =>
      throw _privateConstructorUsedError; // KPI cards (ordered, RBAC-gated)
  List<KpiCard> get kpiCards =>
      throw _privateConstructorUsedError; // Quick actions (ordered, RBAC-gated)
  List<QuickAction> get quickActions =>
      throw _privateConstructorUsedError; // Activity feed
  List<ActivityFeedItem> get activityFeed => throw _privateConstructorUsedError;
  bool get isLoadingMoreFeed => throw _privateConstructorUsedError;
  bool get hasMoreFeed =>
      throw _privateConstructorUsedError; // Manager: team status
  TeamStatusSummary? get teamStatus =>
      throw _privateConstructorUsedError; // Sync
  SyncInfo get syncInfo =>
      throw _privateConstructorUsedError; // Notification count
  int get unreadNotifications => throw _privateConstructorUsedError; // Error
  String? get errorMessage => throw _privateConstructorUsedError;

  /// Create a copy of DashboardState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $DashboardStateCopyWith<DashboardState> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $DashboardStateCopyWith<$Res> {
  factory $DashboardStateCopyWith(
    DashboardState value,
    $Res Function(DashboardState) then,
  ) = _$DashboardStateCopyWithImpl<$Res, DashboardState>;
  @useResult
  $Res call({
    bool isLoading,
    bool isRefreshing,
    bool isOnline,
    DashboardUserInfo? user,
    AttendanceHeroData? attendanceHero,
    bool isAttendanceActionInFlight,
    String? attendanceActionError,
    List<KpiCard> kpiCards,
    List<QuickAction> quickActions,
    List<ActivityFeedItem> activityFeed,
    bool isLoadingMoreFeed,
    bool hasMoreFeed,
    TeamStatusSummary? teamStatus,
    SyncInfo syncInfo,
    int unreadNotifications,
    String? errorMessage,
  });

  $DashboardUserInfoCopyWith<$Res>? get user;
  $AttendanceHeroDataCopyWith<$Res>? get attendanceHero;
  $TeamStatusSummaryCopyWith<$Res>? get teamStatus;
  $SyncInfoCopyWith<$Res> get syncInfo;
}

/// @nodoc
class _$DashboardStateCopyWithImpl<$Res, $Val extends DashboardState>
    implements $DashboardStateCopyWith<$Res> {
  _$DashboardStateCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of DashboardState
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? isLoading = null,
    Object? isRefreshing = null,
    Object? isOnline = null,
    Object? user = freezed,
    Object? attendanceHero = freezed,
    Object? isAttendanceActionInFlight = null,
    Object? attendanceActionError = freezed,
    Object? kpiCards = null,
    Object? quickActions = null,
    Object? activityFeed = null,
    Object? isLoadingMoreFeed = null,
    Object? hasMoreFeed = null,
    Object? teamStatus = freezed,
    Object? syncInfo = null,
    Object? unreadNotifications = null,
    Object? errorMessage = freezed,
  }) {
    return _then(
      _value.copyWith(
            isLoading: null == isLoading
                ? _value.isLoading
                : isLoading // ignore: cast_nullable_to_non_nullable
                      as bool,
            isRefreshing: null == isRefreshing
                ? _value.isRefreshing
                : isRefreshing // ignore: cast_nullable_to_non_nullable
                      as bool,
            isOnline: null == isOnline
                ? _value.isOnline
                : isOnline // ignore: cast_nullable_to_non_nullable
                      as bool,
            user: freezed == user
                ? _value.user
                : user // ignore: cast_nullable_to_non_nullable
                      as DashboardUserInfo?,
            attendanceHero: freezed == attendanceHero
                ? _value.attendanceHero
                : attendanceHero // ignore: cast_nullable_to_non_nullable
                      as AttendanceHeroData?,
            isAttendanceActionInFlight: null == isAttendanceActionInFlight
                ? _value.isAttendanceActionInFlight
                : isAttendanceActionInFlight // ignore: cast_nullable_to_non_nullable
                      as bool,
            attendanceActionError: freezed == attendanceActionError
                ? _value.attendanceActionError
                : attendanceActionError // ignore: cast_nullable_to_non_nullable
                      as String?,
            kpiCards: null == kpiCards
                ? _value.kpiCards
                : kpiCards // ignore: cast_nullable_to_non_nullable
                      as List<KpiCard>,
            quickActions: null == quickActions
                ? _value.quickActions
                : quickActions // ignore: cast_nullable_to_non_nullable
                      as List<QuickAction>,
            activityFeed: null == activityFeed
                ? _value.activityFeed
                : activityFeed // ignore: cast_nullable_to_non_nullable
                      as List<ActivityFeedItem>,
            isLoadingMoreFeed: null == isLoadingMoreFeed
                ? _value.isLoadingMoreFeed
                : isLoadingMoreFeed // ignore: cast_nullable_to_non_nullable
                      as bool,
            hasMoreFeed: null == hasMoreFeed
                ? _value.hasMoreFeed
                : hasMoreFeed // ignore: cast_nullable_to_non_nullable
                      as bool,
            teamStatus: freezed == teamStatus
                ? _value.teamStatus
                : teamStatus // ignore: cast_nullable_to_non_nullable
                      as TeamStatusSummary?,
            syncInfo: null == syncInfo
                ? _value.syncInfo
                : syncInfo // ignore: cast_nullable_to_non_nullable
                      as SyncInfo,
            unreadNotifications: null == unreadNotifications
                ? _value.unreadNotifications
                : unreadNotifications // ignore: cast_nullable_to_non_nullable
                      as int,
            errorMessage: freezed == errorMessage
                ? _value.errorMessage
                : errorMessage // ignore: cast_nullable_to_non_nullable
                      as String?,
          )
          as $Val,
    );
  }

  /// Create a copy of DashboardState
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $DashboardUserInfoCopyWith<$Res>? get user {
    if (_value.user == null) {
      return null;
    }

    return $DashboardUserInfoCopyWith<$Res>(_value.user!, (value) {
      return _then(_value.copyWith(user: value) as $Val);
    });
  }

  /// Create a copy of DashboardState
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $AttendanceHeroDataCopyWith<$Res>? get attendanceHero {
    if (_value.attendanceHero == null) {
      return null;
    }

    return $AttendanceHeroDataCopyWith<$Res>(_value.attendanceHero!, (value) {
      return _then(_value.copyWith(attendanceHero: value) as $Val);
    });
  }

  /// Create a copy of DashboardState
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $TeamStatusSummaryCopyWith<$Res>? get teamStatus {
    if (_value.teamStatus == null) {
      return null;
    }

    return $TeamStatusSummaryCopyWith<$Res>(_value.teamStatus!, (value) {
      return _then(_value.copyWith(teamStatus: value) as $Val);
    });
  }

  /// Create a copy of DashboardState
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $SyncInfoCopyWith<$Res> get syncInfo {
    return $SyncInfoCopyWith<$Res>(_value.syncInfo, (value) {
      return _then(_value.copyWith(syncInfo: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$DashboardStateImplCopyWith<$Res>
    implements $DashboardStateCopyWith<$Res> {
  factory _$$DashboardStateImplCopyWith(
    _$DashboardStateImpl value,
    $Res Function(_$DashboardStateImpl) then,
  ) = __$$DashboardStateImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    bool isLoading,
    bool isRefreshing,
    bool isOnline,
    DashboardUserInfo? user,
    AttendanceHeroData? attendanceHero,
    bool isAttendanceActionInFlight,
    String? attendanceActionError,
    List<KpiCard> kpiCards,
    List<QuickAction> quickActions,
    List<ActivityFeedItem> activityFeed,
    bool isLoadingMoreFeed,
    bool hasMoreFeed,
    TeamStatusSummary? teamStatus,
    SyncInfo syncInfo,
    int unreadNotifications,
    String? errorMessage,
  });

  @override
  $DashboardUserInfoCopyWith<$Res>? get user;
  @override
  $AttendanceHeroDataCopyWith<$Res>? get attendanceHero;
  @override
  $TeamStatusSummaryCopyWith<$Res>? get teamStatus;
  @override
  $SyncInfoCopyWith<$Res> get syncInfo;
}

/// @nodoc
class __$$DashboardStateImplCopyWithImpl<$Res>
    extends _$DashboardStateCopyWithImpl<$Res, _$DashboardStateImpl>
    implements _$$DashboardStateImplCopyWith<$Res> {
  __$$DashboardStateImplCopyWithImpl(
    _$DashboardStateImpl _value,
    $Res Function(_$DashboardStateImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of DashboardState
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? isLoading = null,
    Object? isRefreshing = null,
    Object? isOnline = null,
    Object? user = freezed,
    Object? attendanceHero = freezed,
    Object? isAttendanceActionInFlight = null,
    Object? attendanceActionError = freezed,
    Object? kpiCards = null,
    Object? quickActions = null,
    Object? activityFeed = null,
    Object? isLoadingMoreFeed = null,
    Object? hasMoreFeed = null,
    Object? teamStatus = freezed,
    Object? syncInfo = null,
    Object? unreadNotifications = null,
    Object? errorMessage = freezed,
  }) {
    return _then(
      _$DashboardStateImpl(
        isLoading: null == isLoading
            ? _value.isLoading
            : isLoading // ignore: cast_nullable_to_non_nullable
                  as bool,
        isRefreshing: null == isRefreshing
            ? _value.isRefreshing
            : isRefreshing // ignore: cast_nullable_to_non_nullable
                  as bool,
        isOnline: null == isOnline
            ? _value.isOnline
            : isOnline // ignore: cast_nullable_to_non_nullable
                  as bool,
        user: freezed == user
            ? _value.user
            : user // ignore: cast_nullable_to_non_nullable
                  as DashboardUserInfo?,
        attendanceHero: freezed == attendanceHero
            ? _value.attendanceHero
            : attendanceHero // ignore: cast_nullable_to_non_nullable
                  as AttendanceHeroData?,
        isAttendanceActionInFlight: null == isAttendanceActionInFlight
            ? _value.isAttendanceActionInFlight
            : isAttendanceActionInFlight // ignore: cast_nullable_to_non_nullable
                  as bool,
        attendanceActionError: freezed == attendanceActionError
            ? _value.attendanceActionError
            : attendanceActionError // ignore: cast_nullable_to_non_nullable
                  as String?,
        kpiCards: null == kpiCards
            ? _value._kpiCards
            : kpiCards // ignore: cast_nullable_to_non_nullable
                  as List<KpiCard>,
        quickActions: null == quickActions
            ? _value._quickActions
            : quickActions // ignore: cast_nullable_to_non_nullable
                  as List<QuickAction>,
        activityFeed: null == activityFeed
            ? _value._activityFeed
            : activityFeed // ignore: cast_nullable_to_non_nullable
                  as List<ActivityFeedItem>,
        isLoadingMoreFeed: null == isLoadingMoreFeed
            ? _value.isLoadingMoreFeed
            : isLoadingMoreFeed // ignore: cast_nullable_to_non_nullable
                  as bool,
        hasMoreFeed: null == hasMoreFeed
            ? _value.hasMoreFeed
            : hasMoreFeed // ignore: cast_nullable_to_non_nullable
                  as bool,
        teamStatus: freezed == teamStatus
            ? _value.teamStatus
            : teamStatus // ignore: cast_nullable_to_non_nullable
                  as TeamStatusSummary?,
        syncInfo: null == syncInfo
            ? _value.syncInfo
            : syncInfo // ignore: cast_nullable_to_non_nullable
                  as SyncInfo,
        unreadNotifications: null == unreadNotifications
            ? _value.unreadNotifications
            : unreadNotifications // ignore: cast_nullable_to_non_nullable
                  as int,
        errorMessage: freezed == errorMessage
            ? _value.errorMessage
            : errorMessage // ignore: cast_nullable_to_non_nullable
                  as String?,
      ),
    );
  }
}

/// @nodoc

class _$DashboardStateImpl extends _DashboardState {
  const _$DashboardStateImpl({
    this.isLoading = true,
    this.isRefreshing = false,
    this.isOnline = true,
    this.user,
    this.attendanceHero,
    this.isAttendanceActionInFlight = false,
    this.attendanceActionError,
    final List<KpiCard> kpiCards = const [],
    final List<QuickAction> quickActions = const [],
    final List<ActivityFeedItem> activityFeed = const [],
    this.isLoadingMoreFeed = false,
    this.hasMoreFeed = false,
    this.teamStatus,
    this.syncInfo = const SyncInfo(),
    this.unreadNotifications = 0,
    this.errorMessage,
  }) : _kpiCards = kpiCards,
       _quickActions = quickActions,
       _activityFeed = activityFeed,
       super._();

  // Loading
  @override
  @JsonKey()
  final bool isLoading;
  @override
  @JsonKey()
  final bool isRefreshing;
  // Online / Offline
  @override
  @JsonKey()
  final bool isOnline;
  // User
  @override
  final DashboardUserInfo? user;
  // Attendance hero
  @override
  final AttendanceHeroData? attendanceHero;

  /// A break start/end triggered from the hero card is in flight.
  @override
  @JsonKey()
  final bool isAttendanceActionInFlight;

  /// Message shown when an inline attendance action is refused.
  @override
  final String? attendanceActionError;
  // KPI cards (ordered, RBAC-gated)
  final List<KpiCard> _kpiCards;
  // KPI cards (ordered, RBAC-gated)
  @override
  @JsonKey()
  List<KpiCard> get kpiCards {
    if (_kpiCards is EqualUnmodifiableListView) return _kpiCards;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_kpiCards);
  }

  // Quick actions (ordered, RBAC-gated)
  final List<QuickAction> _quickActions;
  // Quick actions (ordered, RBAC-gated)
  @override
  @JsonKey()
  List<QuickAction> get quickActions {
    if (_quickActions is EqualUnmodifiableListView) return _quickActions;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_quickActions);
  }

  // Activity feed
  final List<ActivityFeedItem> _activityFeed;
  // Activity feed
  @override
  @JsonKey()
  List<ActivityFeedItem> get activityFeed {
    if (_activityFeed is EqualUnmodifiableListView) return _activityFeed;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_activityFeed);
  }

  @override
  @JsonKey()
  final bool isLoadingMoreFeed;
  @override
  @JsonKey()
  final bool hasMoreFeed;
  // Manager: team status
  @override
  final TeamStatusSummary? teamStatus;
  // Sync
  @override
  @JsonKey()
  final SyncInfo syncInfo;
  // Notification count
  @override
  @JsonKey()
  final int unreadNotifications;
  // Error
  @override
  final String? errorMessage;

  @override
  String toString() {
    return 'DashboardState(isLoading: $isLoading, isRefreshing: $isRefreshing, isOnline: $isOnline, user: $user, attendanceHero: $attendanceHero, isAttendanceActionInFlight: $isAttendanceActionInFlight, attendanceActionError: $attendanceActionError, kpiCards: $kpiCards, quickActions: $quickActions, activityFeed: $activityFeed, isLoadingMoreFeed: $isLoadingMoreFeed, hasMoreFeed: $hasMoreFeed, teamStatus: $teamStatus, syncInfo: $syncInfo, unreadNotifications: $unreadNotifications, errorMessage: $errorMessage)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$DashboardStateImpl &&
            (identical(other.isLoading, isLoading) ||
                other.isLoading == isLoading) &&
            (identical(other.isRefreshing, isRefreshing) ||
                other.isRefreshing == isRefreshing) &&
            (identical(other.isOnline, isOnline) ||
                other.isOnline == isOnline) &&
            (identical(other.user, user) || other.user == user) &&
            (identical(other.attendanceHero, attendanceHero) ||
                other.attendanceHero == attendanceHero) &&
            (identical(
                  other.isAttendanceActionInFlight,
                  isAttendanceActionInFlight,
                ) ||
                other.isAttendanceActionInFlight ==
                    isAttendanceActionInFlight) &&
            (identical(other.attendanceActionError, attendanceActionError) ||
                other.attendanceActionError == attendanceActionError) &&
            const DeepCollectionEquality().equals(other._kpiCards, _kpiCards) &&
            const DeepCollectionEquality().equals(
              other._quickActions,
              _quickActions,
            ) &&
            const DeepCollectionEquality().equals(
              other._activityFeed,
              _activityFeed,
            ) &&
            (identical(other.isLoadingMoreFeed, isLoadingMoreFeed) ||
                other.isLoadingMoreFeed == isLoadingMoreFeed) &&
            (identical(other.hasMoreFeed, hasMoreFeed) ||
                other.hasMoreFeed == hasMoreFeed) &&
            (identical(other.teamStatus, teamStatus) ||
                other.teamStatus == teamStatus) &&
            (identical(other.syncInfo, syncInfo) ||
                other.syncInfo == syncInfo) &&
            (identical(other.unreadNotifications, unreadNotifications) ||
                other.unreadNotifications == unreadNotifications) &&
            (identical(other.errorMessage, errorMessage) ||
                other.errorMessage == errorMessage));
  }

  @override
  int get hashCode => Object.hash(
    runtimeType,
    isLoading,
    isRefreshing,
    isOnline,
    user,
    attendanceHero,
    isAttendanceActionInFlight,
    attendanceActionError,
    const DeepCollectionEquality().hash(_kpiCards),
    const DeepCollectionEquality().hash(_quickActions),
    const DeepCollectionEquality().hash(_activityFeed),
    isLoadingMoreFeed,
    hasMoreFeed,
    teamStatus,
    syncInfo,
    unreadNotifications,
    errorMessage,
  );

  /// Create a copy of DashboardState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$DashboardStateImplCopyWith<_$DashboardStateImpl> get copyWith =>
      __$$DashboardStateImplCopyWithImpl<_$DashboardStateImpl>(
        this,
        _$identity,
      );
}

abstract class _DashboardState extends DashboardState {
  const factory _DashboardState({
    final bool isLoading,
    final bool isRefreshing,
    final bool isOnline,
    final DashboardUserInfo? user,
    final AttendanceHeroData? attendanceHero,
    final List<KpiCard> kpiCards,
    final List<QuickAction> quickActions,
    final List<ActivityFeedItem> activityFeed,
    final bool isLoadingMoreFeed,
    final bool hasMoreFeed,
    final TeamStatusSummary? teamStatus,
    final SyncInfo syncInfo,
    final int unreadNotifications,
    final String? errorMessage,
  }) = _$DashboardStateImpl;
  const _DashboardState._() : super._();

  // Loading
  @override
  bool get isLoading;
  @override
  bool get isRefreshing; // Online / Offline
  @override
  bool get isOnline; // User
  @override
  DashboardUserInfo? get user; // Attendance hero
  @override
  AttendanceHeroData? get attendanceHero;

  /// A break start/end triggered from the hero card is in flight.
  @override
  bool get isAttendanceActionInFlight;

  /// Message shown when an inline attendance action is refused.
  @override
  String? get attendanceActionError; // KPI cards (ordered, RBAC-gated)
  @override
  List<KpiCard> get kpiCards; // Quick actions (ordered, RBAC-gated)
  @override
  List<QuickAction> get quickActions; // Activity feed
  @override
  List<ActivityFeedItem> get activityFeed;
  @override
  bool get isLoadingMoreFeed;
  @override
  bool get hasMoreFeed; // Manager: team status
  @override
  TeamStatusSummary? get teamStatus; // Sync
  @override
  SyncInfo get syncInfo; // Notification count
  @override
  int get unreadNotifications; // Error
  @override
  String? get errorMessage;

  /// Create a copy of DashboardState
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$DashboardStateImplCopyWith<_$DashboardStateImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
