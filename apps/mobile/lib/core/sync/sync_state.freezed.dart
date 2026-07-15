// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'sync_state.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
  'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models',
);

/// @nodoc
mixin _$SyncQueueItem {
  String get id => throw _privateConstructorUsedError;
  SyncItemModule get module => throw _privateConstructorUsedError;
  String get entityId => throw _privateConstructorUsedError;
  String get operationType =>
      throw _privateConstructorUsedError; // 'create' | 'update' | 'delete' | 'upload'
  String get description =>
      throw _privateConstructorUsedError; // Human-readable: "Check-in for Ahmed Ali"
  DateTime get queuedAt => throw _privateConstructorUsedError;
  int get retryCount => throw _privateConstructorUsedError;
  int get maxRetries => throw _privateConstructorUsedError;
  String? get errorMessage => throw _privateConstructorUsedError;
  bool get hasConflict => throw _privateConstructorUsedError; // Conflict data
  String? get localValue => throw _privateConstructorUsedError;
  String? get serverValue => throw _privateConstructorUsedError;
  String? get conflictField => throw _privateConstructorUsedError;

  /// Create a copy of SyncQueueItem
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $SyncQueueItemCopyWith<SyncQueueItem> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $SyncQueueItemCopyWith<$Res> {
  factory $SyncQueueItemCopyWith(
    SyncQueueItem value,
    $Res Function(SyncQueueItem) then,
  ) = _$SyncQueueItemCopyWithImpl<$Res, SyncQueueItem>;
  @useResult
  $Res call({
    String id,
    SyncItemModule module,
    String entityId,
    String operationType,
    String description,
    DateTime queuedAt,
    int retryCount,
    int maxRetries,
    String? errorMessage,
    bool hasConflict,
    String? localValue,
    String? serverValue,
    String? conflictField,
  });
}

/// @nodoc
class _$SyncQueueItemCopyWithImpl<$Res, $Val extends SyncQueueItem>
    implements $SyncQueueItemCopyWith<$Res> {
  _$SyncQueueItemCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of SyncQueueItem
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? module = null,
    Object? entityId = null,
    Object? operationType = null,
    Object? description = null,
    Object? queuedAt = null,
    Object? retryCount = null,
    Object? maxRetries = null,
    Object? errorMessage = freezed,
    Object? hasConflict = null,
    Object? localValue = freezed,
    Object? serverValue = freezed,
    Object? conflictField = freezed,
  }) {
    return _then(
      _value.copyWith(
            id: null == id
                ? _value.id
                : id // ignore: cast_nullable_to_non_nullable
                      as String,
            module: null == module
                ? _value.module
                : module // ignore: cast_nullable_to_non_nullable
                      as SyncItemModule,
            entityId: null == entityId
                ? _value.entityId
                : entityId // ignore: cast_nullable_to_non_nullable
                      as String,
            operationType: null == operationType
                ? _value.operationType
                : operationType // ignore: cast_nullable_to_non_nullable
                      as String,
            description: null == description
                ? _value.description
                : description // ignore: cast_nullable_to_non_nullable
                      as String,
            queuedAt: null == queuedAt
                ? _value.queuedAt
                : queuedAt // ignore: cast_nullable_to_non_nullable
                      as DateTime,
            retryCount: null == retryCount
                ? _value.retryCount
                : retryCount // ignore: cast_nullable_to_non_nullable
                      as int,
            maxRetries: null == maxRetries
                ? _value.maxRetries
                : maxRetries // ignore: cast_nullable_to_non_nullable
                      as int,
            errorMessage: freezed == errorMessage
                ? _value.errorMessage
                : errorMessage // ignore: cast_nullable_to_non_nullable
                      as String?,
            hasConflict: null == hasConflict
                ? _value.hasConflict
                : hasConflict // ignore: cast_nullable_to_non_nullable
                      as bool,
            localValue: freezed == localValue
                ? _value.localValue
                : localValue // ignore: cast_nullable_to_non_nullable
                      as String?,
            serverValue: freezed == serverValue
                ? _value.serverValue
                : serverValue // ignore: cast_nullable_to_non_nullable
                      as String?,
            conflictField: freezed == conflictField
                ? _value.conflictField
                : conflictField // ignore: cast_nullable_to_non_nullable
                      as String?,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$SyncQueueItemImplCopyWith<$Res>
    implements $SyncQueueItemCopyWith<$Res> {
  factory _$$SyncQueueItemImplCopyWith(
    _$SyncQueueItemImpl value,
    $Res Function(_$SyncQueueItemImpl) then,
  ) = __$$SyncQueueItemImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    String id,
    SyncItemModule module,
    String entityId,
    String operationType,
    String description,
    DateTime queuedAt,
    int retryCount,
    int maxRetries,
    String? errorMessage,
    bool hasConflict,
    String? localValue,
    String? serverValue,
    String? conflictField,
  });
}

/// @nodoc
class __$$SyncQueueItemImplCopyWithImpl<$Res>
    extends _$SyncQueueItemCopyWithImpl<$Res, _$SyncQueueItemImpl>
    implements _$$SyncQueueItemImplCopyWith<$Res> {
  __$$SyncQueueItemImplCopyWithImpl(
    _$SyncQueueItemImpl _value,
    $Res Function(_$SyncQueueItemImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of SyncQueueItem
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? module = null,
    Object? entityId = null,
    Object? operationType = null,
    Object? description = null,
    Object? queuedAt = null,
    Object? retryCount = null,
    Object? maxRetries = null,
    Object? errorMessage = freezed,
    Object? hasConflict = null,
    Object? localValue = freezed,
    Object? serverValue = freezed,
    Object? conflictField = freezed,
  }) {
    return _then(
      _$SyncQueueItemImpl(
        id: null == id
            ? _value.id
            : id // ignore: cast_nullable_to_non_nullable
                  as String,
        module: null == module
            ? _value.module
            : module // ignore: cast_nullable_to_non_nullable
                  as SyncItemModule,
        entityId: null == entityId
            ? _value.entityId
            : entityId // ignore: cast_nullable_to_non_nullable
                  as String,
        operationType: null == operationType
            ? _value.operationType
            : operationType // ignore: cast_nullable_to_non_nullable
                  as String,
        description: null == description
            ? _value.description
            : description // ignore: cast_nullable_to_non_nullable
                  as String,
        queuedAt: null == queuedAt
            ? _value.queuedAt
            : queuedAt // ignore: cast_nullable_to_non_nullable
                  as DateTime,
        retryCount: null == retryCount
            ? _value.retryCount
            : retryCount // ignore: cast_nullable_to_non_nullable
                  as int,
        maxRetries: null == maxRetries
            ? _value.maxRetries
            : maxRetries // ignore: cast_nullable_to_non_nullable
                  as int,
        errorMessage: freezed == errorMessage
            ? _value.errorMessage
            : errorMessage // ignore: cast_nullable_to_non_nullable
                  as String?,
        hasConflict: null == hasConflict
            ? _value.hasConflict
            : hasConflict // ignore: cast_nullable_to_non_nullable
                  as bool,
        localValue: freezed == localValue
            ? _value.localValue
            : localValue // ignore: cast_nullable_to_non_nullable
                  as String?,
        serverValue: freezed == serverValue
            ? _value.serverValue
            : serverValue // ignore: cast_nullable_to_non_nullable
                  as String?,
        conflictField: freezed == conflictField
            ? _value.conflictField
            : conflictField // ignore: cast_nullable_to_non_nullable
                  as String?,
      ),
    );
  }
}

/// @nodoc

class _$SyncQueueItemImpl extends _SyncQueueItem {
  const _$SyncQueueItemImpl({
    required this.id,
    required this.module,
    required this.entityId,
    required this.operationType,
    required this.description,
    required this.queuedAt,
    this.retryCount = 0,
    this.maxRetries = 3,
    this.errorMessage,
    this.hasConflict = false,
    this.localValue,
    this.serverValue,
    this.conflictField,
  }) : super._();

  @override
  final String id;
  @override
  final SyncItemModule module;
  @override
  final String entityId;
  @override
  final String operationType;
  // 'create' | 'update' | 'delete' | 'upload'
  @override
  final String description;
  // Human-readable: "Check-in for Ahmed Ali"
  @override
  final DateTime queuedAt;
  @override
  @JsonKey()
  final int retryCount;
  @override
  @JsonKey()
  final int maxRetries;
  @override
  final String? errorMessage;
  @override
  @JsonKey()
  final bool hasConflict;
  // Conflict data
  @override
  final String? localValue;
  @override
  final String? serverValue;
  @override
  final String? conflictField;

  @override
  String toString() {
    return 'SyncQueueItem(id: $id, module: $module, entityId: $entityId, operationType: $operationType, description: $description, queuedAt: $queuedAt, retryCount: $retryCount, maxRetries: $maxRetries, errorMessage: $errorMessage, hasConflict: $hasConflict, localValue: $localValue, serverValue: $serverValue, conflictField: $conflictField)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$SyncQueueItemImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.module, module) || other.module == module) &&
            (identical(other.entityId, entityId) ||
                other.entityId == entityId) &&
            (identical(other.operationType, operationType) ||
                other.operationType == operationType) &&
            (identical(other.description, description) ||
                other.description == description) &&
            (identical(other.queuedAt, queuedAt) ||
                other.queuedAt == queuedAt) &&
            (identical(other.retryCount, retryCount) ||
                other.retryCount == retryCount) &&
            (identical(other.maxRetries, maxRetries) ||
                other.maxRetries == maxRetries) &&
            (identical(other.errorMessage, errorMessage) ||
                other.errorMessage == errorMessage) &&
            (identical(other.hasConflict, hasConflict) ||
                other.hasConflict == hasConflict) &&
            (identical(other.localValue, localValue) ||
                other.localValue == localValue) &&
            (identical(other.serverValue, serverValue) ||
                other.serverValue == serverValue) &&
            (identical(other.conflictField, conflictField) ||
                other.conflictField == conflictField));
  }

  @override
  int get hashCode => Object.hash(
    runtimeType,
    id,
    module,
    entityId,
    operationType,
    description,
    queuedAt,
    retryCount,
    maxRetries,
    errorMessage,
    hasConflict,
    localValue,
    serverValue,
    conflictField,
  );

  /// Create a copy of SyncQueueItem
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$SyncQueueItemImplCopyWith<_$SyncQueueItemImpl> get copyWith =>
      __$$SyncQueueItemImplCopyWithImpl<_$SyncQueueItemImpl>(this, _$identity);
}

abstract class _SyncQueueItem extends SyncQueueItem {
  const factory _SyncQueueItem({
    required final String id,
    required final SyncItemModule module,
    required final String entityId,
    required final String operationType,
    required final String description,
    required final DateTime queuedAt,
    final int retryCount,
    final int maxRetries,
    final String? errorMessage,
    final bool hasConflict,
    final String? localValue,
    final String? serverValue,
    final String? conflictField,
  }) = _$SyncQueueItemImpl;
  const _SyncQueueItem._() : super._();

  @override
  String get id;
  @override
  SyncItemModule get module;
  @override
  String get entityId;
  @override
  String get operationType; // 'create' | 'update' | 'delete' | 'upload'
  @override
  String get description; // Human-readable: "Check-in for Ahmed Ali"
  @override
  DateTime get queuedAt;
  @override
  int get retryCount;
  @override
  int get maxRetries;
  @override
  String? get errorMessage;
  @override
  bool get hasConflict; // Conflict data
  @override
  String? get localValue;
  @override
  String? get serverValue;
  @override
  String? get conflictField;

  /// Create a copy of SyncQueueItem
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$SyncQueueItemImplCopyWith<_$SyncQueueItemImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
mixin _$SyncConflict {
  String get itemId => throw _privateConstructorUsedError;
  String get entityId => throw _privateConstructorUsedError;
  String get fieldName => throw _privateConstructorUsedError;
  String get localValue => throw _privateConstructorUsedError;
  String get serverValue => throw _privateConstructorUsedError;
  DateTime get localTimestamp => throw _privateConstructorUsedError;
  DateTime get serverTimestamp => throw _privateConstructorUsedError;
  SyncItemModule get module => throw _privateConstructorUsedError;
  String get entityDescription => throw _privateConstructorUsedError;

  /// Create a copy of SyncConflict
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $SyncConflictCopyWith<SyncConflict> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $SyncConflictCopyWith<$Res> {
  factory $SyncConflictCopyWith(
    SyncConflict value,
    $Res Function(SyncConflict) then,
  ) = _$SyncConflictCopyWithImpl<$Res, SyncConflict>;
  @useResult
  $Res call({
    String itemId,
    String entityId,
    String fieldName,
    String localValue,
    String serverValue,
    DateTime localTimestamp,
    DateTime serverTimestamp,
    SyncItemModule module,
    String entityDescription,
  });
}

/// @nodoc
class _$SyncConflictCopyWithImpl<$Res, $Val extends SyncConflict>
    implements $SyncConflictCopyWith<$Res> {
  _$SyncConflictCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of SyncConflict
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? itemId = null,
    Object? entityId = null,
    Object? fieldName = null,
    Object? localValue = null,
    Object? serverValue = null,
    Object? localTimestamp = null,
    Object? serverTimestamp = null,
    Object? module = null,
    Object? entityDescription = null,
  }) {
    return _then(
      _value.copyWith(
            itemId: null == itemId
                ? _value.itemId
                : itemId // ignore: cast_nullable_to_non_nullable
                      as String,
            entityId: null == entityId
                ? _value.entityId
                : entityId // ignore: cast_nullable_to_non_nullable
                      as String,
            fieldName: null == fieldName
                ? _value.fieldName
                : fieldName // ignore: cast_nullable_to_non_nullable
                      as String,
            localValue: null == localValue
                ? _value.localValue
                : localValue // ignore: cast_nullable_to_non_nullable
                      as String,
            serverValue: null == serverValue
                ? _value.serverValue
                : serverValue // ignore: cast_nullable_to_non_nullable
                      as String,
            localTimestamp: null == localTimestamp
                ? _value.localTimestamp
                : localTimestamp // ignore: cast_nullable_to_non_nullable
                      as DateTime,
            serverTimestamp: null == serverTimestamp
                ? _value.serverTimestamp
                : serverTimestamp // ignore: cast_nullable_to_non_nullable
                      as DateTime,
            module: null == module
                ? _value.module
                : module // ignore: cast_nullable_to_non_nullable
                      as SyncItemModule,
            entityDescription: null == entityDescription
                ? _value.entityDescription
                : entityDescription // ignore: cast_nullable_to_non_nullable
                      as String,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$SyncConflictImplCopyWith<$Res>
    implements $SyncConflictCopyWith<$Res> {
  factory _$$SyncConflictImplCopyWith(
    _$SyncConflictImpl value,
    $Res Function(_$SyncConflictImpl) then,
  ) = __$$SyncConflictImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    String itemId,
    String entityId,
    String fieldName,
    String localValue,
    String serverValue,
    DateTime localTimestamp,
    DateTime serverTimestamp,
    SyncItemModule module,
    String entityDescription,
  });
}

/// @nodoc
class __$$SyncConflictImplCopyWithImpl<$Res>
    extends _$SyncConflictCopyWithImpl<$Res, _$SyncConflictImpl>
    implements _$$SyncConflictImplCopyWith<$Res> {
  __$$SyncConflictImplCopyWithImpl(
    _$SyncConflictImpl _value,
    $Res Function(_$SyncConflictImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of SyncConflict
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? itemId = null,
    Object? entityId = null,
    Object? fieldName = null,
    Object? localValue = null,
    Object? serverValue = null,
    Object? localTimestamp = null,
    Object? serverTimestamp = null,
    Object? module = null,
    Object? entityDescription = null,
  }) {
    return _then(
      _$SyncConflictImpl(
        itemId: null == itemId
            ? _value.itemId
            : itemId // ignore: cast_nullable_to_non_nullable
                  as String,
        entityId: null == entityId
            ? _value.entityId
            : entityId // ignore: cast_nullable_to_non_nullable
                  as String,
        fieldName: null == fieldName
            ? _value.fieldName
            : fieldName // ignore: cast_nullable_to_non_nullable
                  as String,
        localValue: null == localValue
            ? _value.localValue
            : localValue // ignore: cast_nullable_to_non_nullable
                  as String,
        serverValue: null == serverValue
            ? _value.serverValue
            : serverValue // ignore: cast_nullable_to_non_nullable
                  as String,
        localTimestamp: null == localTimestamp
            ? _value.localTimestamp
            : localTimestamp // ignore: cast_nullable_to_non_nullable
                  as DateTime,
        serverTimestamp: null == serverTimestamp
            ? _value.serverTimestamp
            : serverTimestamp // ignore: cast_nullable_to_non_nullable
                  as DateTime,
        module: null == module
            ? _value.module
            : module // ignore: cast_nullable_to_non_nullable
                  as SyncItemModule,
        entityDescription: null == entityDescription
            ? _value.entityDescription
            : entityDescription // ignore: cast_nullable_to_non_nullable
                  as String,
      ),
    );
  }
}

/// @nodoc

class _$SyncConflictImpl implements _SyncConflict {
  const _$SyncConflictImpl({
    required this.itemId,
    required this.entityId,
    required this.fieldName,
    required this.localValue,
    required this.serverValue,
    required this.localTimestamp,
    required this.serverTimestamp,
    required this.module,
    required this.entityDescription,
  });

  @override
  final String itemId;
  @override
  final String entityId;
  @override
  final String fieldName;
  @override
  final String localValue;
  @override
  final String serverValue;
  @override
  final DateTime localTimestamp;
  @override
  final DateTime serverTimestamp;
  @override
  final SyncItemModule module;
  @override
  final String entityDescription;

  @override
  String toString() {
    return 'SyncConflict(itemId: $itemId, entityId: $entityId, fieldName: $fieldName, localValue: $localValue, serverValue: $serverValue, localTimestamp: $localTimestamp, serverTimestamp: $serverTimestamp, module: $module, entityDescription: $entityDescription)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$SyncConflictImpl &&
            (identical(other.itemId, itemId) || other.itemId == itemId) &&
            (identical(other.entityId, entityId) ||
                other.entityId == entityId) &&
            (identical(other.fieldName, fieldName) ||
                other.fieldName == fieldName) &&
            (identical(other.localValue, localValue) ||
                other.localValue == localValue) &&
            (identical(other.serverValue, serverValue) ||
                other.serverValue == serverValue) &&
            (identical(other.localTimestamp, localTimestamp) ||
                other.localTimestamp == localTimestamp) &&
            (identical(other.serverTimestamp, serverTimestamp) ||
                other.serverTimestamp == serverTimestamp) &&
            (identical(other.module, module) || other.module == module) &&
            (identical(other.entityDescription, entityDescription) ||
                other.entityDescription == entityDescription));
  }

  @override
  int get hashCode => Object.hash(
    runtimeType,
    itemId,
    entityId,
    fieldName,
    localValue,
    serverValue,
    localTimestamp,
    serverTimestamp,
    module,
    entityDescription,
  );

  /// Create a copy of SyncConflict
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$SyncConflictImplCopyWith<_$SyncConflictImpl> get copyWith =>
      __$$SyncConflictImplCopyWithImpl<_$SyncConflictImpl>(this, _$identity);
}

abstract class _SyncConflict implements SyncConflict {
  const factory _SyncConflict({
    required final String itemId,
    required final String entityId,
    required final String fieldName,
    required final String localValue,
    required final String serverValue,
    required final DateTime localTimestamp,
    required final DateTime serverTimestamp,
    required final SyncItemModule module,
    required final String entityDescription,
  }) = _$SyncConflictImpl;

  @override
  String get itemId;
  @override
  String get entityId;
  @override
  String get fieldName;
  @override
  String get localValue;
  @override
  String get serverValue;
  @override
  DateTime get localTimestamp;
  @override
  DateTime get serverTimestamp;
  @override
  SyncItemModule get module;
  @override
  String get entityDescription;

  /// Create a copy of SyncConflict
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$SyncConflictImplCopyWith<_$SyncConflictImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
mixin _$SyncState {
  SyncQueueStatus get status => throw _privateConstructorUsedError;
  List<SyncQueueItem> get queue => throw _privateConstructorUsedError;
  List<SyncConflict> get conflicts => throw _privateConstructorUsedError;
  DateTime? get lastSyncedAt => throw _privateConstructorUsedError;
  int get currentProgress =>
      throw _privateConstructorUsedError; // 0-100 for active sync
  int get totalInBatch => throw _privateConstructorUsedError;
  int get completedInBatch => throw _privateConstructorUsedError;
  String? get lastErrorMessage => throw _privateConstructorUsedError;

  /// Create a copy of SyncState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $SyncStateCopyWith<SyncState> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $SyncStateCopyWith<$Res> {
  factory $SyncStateCopyWith(SyncState value, $Res Function(SyncState) then) =
      _$SyncStateCopyWithImpl<$Res, SyncState>;
  @useResult
  $Res call({
    SyncQueueStatus status,
    List<SyncQueueItem> queue,
    List<SyncConflict> conflicts,
    DateTime? lastSyncedAt,
    int currentProgress,
    int totalInBatch,
    int completedInBatch,
    String? lastErrorMessage,
  });
}

/// @nodoc
class _$SyncStateCopyWithImpl<$Res, $Val extends SyncState>
    implements $SyncStateCopyWith<$Res> {
  _$SyncStateCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of SyncState
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? status = null,
    Object? queue = null,
    Object? conflicts = null,
    Object? lastSyncedAt = freezed,
    Object? currentProgress = null,
    Object? totalInBatch = null,
    Object? completedInBatch = null,
    Object? lastErrorMessage = freezed,
  }) {
    return _then(
      _value.copyWith(
            status: null == status
                ? _value.status
                : status // ignore: cast_nullable_to_non_nullable
                      as SyncQueueStatus,
            queue: null == queue
                ? _value.queue
                : queue // ignore: cast_nullable_to_non_nullable
                      as List<SyncQueueItem>,
            conflicts: null == conflicts
                ? _value.conflicts
                : conflicts // ignore: cast_nullable_to_non_nullable
                      as List<SyncConflict>,
            lastSyncedAt: freezed == lastSyncedAt
                ? _value.lastSyncedAt
                : lastSyncedAt // ignore: cast_nullable_to_non_nullable
                      as DateTime?,
            currentProgress: null == currentProgress
                ? _value.currentProgress
                : currentProgress // ignore: cast_nullable_to_non_nullable
                      as int,
            totalInBatch: null == totalInBatch
                ? _value.totalInBatch
                : totalInBatch // ignore: cast_nullable_to_non_nullable
                      as int,
            completedInBatch: null == completedInBatch
                ? _value.completedInBatch
                : completedInBatch // ignore: cast_nullable_to_non_nullable
                      as int,
            lastErrorMessage: freezed == lastErrorMessage
                ? _value.lastErrorMessage
                : lastErrorMessage // ignore: cast_nullable_to_non_nullable
                      as String?,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$SyncStateImplCopyWith<$Res>
    implements $SyncStateCopyWith<$Res> {
  factory _$$SyncStateImplCopyWith(
    _$SyncStateImpl value,
    $Res Function(_$SyncStateImpl) then,
  ) = __$$SyncStateImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    SyncQueueStatus status,
    List<SyncQueueItem> queue,
    List<SyncConflict> conflicts,
    DateTime? lastSyncedAt,
    int currentProgress,
    int totalInBatch,
    int completedInBatch,
    String? lastErrorMessage,
  });
}

/// @nodoc
class __$$SyncStateImplCopyWithImpl<$Res>
    extends _$SyncStateCopyWithImpl<$Res, _$SyncStateImpl>
    implements _$$SyncStateImplCopyWith<$Res> {
  __$$SyncStateImplCopyWithImpl(
    _$SyncStateImpl _value,
    $Res Function(_$SyncStateImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of SyncState
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? status = null,
    Object? queue = null,
    Object? conflicts = null,
    Object? lastSyncedAt = freezed,
    Object? currentProgress = null,
    Object? totalInBatch = null,
    Object? completedInBatch = null,
    Object? lastErrorMessage = freezed,
  }) {
    return _then(
      _$SyncStateImpl(
        status: null == status
            ? _value.status
            : status // ignore: cast_nullable_to_non_nullable
                  as SyncQueueStatus,
        queue: null == queue
            ? _value._queue
            : queue // ignore: cast_nullable_to_non_nullable
                  as List<SyncQueueItem>,
        conflicts: null == conflicts
            ? _value._conflicts
            : conflicts // ignore: cast_nullable_to_non_nullable
                  as List<SyncConflict>,
        lastSyncedAt: freezed == lastSyncedAt
            ? _value.lastSyncedAt
            : lastSyncedAt // ignore: cast_nullable_to_non_nullable
                  as DateTime?,
        currentProgress: null == currentProgress
            ? _value.currentProgress
            : currentProgress // ignore: cast_nullable_to_non_nullable
                  as int,
        totalInBatch: null == totalInBatch
            ? _value.totalInBatch
            : totalInBatch // ignore: cast_nullable_to_non_nullable
                  as int,
        completedInBatch: null == completedInBatch
            ? _value.completedInBatch
            : completedInBatch // ignore: cast_nullable_to_non_nullable
                  as int,
        lastErrorMessage: freezed == lastErrorMessage
            ? _value.lastErrorMessage
            : lastErrorMessage // ignore: cast_nullable_to_non_nullable
                  as String?,
      ),
    );
  }
}

/// @nodoc

class _$SyncStateImpl extends _SyncState {
  const _$SyncStateImpl({
    this.status = SyncQueueStatus.idle,
    final List<SyncQueueItem> queue = const [],
    final List<SyncConflict> conflicts = const [],
    this.lastSyncedAt,
    this.currentProgress = 0,
    this.totalInBatch = 0,
    this.completedInBatch = 0,
    this.lastErrorMessage,
  }) : _queue = queue,
       _conflicts = conflicts,
       super._();

  @override
  @JsonKey()
  final SyncQueueStatus status;
  final List<SyncQueueItem> _queue;
  @override
  @JsonKey()
  List<SyncQueueItem> get queue {
    if (_queue is EqualUnmodifiableListView) return _queue;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_queue);
  }

  final List<SyncConflict> _conflicts;
  @override
  @JsonKey()
  List<SyncConflict> get conflicts {
    if (_conflicts is EqualUnmodifiableListView) return _conflicts;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_conflicts);
  }

  @override
  final DateTime? lastSyncedAt;
  @override
  @JsonKey()
  final int currentProgress;
  // 0-100 for active sync
  @override
  @JsonKey()
  final int totalInBatch;
  @override
  @JsonKey()
  final int completedInBatch;
  @override
  final String? lastErrorMessage;

  @override
  String toString() {
    return 'SyncState(status: $status, queue: $queue, conflicts: $conflicts, lastSyncedAt: $lastSyncedAt, currentProgress: $currentProgress, totalInBatch: $totalInBatch, completedInBatch: $completedInBatch, lastErrorMessage: $lastErrorMessage)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$SyncStateImpl &&
            (identical(other.status, status) || other.status == status) &&
            const DeepCollectionEquality().equals(other._queue, _queue) &&
            const DeepCollectionEquality().equals(
              other._conflicts,
              _conflicts,
            ) &&
            (identical(other.lastSyncedAt, lastSyncedAt) ||
                other.lastSyncedAt == lastSyncedAt) &&
            (identical(other.currentProgress, currentProgress) ||
                other.currentProgress == currentProgress) &&
            (identical(other.totalInBatch, totalInBatch) ||
                other.totalInBatch == totalInBatch) &&
            (identical(other.completedInBatch, completedInBatch) ||
                other.completedInBatch == completedInBatch) &&
            (identical(other.lastErrorMessage, lastErrorMessage) ||
                other.lastErrorMessage == lastErrorMessage));
  }

  @override
  int get hashCode => Object.hash(
    runtimeType,
    status,
    const DeepCollectionEquality().hash(_queue),
    const DeepCollectionEquality().hash(_conflicts),
    lastSyncedAt,
    currentProgress,
    totalInBatch,
    completedInBatch,
    lastErrorMessage,
  );

  /// Create a copy of SyncState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$SyncStateImplCopyWith<_$SyncStateImpl> get copyWith =>
      __$$SyncStateImplCopyWithImpl<_$SyncStateImpl>(this, _$identity);
}

abstract class _SyncState extends SyncState {
  const factory _SyncState({
    final SyncQueueStatus status,
    final List<SyncQueueItem> queue,
    final List<SyncConflict> conflicts,
    final DateTime? lastSyncedAt,
    final int currentProgress,
    final int totalInBatch,
    final int completedInBatch,
    final String? lastErrorMessage,
  }) = _$SyncStateImpl;
  const _SyncState._() : super._();

  @override
  SyncQueueStatus get status;
  @override
  List<SyncQueueItem> get queue;
  @override
  List<SyncConflict> get conflicts;
  @override
  DateTime? get lastSyncedAt;
  @override
  int get currentProgress; // 0-100 for active sync
  @override
  int get totalInBatch;
  @override
  int get completedInBatch;
  @override
  String? get lastErrorMessage;

  /// Create a copy of SyncState
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$SyncStateImplCopyWith<_$SyncStateImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
