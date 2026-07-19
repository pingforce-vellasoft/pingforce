// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'check_in_state.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
  'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models',
);

/// @nodoc
mixin _$ShiftInfo {
  String get shiftCode => throw _privateConstructorUsedError;
  String get shiftName => throw _privateConstructorUsedError;
  String get startTime => throw _privateConstructorUsedError; // e.g. "09:00"
  String get endTime => throw _privateConstructorUsedError; // e.g. "18:00"
  int get gracePeriodMinutes => throw _privateConstructorUsedError; // e.g. 15
  int get totalBreaksAllowed => throw _privateConstructorUsedError;
  double get requiredHours => throw _privateConstructorUsedError;
  bool get isCurrentlyActive => throw _privateConstructorUsedError;
  bool get isInGracePeriod => throw _privateConstructorUsedError;
  bool get isLate => throw _privateConstructorUsedError;
  int? get minutesLate => throw _privateConstructorUsedError;
  int? get minutesEarlyCheckIn => throw _privateConstructorUsedError;

  /// Create a copy of ShiftInfo
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $ShiftInfoCopyWith<ShiftInfo> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ShiftInfoCopyWith<$Res> {
  factory $ShiftInfoCopyWith(ShiftInfo value, $Res Function(ShiftInfo) then) =
      _$ShiftInfoCopyWithImpl<$Res, ShiftInfo>;
  @useResult
  $Res call({
    String shiftCode,
    String shiftName,
    String startTime,
    String endTime,
    int gracePeriodMinutes,
    int totalBreaksAllowed,
    double requiredHours,
    bool isCurrentlyActive,
    bool isInGracePeriod,
    bool isLate,
    int? minutesLate,
    int? minutesEarlyCheckIn,
  });
}

/// @nodoc
class _$ShiftInfoCopyWithImpl<$Res, $Val extends ShiftInfo>
    implements $ShiftInfoCopyWith<$Res> {
  _$ShiftInfoCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of ShiftInfo
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? shiftCode = null,
    Object? shiftName = null,
    Object? startTime = null,
    Object? endTime = null,
    Object? gracePeriodMinutes = null,
    Object? totalBreaksAllowed = null,
    Object? requiredHours = null,
    Object? isCurrentlyActive = null,
    Object? isInGracePeriod = null,
    Object? isLate = null,
    Object? minutesLate = freezed,
    Object? minutesEarlyCheckIn = freezed,
  }) {
    return _then(
      _value.copyWith(
            shiftCode: null == shiftCode
                ? _value.shiftCode
                : shiftCode // ignore: cast_nullable_to_non_nullable
                      as String,
            shiftName: null == shiftName
                ? _value.shiftName
                : shiftName // ignore: cast_nullable_to_non_nullable
                      as String,
            startTime: null == startTime
                ? _value.startTime
                : startTime // ignore: cast_nullable_to_non_nullable
                      as String,
            endTime: null == endTime
                ? _value.endTime
                : endTime // ignore: cast_nullable_to_non_nullable
                      as String,
            gracePeriodMinutes: null == gracePeriodMinutes
                ? _value.gracePeriodMinutes
                : gracePeriodMinutes // ignore: cast_nullable_to_non_nullable
                      as int,
            totalBreaksAllowed: null == totalBreaksAllowed
                ? _value.totalBreaksAllowed
                : totalBreaksAllowed // ignore: cast_nullable_to_non_nullable
                      as int,
            requiredHours: null == requiredHours
                ? _value.requiredHours
                : requiredHours // ignore: cast_nullable_to_non_nullable
                      as double,
            isCurrentlyActive: null == isCurrentlyActive
                ? _value.isCurrentlyActive
                : isCurrentlyActive // ignore: cast_nullable_to_non_nullable
                      as bool,
            isInGracePeriod: null == isInGracePeriod
                ? _value.isInGracePeriod
                : isInGracePeriod // ignore: cast_nullable_to_non_nullable
                      as bool,
            isLate: null == isLate
                ? _value.isLate
                : isLate // ignore: cast_nullable_to_non_nullable
                      as bool,
            minutesLate: freezed == minutesLate
                ? _value.minutesLate
                : minutesLate // ignore: cast_nullable_to_non_nullable
                      as int?,
            minutesEarlyCheckIn: freezed == minutesEarlyCheckIn
                ? _value.minutesEarlyCheckIn
                : minutesEarlyCheckIn // ignore: cast_nullable_to_non_nullable
                      as int?,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$ShiftInfoImplCopyWith<$Res>
    implements $ShiftInfoCopyWith<$Res> {
  factory _$$ShiftInfoImplCopyWith(
    _$ShiftInfoImpl value,
    $Res Function(_$ShiftInfoImpl) then,
  ) = __$$ShiftInfoImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    String shiftCode,
    String shiftName,
    String startTime,
    String endTime,
    int gracePeriodMinutes,
    int totalBreaksAllowed,
    double requiredHours,
    bool isCurrentlyActive,
    bool isInGracePeriod,
    bool isLate,
    int? minutesLate,
    int? minutesEarlyCheckIn,
  });
}

/// @nodoc
class __$$ShiftInfoImplCopyWithImpl<$Res>
    extends _$ShiftInfoCopyWithImpl<$Res, _$ShiftInfoImpl>
    implements _$$ShiftInfoImplCopyWith<$Res> {
  __$$ShiftInfoImplCopyWithImpl(
    _$ShiftInfoImpl _value,
    $Res Function(_$ShiftInfoImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of ShiftInfo
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? shiftCode = null,
    Object? shiftName = null,
    Object? startTime = null,
    Object? endTime = null,
    Object? gracePeriodMinutes = null,
    Object? totalBreaksAllowed = null,
    Object? requiredHours = null,
    Object? isCurrentlyActive = null,
    Object? isInGracePeriod = null,
    Object? isLate = null,
    Object? minutesLate = freezed,
    Object? minutesEarlyCheckIn = freezed,
  }) {
    return _then(
      _$ShiftInfoImpl(
        shiftCode: null == shiftCode
            ? _value.shiftCode
            : shiftCode // ignore: cast_nullable_to_non_nullable
                  as String,
        shiftName: null == shiftName
            ? _value.shiftName
            : shiftName // ignore: cast_nullable_to_non_nullable
                  as String,
        startTime: null == startTime
            ? _value.startTime
            : startTime // ignore: cast_nullable_to_non_nullable
                  as String,
        endTime: null == endTime
            ? _value.endTime
            : endTime // ignore: cast_nullable_to_non_nullable
                  as String,
        gracePeriodMinutes: null == gracePeriodMinutes
            ? _value.gracePeriodMinutes
            : gracePeriodMinutes // ignore: cast_nullable_to_non_nullable
                  as int,
        totalBreaksAllowed: null == totalBreaksAllowed
            ? _value.totalBreaksAllowed
            : totalBreaksAllowed // ignore: cast_nullable_to_non_nullable
                  as int,
        requiredHours: null == requiredHours
            ? _value.requiredHours
            : requiredHours // ignore: cast_nullable_to_non_nullable
                  as double,
        isCurrentlyActive: null == isCurrentlyActive
            ? _value.isCurrentlyActive
            : isCurrentlyActive // ignore: cast_nullable_to_non_nullable
                  as bool,
        isInGracePeriod: null == isInGracePeriod
            ? _value.isInGracePeriod
            : isInGracePeriod // ignore: cast_nullable_to_non_nullable
                  as bool,
        isLate: null == isLate
            ? _value.isLate
            : isLate // ignore: cast_nullable_to_non_nullable
                  as bool,
        minutesLate: freezed == minutesLate
            ? _value.minutesLate
            : minutesLate // ignore: cast_nullable_to_non_nullable
                  as int?,
        minutesEarlyCheckIn: freezed == minutesEarlyCheckIn
            ? _value.minutesEarlyCheckIn
            : minutesEarlyCheckIn // ignore: cast_nullable_to_non_nullable
                  as int?,
      ),
    );
  }
}

/// @nodoc

class _$ShiftInfoImpl implements _ShiftInfo {
  const _$ShiftInfoImpl({
    required this.shiftCode,
    required this.shiftName,
    required this.startTime,
    required this.endTime,
    required this.gracePeriodMinutes,
    required this.totalBreaksAllowed,
    required this.requiredHours,
    this.isCurrentlyActive = false,
    this.isInGracePeriod = false,
    this.isLate = false,
    this.minutesLate,
    this.minutesEarlyCheckIn,
  });

  @override
  final String shiftCode;
  @override
  final String shiftName;
  @override
  final String startTime;
  // e.g. "09:00"
  @override
  final String endTime;
  // e.g. "18:00"
  @override
  final int gracePeriodMinutes;
  // e.g. 15
  @override
  final int totalBreaksAllowed;
  @override
  final double requiredHours;
  @override
  @JsonKey()
  final bool isCurrentlyActive;
  @override
  @JsonKey()
  final bool isInGracePeriod;
  @override
  @JsonKey()
  final bool isLate;
  @override
  final int? minutesLate;
  @override
  final int? minutesEarlyCheckIn;

  @override
  String toString() {
    return 'ShiftInfo(shiftCode: $shiftCode, shiftName: $shiftName, startTime: $startTime, endTime: $endTime, gracePeriodMinutes: $gracePeriodMinutes, totalBreaksAllowed: $totalBreaksAllowed, requiredHours: $requiredHours, isCurrentlyActive: $isCurrentlyActive, isInGracePeriod: $isInGracePeriod, isLate: $isLate, minutesLate: $minutesLate, minutesEarlyCheckIn: $minutesEarlyCheckIn)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ShiftInfoImpl &&
            (identical(other.shiftCode, shiftCode) ||
                other.shiftCode == shiftCode) &&
            (identical(other.shiftName, shiftName) ||
                other.shiftName == shiftName) &&
            (identical(other.startTime, startTime) ||
                other.startTime == startTime) &&
            (identical(other.endTime, endTime) || other.endTime == endTime) &&
            (identical(other.gracePeriodMinutes, gracePeriodMinutes) ||
                other.gracePeriodMinutes == gracePeriodMinutes) &&
            (identical(other.totalBreaksAllowed, totalBreaksAllowed) ||
                other.totalBreaksAllowed == totalBreaksAllowed) &&
            (identical(other.requiredHours, requiredHours) ||
                other.requiredHours == requiredHours) &&
            (identical(other.isCurrentlyActive, isCurrentlyActive) ||
                other.isCurrentlyActive == isCurrentlyActive) &&
            (identical(other.isInGracePeriod, isInGracePeriod) ||
                other.isInGracePeriod == isInGracePeriod) &&
            (identical(other.isLate, isLate) || other.isLate == isLate) &&
            (identical(other.minutesLate, minutesLate) ||
                other.minutesLate == minutesLate) &&
            (identical(other.minutesEarlyCheckIn, minutesEarlyCheckIn) ||
                other.minutesEarlyCheckIn == minutesEarlyCheckIn));
  }

  @override
  int get hashCode => Object.hash(
    runtimeType,
    shiftCode,
    shiftName,
    startTime,
    endTime,
    gracePeriodMinutes,
    totalBreaksAllowed,
    requiredHours,
    isCurrentlyActive,
    isInGracePeriod,
    isLate,
    minutesLate,
    minutesEarlyCheckIn,
  );

  /// Create a copy of ShiftInfo
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$ShiftInfoImplCopyWith<_$ShiftInfoImpl> get copyWith =>
      __$$ShiftInfoImplCopyWithImpl<_$ShiftInfoImpl>(this, _$identity);
}

abstract class _ShiftInfo implements ShiftInfo {
  const factory _ShiftInfo({
    required final String shiftCode,
    required final String shiftName,
    required final String startTime,
    required final String endTime,
    required final int gracePeriodMinutes,
    required final int totalBreaksAllowed,
    required final double requiredHours,
    final bool isCurrentlyActive,
    final bool isInGracePeriod,
    final bool isLate,
    final int? minutesLate,
    final int? minutesEarlyCheckIn,
  }) = _$ShiftInfoImpl;

  @override
  String get shiftCode;
  @override
  String get shiftName;
  @override
  String get startTime; // e.g. "09:00"
  @override
  String get endTime; // e.g. "18:00"
  @override
  int get gracePeriodMinutes; // e.g. 15
  @override
  int get totalBreaksAllowed;
  @override
  double get requiredHours;
  @override
  bool get isCurrentlyActive;
  @override
  bool get isInGracePeriod;
  @override
  bool get isLate;
  @override
  int? get minutesLate;
  @override
  int? get minutesEarlyCheckIn;

  /// Create a copy of ShiftInfo
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$ShiftInfoImplCopyWith<_$ShiftInfoImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
mixin _$GeofenceInfo {
  String get id => throw _privateConstructorUsedError;
  String get name => throw _privateConstructorUsedError;
  LatLng get center => throw _privateConstructorUsedError;
  double get radiusMeters => throw _privateConstructorUsedError;
  GeofenceStatus get status => throw _privateConstructorUsedError;
  double? get distanceToFence => throw _privateConstructorUsedError;

  /// Create a copy of GeofenceInfo
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $GeofenceInfoCopyWith<GeofenceInfo> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $GeofenceInfoCopyWith<$Res> {
  factory $GeofenceInfoCopyWith(
    GeofenceInfo value,
    $Res Function(GeofenceInfo) then,
  ) = _$GeofenceInfoCopyWithImpl<$Res, GeofenceInfo>;
  @useResult
  $Res call({
    String id,
    String name,
    LatLng center,
    double radiusMeters,
    GeofenceStatus status,
    double? distanceToFence,
  });
}

/// @nodoc
class _$GeofenceInfoCopyWithImpl<$Res, $Val extends GeofenceInfo>
    implements $GeofenceInfoCopyWith<$Res> {
  _$GeofenceInfoCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of GeofenceInfo
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? name = null,
    Object? center = null,
    Object? radiusMeters = null,
    Object? status = null,
    Object? distanceToFence = freezed,
  }) {
    return _then(
      _value.copyWith(
            id: null == id
                ? _value.id
                : id // ignore: cast_nullable_to_non_nullable
                      as String,
            name: null == name
                ? _value.name
                : name // ignore: cast_nullable_to_non_nullable
                      as String,
            center: null == center
                ? _value.center
                : center // ignore: cast_nullable_to_non_nullable
                      as LatLng,
            radiusMeters: null == radiusMeters
                ? _value.radiusMeters
                : radiusMeters // ignore: cast_nullable_to_non_nullable
                      as double,
            status: null == status
                ? _value.status
                : status // ignore: cast_nullable_to_non_nullable
                      as GeofenceStatus,
            distanceToFence: freezed == distanceToFence
                ? _value.distanceToFence
                : distanceToFence // ignore: cast_nullable_to_non_nullable
                      as double?,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$GeofenceInfoImplCopyWith<$Res>
    implements $GeofenceInfoCopyWith<$Res> {
  factory _$$GeofenceInfoImplCopyWith(
    _$GeofenceInfoImpl value,
    $Res Function(_$GeofenceInfoImpl) then,
  ) = __$$GeofenceInfoImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    String id,
    String name,
    LatLng center,
    double radiusMeters,
    GeofenceStatus status,
    double? distanceToFence,
  });
}

/// @nodoc
class __$$GeofenceInfoImplCopyWithImpl<$Res>
    extends _$GeofenceInfoCopyWithImpl<$Res, _$GeofenceInfoImpl>
    implements _$$GeofenceInfoImplCopyWith<$Res> {
  __$$GeofenceInfoImplCopyWithImpl(
    _$GeofenceInfoImpl _value,
    $Res Function(_$GeofenceInfoImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of GeofenceInfo
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? name = null,
    Object? center = null,
    Object? radiusMeters = null,
    Object? status = null,
    Object? distanceToFence = freezed,
  }) {
    return _then(
      _$GeofenceInfoImpl(
        id: null == id
            ? _value.id
            : id // ignore: cast_nullable_to_non_nullable
                  as String,
        name: null == name
            ? _value.name
            : name // ignore: cast_nullable_to_non_nullable
                  as String,
        center: null == center
            ? _value.center
            : center // ignore: cast_nullable_to_non_nullable
                  as LatLng,
        radiusMeters: null == radiusMeters
            ? _value.radiusMeters
            : radiusMeters // ignore: cast_nullable_to_non_nullable
                  as double,
        status: null == status
            ? _value.status
            : status // ignore: cast_nullable_to_non_nullable
                  as GeofenceStatus,
        distanceToFence: freezed == distanceToFence
            ? _value.distanceToFence
            : distanceToFence // ignore: cast_nullable_to_non_nullable
                  as double?,
      ),
    );
  }
}

/// @nodoc

class _$GeofenceInfoImpl implements _GeofenceInfo {
  const _$GeofenceInfoImpl({
    required this.id,
    required this.name,
    required this.center,
    required this.radiusMeters,
    this.status = GeofenceStatus.unknown,
    this.distanceToFence,
  });

  @override
  final String id;
  @override
  final String name;
  @override
  final LatLng center;
  @override
  final double radiusMeters;
  @override
  @JsonKey()
  final GeofenceStatus status;
  @override
  final double? distanceToFence;

  @override
  String toString() {
    return 'GeofenceInfo(id: $id, name: $name, center: $center, radiusMeters: $radiusMeters, status: $status, distanceToFence: $distanceToFence)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$GeofenceInfoImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.center, center) || other.center == center) &&
            (identical(other.radiusMeters, radiusMeters) ||
                other.radiusMeters == radiusMeters) &&
            (identical(other.status, status) || other.status == status) &&
            (identical(other.distanceToFence, distanceToFence) ||
                other.distanceToFence == distanceToFence));
  }

  @override
  int get hashCode => Object.hash(
    runtimeType,
    id,
    name,
    center,
    radiusMeters,
    status,
    distanceToFence,
  );

  /// Create a copy of GeofenceInfo
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$GeofenceInfoImplCopyWith<_$GeofenceInfoImpl> get copyWith =>
      __$$GeofenceInfoImplCopyWithImpl<_$GeofenceInfoImpl>(this, _$identity);
}

abstract class _GeofenceInfo implements GeofenceInfo {
  const factory _GeofenceInfo({
    required final String id,
    required final String name,
    required final LatLng center,
    required final double radiusMeters,
    final GeofenceStatus status,
    final double? distanceToFence,
  }) = _$GeofenceInfoImpl;

  @override
  String get id;
  @override
  String get name;
  @override
  LatLng get center;
  @override
  double get radiusMeters;
  @override
  GeofenceStatus get status;
  @override
  double? get distanceToFence;

  /// Create a copy of GeofenceInfo
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$GeofenceInfoImplCopyWith<_$GeofenceInfoImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
mixin _$GpsLocation {
  double get latitude => throw _privateConstructorUsedError;
  double get longitude => throw _privateConstructorUsedError;
  double get accuracyMeters => throw _privateConstructorUsedError;
  DateTime get timestamp => throw _privateConstructorUsedError;
  bool get isMockLocation => throw _privateConstructorUsedError;
  double? get altitude => throw _privateConstructorUsedError;
  double? get speed => throw _privateConstructorUsedError;

  /// Create a copy of GpsLocation
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $GpsLocationCopyWith<GpsLocation> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $GpsLocationCopyWith<$Res> {
  factory $GpsLocationCopyWith(
    GpsLocation value,
    $Res Function(GpsLocation) then,
  ) = _$GpsLocationCopyWithImpl<$Res, GpsLocation>;
  @useResult
  $Res call({
    double latitude,
    double longitude,
    double accuracyMeters,
    DateTime timestamp,
    bool isMockLocation,
    double? altitude,
    double? speed,
  });
}

/// @nodoc
class _$GpsLocationCopyWithImpl<$Res, $Val extends GpsLocation>
    implements $GpsLocationCopyWith<$Res> {
  _$GpsLocationCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of GpsLocation
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? latitude = null,
    Object? longitude = null,
    Object? accuracyMeters = null,
    Object? timestamp = null,
    Object? isMockLocation = null,
    Object? altitude = freezed,
    Object? speed = freezed,
  }) {
    return _then(
      _value.copyWith(
            latitude: null == latitude
                ? _value.latitude
                : latitude // ignore: cast_nullable_to_non_nullable
                      as double,
            longitude: null == longitude
                ? _value.longitude
                : longitude // ignore: cast_nullable_to_non_nullable
                      as double,
            accuracyMeters: null == accuracyMeters
                ? _value.accuracyMeters
                : accuracyMeters // ignore: cast_nullable_to_non_nullable
                      as double,
            timestamp: null == timestamp
                ? _value.timestamp
                : timestamp // ignore: cast_nullable_to_non_nullable
                      as DateTime,
            isMockLocation: null == isMockLocation
                ? _value.isMockLocation
                : isMockLocation // ignore: cast_nullable_to_non_nullable
                      as bool,
            altitude: freezed == altitude
                ? _value.altitude
                : altitude // ignore: cast_nullable_to_non_nullable
                      as double?,
            speed: freezed == speed
                ? _value.speed
                : speed // ignore: cast_nullable_to_non_nullable
                      as double?,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$GpsLocationImplCopyWith<$Res>
    implements $GpsLocationCopyWith<$Res> {
  factory _$$GpsLocationImplCopyWith(
    _$GpsLocationImpl value,
    $Res Function(_$GpsLocationImpl) then,
  ) = __$$GpsLocationImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    double latitude,
    double longitude,
    double accuracyMeters,
    DateTime timestamp,
    bool isMockLocation,
    double? altitude,
    double? speed,
  });
}

/// @nodoc
class __$$GpsLocationImplCopyWithImpl<$Res>
    extends _$GpsLocationCopyWithImpl<$Res, _$GpsLocationImpl>
    implements _$$GpsLocationImplCopyWith<$Res> {
  __$$GpsLocationImplCopyWithImpl(
    _$GpsLocationImpl _value,
    $Res Function(_$GpsLocationImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of GpsLocation
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? latitude = null,
    Object? longitude = null,
    Object? accuracyMeters = null,
    Object? timestamp = null,
    Object? isMockLocation = null,
    Object? altitude = freezed,
    Object? speed = freezed,
  }) {
    return _then(
      _$GpsLocationImpl(
        latitude: null == latitude
            ? _value.latitude
            : latitude // ignore: cast_nullable_to_non_nullable
                  as double,
        longitude: null == longitude
            ? _value.longitude
            : longitude // ignore: cast_nullable_to_non_nullable
                  as double,
        accuracyMeters: null == accuracyMeters
            ? _value.accuracyMeters
            : accuracyMeters // ignore: cast_nullable_to_non_nullable
                  as double,
        timestamp: null == timestamp
            ? _value.timestamp
            : timestamp // ignore: cast_nullable_to_non_nullable
                  as DateTime,
        isMockLocation: null == isMockLocation
            ? _value.isMockLocation
            : isMockLocation // ignore: cast_nullable_to_non_nullable
                  as bool,
        altitude: freezed == altitude
            ? _value.altitude
            : altitude // ignore: cast_nullable_to_non_nullable
                  as double?,
        speed: freezed == speed
            ? _value.speed
            : speed // ignore: cast_nullable_to_non_nullable
                  as double?,
      ),
    );
  }
}

/// @nodoc

class _$GpsLocationImpl implements _GpsLocation {
  const _$GpsLocationImpl({
    required this.latitude,
    required this.longitude,
    required this.accuracyMeters,
    required this.timestamp,
    this.isMockLocation = false,
    this.altitude,
    this.speed,
  });

  @override
  final double latitude;
  @override
  final double longitude;
  @override
  final double accuracyMeters;
  @override
  final DateTime timestamp;
  @override
  @JsonKey()
  final bool isMockLocation;
  @override
  final double? altitude;
  @override
  final double? speed;

  @override
  String toString() {
    return 'GpsLocation(latitude: $latitude, longitude: $longitude, accuracyMeters: $accuracyMeters, timestamp: $timestamp, isMockLocation: $isMockLocation, altitude: $altitude, speed: $speed)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$GpsLocationImpl &&
            (identical(other.latitude, latitude) ||
                other.latitude == latitude) &&
            (identical(other.longitude, longitude) ||
                other.longitude == longitude) &&
            (identical(other.accuracyMeters, accuracyMeters) ||
                other.accuracyMeters == accuracyMeters) &&
            (identical(other.timestamp, timestamp) ||
                other.timestamp == timestamp) &&
            (identical(other.isMockLocation, isMockLocation) ||
                other.isMockLocation == isMockLocation) &&
            (identical(other.altitude, altitude) ||
                other.altitude == altitude) &&
            (identical(other.speed, speed) || other.speed == speed));
  }

  @override
  int get hashCode => Object.hash(
    runtimeType,
    latitude,
    longitude,
    accuracyMeters,
    timestamp,
    isMockLocation,
    altitude,
    speed,
  );

  /// Create a copy of GpsLocation
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$GpsLocationImplCopyWith<_$GpsLocationImpl> get copyWith =>
      __$$GpsLocationImplCopyWithImpl<_$GpsLocationImpl>(this, _$identity);
}

abstract class _GpsLocation implements GpsLocation {
  const factory _GpsLocation({
    required final double latitude,
    required final double longitude,
    required final double accuracyMeters,
    required final DateTime timestamp,
    final bool isMockLocation,
    final double? altitude,
    final double? speed,
  }) = _$GpsLocationImpl;

  @override
  double get latitude;
  @override
  double get longitude;
  @override
  double get accuracyMeters;
  @override
  DateTime get timestamp;
  @override
  bool get isMockLocation;
  @override
  double? get altitude;
  @override
  double? get speed;

  /// Create a copy of GpsLocation
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$GpsLocationImplCopyWith<_$GpsLocationImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
mixin _$ActiveSession {
  String get sessionId => throw _privateConstructorUsedError;
  DateTime get checkInTime => throw _privateConstructorUsedError;
  String get shiftName => throw _privateConstructorUsedError;
  int? get breaksTaken => throw _privateConstructorUsedError;
  DateTime? get lastBreakStart => throw _privateConstructorUsedError;
  bool get isOnBreak => throw _privateConstructorUsedError;

  /// Geofence the employee checked in from. Check-out must occur inside this
  /// same zone (exceptions are handled by admin force-checkout).
  String? get checkInGeofenceId => throw _privateConstructorUsedError;
  String? get checkInGeofenceName => throw _privateConstructorUsedError;

  /// Create a copy of ActiveSession
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $ActiveSessionCopyWith<ActiveSession> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ActiveSessionCopyWith<$Res> {
  factory $ActiveSessionCopyWith(
    ActiveSession value,
    $Res Function(ActiveSession) then,
  ) = _$ActiveSessionCopyWithImpl<$Res, ActiveSession>;
  @useResult
  $Res call({
    String sessionId,
    DateTime checkInTime,
    String shiftName,
    int? breaksTaken,
    DateTime? lastBreakStart,
    bool isOnBreak,
    String? checkInGeofenceId,
    String? checkInGeofenceName,
  });
}

/// @nodoc
class _$ActiveSessionCopyWithImpl<$Res, $Val extends ActiveSession>
    implements $ActiveSessionCopyWith<$Res> {
  _$ActiveSessionCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of ActiveSession
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? sessionId = null,
    Object? checkInTime = null,
    Object? shiftName = null,
    Object? breaksTaken = freezed,
    Object? lastBreakStart = freezed,
    Object? isOnBreak = null,
    Object? checkInGeofenceId = freezed,
    Object? checkInGeofenceName = freezed,
  }) {
    return _then(
      _value.copyWith(
            sessionId: null == sessionId
                ? _value.sessionId
                : sessionId // ignore: cast_nullable_to_non_nullable
                      as String,
            checkInTime: null == checkInTime
                ? _value.checkInTime
                : checkInTime // ignore: cast_nullable_to_non_nullable
                      as DateTime,
            shiftName: null == shiftName
                ? _value.shiftName
                : shiftName // ignore: cast_nullable_to_non_nullable
                      as String,
            breaksTaken: freezed == breaksTaken
                ? _value.breaksTaken
                : breaksTaken // ignore: cast_nullable_to_non_nullable
                      as int?,
            lastBreakStart: freezed == lastBreakStart
                ? _value.lastBreakStart
                : lastBreakStart // ignore: cast_nullable_to_non_nullable
                      as DateTime?,
            isOnBreak: null == isOnBreak
                ? _value.isOnBreak
                : isOnBreak // ignore: cast_nullable_to_non_nullable
                      as bool,
            checkInGeofenceId: freezed == checkInGeofenceId
                ? _value.checkInGeofenceId
                : checkInGeofenceId // ignore: cast_nullable_to_non_nullable
                      as String?,
            checkInGeofenceName: freezed == checkInGeofenceName
                ? _value.checkInGeofenceName
                : checkInGeofenceName // ignore: cast_nullable_to_non_nullable
                      as String?,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$ActiveSessionImplCopyWith<$Res>
    implements $ActiveSessionCopyWith<$Res> {
  factory _$$ActiveSessionImplCopyWith(
    _$ActiveSessionImpl value,
    $Res Function(_$ActiveSessionImpl) then,
  ) = __$$ActiveSessionImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    String sessionId,
    DateTime checkInTime,
    String shiftName,
    int? breaksTaken,
    DateTime? lastBreakStart,
    bool isOnBreak,
    String? checkInGeofenceId,
    String? checkInGeofenceName,
  });
}

/// @nodoc
class __$$ActiveSessionImplCopyWithImpl<$Res>
    extends _$ActiveSessionCopyWithImpl<$Res, _$ActiveSessionImpl>
    implements _$$ActiveSessionImplCopyWith<$Res> {
  __$$ActiveSessionImplCopyWithImpl(
    _$ActiveSessionImpl _value,
    $Res Function(_$ActiveSessionImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of ActiveSession
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? sessionId = null,
    Object? checkInTime = null,
    Object? shiftName = null,
    Object? breaksTaken = freezed,
    Object? lastBreakStart = freezed,
    Object? isOnBreak = null,
    Object? checkInGeofenceId = freezed,
    Object? checkInGeofenceName = freezed,
  }) {
    return _then(
      _$ActiveSessionImpl(
        sessionId: null == sessionId
            ? _value.sessionId
            : sessionId // ignore: cast_nullable_to_non_nullable
                  as String,
        checkInTime: null == checkInTime
            ? _value.checkInTime
            : checkInTime // ignore: cast_nullable_to_non_nullable
                  as DateTime,
        shiftName: null == shiftName
            ? _value.shiftName
            : shiftName // ignore: cast_nullable_to_non_nullable
                  as String,
        breaksTaken: freezed == breaksTaken
            ? _value.breaksTaken
            : breaksTaken // ignore: cast_nullable_to_non_nullable
                  as int?,
        lastBreakStart: freezed == lastBreakStart
            ? _value.lastBreakStart
            : lastBreakStart // ignore: cast_nullable_to_non_nullable
                  as DateTime?,
        isOnBreak: null == isOnBreak
            ? _value.isOnBreak
            : isOnBreak // ignore: cast_nullable_to_non_nullable
                  as bool,
        checkInGeofenceId: freezed == checkInGeofenceId
            ? _value.checkInGeofenceId
            : checkInGeofenceId // ignore: cast_nullable_to_non_nullable
                  as String?,
        checkInGeofenceName: freezed == checkInGeofenceName
            ? _value.checkInGeofenceName
            : checkInGeofenceName // ignore: cast_nullable_to_non_nullable
                  as String?,
      ),
    );
  }
}

/// @nodoc

class _$ActiveSessionImpl implements _ActiveSession {
  const _$ActiveSessionImpl({
    required this.sessionId,
    required this.checkInTime,
    required this.shiftName,
    this.breaksTaken,
    this.lastBreakStart,
    this.isOnBreak = false,
    this.checkInGeofenceId,
    this.checkInGeofenceName,
  });

  @override
  final String sessionId;
  @override
  final DateTime checkInTime;
  @override
  final String shiftName;
  @override
  final int? breaksTaken;
  @override
  final DateTime? lastBreakStart;
  @override
  @JsonKey()
  final bool isOnBreak;

  /// Geofence the employee checked in from. Check-out must occur inside this
  /// same zone (exceptions are handled by admin force-checkout).
  @override
  final String? checkInGeofenceId;
  @override
  final String? checkInGeofenceName;

  @override
  String toString() {
    return 'ActiveSession(sessionId: $sessionId, checkInTime: $checkInTime, shiftName: $shiftName, breaksTaken: $breaksTaken, lastBreakStart: $lastBreakStart, isOnBreak: $isOnBreak, checkInGeofenceId: $checkInGeofenceId, checkInGeofenceName: $checkInGeofenceName)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ActiveSessionImpl &&
            (identical(other.sessionId, sessionId) ||
                other.sessionId == sessionId) &&
            (identical(other.checkInTime, checkInTime) ||
                other.checkInTime == checkInTime) &&
            (identical(other.shiftName, shiftName) ||
                other.shiftName == shiftName) &&
            (identical(other.breaksTaken, breaksTaken) ||
                other.breaksTaken == breaksTaken) &&
            (identical(other.lastBreakStart, lastBreakStart) ||
                other.lastBreakStart == lastBreakStart) &&
            (identical(other.isOnBreak, isOnBreak) ||
                other.isOnBreak == isOnBreak) &&
            (identical(other.checkInGeofenceId, checkInGeofenceId) ||
                other.checkInGeofenceId == checkInGeofenceId) &&
            (identical(other.checkInGeofenceName, checkInGeofenceName) ||
                other.checkInGeofenceName == checkInGeofenceName));
  }

  @override
  int get hashCode => Object.hash(
    runtimeType,
    sessionId,
    checkInTime,
    shiftName,
    breaksTaken,
    lastBreakStart,
    isOnBreak,
    checkInGeofenceId,
    checkInGeofenceName,
  );

  /// Create a copy of ActiveSession
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$ActiveSessionImplCopyWith<_$ActiveSessionImpl> get copyWith =>
      __$$ActiveSessionImplCopyWithImpl<_$ActiveSessionImpl>(this, _$identity);
}

abstract class _ActiveSession implements ActiveSession {
  const factory _ActiveSession({
    required final String sessionId,
    required final DateTime checkInTime,
    required final String shiftName,
    final int? breaksTaken,
    final DateTime? lastBreakStart,
    final bool isOnBreak,
    final String? checkInGeofenceId,
    final String? checkInGeofenceName,
  }) = _$ActiveSessionImpl;

  @override
  String get sessionId;
  @override
  DateTime get checkInTime;
  @override
  String get shiftName;
  @override
  int? get breaksTaken;
  @override
  DateTime? get lastBreakStart;
  @override
  bool get isOnBreak;

  /// Geofence the employee checked in from. Check-out must occur inside this
  /// same zone (exceptions are handled by admin force-checkout).
  @override
  String? get checkInGeofenceId;
  @override
  String? get checkInGeofenceName;

  /// Create a copy of ActiveSession
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$ActiveSessionImplCopyWith<_$ActiveSessionImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
mixin _$CheckInResult {
  String get attendanceId => throw _privateConstructorUsedError;
  DateTime get checkInTime => throw _privateConstructorUsedError;
  String get shiftName => throw _privateConstructorUsedError;
  String get branchName => throw _privateConstructorUsedError;
  bool get isOffline => throw _privateConstructorUsedError;
  bool get isLate => throw _privateConstructorUsedError;
  int? get minutesLate => throw _privateConstructorUsedError;

  /// Create a copy of CheckInResult
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $CheckInResultCopyWith<CheckInResult> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $CheckInResultCopyWith<$Res> {
  factory $CheckInResultCopyWith(
    CheckInResult value,
    $Res Function(CheckInResult) then,
  ) = _$CheckInResultCopyWithImpl<$Res, CheckInResult>;
  @useResult
  $Res call({
    String attendanceId,
    DateTime checkInTime,
    String shiftName,
    String branchName,
    bool isOffline,
    bool isLate,
    int? minutesLate,
  });
}

/// @nodoc
class _$CheckInResultCopyWithImpl<$Res, $Val extends CheckInResult>
    implements $CheckInResultCopyWith<$Res> {
  _$CheckInResultCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of CheckInResult
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? attendanceId = null,
    Object? checkInTime = null,
    Object? shiftName = null,
    Object? branchName = null,
    Object? isOffline = null,
    Object? isLate = null,
    Object? minutesLate = freezed,
  }) {
    return _then(
      _value.copyWith(
            attendanceId: null == attendanceId
                ? _value.attendanceId
                : attendanceId // ignore: cast_nullable_to_non_nullable
                      as String,
            checkInTime: null == checkInTime
                ? _value.checkInTime
                : checkInTime // ignore: cast_nullable_to_non_nullable
                      as DateTime,
            shiftName: null == shiftName
                ? _value.shiftName
                : shiftName // ignore: cast_nullable_to_non_nullable
                      as String,
            branchName: null == branchName
                ? _value.branchName
                : branchName // ignore: cast_nullable_to_non_nullable
                      as String,
            isOffline: null == isOffline
                ? _value.isOffline
                : isOffline // ignore: cast_nullable_to_non_nullable
                      as bool,
            isLate: null == isLate
                ? _value.isLate
                : isLate // ignore: cast_nullable_to_non_nullable
                      as bool,
            minutesLate: freezed == minutesLate
                ? _value.minutesLate
                : minutesLate // ignore: cast_nullable_to_non_nullable
                      as int?,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$CheckInResultImplCopyWith<$Res>
    implements $CheckInResultCopyWith<$Res> {
  factory _$$CheckInResultImplCopyWith(
    _$CheckInResultImpl value,
    $Res Function(_$CheckInResultImpl) then,
  ) = __$$CheckInResultImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    String attendanceId,
    DateTime checkInTime,
    String shiftName,
    String branchName,
    bool isOffline,
    bool isLate,
    int? minutesLate,
  });
}

/// @nodoc
class __$$CheckInResultImplCopyWithImpl<$Res>
    extends _$CheckInResultCopyWithImpl<$Res, _$CheckInResultImpl>
    implements _$$CheckInResultImplCopyWith<$Res> {
  __$$CheckInResultImplCopyWithImpl(
    _$CheckInResultImpl _value,
    $Res Function(_$CheckInResultImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of CheckInResult
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? attendanceId = null,
    Object? checkInTime = null,
    Object? shiftName = null,
    Object? branchName = null,
    Object? isOffline = null,
    Object? isLate = null,
    Object? minutesLate = freezed,
  }) {
    return _then(
      _$CheckInResultImpl(
        attendanceId: null == attendanceId
            ? _value.attendanceId
            : attendanceId // ignore: cast_nullable_to_non_nullable
                  as String,
        checkInTime: null == checkInTime
            ? _value.checkInTime
            : checkInTime // ignore: cast_nullable_to_non_nullable
                  as DateTime,
        shiftName: null == shiftName
            ? _value.shiftName
            : shiftName // ignore: cast_nullable_to_non_nullable
                  as String,
        branchName: null == branchName
            ? _value.branchName
            : branchName // ignore: cast_nullable_to_non_nullable
                  as String,
        isOffline: null == isOffline
            ? _value.isOffline
            : isOffline // ignore: cast_nullable_to_non_nullable
                  as bool,
        isLate: null == isLate
            ? _value.isLate
            : isLate // ignore: cast_nullable_to_non_nullable
                  as bool,
        minutesLate: freezed == minutesLate
            ? _value.minutesLate
            : minutesLate // ignore: cast_nullable_to_non_nullable
                  as int?,
      ),
    );
  }
}

/// @nodoc

class _$CheckInResultImpl implements _CheckInResult {
  const _$CheckInResultImpl({
    required this.attendanceId,
    required this.checkInTime,
    required this.shiftName,
    required this.branchName,
    required this.isOffline,
    this.isLate = false,
    this.minutesLate,
  });

  @override
  final String attendanceId;
  @override
  final DateTime checkInTime;
  @override
  final String shiftName;
  @override
  final String branchName;
  @override
  final bool isOffline;
  @override
  @JsonKey()
  final bool isLate;
  @override
  final int? minutesLate;

  @override
  String toString() {
    return 'CheckInResult(attendanceId: $attendanceId, checkInTime: $checkInTime, shiftName: $shiftName, branchName: $branchName, isOffline: $isOffline, isLate: $isLate, minutesLate: $minutesLate)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$CheckInResultImpl &&
            (identical(other.attendanceId, attendanceId) ||
                other.attendanceId == attendanceId) &&
            (identical(other.checkInTime, checkInTime) ||
                other.checkInTime == checkInTime) &&
            (identical(other.shiftName, shiftName) ||
                other.shiftName == shiftName) &&
            (identical(other.branchName, branchName) ||
                other.branchName == branchName) &&
            (identical(other.isOffline, isOffline) ||
                other.isOffline == isOffline) &&
            (identical(other.isLate, isLate) || other.isLate == isLate) &&
            (identical(other.minutesLate, minutesLate) ||
                other.minutesLate == minutesLate));
  }

  @override
  int get hashCode => Object.hash(
    runtimeType,
    attendanceId,
    checkInTime,
    shiftName,
    branchName,
    isOffline,
    isLate,
    minutesLate,
  );

  /// Create a copy of CheckInResult
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$CheckInResultImplCopyWith<_$CheckInResultImpl> get copyWith =>
      __$$CheckInResultImplCopyWithImpl<_$CheckInResultImpl>(this, _$identity);
}

abstract class _CheckInResult implements CheckInResult {
  const factory _CheckInResult({
    required final String attendanceId,
    required final DateTime checkInTime,
    required final String shiftName,
    required final String branchName,
    required final bool isOffline,
    final bool isLate,
    final int? minutesLate,
  }) = _$CheckInResultImpl;

  @override
  String get attendanceId;
  @override
  DateTime get checkInTime;
  @override
  String get shiftName;
  @override
  String get branchName;
  @override
  bool get isOffline;
  @override
  bool get isLate;
  @override
  int? get minutesLate;

  /// Create a copy of CheckInResult
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$CheckInResultImplCopyWith<_$CheckInResultImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
mixin _$TenantCheckInPolicy {
  bool get gpsRequired => throw _privateConstructorUsedError;
  bool get geofenceEnabled => throw _privateConstructorUsedError;
  String get geofencePolicy =>
      throw _privateConstructorUsedError; // BLOCK | WARN | ALLOW
  bool get biometricRequired => throw _privateConstructorUsedError;
  bool get selfieRequired => throw _privateConstructorUsedError;
  bool get allowLowAccuracy => throw _privateConstructorUsedError;
  double get accuracyThresholdMeters => throw _privateConstructorUsedError;
  bool get allowOfflineCheckIn => throw _privateConstructorUsedError;
  List<String> get checkInMethods => throw _privateConstructorUsedError;
  String get mockLocationPolicy => throw _privateConstructorUsedError;

  /// Create a copy of TenantCheckInPolicy
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $TenantCheckInPolicyCopyWith<TenantCheckInPolicy> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $TenantCheckInPolicyCopyWith<$Res> {
  factory $TenantCheckInPolicyCopyWith(
    TenantCheckInPolicy value,
    $Res Function(TenantCheckInPolicy) then,
  ) = _$TenantCheckInPolicyCopyWithImpl<$Res, TenantCheckInPolicy>;
  @useResult
  $Res call({
    bool gpsRequired,
    bool geofenceEnabled,
    String geofencePolicy,
    bool biometricRequired,
    bool selfieRequired,
    bool allowLowAccuracy,
    double accuracyThresholdMeters,
    bool allowOfflineCheckIn,
    List<String> checkInMethods,
    String mockLocationPolicy,
  });
}

/// @nodoc
class _$TenantCheckInPolicyCopyWithImpl<$Res, $Val extends TenantCheckInPolicy>
    implements $TenantCheckInPolicyCopyWith<$Res> {
  _$TenantCheckInPolicyCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of TenantCheckInPolicy
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? gpsRequired = null,
    Object? geofenceEnabled = null,
    Object? geofencePolicy = null,
    Object? biometricRequired = null,
    Object? selfieRequired = null,
    Object? allowLowAccuracy = null,
    Object? accuracyThresholdMeters = null,
    Object? allowOfflineCheckIn = null,
    Object? checkInMethods = null,
    Object? mockLocationPolicy = null,
  }) {
    return _then(
      _value.copyWith(
            gpsRequired: null == gpsRequired
                ? _value.gpsRequired
                : gpsRequired // ignore: cast_nullable_to_non_nullable
                      as bool,
            geofenceEnabled: null == geofenceEnabled
                ? _value.geofenceEnabled
                : geofenceEnabled // ignore: cast_nullable_to_non_nullable
                      as bool,
            geofencePolicy: null == geofencePolicy
                ? _value.geofencePolicy
                : geofencePolicy // ignore: cast_nullable_to_non_nullable
                      as String,
            biometricRequired: null == biometricRequired
                ? _value.biometricRequired
                : biometricRequired // ignore: cast_nullable_to_non_nullable
                      as bool,
            selfieRequired: null == selfieRequired
                ? _value.selfieRequired
                : selfieRequired // ignore: cast_nullable_to_non_nullable
                      as bool,
            allowLowAccuracy: null == allowLowAccuracy
                ? _value.allowLowAccuracy
                : allowLowAccuracy // ignore: cast_nullable_to_non_nullable
                      as bool,
            accuracyThresholdMeters: null == accuracyThresholdMeters
                ? _value.accuracyThresholdMeters
                : accuracyThresholdMeters // ignore: cast_nullable_to_non_nullable
                      as double,
            allowOfflineCheckIn: null == allowOfflineCheckIn
                ? _value.allowOfflineCheckIn
                : allowOfflineCheckIn // ignore: cast_nullable_to_non_nullable
                      as bool,
            checkInMethods: null == checkInMethods
                ? _value.checkInMethods
                : checkInMethods // ignore: cast_nullable_to_non_nullable
                      as List<String>,
            mockLocationPolicy: null == mockLocationPolicy
                ? _value.mockLocationPolicy
                : mockLocationPolicy // ignore: cast_nullable_to_non_nullable
                      as String,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$TenantCheckInPolicyImplCopyWith<$Res>
    implements $TenantCheckInPolicyCopyWith<$Res> {
  factory _$$TenantCheckInPolicyImplCopyWith(
    _$TenantCheckInPolicyImpl value,
    $Res Function(_$TenantCheckInPolicyImpl) then,
  ) = __$$TenantCheckInPolicyImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    bool gpsRequired,
    bool geofenceEnabled,
    String geofencePolicy,
    bool biometricRequired,
    bool selfieRequired,
    bool allowLowAccuracy,
    double accuracyThresholdMeters,
    bool allowOfflineCheckIn,
    List<String> checkInMethods,
    String mockLocationPolicy,
  });
}

/// @nodoc
class __$$TenantCheckInPolicyImplCopyWithImpl<$Res>
    extends _$TenantCheckInPolicyCopyWithImpl<$Res, _$TenantCheckInPolicyImpl>
    implements _$$TenantCheckInPolicyImplCopyWith<$Res> {
  __$$TenantCheckInPolicyImplCopyWithImpl(
    _$TenantCheckInPolicyImpl _value,
    $Res Function(_$TenantCheckInPolicyImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of TenantCheckInPolicy
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? gpsRequired = null,
    Object? geofenceEnabled = null,
    Object? geofencePolicy = null,
    Object? biometricRequired = null,
    Object? selfieRequired = null,
    Object? allowLowAccuracy = null,
    Object? accuracyThresholdMeters = null,
    Object? allowOfflineCheckIn = null,
    Object? checkInMethods = null,
    Object? mockLocationPolicy = null,
  }) {
    return _then(
      _$TenantCheckInPolicyImpl(
        gpsRequired: null == gpsRequired
            ? _value.gpsRequired
            : gpsRequired // ignore: cast_nullable_to_non_nullable
                  as bool,
        geofenceEnabled: null == geofenceEnabled
            ? _value.geofenceEnabled
            : geofenceEnabled // ignore: cast_nullable_to_non_nullable
                  as bool,
        geofencePolicy: null == geofencePolicy
            ? _value.geofencePolicy
            : geofencePolicy // ignore: cast_nullable_to_non_nullable
                  as String,
        biometricRequired: null == biometricRequired
            ? _value.biometricRequired
            : biometricRequired // ignore: cast_nullable_to_non_nullable
                  as bool,
        selfieRequired: null == selfieRequired
            ? _value.selfieRequired
            : selfieRequired // ignore: cast_nullable_to_non_nullable
                  as bool,
        allowLowAccuracy: null == allowLowAccuracy
            ? _value.allowLowAccuracy
            : allowLowAccuracy // ignore: cast_nullable_to_non_nullable
                  as bool,
        accuracyThresholdMeters: null == accuracyThresholdMeters
            ? _value.accuracyThresholdMeters
            : accuracyThresholdMeters // ignore: cast_nullable_to_non_nullable
                  as double,
        allowOfflineCheckIn: null == allowOfflineCheckIn
            ? _value.allowOfflineCheckIn
            : allowOfflineCheckIn // ignore: cast_nullable_to_non_nullable
                  as bool,
        checkInMethods: null == checkInMethods
            ? _value._checkInMethods
            : checkInMethods // ignore: cast_nullable_to_non_nullable
                  as List<String>,
        mockLocationPolicy: null == mockLocationPolicy
            ? _value.mockLocationPolicy
            : mockLocationPolicy // ignore: cast_nullable_to_non_nullable
                  as String,
      ),
    );
  }
}

/// @nodoc

class _$TenantCheckInPolicyImpl implements _TenantCheckInPolicy {
  const _$TenantCheckInPolicyImpl({
    this.gpsRequired = true,
    this.geofenceEnabled = true,
    this.geofencePolicy = 'BLOCK',
    this.biometricRequired = false,
    this.selfieRequired = false,
    this.allowLowAccuracy = false,
    this.accuracyThresholdMeters = 50.0,
    this.allowOfflineCheckIn = true,
    final List<String> checkInMethods = const ['GPS'],
    this.mockLocationPolicy = 'BLOCK',
  }) : _checkInMethods = checkInMethods;

  @override
  @JsonKey()
  final bool gpsRequired;
  @override
  @JsonKey()
  final bool geofenceEnabled;
  @override
  @JsonKey()
  final String geofencePolicy;
  // BLOCK | WARN | ALLOW
  @override
  @JsonKey()
  final bool biometricRequired;
  @override
  @JsonKey()
  final bool selfieRequired;
  @override
  @JsonKey()
  final bool allowLowAccuracy;
  @override
  @JsonKey()
  final double accuracyThresholdMeters;
  @override
  @JsonKey()
  final bool allowOfflineCheckIn;
  final List<String> _checkInMethods;
  @override
  @JsonKey()
  List<String> get checkInMethods {
    if (_checkInMethods is EqualUnmodifiableListView) return _checkInMethods;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_checkInMethods);
  }

  @override
  @JsonKey()
  final String mockLocationPolicy;

  @override
  String toString() {
    return 'TenantCheckInPolicy(gpsRequired: $gpsRequired, geofenceEnabled: $geofenceEnabled, geofencePolicy: $geofencePolicy, biometricRequired: $biometricRequired, selfieRequired: $selfieRequired, allowLowAccuracy: $allowLowAccuracy, accuracyThresholdMeters: $accuracyThresholdMeters, allowOfflineCheckIn: $allowOfflineCheckIn, checkInMethods: $checkInMethods, mockLocationPolicy: $mockLocationPolicy)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$TenantCheckInPolicyImpl &&
            (identical(other.gpsRequired, gpsRequired) ||
                other.gpsRequired == gpsRequired) &&
            (identical(other.geofenceEnabled, geofenceEnabled) ||
                other.geofenceEnabled == geofenceEnabled) &&
            (identical(other.geofencePolicy, geofencePolicy) ||
                other.geofencePolicy == geofencePolicy) &&
            (identical(other.biometricRequired, biometricRequired) ||
                other.biometricRequired == biometricRequired) &&
            (identical(other.selfieRequired, selfieRequired) ||
                other.selfieRequired == selfieRequired) &&
            (identical(other.allowLowAccuracy, allowLowAccuracy) ||
                other.allowLowAccuracy == allowLowAccuracy) &&
            (identical(
                  other.accuracyThresholdMeters,
                  accuracyThresholdMeters,
                ) ||
                other.accuracyThresholdMeters == accuracyThresholdMeters) &&
            (identical(other.allowOfflineCheckIn, allowOfflineCheckIn) ||
                other.allowOfflineCheckIn == allowOfflineCheckIn) &&
            const DeepCollectionEquality().equals(
              other._checkInMethods,
              _checkInMethods,
            ) &&
            (identical(other.mockLocationPolicy, mockLocationPolicy) ||
                other.mockLocationPolicy == mockLocationPolicy));
  }

  @override
  int get hashCode => Object.hash(
    runtimeType,
    gpsRequired,
    geofenceEnabled,
    geofencePolicy,
    biometricRequired,
    selfieRequired,
    allowLowAccuracy,
    accuracyThresholdMeters,
    allowOfflineCheckIn,
    const DeepCollectionEquality().hash(_checkInMethods),
    mockLocationPolicy,
  );

  /// Create a copy of TenantCheckInPolicy
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$TenantCheckInPolicyImplCopyWith<_$TenantCheckInPolicyImpl> get copyWith =>
      __$$TenantCheckInPolicyImplCopyWithImpl<_$TenantCheckInPolicyImpl>(
        this,
        _$identity,
      );
}

abstract class _TenantCheckInPolicy implements TenantCheckInPolicy {
  const factory _TenantCheckInPolicy({
    final bool gpsRequired,
    final bool geofenceEnabled,
    final String geofencePolicy,
    final bool biometricRequired,
    final bool selfieRequired,
    final bool allowLowAccuracy,
    final double accuracyThresholdMeters,
    final bool allowOfflineCheckIn,
    final List<String> checkInMethods,
    final String mockLocationPolicy,
  }) = _$TenantCheckInPolicyImpl;

  @override
  bool get gpsRequired;
  @override
  bool get geofenceEnabled;
  @override
  String get geofencePolicy; // BLOCK | WARN | ALLOW
  @override
  bool get biometricRequired;
  @override
  bool get selfieRequired;
  @override
  bool get allowLowAccuracy;
  @override
  double get accuracyThresholdMeters;
  @override
  bool get allowOfflineCheckIn;
  @override
  List<String> get checkInMethods;
  @override
  String get mockLocationPolicy;

  /// Create a copy of TenantCheckInPolicy
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$TenantCheckInPolicyImplCopyWith<_$TenantCheckInPolicyImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
mixin _$CheckInState {
  CheckInScreenStatus get status => throw _privateConstructorUsedError; // Data
  ShiftInfo? get shift => throw _privateConstructorUsedError;
  GpsLocation? get location => throw _privateConstructorUsedError;
  GeofenceInfo? get geofence => throw _privateConstructorUsedError;
  ActiveSession? get activeSession => throw _privateConstructorUsedError;
  CheckInResult? get checkInResult => throw _privateConstructorUsedError;
  TenantCheckInPolicy? get policy => throw _privateConstructorUsedError;

  /// Name of the geofence the user is inside, or the nearest one when
  /// outside. Used to name the zone in status messages.
  String? get nearestGeofenceName => throw _privateConstructorUsedError; // GPS
  GpsAccuracyLevel get gpsAccuracy => throw _privateConstructorUsedError;
  GeofenceStatus get geofenceStatus => throw _privateConstructorUsedError;
  bool get isMockLocationDetected => throw _privateConstructorUsedError;
  bool get isOnline => throw _privateConstructorUsedError; // UI helpers
  CheckInButtonMode get buttonMode => throw _privateConstructorUsedError;
  bool get showSuccessOverlay => throw _privateConstructorUsedError;
  bool get isProcessingBiometric => throw _privateConstructorUsedError;
  bool get isCapturingSelfie => throw _privateConstructorUsedError; // Check-out
  bool get isCheckingOut => throw _privateConstructorUsedError;
  String? get checkOutError => throw _privateConstructorUsedError; // Error
  String? get errorMessage => throw _privateConstructorUsedError;
  String? get errorCode => throw _privateConstructorUsedError;

  /// Create a copy of CheckInState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $CheckInStateCopyWith<CheckInState> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $CheckInStateCopyWith<$Res> {
  factory $CheckInStateCopyWith(
    CheckInState value,
    $Res Function(CheckInState) then,
  ) = _$CheckInStateCopyWithImpl<$Res, CheckInState>;
  @useResult
  $Res call({
    CheckInScreenStatus status,
    ShiftInfo? shift,
    GpsLocation? location,
    GeofenceInfo? geofence,
    ActiveSession? activeSession,
    CheckInResult? checkInResult,
    TenantCheckInPolicy? policy,
    String? nearestGeofenceName,
    GpsAccuracyLevel gpsAccuracy,
    GeofenceStatus geofenceStatus,
    bool isMockLocationDetected,
    bool isOnline,
    CheckInButtonMode buttonMode,
    bool showSuccessOverlay,
    bool isProcessingBiometric,
    bool isCapturingSelfie,
    bool isCheckingOut,
    String? checkOutError,
    String? errorMessage,
    String? errorCode,
  });

  $ShiftInfoCopyWith<$Res>? get shift;
  $GpsLocationCopyWith<$Res>? get location;
  $GeofenceInfoCopyWith<$Res>? get geofence;
  $ActiveSessionCopyWith<$Res>? get activeSession;
  $CheckInResultCopyWith<$Res>? get checkInResult;
  $TenantCheckInPolicyCopyWith<$Res>? get policy;
}

/// @nodoc
class _$CheckInStateCopyWithImpl<$Res, $Val extends CheckInState>
    implements $CheckInStateCopyWith<$Res> {
  _$CheckInStateCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of CheckInState
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? status = null,
    Object? shift = freezed,
    Object? location = freezed,
    Object? geofence = freezed,
    Object? activeSession = freezed,
    Object? checkInResult = freezed,
    Object? policy = freezed,
    Object? nearestGeofenceName = freezed,
    Object? gpsAccuracy = null,
    Object? geofenceStatus = null,
    Object? isMockLocationDetected = null,
    Object? isOnline = null,
    Object? buttonMode = null,
    Object? showSuccessOverlay = null,
    Object? isProcessingBiometric = null,
    Object? isCapturingSelfie = null,
    Object? isCheckingOut = null,
    Object? checkOutError = freezed,
    Object? errorMessage = freezed,
    Object? errorCode = freezed,
  }) {
    return _then(
      _value.copyWith(
            status: null == status
                ? _value.status
                : status // ignore: cast_nullable_to_non_nullable
                      as CheckInScreenStatus,
            shift: freezed == shift
                ? _value.shift
                : shift // ignore: cast_nullable_to_non_nullable
                      as ShiftInfo?,
            location: freezed == location
                ? _value.location
                : location // ignore: cast_nullable_to_non_nullable
                      as GpsLocation?,
            geofence: freezed == geofence
                ? _value.geofence
                : geofence // ignore: cast_nullable_to_non_nullable
                      as GeofenceInfo?,
            activeSession: freezed == activeSession
                ? _value.activeSession
                : activeSession // ignore: cast_nullable_to_non_nullable
                      as ActiveSession?,
            checkInResult: freezed == checkInResult
                ? _value.checkInResult
                : checkInResult // ignore: cast_nullable_to_non_nullable
                      as CheckInResult?,
            policy: freezed == policy
                ? _value.policy
                : policy // ignore: cast_nullable_to_non_nullable
                      as TenantCheckInPolicy?,
            nearestGeofenceName: freezed == nearestGeofenceName
                ? _value.nearestGeofenceName
                : nearestGeofenceName // ignore: cast_nullable_to_non_nullable
                      as String?,
            gpsAccuracy: null == gpsAccuracy
                ? _value.gpsAccuracy
                : gpsAccuracy // ignore: cast_nullable_to_non_nullable
                      as GpsAccuracyLevel,
            geofenceStatus: null == geofenceStatus
                ? _value.geofenceStatus
                : geofenceStatus // ignore: cast_nullable_to_non_nullable
                      as GeofenceStatus,
            isMockLocationDetected: null == isMockLocationDetected
                ? _value.isMockLocationDetected
                : isMockLocationDetected // ignore: cast_nullable_to_non_nullable
                      as bool,
            isOnline: null == isOnline
                ? _value.isOnline
                : isOnline // ignore: cast_nullable_to_non_nullable
                      as bool,
            buttonMode: null == buttonMode
                ? _value.buttonMode
                : buttonMode // ignore: cast_nullable_to_non_nullable
                      as CheckInButtonMode,
            showSuccessOverlay: null == showSuccessOverlay
                ? _value.showSuccessOverlay
                : showSuccessOverlay // ignore: cast_nullable_to_non_nullable
                      as bool,
            isProcessingBiometric: null == isProcessingBiometric
                ? _value.isProcessingBiometric
                : isProcessingBiometric // ignore: cast_nullable_to_non_nullable
                      as bool,
            isCapturingSelfie: null == isCapturingSelfie
                ? _value.isCapturingSelfie
                : isCapturingSelfie // ignore: cast_nullable_to_non_nullable
                      as bool,
            isCheckingOut: null == isCheckingOut
                ? _value.isCheckingOut
                : isCheckingOut // ignore: cast_nullable_to_non_nullable
                      as bool,
            checkOutError: freezed == checkOutError
                ? _value.checkOutError
                : checkOutError // ignore: cast_nullable_to_non_nullable
                      as String?,
            errorMessage: freezed == errorMessage
                ? _value.errorMessage
                : errorMessage // ignore: cast_nullable_to_non_nullable
                      as String?,
            errorCode: freezed == errorCode
                ? _value.errorCode
                : errorCode // ignore: cast_nullable_to_non_nullable
                      as String?,
          )
          as $Val,
    );
  }

  /// Create a copy of CheckInState
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $ShiftInfoCopyWith<$Res>? get shift {
    if (_value.shift == null) {
      return null;
    }

    return $ShiftInfoCopyWith<$Res>(_value.shift!, (value) {
      return _then(_value.copyWith(shift: value) as $Val);
    });
  }

  /// Create a copy of CheckInState
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $GpsLocationCopyWith<$Res>? get location {
    if (_value.location == null) {
      return null;
    }

    return $GpsLocationCopyWith<$Res>(_value.location!, (value) {
      return _then(_value.copyWith(location: value) as $Val);
    });
  }

  /// Create a copy of CheckInState
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $GeofenceInfoCopyWith<$Res>? get geofence {
    if (_value.geofence == null) {
      return null;
    }

    return $GeofenceInfoCopyWith<$Res>(_value.geofence!, (value) {
      return _then(_value.copyWith(geofence: value) as $Val);
    });
  }

  /// Create a copy of CheckInState
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $ActiveSessionCopyWith<$Res>? get activeSession {
    if (_value.activeSession == null) {
      return null;
    }

    return $ActiveSessionCopyWith<$Res>(_value.activeSession!, (value) {
      return _then(_value.copyWith(activeSession: value) as $Val);
    });
  }

  /// Create a copy of CheckInState
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $CheckInResultCopyWith<$Res>? get checkInResult {
    if (_value.checkInResult == null) {
      return null;
    }

    return $CheckInResultCopyWith<$Res>(_value.checkInResult!, (value) {
      return _then(_value.copyWith(checkInResult: value) as $Val);
    });
  }

  /// Create a copy of CheckInState
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $TenantCheckInPolicyCopyWith<$Res>? get policy {
    if (_value.policy == null) {
      return null;
    }

    return $TenantCheckInPolicyCopyWith<$Res>(_value.policy!, (value) {
      return _then(_value.copyWith(policy: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$CheckInStateImplCopyWith<$Res>
    implements $CheckInStateCopyWith<$Res> {
  factory _$$CheckInStateImplCopyWith(
    _$CheckInStateImpl value,
    $Res Function(_$CheckInStateImpl) then,
  ) = __$$CheckInStateImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    CheckInScreenStatus status,
    ShiftInfo? shift,
    GpsLocation? location,
    GeofenceInfo? geofence,
    ActiveSession? activeSession,
    CheckInResult? checkInResult,
    TenantCheckInPolicy? policy,
    String? nearestGeofenceName,
    GpsAccuracyLevel gpsAccuracy,
    GeofenceStatus geofenceStatus,
    bool isMockLocationDetected,
    bool isOnline,
    CheckInButtonMode buttonMode,
    bool showSuccessOverlay,
    bool isProcessingBiometric,
    bool isCapturingSelfie,
    bool isCheckingOut,
    String? checkOutError,
    String? errorMessage,
    String? errorCode,
  });

  @override
  $ShiftInfoCopyWith<$Res>? get shift;
  @override
  $GpsLocationCopyWith<$Res>? get location;
  @override
  $GeofenceInfoCopyWith<$Res>? get geofence;
  @override
  $ActiveSessionCopyWith<$Res>? get activeSession;
  @override
  $CheckInResultCopyWith<$Res>? get checkInResult;
  @override
  $TenantCheckInPolicyCopyWith<$Res>? get policy;
}

/// @nodoc
class __$$CheckInStateImplCopyWithImpl<$Res>
    extends _$CheckInStateCopyWithImpl<$Res, _$CheckInStateImpl>
    implements _$$CheckInStateImplCopyWith<$Res> {
  __$$CheckInStateImplCopyWithImpl(
    _$CheckInStateImpl _value,
    $Res Function(_$CheckInStateImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of CheckInState
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? status = null,
    Object? shift = freezed,
    Object? location = freezed,
    Object? geofence = freezed,
    Object? activeSession = freezed,
    Object? checkInResult = freezed,
    Object? policy = freezed,
    Object? nearestGeofenceName = freezed,
    Object? gpsAccuracy = null,
    Object? geofenceStatus = null,
    Object? isMockLocationDetected = null,
    Object? isOnline = null,
    Object? buttonMode = null,
    Object? showSuccessOverlay = null,
    Object? isProcessingBiometric = null,
    Object? isCapturingSelfie = null,
    Object? isCheckingOut = null,
    Object? checkOutError = freezed,
    Object? errorMessage = freezed,
    Object? errorCode = freezed,
  }) {
    return _then(
      _$CheckInStateImpl(
        status: null == status
            ? _value.status
            : status // ignore: cast_nullable_to_non_nullable
                  as CheckInScreenStatus,
        shift: freezed == shift
            ? _value.shift
            : shift // ignore: cast_nullable_to_non_nullable
                  as ShiftInfo?,
        location: freezed == location
            ? _value.location
            : location // ignore: cast_nullable_to_non_nullable
                  as GpsLocation?,
        geofence: freezed == geofence
            ? _value.geofence
            : geofence // ignore: cast_nullable_to_non_nullable
                  as GeofenceInfo?,
        activeSession: freezed == activeSession
            ? _value.activeSession
            : activeSession // ignore: cast_nullable_to_non_nullable
                  as ActiveSession?,
        checkInResult: freezed == checkInResult
            ? _value.checkInResult
            : checkInResult // ignore: cast_nullable_to_non_nullable
                  as CheckInResult?,
        policy: freezed == policy
            ? _value.policy
            : policy // ignore: cast_nullable_to_non_nullable
                  as TenantCheckInPolicy?,
        nearestGeofenceName: freezed == nearestGeofenceName
            ? _value.nearestGeofenceName
            : nearestGeofenceName // ignore: cast_nullable_to_non_nullable
                  as String?,
        gpsAccuracy: null == gpsAccuracy
            ? _value.gpsAccuracy
            : gpsAccuracy // ignore: cast_nullable_to_non_nullable
                  as GpsAccuracyLevel,
        geofenceStatus: null == geofenceStatus
            ? _value.geofenceStatus
            : geofenceStatus // ignore: cast_nullable_to_non_nullable
                  as GeofenceStatus,
        isMockLocationDetected: null == isMockLocationDetected
            ? _value.isMockLocationDetected
            : isMockLocationDetected // ignore: cast_nullable_to_non_nullable
                  as bool,
        isOnline: null == isOnline
            ? _value.isOnline
            : isOnline // ignore: cast_nullable_to_non_nullable
                  as bool,
        buttonMode: null == buttonMode
            ? _value.buttonMode
            : buttonMode // ignore: cast_nullable_to_non_nullable
                  as CheckInButtonMode,
        showSuccessOverlay: null == showSuccessOverlay
            ? _value.showSuccessOverlay
            : showSuccessOverlay // ignore: cast_nullable_to_non_nullable
                  as bool,
        isProcessingBiometric: null == isProcessingBiometric
            ? _value.isProcessingBiometric
            : isProcessingBiometric // ignore: cast_nullable_to_non_nullable
                  as bool,
        isCapturingSelfie: null == isCapturingSelfie
            ? _value.isCapturingSelfie
            : isCapturingSelfie // ignore: cast_nullable_to_non_nullable
                  as bool,
        isCheckingOut: null == isCheckingOut
            ? _value.isCheckingOut
            : isCheckingOut // ignore: cast_nullable_to_non_nullable
                  as bool,
        checkOutError: freezed == checkOutError
            ? _value.checkOutError
            : checkOutError // ignore: cast_nullable_to_non_nullable
                  as String?,
        errorMessage: freezed == errorMessage
            ? _value.errorMessage
            : errorMessage // ignore: cast_nullable_to_non_nullable
                  as String?,
        errorCode: freezed == errorCode
            ? _value.errorCode
            : errorCode // ignore: cast_nullable_to_non_nullable
                  as String?,
      ),
    );
  }
}

/// @nodoc

class _$CheckInStateImpl extends _CheckInState {
  const _$CheckInStateImpl({
    this.status = CheckInScreenStatus.initializing,
    this.shift,
    this.location,
    this.geofence,
    this.activeSession,
    this.checkInResult,
    this.policy,
    this.nearestGeofenceName,
    this.gpsAccuracy = GpsAccuracyLevel.unavailable,
    this.geofenceStatus = GeofenceStatus.unknown,
    this.isMockLocationDetected = false,
    this.isOnline = false,
    this.buttonMode = CheckInButtonMode.loading,
    this.showSuccessOverlay = false,
    this.isProcessingBiometric = false,
    this.isCapturingSelfie = false,
    this.isCheckingOut = false,
    this.checkOutError,
    this.errorMessage,
    this.errorCode,
  }) : super._();

  @override
  @JsonKey()
  final CheckInScreenStatus status;
  // Data
  @override
  final ShiftInfo? shift;
  @override
  final GpsLocation? location;
  @override
  final GeofenceInfo? geofence;
  @override
  final ActiveSession? activeSession;
  @override
  final CheckInResult? checkInResult;
  @override
  final TenantCheckInPolicy? policy;

  /// Name of the geofence the user is inside, or the nearest one when
  /// outside. Used to name the zone in status messages.
  @override
  final String? nearestGeofenceName;
  // GPS
  @override
  @JsonKey()
  final GpsAccuracyLevel gpsAccuracy;
  @override
  @JsonKey()
  final GeofenceStatus geofenceStatus;
  @override
  @JsonKey()
  final bool isMockLocationDetected;
  @override
  @JsonKey()
  final bool isOnline;
  // UI helpers
  @override
  @JsonKey()
  final CheckInButtonMode buttonMode;
  @override
  @JsonKey()
  final bool showSuccessOverlay;
  @override
  @JsonKey()
  final bool isProcessingBiometric;
  @override
  @JsonKey()
  final bool isCapturingSelfie;
  // Check-out
  @override
  @JsonKey()
  final bool isCheckingOut;
  @override
  final String? checkOutError;
  // Error
  @override
  final String? errorMessage;
  @override
  final String? errorCode;

  @override
  String toString() {
    return 'CheckInState(status: $status, shift: $shift, location: $location, geofence: $geofence, activeSession: $activeSession, checkInResult: $checkInResult, policy: $policy, nearestGeofenceName: $nearestGeofenceName, gpsAccuracy: $gpsAccuracy, geofenceStatus: $geofenceStatus, isMockLocationDetected: $isMockLocationDetected, isOnline: $isOnline, buttonMode: $buttonMode, showSuccessOverlay: $showSuccessOverlay, isProcessingBiometric: $isProcessingBiometric, isCapturingSelfie: $isCapturingSelfie, isCheckingOut: $isCheckingOut, checkOutError: $checkOutError, errorMessage: $errorMessage, errorCode: $errorCode)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$CheckInStateImpl &&
            (identical(other.status, status) || other.status == status) &&
            (identical(other.shift, shift) || other.shift == shift) &&
            (identical(other.location, location) ||
                other.location == location) &&
            (identical(other.geofence, geofence) ||
                other.geofence == geofence) &&
            (identical(other.activeSession, activeSession) ||
                other.activeSession == activeSession) &&
            (identical(other.checkInResult, checkInResult) ||
                other.checkInResult == checkInResult) &&
            (identical(other.policy, policy) || other.policy == policy) &&
            (identical(other.nearestGeofenceName, nearestGeofenceName) ||
                other.nearestGeofenceName == nearestGeofenceName) &&
            (identical(other.gpsAccuracy, gpsAccuracy) ||
                other.gpsAccuracy == gpsAccuracy) &&
            (identical(other.geofenceStatus, geofenceStatus) ||
                other.geofenceStatus == geofenceStatus) &&
            (identical(other.isMockLocationDetected, isMockLocationDetected) ||
                other.isMockLocationDetected == isMockLocationDetected) &&
            (identical(other.isOnline, isOnline) ||
                other.isOnline == isOnline) &&
            (identical(other.buttonMode, buttonMode) ||
                other.buttonMode == buttonMode) &&
            (identical(other.showSuccessOverlay, showSuccessOverlay) ||
                other.showSuccessOverlay == showSuccessOverlay) &&
            (identical(other.isProcessingBiometric, isProcessingBiometric) ||
                other.isProcessingBiometric == isProcessingBiometric) &&
            (identical(other.isCapturingSelfie, isCapturingSelfie) ||
                other.isCapturingSelfie == isCapturingSelfie) &&
            (identical(other.isCheckingOut, isCheckingOut) ||
                other.isCheckingOut == isCheckingOut) &&
            (identical(other.checkOutError, checkOutError) ||
                other.checkOutError == checkOutError) &&
            (identical(other.errorMessage, errorMessage) ||
                other.errorMessage == errorMessage) &&
            (identical(other.errorCode, errorCode) ||
                other.errorCode == errorCode));
  }

  @override
  int get hashCode => Object.hashAll([
    runtimeType,
    status,
    shift,
    location,
    geofence,
    activeSession,
    checkInResult,
    policy,
    nearestGeofenceName,
    gpsAccuracy,
    geofenceStatus,
    isMockLocationDetected,
    isOnline,
    buttonMode,
    showSuccessOverlay,
    isProcessingBiometric,
    isCapturingSelfie,
    isCheckingOut,
    checkOutError,
    errorMessage,
    errorCode,
  ]);

  /// Create a copy of CheckInState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$CheckInStateImplCopyWith<_$CheckInStateImpl> get copyWith =>
      __$$CheckInStateImplCopyWithImpl<_$CheckInStateImpl>(this, _$identity);
}

abstract class _CheckInState extends CheckInState {
  const factory _CheckInState({
    final CheckInScreenStatus status,
    final ShiftInfo? shift,
    final GpsLocation? location,
    final GeofenceInfo? geofence,
    final ActiveSession? activeSession,
    final CheckInResult? checkInResult,
    final TenantCheckInPolicy? policy,
    final String? nearestGeofenceName,
    final GpsAccuracyLevel gpsAccuracy,
    final GeofenceStatus geofenceStatus,
    final bool isMockLocationDetected,
    final bool isOnline,
    final CheckInButtonMode buttonMode,
    final bool showSuccessOverlay,
    final bool isProcessingBiometric,
    final bool isCapturingSelfie,
    final bool isCheckingOut,
    final String? checkOutError,
    final String? errorMessage,
    final String? errorCode,
  }) = _$CheckInStateImpl;
  const _CheckInState._() : super._();

  @override
  CheckInScreenStatus get status; // Data
  @override
  ShiftInfo? get shift;
  @override
  GpsLocation? get location;
  @override
  GeofenceInfo? get geofence;
  @override
  ActiveSession? get activeSession;
  @override
  CheckInResult? get checkInResult;
  @override
  TenantCheckInPolicy? get policy;

  /// Name of the geofence the user is inside, or the nearest one when
  /// outside. Used to name the zone in status messages.
  @override
  String? get nearestGeofenceName; // GPS
  @override
  GpsAccuracyLevel get gpsAccuracy;
  @override
  GeofenceStatus get geofenceStatus;
  @override
  bool get isMockLocationDetected;
  @override
  bool get isOnline; // UI helpers
  @override
  CheckInButtonMode get buttonMode;
  @override
  bool get showSuccessOverlay;
  @override
  bool get isProcessingBiometric;
  @override
  bool get isCapturingSelfie; // Check-out
  @override
  bool get isCheckingOut;
  @override
  String? get checkOutError; // Error
  @override
  String? get errorMessage;
  @override
  String? get errorCode;

  /// Create a copy of CheckInState
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$CheckInStateImplCopyWith<_$CheckInStateImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
