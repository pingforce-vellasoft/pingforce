// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'nav_destinations.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
  'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models',
);

/// @nodoc
mixin _$DestinationFabConfig {
  String get tooltip => throw _privateConstructorUsedError;
  IconData get icon => throw _privateConstructorUsedError;
  String get route => throw _privateConstructorUsedError;
  bool get isSpeedDial => throw _privateConstructorUsedError;
  List<SpeedDialItem> get speedDialItems => throw _privateConstructorUsedError;

  /// Create a copy of DestinationFabConfig
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $DestinationFabConfigCopyWith<DestinationFabConfig> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $DestinationFabConfigCopyWith<$Res> {
  factory $DestinationFabConfigCopyWith(
    DestinationFabConfig value,
    $Res Function(DestinationFabConfig) then,
  ) = _$DestinationFabConfigCopyWithImpl<$Res, DestinationFabConfig>;
  @useResult
  $Res call({
    String tooltip,
    IconData icon,
    String route,
    bool isSpeedDial,
    List<SpeedDialItem> speedDialItems,
  });
}

/// @nodoc
class _$DestinationFabConfigCopyWithImpl<
  $Res,
  $Val extends DestinationFabConfig
>
    implements $DestinationFabConfigCopyWith<$Res> {
  _$DestinationFabConfigCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of DestinationFabConfig
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? tooltip = null,
    Object? icon = null,
    Object? route = null,
    Object? isSpeedDial = null,
    Object? speedDialItems = null,
  }) {
    return _then(
      _value.copyWith(
            tooltip: null == tooltip
                ? _value.tooltip
                : tooltip // ignore: cast_nullable_to_non_nullable
                      as String,
            icon: null == icon
                ? _value.icon
                : icon // ignore: cast_nullable_to_non_nullable
                      as IconData,
            route: null == route
                ? _value.route
                : route // ignore: cast_nullable_to_non_nullable
                      as String,
            isSpeedDial: null == isSpeedDial
                ? _value.isSpeedDial
                : isSpeedDial // ignore: cast_nullable_to_non_nullable
                      as bool,
            speedDialItems: null == speedDialItems
                ? _value.speedDialItems
                : speedDialItems // ignore: cast_nullable_to_non_nullable
                      as List<SpeedDialItem>,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$DestinationFabConfigImplCopyWith<$Res>
    implements $DestinationFabConfigCopyWith<$Res> {
  factory _$$DestinationFabConfigImplCopyWith(
    _$DestinationFabConfigImpl value,
    $Res Function(_$DestinationFabConfigImpl) then,
  ) = __$$DestinationFabConfigImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    String tooltip,
    IconData icon,
    String route,
    bool isSpeedDial,
    List<SpeedDialItem> speedDialItems,
  });
}

/// @nodoc
class __$$DestinationFabConfigImplCopyWithImpl<$Res>
    extends _$DestinationFabConfigCopyWithImpl<$Res, _$DestinationFabConfigImpl>
    implements _$$DestinationFabConfigImplCopyWith<$Res> {
  __$$DestinationFabConfigImplCopyWithImpl(
    _$DestinationFabConfigImpl _value,
    $Res Function(_$DestinationFabConfigImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of DestinationFabConfig
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? tooltip = null,
    Object? icon = null,
    Object? route = null,
    Object? isSpeedDial = null,
    Object? speedDialItems = null,
  }) {
    return _then(
      _$DestinationFabConfigImpl(
        tooltip: null == tooltip
            ? _value.tooltip
            : tooltip // ignore: cast_nullable_to_non_nullable
                  as String,
        icon: null == icon
            ? _value.icon
            : icon // ignore: cast_nullable_to_non_nullable
                  as IconData,
        route: null == route
            ? _value.route
            : route // ignore: cast_nullable_to_non_nullable
                  as String,
        isSpeedDial: null == isSpeedDial
            ? _value.isSpeedDial
            : isSpeedDial // ignore: cast_nullable_to_non_nullable
                  as bool,
        speedDialItems: null == speedDialItems
            ? _value._speedDialItems
            : speedDialItems // ignore: cast_nullable_to_non_nullable
                  as List<SpeedDialItem>,
      ),
    );
  }
}

/// @nodoc

class _$DestinationFabConfigImpl implements _DestinationFabConfig {
  const _$DestinationFabConfigImpl({
    required this.tooltip,
    required this.icon,
    required this.route,
    this.isSpeedDial = false,
    final List<SpeedDialItem> speedDialItems = const [],
  }) : _speedDialItems = speedDialItems;

  @override
  final String tooltip;
  @override
  final IconData icon;
  @override
  final String route;
  @override
  @JsonKey()
  final bool isSpeedDial;
  final List<SpeedDialItem> _speedDialItems;
  @override
  @JsonKey()
  List<SpeedDialItem> get speedDialItems {
    if (_speedDialItems is EqualUnmodifiableListView) return _speedDialItems;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_speedDialItems);
  }

  @override
  String toString() {
    return 'DestinationFabConfig(tooltip: $tooltip, icon: $icon, route: $route, isSpeedDial: $isSpeedDial, speedDialItems: $speedDialItems)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$DestinationFabConfigImpl &&
            (identical(other.tooltip, tooltip) || other.tooltip == tooltip) &&
            (identical(other.icon, icon) || other.icon == icon) &&
            (identical(other.route, route) || other.route == route) &&
            (identical(other.isSpeedDial, isSpeedDial) ||
                other.isSpeedDial == isSpeedDial) &&
            const DeepCollectionEquality().equals(
              other._speedDialItems,
              _speedDialItems,
            ));
  }

  @override
  int get hashCode => Object.hash(
    runtimeType,
    tooltip,
    icon,
    route,
    isSpeedDial,
    const DeepCollectionEquality().hash(_speedDialItems),
  );

  /// Create a copy of DestinationFabConfig
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$DestinationFabConfigImplCopyWith<_$DestinationFabConfigImpl>
  get copyWith =>
      __$$DestinationFabConfigImplCopyWithImpl<_$DestinationFabConfigImpl>(
        this,
        _$identity,
      );
}

abstract class _DestinationFabConfig implements DestinationFabConfig {
  const factory _DestinationFabConfig({
    required final String tooltip,
    required final IconData icon,
    required final String route,
    final bool isSpeedDial,
    final List<SpeedDialItem> speedDialItems,
  }) = _$DestinationFabConfigImpl;

  @override
  String get tooltip;
  @override
  IconData get icon;
  @override
  String get route;
  @override
  bool get isSpeedDial;
  @override
  List<SpeedDialItem> get speedDialItems;

  /// Create a copy of DestinationFabConfig
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$DestinationFabConfigImplCopyWith<_$DestinationFabConfigImpl>
  get copyWith => throw _privateConstructorUsedError;
}

/// @nodoc
mixin _$SpeedDialItem {
  String get tooltip => throw _privateConstructorUsedError;
  IconData get icon => throw _privateConstructorUsedError;
  String get route => throw _privateConstructorUsedError;

  /// Create a copy of SpeedDialItem
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $SpeedDialItemCopyWith<SpeedDialItem> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $SpeedDialItemCopyWith<$Res> {
  factory $SpeedDialItemCopyWith(
    SpeedDialItem value,
    $Res Function(SpeedDialItem) then,
  ) = _$SpeedDialItemCopyWithImpl<$Res, SpeedDialItem>;
  @useResult
  $Res call({String tooltip, IconData icon, String route});
}

/// @nodoc
class _$SpeedDialItemCopyWithImpl<$Res, $Val extends SpeedDialItem>
    implements $SpeedDialItemCopyWith<$Res> {
  _$SpeedDialItemCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of SpeedDialItem
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? tooltip = null,
    Object? icon = null,
    Object? route = null,
  }) {
    return _then(
      _value.copyWith(
            tooltip: null == tooltip
                ? _value.tooltip
                : tooltip // ignore: cast_nullable_to_non_nullable
                      as String,
            icon: null == icon
                ? _value.icon
                : icon // ignore: cast_nullable_to_non_nullable
                      as IconData,
            route: null == route
                ? _value.route
                : route // ignore: cast_nullable_to_non_nullable
                      as String,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$SpeedDialItemImplCopyWith<$Res>
    implements $SpeedDialItemCopyWith<$Res> {
  factory _$$SpeedDialItemImplCopyWith(
    _$SpeedDialItemImpl value,
    $Res Function(_$SpeedDialItemImpl) then,
  ) = __$$SpeedDialItemImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({String tooltip, IconData icon, String route});
}

/// @nodoc
class __$$SpeedDialItemImplCopyWithImpl<$Res>
    extends _$SpeedDialItemCopyWithImpl<$Res, _$SpeedDialItemImpl>
    implements _$$SpeedDialItemImplCopyWith<$Res> {
  __$$SpeedDialItemImplCopyWithImpl(
    _$SpeedDialItemImpl _value,
    $Res Function(_$SpeedDialItemImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of SpeedDialItem
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? tooltip = null,
    Object? icon = null,
    Object? route = null,
  }) {
    return _then(
      _$SpeedDialItemImpl(
        tooltip: null == tooltip
            ? _value.tooltip
            : tooltip // ignore: cast_nullable_to_non_nullable
                  as String,
        icon: null == icon
            ? _value.icon
            : icon // ignore: cast_nullable_to_non_nullable
                  as IconData,
        route: null == route
            ? _value.route
            : route // ignore: cast_nullable_to_non_nullable
                  as String,
      ),
    );
  }
}

/// @nodoc

class _$SpeedDialItemImpl implements _SpeedDialItem {
  const _$SpeedDialItemImpl({
    required this.tooltip,
    required this.icon,
    required this.route,
  });

  @override
  final String tooltip;
  @override
  final IconData icon;
  @override
  final String route;

  @override
  String toString() {
    return 'SpeedDialItem(tooltip: $tooltip, icon: $icon, route: $route)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$SpeedDialItemImpl &&
            (identical(other.tooltip, tooltip) || other.tooltip == tooltip) &&
            (identical(other.icon, icon) || other.icon == icon) &&
            (identical(other.route, route) || other.route == route));
  }

  @override
  int get hashCode => Object.hash(runtimeType, tooltip, icon, route);

  /// Create a copy of SpeedDialItem
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$SpeedDialItemImplCopyWith<_$SpeedDialItemImpl> get copyWith =>
      __$$SpeedDialItemImplCopyWithImpl<_$SpeedDialItemImpl>(this, _$identity);
}

abstract class _SpeedDialItem implements SpeedDialItem {
  const factory _SpeedDialItem({
    required final String tooltip,
    required final IconData icon,
    required final String route,
  }) = _$SpeedDialItemImpl;

  @override
  String get tooltip;
  @override
  IconData get icon;
  @override
  String get route;

  /// Create a copy of SpeedDialItem
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$SpeedDialItemImplCopyWith<_$SpeedDialItemImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
mixin _$NavDestination {
  NavDestinationId get id => throw _privateConstructorUsedError;
  String get label => throw _privateConstructorUsedError;
  IconData get icon => throw _privateConstructorUsedError;
  IconData get selectedIcon => throw _privateConstructorUsedError;
  String get rootRoute => throw _privateConstructorUsedError;
  String get permissionKey =>
      throw _privateConstructorUsedError; // RBAC key to check
  bool get showInBottomNav => throw _privateConstructorUsedError;
  bool get showInMoreSheet => throw _privateConstructorUsedError;
  int get badgeCount => throw _privateConstructorUsedError;
  DestinationFabConfig? get fab => throw _privateConstructorUsedError;

  /// Create a copy of NavDestination
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $NavDestinationCopyWith<NavDestination> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $NavDestinationCopyWith<$Res> {
  factory $NavDestinationCopyWith(
    NavDestination value,
    $Res Function(NavDestination) then,
  ) = _$NavDestinationCopyWithImpl<$Res, NavDestination>;
  @useResult
  $Res call({
    NavDestinationId id,
    String label,
    IconData icon,
    IconData selectedIcon,
    String rootRoute,
    String permissionKey,
    bool showInBottomNav,
    bool showInMoreSheet,
    int badgeCount,
    DestinationFabConfig? fab,
  });

  $DestinationFabConfigCopyWith<$Res>? get fab;
}

/// @nodoc
class _$NavDestinationCopyWithImpl<$Res, $Val extends NavDestination>
    implements $NavDestinationCopyWith<$Res> {
  _$NavDestinationCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of NavDestination
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? label = null,
    Object? icon = null,
    Object? selectedIcon = null,
    Object? rootRoute = null,
    Object? permissionKey = null,
    Object? showInBottomNav = null,
    Object? showInMoreSheet = null,
    Object? badgeCount = null,
    Object? fab = freezed,
  }) {
    return _then(
      _value.copyWith(
            id: null == id
                ? _value.id
                : id // ignore: cast_nullable_to_non_nullable
                      as NavDestinationId,
            label: null == label
                ? _value.label
                : label // ignore: cast_nullable_to_non_nullable
                      as String,
            icon: null == icon
                ? _value.icon
                : icon // ignore: cast_nullable_to_non_nullable
                      as IconData,
            selectedIcon: null == selectedIcon
                ? _value.selectedIcon
                : selectedIcon // ignore: cast_nullable_to_non_nullable
                      as IconData,
            rootRoute: null == rootRoute
                ? _value.rootRoute
                : rootRoute // ignore: cast_nullable_to_non_nullable
                      as String,
            permissionKey: null == permissionKey
                ? _value.permissionKey
                : permissionKey // ignore: cast_nullable_to_non_nullable
                      as String,
            showInBottomNav: null == showInBottomNav
                ? _value.showInBottomNav
                : showInBottomNav // ignore: cast_nullable_to_non_nullable
                      as bool,
            showInMoreSheet: null == showInMoreSheet
                ? _value.showInMoreSheet
                : showInMoreSheet // ignore: cast_nullable_to_non_nullable
                      as bool,
            badgeCount: null == badgeCount
                ? _value.badgeCount
                : badgeCount // ignore: cast_nullable_to_non_nullable
                      as int,
            fab: freezed == fab
                ? _value.fab
                : fab // ignore: cast_nullable_to_non_nullable
                      as DestinationFabConfig?,
          )
          as $Val,
    );
  }

  /// Create a copy of NavDestination
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $DestinationFabConfigCopyWith<$Res>? get fab {
    if (_value.fab == null) {
      return null;
    }

    return $DestinationFabConfigCopyWith<$Res>(_value.fab!, (value) {
      return _then(_value.copyWith(fab: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$NavDestinationImplCopyWith<$Res>
    implements $NavDestinationCopyWith<$Res> {
  factory _$$NavDestinationImplCopyWith(
    _$NavDestinationImpl value,
    $Res Function(_$NavDestinationImpl) then,
  ) = __$$NavDestinationImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    NavDestinationId id,
    String label,
    IconData icon,
    IconData selectedIcon,
    String rootRoute,
    String permissionKey,
    bool showInBottomNav,
    bool showInMoreSheet,
    int badgeCount,
    DestinationFabConfig? fab,
  });

  @override
  $DestinationFabConfigCopyWith<$Res>? get fab;
}

/// @nodoc
class __$$NavDestinationImplCopyWithImpl<$Res>
    extends _$NavDestinationCopyWithImpl<$Res, _$NavDestinationImpl>
    implements _$$NavDestinationImplCopyWith<$Res> {
  __$$NavDestinationImplCopyWithImpl(
    _$NavDestinationImpl _value,
    $Res Function(_$NavDestinationImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of NavDestination
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? label = null,
    Object? icon = null,
    Object? selectedIcon = null,
    Object? rootRoute = null,
    Object? permissionKey = null,
    Object? showInBottomNav = null,
    Object? showInMoreSheet = null,
    Object? badgeCount = null,
    Object? fab = freezed,
  }) {
    return _then(
      _$NavDestinationImpl(
        id: null == id
            ? _value.id
            : id // ignore: cast_nullable_to_non_nullable
                  as NavDestinationId,
        label: null == label
            ? _value.label
            : label // ignore: cast_nullable_to_non_nullable
                  as String,
        icon: null == icon
            ? _value.icon
            : icon // ignore: cast_nullable_to_non_nullable
                  as IconData,
        selectedIcon: null == selectedIcon
            ? _value.selectedIcon
            : selectedIcon // ignore: cast_nullable_to_non_nullable
                  as IconData,
        rootRoute: null == rootRoute
            ? _value.rootRoute
            : rootRoute // ignore: cast_nullable_to_non_nullable
                  as String,
        permissionKey: null == permissionKey
            ? _value.permissionKey
            : permissionKey // ignore: cast_nullable_to_non_nullable
                  as String,
        showInBottomNav: null == showInBottomNav
            ? _value.showInBottomNav
            : showInBottomNav // ignore: cast_nullable_to_non_nullable
                  as bool,
        showInMoreSheet: null == showInMoreSheet
            ? _value.showInMoreSheet
            : showInMoreSheet // ignore: cast_nullable_to_non_nullable
                  as bool,
        badgeCount: null == badgeCount
            ? _value.badgeCount
            : badgeCount // ignore: cast_nullable_to_non_nullable
                  as int,
        fab: freezed == fab
            ? _value.fab
            : fab // ignore: cast_nullable_to_non_nullable
                  as DestinationFabConfig?,
      ),
    );
  }
}

/// @nodoc

class _$NavDestinationImpl extends _NavDestination {
  const _$NavDestinationImpl({
    required this.id,
    required this.label,
    required this.icon,
    required this.selectedIcon,
    required this.rootRoute,
    required this.permissionKey,
    this.showInBottomNav = false,
    this.showInMoreSheet = false,
    this.badgeCount = 0,
    this.fab,
  }) : super._();

  @override
  final NavDestinationId id;
  @override
  final String label;
  @override
  final IconData icon;
  @override
  final IconData selectedIcon;
  @override
  final String rootRoute;
  @override
  final String permissionKey;
  // RBAC key to check
  @override
  @JsonKey()
  final bool showInBottomNav;
  @override
  @JsonKey()
  final bool showInMoreSheet;
  @override
  @JsonKey()
  final int badgeCount;
  @override
  final DestinationFabConfig? fab;

  @override
  String toString() {
    return 'NavDestination(id: $id, label: $label, icon: $icon, selectedIcon: $selectedIcon, rootRoute: $rootRoute, permissionKey: $permissionKey, showInBottomNav: $showInBottomNav, showInMoreSheet: $showInMoreSheet, badgeCount: $badgeCount, fab: $fab)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$NavDestinationImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.label, label) || other.label == label) &&
            (identical(other.icon, icon) || other.icon == icon) &&
            (identical(other.selectedIcon, selectedIcon) ||
                other.selectedIcon == selectedIcon) &&
            (identical(other.rootRoute, rootRoute) ||
                other.rootRoute == rootRoute) &&
            (identical(other.permissionKey, permissionKey) ||
                other.permissionKey == permissionKey) &&
            (identical(other.showInBottomNav, showInBottomNav) ||
                other.showInBottomNav == showInBottomNav) &&
            (identical(other.showInMoreSheet, showInMoreSheet) ||
                other.showInMoreSheet == showInMoreSheet) &&
            (identical(other.badgeCount, badgeCount) ||
                other.badgeCount == badgeCount) &&
            (identical(other.fab, fab) || other.fab == fab));
  }

  @override
  int get hashCode => Object.hash(
    runtimeType,
    id,
    label,
    icon,
    selectedIcon,
    rootRoute,
    permissionKey,
    showInBottomNav,
    showInMoreSheet,
    badgeCount,
    fab,
  );

  /// Create a copy of NavDestination
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$NavDestinationImplCopyWith<_$NavDestinationImpl> get copyWith =>
      __$$NavDestinationImplCopyWithImpl<_$NavDestinationImpl>(
        this,
        _$identity,
      );
}

abstract class _NavDestination extends NavDestination {
  const factory _NavDestination({
    required final NavDestinationId id,
    required final String label,
    required final IconData icon,
    required final IconData selectedIcon,
    required final String rootRoute,
    required final String permissionKey,
    final bool showInBottomNav,
    final bool showInMoreSheet,
    final int badgeCount,
    final DestinationFabConfig? fab,
  }) = _$NavDestinationImpl;
  const _NavDestination._() : super._();

  @override
  NavDestinationId get id;
  @override
  String get label;
  @override
  IconData get icon;
  @override
  IconData get selectedIcon;
  @override
  String get rootRoute;
  @override
  String get permissionKey; // RBAC key to check
  @override
  bool get showInBottomNav;
  @override
  bool get showInMoreSheet;
  @override
  int get badgeCount;
  @override
  DestinationFabConfig? get fab;

  /// Create a copy of NavDestination
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$NavDestinationImplCopyWith<_$NavDestinationImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
