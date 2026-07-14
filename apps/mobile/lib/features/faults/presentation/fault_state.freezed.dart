// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'fault_state.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
  'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models',
);

/// @nodoc
mixin _$FaultSummary {
  String get id => throw _privateConstructorUsedError;
  String get faultNumber => throw _privateConstructorUsedError; // e.g. "F-1032"
  String get title => throw _privateConstructorUsedError;
  String get description => throw _privateConstructorUsedError;
  FaultStatus get status => throw _privateConstructorUsedError;
  FaultPriority get priority => throw _privateConstructorUsedError;
  String get customerName => throw _privateConstructorUsedError;
  String get siteName => throw _privateConstructorUsedError;
  DateTime get createdAt => throw _privateConstructorUsedError;
  DateTime? get dueAt => throw _privateConstructorUsedError; // SLA deadline
  String? get assigneeName => throw _privateConstructorUsedError;
  String? get assigneeAvatarUrl => throw _privateConstructorUsedError;
  String? get categoryName => throw _privateConstructorUsedError;
  int? get attemptsCount => throw _privateConstructorUsedError;
  bool get isOffline => throw _privateConstructorUsedError; // pending sync
  bool get hasAttachments => throw _privateConstructorUsedError;
  int get commentsCount => throw _privateConstructorUsedError;

  /// Create a copy of FaultSummary
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $FaultSummaryCopyWith<FaultSummary> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $FaultSummaryCopyWith<$Res> {
  factory $FaultSummaryCopyWith(
    FaultSummary value,
    $Res Function(FaultSummary) then,
  ) = _$FaultSummaryCopyWithImpl<$Res, FaultSummary>;
  @useResult
  $Res call({
    String id,
    String faultNumber,
    String title,
    String description,
    FaultStatus status,
    FaultPriority priority,
    String customerName,
    String siteName,
    DateTime createdAt,
    DateTime? dueAt,
    String? assigneeName,
    String? assigneeAvatarUrl,
    String? categoryName,
    int? attemptsCount,
    bool isOffline,
    bool hasAttachments,
    int commentsCount,
  });
}

/// @nodoc
class _$FaultSummaryCopyWithImpl<$Res, $Val extends FaultSummary>
    implements $FaultSummaryCopyWith<$Res> {
  _$FaultSummaryCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of FaultSummary
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? faultNumber = null,
    Object? title = null,
    Object? description = null,
    Object? status = null,
    Object? priority = null,
    Object? customerName = null,
    Object? siteName = null,
    Object? createdAt = null,
    Object? dueAt = freezed,
    Object? assigneeName = freezed,
    Object? assigneeAvatarUrl = freezed,
    Object? categoryName = freezed,
    Object? attemptsCount = freezed,
    Object? isOffline = null,
    Object? hasAttachments = null,
    Object? commentsCount = null,
  }) {
    return _then(
      _value.copyWith(
            id: null == id
                ? _value.id
                : id // ignore: cast_nullable_to_non_nullable
                      as String,
            faultNumber: null == faultNumber
                ? _value.faultNumber
                : faultNumber // ignore: cast_nullable_to_non_nullable
                      as String,
            title: null == title
                ? _value.title
                : title // ignore: cast_nullable_to_non_nullable
                      as String,
            description: null == description
                ? _value.description
                : description // ignore: cast_nullable_to_non_nullable
                      as String,
            status: null == status
                ? _value.status
                : status // ignore: cast_nullable_to_non_nullable
                      as FaultStatus,
            priority: null == priority
                ? _value.priority
                : priority // ignore: cast_nullable_to_non_nullable
                      as FaultPriority,
            customerName: null == customerName
                ? _value.customerName
                : customerName // ignore: cast_nullable_to_non_nullable
                      as String,
            siteName: null == siteName
                ? _value.siteName
                : siteName // ignore: cast_nullable_to_non_nullable
                      as String,
            createdAt: null == createdAt
                ? _value.createdAt
                : createdAt // ignore: cast_nullable_to_non_nullable
                      as DateTime,
            dueAt: freezed == dueAt
                ? _value.dueAt
                : dueAt // ignore: cast_nullable_to_non_nullable
                      as DateTime?,
            assigneeName: freezed == assigneeName
                ? _value.assigneeName
                : assigneeName // ignore: cast_nullable_to_non_nullable
                      as String?,
            assigneeAvatarUrl: freezed == assigneeAvatarUrl
                ? _value.assigneeAvatarUrl
                : assigneeAvatarUrl // ignore: cast_nullable_to_non_nullable
                      as String?,
            categoryName: freezed == categoryName
                ? _value.categoryName
                : categoryName // ignore: cast_nullable_to_non_nullable
                      as String?,
            attemptsCount: freezed == attemptsCount
                ? _value.attemptsCount
                : attemptsCount // ignore: cast_nullable_to_non_nullable
                      as int?,
            isOffline: null == isOffline
                ? _value.isOffline
                : isOffline // ignore: cast_nullable_to_non_nullable
                      as bool,
            hasAttachments: null == hasAttachments
                ? _value.hasAttachments
                : hasAttachments // ignore: cast_nullable_to_non_nullable
                      as bool,
            commentsCount: null == commentsCount
                ? _value.commentsCount
                : commentsCount // ignore: cast_nullable_to_non_nullable
                      as int,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$FaultSummaryImplCopyWith<$Res>
    implements $FaultSummaryCopyWith<$Res> {
  factory _$$FaultSummaryImplCopyWith(
    _$FaultSummaryImpl value,
    $Res Function(_$FaultSummaryImpl) then,
  ) = _$$FaultSummaryImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    String id,
    String faultNumber,
    String title,
    String description,
    FaultStatus status,
    FaultPriority priority,
    String customerName,
    String siteName,
    DateTime createdAt,
    DateTime? dueAt,
    String? assigneeName,
    String? assigneeAvatarUrl,
    String? categoryName,
    int? attemptsCount,
    bool isOffline,
    bool hasAttachments,
    int commentsCount,
  });
}

/// @nodoc
class _$$FaultSummaryImplCopyWithImpl<$Res>
    extends _$FaultSummaryCopyWithImpl<$Res, _$FaultSummaryImpl>
    implements _$$FaultSummaryImplCopyWith<$Res> {
  _$$FaultSummaryImplCopyWithImpl(
    _$FaultSummaryImpl _value,
    $Res Function(_$FaultSummaryImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of FaultSummary
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? faultNumber = null,
    Object? title = null,
    Object? description = null,
    Object? status = null,
    Object? priority = null,
    Object? customerName = null,
    Object? siteName = null,
    Object? createdAt = null,
    Object? dueAt = freezed,
    Object? assigneeName = freezed,
    Object? assigneeAvatarUrl = freezed,
    Object? categoryName = freezed,
    Object? attemptsCount = freezed,
    Object? isOffline = null,
    Object? hasAttachments = null,
    Object? commentsCount = null,
  }) {
    return _then(
      _$FaultSummaryImpl(
        id: null == id
            ? _value.id
            : id // ignore: cast_nullable_to_non_nullable
                  as String,
        faultNumber: null == faultNumber
            ? _value.faultNumber
            : faultNumber // ignore: cast_nullable_to_non_nullable
                  as String,
        title: null == title
            ? _value.title
            : title // ignore: cast_nullable_to_non_nullable
                  as String,
        description: null == description
            ? _value.description
            : description // ignore: cast_nullable_to_non_nullable
                  as String,
        status: null == status
            ? _value.status
            : status // ignore: cast_nullable_to_non_nullable
                  as FaultStatus,
        priority: null == priority
            ? _value.priority
            : priority // ignore: cast_nullable_to_non_nullable
                  as FaultPriority,
        customerName: null == customerName
            ? _value.customerName
            : customerName // ignore: cast_nullable_to_non_nullable
                  as String,
        siteName: null == siteName
            ? _value.siteName
            : siteName // ignore: cast_nullable_to_non_nullable
                  as String,
        createdAt: null == createdAt
            ? _value.createdAt
            : createdAt // ignore: cast_nullable_to_non_nullable
                  as DateTime,
        dueAt: freezed == dueAt
            ? _value.dueAt
            : dueAt // ignore: cast_nullable_to_non_nullable
                  as DateTime?,
        assigneeName: freezed == assigneeName
            ? _value.assigneeName
            : assigneeName // ignore: cast_nullable_to_non_nullable
                  as String?,
        assigneeAvatarUrl: freezed == assigneeAvatarUrl
            ? _value.assigneeAvatarUrl
            : assigneeAvatarUrl // ignore: cast_nullable_to_non_nullable
                  as String?,
        categoryName: freezed == categoryName
            ? _value.categoryName
            : categoryName // ignore: cast_nullable_to_non_nullable
                  as String?,
        attemptsCount: freezed == attemptsCount
            ? _value.attemptsCount
            : attemptsCount // ignore: cast_nullable_to_non_nullable
                  as int?,
        isOffline: null == isOffline
            ? _value.isOffline
            : isOffline // ignore: cast_nullable_to_non_nullable
                  as bool,
        hasAttachments: null == hasAttachments
            ? _value.hasAttachments
            : hasAttachments // ignore: cast_nullable_to_non_nullable
                  as bool,
        commentsCount: null == commentsCount
            ? _value.commentsCount
            : commentsCount // ignore: cast_nullable_to_non_nullable
                  as int,
      ),
    );
  }
}

/// @nodoc

class _$FaultSummaryImpl extends _FaultSummary {
  const _$FaultSummaryImpl({
    required this.id,
    required this.faultNumber,
    required this.title,
    required this.description,
    required this.status,
    required this.priority,
    required this.customerName,
    required this.siteName,
    required this.createdAt,
    this.dueAt,
    this.assigneeName,
    this.assigneeAvatarUrl,
    this.categoryName,
    this.attemptsCount,
    this.isOffline = false,
    this.hasAttachments = false,
    this.commentsCount = 0,
  }) : super._();

  @override
  final String id;
  @override
  final String faultNumber;
  // e.g. "F-1032"
  @override
  final String title;
  @override
  final String description;
  @override
  final FaultStatus status;
  @override
  final FaultPriority priority;
  @override
  final String customerName;
  @override
  final String siteName;
  @override
  final DateTime createdAt;
  @override
  final DateTime? dueAt;
  // SLA deadline
  @override
  final String? assigneeName;
  @override
  final String? assigneeAvatarUrl;
  @override
  final String? categoryName;
  @override
  final int? attemptsCount;
  @override
  @JsonKey()
  final bool isOffline;
  // pending sync
  @override
  @JsonKey()
  final bool hasAttachments;
  @override
  @JsonKey()
  final int commentsCount;

  @override
  String toString() {
    return 'FaultSummary(id: $id, faultNumber: $faultNumber, title: $title, description: $description, status: $status, priority: $priority, customerName: $customerName, siteName: $siteName, createdAt: $createdAt, dueAt: $dueAt, assigneeName: $assigneeName, assigneeAvatarUrl: $assigneeAvatarUrl, categoryName: $categoryName, attemptsCount: $attemptsCount, isOffline: $isOffline, hasAttachments: $hasAttachments, commentsCount: $commentsCount)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$FaultSummaryImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.faultNumber, faultNumber) ||
                other.faultNumber == faultNumber) &&
            (identical(other.title, title) || other.title == title) &&
            (identical(other.description, description) ||
                other.description == description) &&
            (identical(other.status, status) || other.status == status) &&
            (identical(other.priority, priority) ||
                other.priority == priority) &&
            (identical(other.customerName, customerName) ||
                other.customerName == customerName) &&
            (identical(other.siteName, siteName) ||
                other.siteName == siteName) &&
            (identical(other.createdAt, createdAt) ||
                other.createdAt == createdAt) &&
            (identical(other.dueAt, dueAt) || other.dueAt == dueAt) &&
            (identical(other.assigneeName, assigneeName) ||
                other.assigneeName == assigneeName) &&
            (identical(other.assigneeAvatarUrl, assigneeAvatarUrl) ||
                other.assigneeAvatarUrl == assigneeAvatarUrl) &&
            (identical(other.categoryName, categoryName) ||
                other.categoryName == categoryName) &&
            (identical(other.attemptsCount, attemptsCount) ||
                other.attemptsCount == attemptsCount) &&
            (identical(other.isOffline, isOffline) ||
                other.isOffline == isOffline) &&
            (identical(other.hasAttachments, hasAttachments) ||
                other.hasAttachments == hasAttachments) &&
            (identical(other.commentsCount, commentsCount) ||
                other.commentsCount == commentsCount));
  }

  @override
  int get hashCode => Object.hash(
    runtimeType,
    id,
    faultNumber,
    title,
    description,
    status,
    priority,
    customerName,
    siteName,
    createdAt,
    dueAt,
    assigneeName,
    assigneeAvatarUrl,
    categoryName,
    attemptsCount,
    isOffline,
    hasAttachments,
    commentsCount,
  );

  /// Create a copy of FaultSummary
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$FaultSummaryImplCopyWith<_$FaultSummaryImpl> get copyWith =>
      _$$FaultSummaryImplCopyWithImpl<_$FaultSummaryImpl>(this, _$identity);
}

abstract class _FaultSummary extends FaultSummary {
  const factory _FaultSummary({
    required final String id,
    required final String faultNumber,
    required final String title,
    required final String description,
    required final FaultStatus status,
    required final FaultPriority priority,
    required final String customerName,
    required final String siteName,
    required final DateTime createdAt,
    final DateTime? dueAt,
    final String? assigneeName,
    final String? assigneeAvatarUrl,
    final String? categoryName,
    final int? attemptsCount,
    final bool isOffline,
    final bool hasAttachments,
    final int commentsCount,
  }) = _$FaultSummaryImpl;
  const _FaultSummary._() : super._();

  @override
  String get id;
  @override
  String get faultNumber; // e.g. "F-1032"
  @override
  String get title;
  @override
  String get description;
  @override
  FaultStatus get status;
  @override
  FaultPriority get priority;
  @override
  String get customerName;
  @override
  String get siteName;
  @override
  DateTime get createdAt;
  @override
  DateTime? get dueAt; // SLA deadline
  @override
  String? get assigneeName;
  @override
  String? get assigneeAvatarUrl;
  @override
  String? get categoryName;
  @override
  int? get attemptsCount;
  @override
  bool get isOffline; // pending sync
  @override
  bool get hasAttachments;
  @override
  int get commentsCount;

  /// Create a copy of FaultSummary
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$FaultSummaryImplCopyWith<_$FaultSummaryImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
mixin _$FaultFilters {
  List<FaultStatus> get statuses => throw _privateConstructorUsedError;
  List<FaultPriority> get priorities => throw _privateConstructorUsedError;
  DateTime? get dueBefore => throw _privateConstructorUsedError;
  String? get assigneeId => throw _privateConstructorUsedError;
  String? get categoryId => throw _privateConstructorUsedError;
  String? get searchQuery => throw _privateConstructorUsedError;

  /// Create a copy of FaultFilters
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $FaultFiltersCopyWith<FaultFilters> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $FaultFiltersCopyWith<$Res> {
  factory $FaultFiltersCopyWith(
    FaultFilters value,
    $Res Function(FaultFilters) then,
  ) = _$FaultFiltersCopyWithImpl<$Res, FaultFilters>;
  @useResult
  $Res call({
    List<FaultStatus> statuses,
    List<FaultPriority> priorities,
    DateTime? dueBefore,
    String? assigneeId,
    String? categoryId,
    String? searchQuery,
  });
}

/// @nodoc
class _$FaultFiltersCopyWithImpl<$Res, $Val extends FaultFilters>
    implements $FaultFiltersCopyWith<$Res> {
  _$FaultFiltersCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of FaultFilters
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? statuses = null,
    Object? priorities = null,
    Object? dueBefore = freezed,
    Object? assigneeId = freezed,
    Object? categoryId = freezed,
    Object? searchQuery = freezed,
  }) {
    return _then(
      _value.copyWith(
            statuses: null == statuses
                ? _value.statuses
                : statuses // ignore: cast_nullable_to_non_nullable
                      as List<FaultStatus>,
            priorities: null == priorities
                ? _value.priorities
                : priorities // ignore: cast_nullable_to_non_nullable
                      as List<FaultPriority>,
            dueBefore: freezed == dueBefore
                ? _value.dueBefore
                : dueBefore // ignore: cast_nullable_to_non_nullable
                      as DateTime?,
            assigneeId: freezed == assigneeId
                ? _value.assigneeId
                : assigneeId // ignore: cast_nullable_to_non_nullable
                      as String?,
            categoryId: freezed == categoryId
                ? _value.categoryId
                : categoryId // ignore: cast_nullable_to_non_nullable
                      as String?,
            searchQuery: freezed == searchQuery
                ? _value.searchQuery
                : searchQuery // ignore: cast_nullable_to_non_nullable
                      as String?,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$FaultFiltersImplCopyWith<$Res>
    implements $FaultFiltersCopyWith<$Res> {
  factory _$$FaultFiltersImplCopyWith(
    _$FaultFiltersImpl value,
    $Res Function(_$FaultFiltersImpl) then,
  ) = _$$FaultFiltersImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    List<FaultStatus> statuses,
    List<FaultPriority> priorities,
    DateTime? dueBefore,
    String? assigneeId,
    String? categoryId,
    String? searchQuery,
  });
}

/// @nodoc
class _$$FaultFiltersImplCopyWithImpl<$Res>
    extends _$FaultFiltersCopyWithImpl<$Res, _$FaultFiltersImpl>
    implements _$$FaultFiltersImplCopyWith<$Res> {
  _$$FaultFiltersImplCopyWithImpl(
    _$FaultFiltersImpl _value,
    $Res Function(_$FaultFiltersImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of FaultFilters
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? statuses = null,
    Object? priorities = null,
    Object? dueBefore = freezed,
    Object? assigneeId = freezed,
    Object? categoryId = freezed,
    Object? searchQuery = freezed,
  }) {
    return _then(
      _$FaultFiltersImpl(
        statuses: null == statuses
            ? _value._statuses
            : statuses // ignore: cast_nullable_to_non_nullable
                  as List<FaultStatus>,
        priorities: null == priorities
            ? _value._priorities
            : priorities // ignore: cast_nullable_to_non_nullable
                  as List<FaultPriority>,
        dueBefore: freezed == dueBefore
            ? _value.dueBefore
            : dueBefore // ignore: cast_nullable_to_non_nullable
                  as DateTime?,
        assigneeId: freezed == assigneeId
            ? _value.assigneeId
            : assigneeId // ignore: cast_nullable_to_non_nullable
                  as String?,
        categoryId: freezed == categoryId
            ? _value.categoryId
            : categoryId // ignore: cast_nullable_to_non_nullable
                  as String?,
        searchQuery: freezed == searchQuery
            ? _value.searchQuery
            : searchQuery // ignore: cast_nullable_to_non_nullable
                  as String?,
      ),
    );
  }
}

/// @nodoc

class _$FaultFiltersImpl extends _FaultFilters {
  const _$FaultFiltersImpl({
    final List<FaultStatus> statuses = const [],
    final List<FaultPriority> priorities = const [],
    this.dueBefore,
    this.assigneeId,
    this.categoryId,
    this.searchQuery,
  }) : _statuses = statuses,
       _priorities = priorities,
       super._();

  final List<FaultStatus> _statuses;
  @override
  @JsonKey()
  List<FaultStatus> get statuses {
    if (_statuses is EqualUnmodifiableListView) return _statuses;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_statuses);
  }

  final List<FaultPriority> _priorities;
  @override
  @JsonKey()
  List<FaultPriority> get priorities {
    if (_priorities is EqualUnmodifiableListView) return _priorities;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_priorities);
  }

  @override
  final DateTime? dueBefore;
  @override
  final String? assigneeId;
  @override
  final String? categoryId;
  @override
  final String? searchQuery;

  @override
  String toString() {
    return 'FaultFilters(statuses: $statuses, priorities: $priorities, dueBefore: $dueBefore, assigneeId: $assigneeId, categoryId: $categoryId, searchQuery: $searchQuery)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$FaultFiltersImpl &&
            const DeepCollectionEquality().equals(other._statuses, _statuses) &&
            const DeepCollectionEquality().equals(
              other._priorities,
              _priorities,
            ) &&
            (identical(other.dueBefore, dueBefore) ||
                other.dueBefore == dueBefore) &&
            (identical(other.assigneeId, assigneeId) ||
                other.assigneeId == assigneeId) &&
            (identical(other.categoryId, categoryId) ||
                other.categoryId == categoryId) &&
            (identical(other.searchQuery, searchQuery) ||
                other.searchQuery == searchQuery));
  }

  @override
  int get hashCode => Object.hash(
    runtimeType,
    const DeepCollectionEquality().hash(_statuses),
    const DeepCollectionEquality().hash(_priorities),
    dueBefore,
    assigneeId,
    categoryId,
    searchQuery,
  );

  /// Create a copy of FaultFilters
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$FaultFiltersImplCopyWith<_$FaultFiltersImpl> get copyWith =>
      _$$FaultFiltersImplCopyWithImpl<_$FaultFiltersImpl>(this, _$identity);
}

abstract class _FaultFilters extends FaultFilters {
  const factory _FaultFilters({
    final List<FaultStatus> statuses,
    final List<FaultPriority> priorities,
    final DateTime? dueBefore,
    final String? assigneeId,
    final String? categoryId,
    final String? searchQuery,
  }) = _$FaultFiltersImpl;
  const _FaultFilters._() : super._();

  @override
  List<FaultStatus> get statuses;
  @override
  List<FaultPriority> get priorities;
  @override
  DateTime? get dueBefore;
  @override
  String? get assigneeId;
  @override
  String? get categoryId;
  @override
  String? get searchQuery;

  /// Create a copy of FaultFilters
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$FaultFiltersImplCopyWith<_$FaultFiltersImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
mixin _$FaultAttempt {
  String get id => throw _privateConstructorUsedError;
  String get attemptNumber => throw _privateConstructorUsedError;
  DateTime get startTime => throw _privateConstructorUsedError;
  DateTime? get endTime => throw _privateConstructorUsedError;
  String get technicianName => throw _privateConstructorUsedError;
  String? get workNotes => throw _privateConstructorUsedError;
  String get outcome =>
      throw _privateConstructorUsedError; // 'resolved' | 'partial' | 'failed' | 'revisit'
  List<String> get attachmentUrls => throw _privateConstructorUsedError;
  String? get gpsLocation => throw _privateConstructorUsedError;

  /// Create a copy of FaultAttempt
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $FaultAttemptCopyWith<FaultAttempt> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $FaultAttemptCopyWith<$Res> {
  factory $FaultAttemptCopyWith(
    FaultAttempt value,
    $Res Function(FaultAttempt) then,
  ) = _$FaultAttemptCopyWithImpl<$Res, FaultAttempt>;
  @useResult
  $Res call({
    String id,
    String attemptNumber,
    DateTime startTime,
    DateTime? endTime,
    String technicianName,
    String? workNotes,
    String outcome,
    List<String> attachmentUrls,
    String? gpsLocation,
  });
}

/// @nodoc
class _$FaultAttemptCopyWithImpl<$Res, $Val extends FaultAttempt>
    implements $FaultAttemptCopyWith<$Res> {
  _$FaultAttemptCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of FaultAttempt
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? attemptNumber = null,
    Object? startTime = null,
    Object? endTime = freezed,
    Object? technicianName = null,
    Object? workNotes = freezed,
    Object? outcome = null,
    Object? attachmentUrls = null,
    Object? gpsLocation = freezed,
  }) {
    return _then(
      _value.copyWith(
            id: null == id
                ? _value.id
                : id // ignore: cast_nullable_to_non_nullable
                      as String,
            attemptNumber: null == attemptNumber
                ? _value.attemptNumber
                : attemptNumber // ignore: cast_nullable_to_non_nullable
                      as String,
            startTime: null == startTime
                ? _value.startTime
                : startTime // ignore: cast_nullable_to_non_nullable
                      as DateTime,
            endTime: freezed == endTime
                ? _value.endTime
                : endTime // ignore: cast_nullable_to_non_nullable
                      as DateTime?,
            technicianName: null == technicianName
                ? _value.technicianName
                : technicianName // ignore: cast_nullable_to_non_nullable
                      as String,
            workNotes: freezed == workNotes
                ? _value.workNotes
                : workNotes // ignore: cast_nullable_to_non_nullable
                      as String?,
            outcome: null == outcome
                ? _value.outcome
                : outcome // ignore: cast_nullable_to_non_nullable
                      as String,
            attachmentUrls: null == attachmentUrls
                ? _value.attachmentUrls
                : attachmentUrls // ignore: cast_nullable_to_non_nullable
                      as List<String>,
            gpsLocation: freezed == gpsLocation
                ? _value.gpsLocation
                : gpsLocation // ignore: cast_nullable_to_non_nullable
                      as String?,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$FaultAttemptImplCopyWith<$Res>
    implements $FaultAttemptCopyWith<$Res> {
  factory _$$FaultAttemptImplCopyWith(
    _$FaultAttemptImpl value,
    $Res Function(_$FaultAttemptImpl) then,
  ) = _$$FaultAttemptImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    String id,
    String attemptNumber,
    DateTime startTime,
    DateTime? endTime,
    String technicianName,
    String? workNotes,
    String outcome,
    List<String> attachmentUrls,
    String? gpsLocation,
  });
}

/// @nodoc
class _$$FaultAttemptImplCopyWithImpl<$Res>
    extends _$FaultAttemptCopyWithImpl<$Res, _$FaultAttemptImpl>
    implements _$$FaultAttemptImplCopyWith<$Res> {
  _$$FaultAttemptImplCopyWithImpl(
    _$FaultAttemptImpl _value,
    $Res Function(_$FaultAttemptImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of FaultAttempt
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? attemptNumber = null,
    Object? startTime = null,
    Object? endTime = freezed,
    Object? technicianName = null,
    Object? workNotes = freezed,
    Object? outcome = null,
    Object? attachmentUrls = null,
    Object? gpsLocation = freezed,
  }) {
    return _then(
      _$FaultAttemptImpl(
        id: null == id
            ? _value.id
            : id // ignore: cast_nullable_to_non_nullable
                  as String,
        attemptNumber: null == attemptNumber
            ? _value.attemptNumber
            : attemptNumber // ignore: cast_nullable_to_non_nullable
                  as String,
        startTime: null == startTime
            ? _value.startTime
            : startTime // ignore: cast_nullable_to_non_nullable
                  as DateTime,
        endTime: freezed == endTime
            ? _value.endTime
            : endTime // ignore: cast_nullable_to_non_nullable
                  as DateTime?,
        technicianName: null == technicianName
            ? _value.technicianName
            : technicianName // ignore: cast_nullable_to_non_nullable
                  as String,
        workNotes: freezed == workNotes
            ? _value.workNotes
            : workNotes // ignore: cast_nullable_to_non_nullable
                  as String?,
        outcome: null == outcome
            ? _value.outcome
            : outcome // ignore: cast_nullable_to_non_nullable
                  as String,
        attachmentUrls: null == attachmentUrls
            ? _value._attachmentUrls
            : attachmentUrls // ignore: cast_nullable_to_non_nullable
                  as List<String>,
        gpsLocation: freezed == gpsLocation
            ? _value.gpsLocation
            : gpsLocation // ignore: cast_nullable_to_non_nullable
                  as String?,
      ),
    );
  }
}

/// @nodoc

class _$FaultAttemptImpl implements _FaultAttempt {
  const _$FaultAttemptImpl({
    required this.id,
    required this.attemptNumber,
    required this.startTime,
    this.endTime,
    required this.technicianName,
    this.workNotes,
    required this.outcome,
    final List<String> attachmentUrls = const [],
    this.gpsLocation,
  }) : _attachmentUrls = attachmentUrls;

  @override
  final String id;
  @override
  final String attemptNumber;
  @override
  final DateTime startTime;
  @override
  final DateTime? endTime;
  @override
  final String technicianName;
  @override
  final String? workNotes;
  @override
  final String outcome;
  // 'resolved' | 'partial' | 'failed' | 'revisit'
  final List<String> _attachmentUrls;
  // 'resolved' | 'partial' | 'failed' | 'revisit'
  @override
  @JsonKey()
  List<String> get attachmentUrls {
    if (_attachmentUrls is EqualUnmodifiableListView) return _attachmentUrls;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_attachmentUrls);
  }

  @override
  final String? gpsLocation;

  @override
  String toString() {
    return 'FaultAttempt(id: $id, attemptNumber: $attemptNumber, startTime: $startTime, endTime: $endTime, technicianName: $technicianName, workNotes: $workNotes, outcome: $outcome, attachmentUrls: $attachmentUrls, gpsLocation: $gpsLocation)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$FaultAttemptImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.attemptNumber, attemptNumber) ||
                other.attemptNumber == attemptNumber) &&
            (identical(other.startTime, startTime) ||
                other.startTime == startTime) &&
            (identical(other.endTime, endTime) || other.endTime == endTime) &&
            (identical(other.technicianName, technicianName) ||
                other.technicianName == technicianName) &&
            (identical(other.workNotes, workNotes) ||
                other.workNotes == workNotes) &&
            (identical(other.outcome, outcome) || other.outcome == outcome) &&
            const DeepCollectionEquality().equals(
              other._attachmentUrls,
              _attachmentUrls,
            ) &&
            (identical(other.gpsLocation, gpsLocation) ||
                other.gpsLocation == gpsLocation));
  }

  @override
  int get hashCode => Object.hash(
    runtimeType,
    id,
    attemptNumber,
    startTime,
    endTime,
    technicianName,
    workNotes,
    outcome,
    const DeepCollectionEquality().hash(_attachmentUrls),
    gpsLocation,
  );

  /// Create a copy of FaultAttempt
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$FaultAttemptImplCopyWith<_$FaultAttemptImpl> get copyWith =>
      _$$FaultAttemptImplCopyWithImpl<_$FaultAttemptImpl>(this, _$identity);
}

abstract class _FaultAttempt implements FaultAttempt {
  const factory _FaultAttempt({
    required final String id,
    required final String attemptNumber,
    required final DateTime startTime,
    final DateTime? endTime,
    required final String technicianName,
    final String? workNotes,
    required final String outcome,
    final List<String> attachmentUrls,
    final String? gpsLocation,
  }) = _$FaultAttemptImpl;

  @override
  String get id;
  @override
  String get attemptNumber;
  @override
  DateTime get startTime;
  @override
  DateTime? get endTime;
  @override
  String get technicianName;
  @override
  String? get workNotes;
  @override
  String get outcome; // 'resolved' | 'partial' | 'failed' | 'revisit'
  @override
  List<String> get attachmentUrls;
  @override
  String? get gpsLocation;

  /// Create a copy of FaultAttempt
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$FaultAttemptImplCopyWith<_$FaultAttemptImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
mixin _$FaultTimelineEvent {
  String get id => throw _privateConstructorUsedError;
  DateTime get timestamp => throw _privateConstructorUsedError;
  String get eventType =>
      throw _privateConstructorUsedError; // 'status_change' | 'assignment' | 'comment' | 'attempt'
  String get description => throw _privateConstructorUsedError;
  String? get actorName => throw _privateConstructorUsedError;
  String? get actorAvatarUrl => throw _privateConstructorUsedError;
  String? get fromValue => throw _privateConstructorUsedError;
  String? get toValue => throw _privateConstructorUsedError;

  /// Create a copy of FaultTimelineEvent
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $FaultTimelineEventCopyWith<FaultTimelineEvent> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $FaultTimelineEventCopyWith<$Res> {
  factory $FaultTimelineEventCopyWith(
    FaultTimelineEvent value,
    $Res Function(FaultTimelineEvent) then,
  ) = _$FaultTimelineEventCopyWithImpl<$Res, FaultTimelineEvent>;
  @useResult
  $Res call({
    String id,
    DateTime timestamp,
    String eventType,
    String description,
    String? actorName,
    String? actorAvatarUrl,
    String? fromValue,
    String? toValue,
  });
}

/// @nodoc
class _$FaultTimelineEventCopyWithImpl<$Res, $Val extends FaultTimelineEvent>
    implements $FaultTimelineEventCopyWith<$Res> {
  _$FaultTimelineEventCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of FaultTimelineEvent
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? timestamp = null,
    Object? eventType = null,
    Object? description = null,
    Object? actorName = freezed,
    Object? actorAvatarUrl = freezed,
    Object? fromValue = freezed,
    Object? toValue = freezed,
  }) {
    return _then(
      _value.copyWith(
            id: null == id
                ? _value.id
                : id // ignore: cast_nullable_to_non_nullable
                      as String,
            timestamp: null == timestamp
                ? _value.timestamp
                : timestamp // ignore: cast_nullable_to_non_nullable
                      as DateTime,
            eventType: null == eventType
                ? _value.eventType
                : eventType // ignore: cast_nullable_to_non_nullable
                      as String,
            description: null == description
                ? _value.description
                : description // ignore: cast_nullable_to_non_nullable
                      as String,
            actorName: freezed == actorName
                ? _value.actorName
                : actorName // ignore: cast_nullable_to_non_nullable
                      as String?,
            actorAvatarUrl: freezed == actorAvatarUrl
                ? _value.actorAvatarUrl
                : actorAvatarUrl // ignore: cast_nullable_to_non_nullable
                      as String?,
            fromValue: freezed == fromValue
                ? _value.fromValue
                : fromValue // ignore: cast_nullable_to_non_nullable
                      as String?,
            toValue: freezed == toValue
                ? _value.toValue
                : toValue // ignore: cast_nullable_to_non_nullable
                      as String?,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$FaultTimelineEventImplCopyWith<$Res>
    implements $FaultTimelineEventCopyWith<$Res> {
  factory _$$FaultTimelineEventImplCopyWith(
    _$FaultTimelineEventImpl value,
    $Res Function(_$FaultTimelineEventImpl) then,
  ) = _$$FaultTimelineEventImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    String id,
    DateTime timestamp,
    String eventType,
    String description,
    String? actorName,
    String? actorAvatarUrl,
    String? fromValue,
    String? toValue,
  });
}

/// @nodoc
class _$$FaultTimelineEventImplCopyWithImpl<$Res>
    extends _$FaultTimelineEventCopyWithImpl<$Res, _$FaultTimelineEventImpl>
    implements _$$FaultTimelineEventImplCopyWith<$Res> {
  _$$FaultTimelineEventImplCopyWithImpl(
    _$FaultTimelineEventImpl _value,
    $Res Function(_$FaultTimelineEventImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of FaultTimelineEvent
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? timestamp = null,
    Object? eventType = null,
    Object? description = null,
    Object? actorName = freezed,
    Object? actorAvatarUrl = freezed,
    Object? fromValue = freezed,
    Object? toValue = freezed,
  }) {
    return _then(
      _$FaultTimelineEventImpl(
        id: null == id
            ? _value.id
            : id // ignore: cast_nullable_to_non_nullable
                  as String,
        timestamp: null == timestamp
            ? _value.timestamp
            : timestamp // ignore: cast_nullable_to_non_nullable
                  as DateTime,
        eventType: null == eventType
            ? _value.eventType
            : eventType // ignore: cast_nullable_to_non_nullable
                  as String,
        description: null == description
            ? _value.description
            : description // ignore: cast_nullable_to_non_nullable
                  as String,
        actorName: freezed == actorName
            ? _value.actorName
            : actorName // ignore: cast_nullable_to_non_nullable
                  as String?,
        actorAvatarUrl: freezed == actorAvatarUrl
            ? _value.actorAvatarUrl
            : actorAvatarUrl // ignore: cast_nullable_to_non_nullable
                  as String?,
        fromValue: freezed == fromValue
            ? _value.fromValue
            : fromValue // ignore: cast_nullable_to_non_nullable
                  as String?,
        toValue: freezed == toValue
            ? _value.toValue
            : toValue // ignore: cast_nullable_to_non_nullable
                  as String?,
      ),
    );
  }
}

/// @nodoc

class _$FaultTimelineEventImpl implements _FaultTimelineEvent {
  const _$FaultTimelineEventImpl({
    required this.id,
    required this.timestamp,
    required this.eventType,
    required this.description,
    this.actorName,
    this.actorAvatarUrl,
    this.fromValue,
    this.toValue,
  });

  @override
  final String id;
  @override
  final DateTime timestamp;
  @override
  final String eventType;
  // 'status_change' | 'assignment' | 'comment' | 'attempt'
  @override
  final String description;
  @override
  final String? actorName;
  @override
  final String? actorAvatarUrl;
  @override
  final String? fromValue;
  @override
  final String? toValue;

  @override
  String toString() {
    return 'FaultTimelineEvent(id: $id, timestamp: $timestamp, eventType: $eventType, description: $description, actorName: $actorName, actorAvatarUrl: $actorAvatarUrl, fromValue: $fromValue, toValue: $toValue)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$FaultTimelineEventImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.timestamp, timestamp) ||
                other.timestamp == timestamp) &&
            (identical(other.eventType, eventType) ||
                other.eventType == eventType) &&
            (identical(other.description, description) ||
                other.description == description) &&
            (identical(other.actorName, actorName) ||
                other.actorName == actorName) &&
            (identical(other.actorAvatarUrl, actorAvatarUrl) ||
                other.actorAvatarUrl == actorAvatarUrl) &&
            (identical(other.fromValue, fromValue) ||
                other.fromValue == fromValue) &&
            (identical(other.toValue, toValue) || other.toValue == toValue));
  }

  @override
  int get hashCode => Object.hash(
    runtimeType,
    id,
    timestamp,
    eventType,
    description,
    actorName,
    actorAvatarUrl,
    fromValue,
    toValue,
  );

  /// Create a copy of FaultTimelineEvent
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$FaultTimelineEventImplCopyWith<_$FaultTimelineEventImpl> get copyWith =>
      _$$FaultTimelineEventImplCopyWithImpl<_$FaultTimelineEventImpl>(
        this,
        _$identity,
      );
}

abstract class _FaultTimelineEvent implements FaultTimelineEvent {
  const factory _FaultTimelineEvent({
    required final String id,
    required final DateTime timestamp,
    required final String eventType,
    required final String description,
    final String? actorName,
    final String? actorAvatarUrl,
    final String? fromValue,
    final String? toValue,
  }) = _$FaultTimelineEventImpl;

  @override
  String get id;
  @override
  DateTime get timestamp;
  @override
  String get eventType; // 'status_change' | 'assignment' | 'comment' | 'attempt'
  @override
  String get description;
  @override
  String? get actorName;
  @override
  String? get actorAvatarUrl;
  @override
  String? get fromValue;
  @override
  String? get toValue;

  /// Create a copy of FaultTimelineEvent
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$FaultTimelineEventImplCopyWith<_$FaultTimelineEventImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
mixin _$FaultDetail {
  FaultSummary get summary => throw _privateConstructorUsedError;
  List<FaultAttempt> get attempts => throw _privateConstructorUsedError;
  List<FaultTimelineEvent> get timeline => throw _privateConstructorUsedError;
  List<String> get attachmentUrls => throw _privateConstructorUsedError;
  String? get customerPhone => throw _privateConstructorUsedError;
  String? get customerEmail => throw _privateConstructorUsedError;
  String? get siteAddress => throw _privateConstructorUsedError;
  double? get siteLatitude => throw _privateConstructorUsedError;
  double? get siteLongitude => throw _privateConstructorUsedError;
  String? get internalNotes => throw _privateConstructorUsedError;

  /// Create a copy of FaultDetail
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $FaultDetailCopyWith<FaultDetail> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $FaultDetailCopyWith<$Res> {
  factory $FaultDetailCopyWith(
    FaultDetail value,
    $Res Function(FaultDetail) then,
  ) = _$FaultDetailCopyWithImpl<$Res, FaultDetail>;
  @useResult
  $Res call({
    FaultSummary summary,
    List<FaultAttempt> attempts,
    List<FaultTimelineEvent> timeline,
    List<String> attachmentUrls,
    String? customerPhone,
    String? customerEmail,
    String? siteAddress,
    double? siteLatitude,
    double? siteLongitude,
    String? internalNotes,
  });

  $FaultSummaryCopyWith<$Res> get summary;
}

/// @nodoc
class _$FaultDetailCopyWithImpl<$Res, $Val extends FaultDetail>
    implements $FaultDetailCopyWith<$Res> {
  _$FaultDetailCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of FaultDetail
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? summary = null,
    Object? attempts = null,
    Object? timeline = null,
    Object? attachmentUrls = null,
    Object? customerPhone = freezed,
    Object? customerEmail = freezed,
    Object? siteAddress = freezed,
    Object? siteLatitude = freezed,
    Object? siteLongitude = freezed,
    Object? internalNotes = freezed,
  }) {
    return _then(
      _value.copyWith(
            summary: null == summary
                ? _value.summary
                : summary // ignore: cast_nullable_to_non_nullable
                      as FaultSummary,
            attempts: null == attempts
                ? _value.attempts
                : attempts // ignore: cast_nullable_to_non_nullable
                      as List<FaultAttempt>,
            timeline: null == timeline
                ? _value.timeline
                : timeline // ignore: cast_nullable_to_non_nullable
                      as List<FaultTimelineEvent>,
            attachmentUrls: null == attachmentUrls
                ? _value.attachmentUrls
                : attachmentUrls // ignore: cast_nullable_to_non_nullable
                      as List<String>,
            customerPhone: freezed == customerPhone
                ? _value.customerPhone
                : customerPhone // ignore: cast_nullable_to_non_nullable
                      as String?,
            customerEmail: freezed == customerEmail
                ? _value.customerEmail
                : customerEmail // ignore: cast_nullable_to_non_nullable
                      as String?,
            siteAddress: freezed == siteAddress
                ? _value.siteAddress
                : siteAddress // ignore: cast_nullable_to_non_nullable
                      as String?,
            siteLatitude: freezed == siteLatitude
                ? _value.siteLatitude
                : siteLatitude // ignore: cast_nullable_to_non_nullable
                      as double?,
            siteLongitude: freezed == siteLongitude
                ? _value.siteLongitude
                : siteLongitude // ignore: cast_nullable_to_non_nullable
                      as double?,
            internalNotes: freezed == internalNotes
                ? _value.internalNotes
                : internalNotes // ignore: cast_nullable_to_non_nullable
                      as String?,
          )
          as $Val,
    );
  }

  /// Create a copy of FaultDetail
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $FaultSummaryCopyWith<$Res> get summary {
    return $FaultSummaryCopyWith<$Res>(_value.summary, (value) {
      return _then(_value.copyWith(summary: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$FaultDetailImplCopyWith<$Res>
    implements $FaultDetailCopyWith<$Res> {
  factory _$$FaultDetailImplCopyWith(
    _$FaultDetailImpl value,
    $Res Function(_$FaultDetailImpl) then,
  ) = _$$FaultDetailImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    FaultSummary summary,
    List<FaultAttempt> attempts,
    List<FaultTimelineEvent> timeline,
    List<String> attachmentUrls,
    String? customerPhone,
    String? customerEmail,
    String? siteAddress,
    double? siteLatitude,
    double? siteLongitude,
    String? internalNotes,
  });

  @override
  $FaultSummaryCopyWith<$Res> get summary;
}

/// @nodoc
class _$$FaultDetailImplCopyWithImpl<$Res>
    extends _$FaultDetailCopyWithImpl<$Res, _$FaultDetailImpl>
    implements _$$FaultDetailImplCopyWith<$Res> {
  _$$FaultDetailImplCopyWithImpl(
    _$FaultDetailImpl _value,
    $Res Function(_$FaultDetailImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of FaultDetail
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? summary = null,
    Object? attempts = null,
    Object? timeline = null,
    Object? attachmentUrls = null,
    Object? customerPhone = freezed,
    Object? customerEmail = freezed,
    Object? siteAddress = freezed,
    Object? siteLatitude = freezed,
    Object? siteLongitude = freezed,
    Object? internalNotes = freezed,
  }) {
    return _then(
      _$FaultDetailImpl(
        summary: null == summary
            ? _value.summary
            : summary // ignore: cast_nullable_to_non_nullable
                  as FaultSummary,
        attempts: null == attempts
            ? _value._attempts
            : attempts // ignore: cast_nullable_to_non_nullable
                  as List<FaultAttempt>,
        timeline: null == timeline
            ? _value._timeline
            : timeline // ignore: cast_nullable_to_non_nullable
                  as List<FaultTimelineEvent>,
        attachmentUrls: null == attachmentUrls
            ? _value._attachmentUrls
            : attachmentUrls // ignore: cast_nullable_to_non_nullable
                  as List<String>,
        customerPhone: freezed == customerPhone
            ? _value.customerPhone
            : customerPhone // ignore: cast_nullable_to_non_nullable
                  as String?,
        customerEmail: freezed == customerEmail
            ? _value.customerEmail
            : customerEmail // ignore: cast_nullable_to_non_nullable
                  as String?,
        siteAddress: freezed == siteAddress
            ? _value.siteAddress
            : siteAddress // ignore: cast_nullable_to_non_nullable
                  as String?,
        siteLatitude: freezed == siteLatitude
            ? _value.siteLatitude
            : siteLatitude // ignore: cast_nullable_to_non_nullable
                  as double?,
        siteLongitude: freezed == siteLongitude
            ? _value.siteLongitude
            : siteLongitude // ignore: cast_nullable_to_non_nullable
                  as double?,
        internalNotes: freezed == internalNotes
            ? _value.internalNotes
            : internalNotes // ignore: cast_nullable_to_non_nullable
                  as String?,
      ),
    );
  }
}

/// @nodoc

class _$FaultDetailImpl implements _FaultDetail {
  const _$FaultDetailImpl({
    required this.summary,
    final List<FaultAttempt> attempts = const [],
    final List<FaultTimelineEvent> timeline = const [],
    final List<String> attachmentUrls = const [],
    this.customerPhone,
    this.customerEmail,
    this.siteAddress,
    this.siteLatitude,
    this.siteLongitude,
    this.internalNotes,
  }) : _attempts = attempts,
       _timeline = timeline,
       _attachmentUrls = attachmentUrls;

  @override
  final FaultSummary summary;
  final List<FaultAttempt> _attempts;
  @override
  @JsonKey()
  List<FaultAttempt> get attempts {
    if (_attempts is EqualUnmodifiableListView) return _attempts;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_attempts);
  }

  final List<FaultTimelineEvent> _timeline;
  @override
  @JsonKey()
  List<FaultTimelineEvent> get timeline {
    if (_timeline is EqualUnmodifiableListView) return _timeline;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_timeline);
  }

  final List<String> _attachmentUrls;
  @override
  @JsonKey()
  List<String> get attachmentUrls {
    if (_attachmentUrls is EqualUnmodifiableListView) return _attachmentUrls;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_attachmentUrls);
  }

  @override
  final String? customerPhone;
  @override
  final String? customerEmail;
  @override
  final String? siteAddress;
  @override
  final double? siteLatitude;
  @override
  final double? siteLongitude;
  @override
  final String? internalNotes;

  @override
  String toString() {
    return 'FaultDetail(summary: $summary, attempts: $attempts, timeline: $timeline, attachmentUrls: $attachmentUrls, customerPhone: $customerPhone, customerEmail: $customerEmail, siteAddress: $siteAddress, siteLatitude: $siteLatitude, siteLongitude: $siteLongitude, internalNotes: $internalNotes)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$FaultDetailImpl &&
            (identical(other.summary, summary) || other.summary == summary) &&
            const DeepCollectionEquality().equals(other._attempts, _attempts) &&
            const DeepCollectionEquality().equals(other._timeline, _timeline) &&
            const DeepCollectionEquality().equals(
              other._attachmentUrls,
              _attachmentUrls,
            ) &&
            (identical(other.customerPhone, customerPhone) ||
                other.customerPhone == customerPhone) &&
            (identical(other.customerEmail, customerEmail) ||
                other.customerEmail == customerEmail) &&
            (identical(other.siteAddress, siteAddress) ||
                other.siteAddress == siteAddress) &&
            (identical(other.siteLatitude, siteLatitude) ||
                other.siteLatitude == siteLatitude) &&
            (identical(other.siteLongitude, siteLongitude) ||
                other.siteLongitude == siteLongitude) &&
            (identical(other.internalNotes, internalNotes) ||
                other.internalNotes == internalNotes));
  }

  @override
  int get hashCode => Object.hash(
    runtimeType,
    summary,
    const DeepCollectionEquality().hash(_attempts),
    const DeepCollectionEquality().hash(_timeline),
    const DeepCollectionEquality().hash(_attachmentUrls),
    customerPhone,
    customerEmail,
    siteAddress,
    siteLatitude,
    siteLongitude,
    internalNotes,
  );

  /// Create a copy of FaultDetail
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$FaultDetailImplCopyWith<_$FaultDetailImpl> get copyWith =>
      _$$FaultDetailImplCopyWithImpl<_$FaultDetailImpl>(this, _$identity);
}

abstract class _FaultDetail implements FaultDetail {
  const factory _FaultDetail({
    required final FaultSummary summary,
    final List<FaultAttempt> attempts,
    final List<FaultTimelineEvent> timeline,
    final List<String> attachmentUrls,
    final String? customerPhone,
    final String? customerEmail,
    final String? siteAddress,
    final double? siteLatitude,
    final double? siteLongitude,
    final String? internalNotes,
  }) = _$FaultDetailImpl;

  @override
  FaultSummary get summary;
  @override
  List<FaultAttempt> get attempts;
  @override
  List<FaultTimelineEvent> get timeline;
  @override
  List<String> get attachmentUrls;
  @override
  String? get customerPhone;
  @override
  String? get customerEmail;
  @override
  String? get siteAddress;
  @override
  double? get siteLatitude;
  @override
  double? get siteLongitude;
  @override
  String? get internalNotes;

  /// Create a copy of FaultDetail
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$FaultDetailImplCopyWith<_$FaultDetailImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
mixin _$FaultState {
  // Loading
  bool get isLoading => throw _privateConstructorUsedError;
  bool get isRefreshing => throw _privateConstructorUsedError; // List data
  List<FaultSummary> get allFaults =>
      throw _privateConstructorUsedError; // Detail (when viewing a fault)
  FaultDetail? get selectedFault => throw _privateConstructorUsedError;
  bool get isLoadingDetail =>
      throw _privateConstructorUsedError; // Filters + Sort
  FaultFilters get activeFilters => throw _privateConstructorUsedError;
  FaultSortBy get sortBy => throw _privateConstructorUsedError; // Error
  String? get errorMessage =>
      throw _privateConstructorUsedError; // Online state
  bool get isOnline => throw _privateConstructorUsedError;

  /// Create a copy of FaultState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $FaultStateCopyWith<FaultState> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $FaultStateCopyWith<$Res> {
  factory $FaultStateCopyWith(
    FaultState value,
    $Res Function(FaultState) then,
  ) = _$FaultStateCopyWithImpl<$Res, FaultState>;
  @useResult
  $Res call({
    bool isLoading,
    bool isRefreshing,
    List<FaultSummary> allFaults,
    FaultDetail? selectedFault,
    bool isLoadingDetail,
    FaultFilters activeFilters,
    FaultSortBy sortBy,
    String? errorMessage,
    bool isOnline,
  });

  $FaultDetailCopyWith<$Res>? get selectedFault;
  $FaultFiltersCopyWith<$Res> get activeFilters;
}

/// @nodoc
class _$FaultStateCopyWithImpl<$Res, $Val extends FaultState>
    implements $FaultStateCopyWith<$Res> {
  _$FaultStateCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of FaultState
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? isLoading = null,
    Object? isRefreshing = null,
    Object? allFaults = null,
    Object? selectedFault = freezed,
    Object? isLoadingDetail = null,
    Object? activeFilters = null,
    Object? sortBy = null,
    Object? errorMessage = freezed,
    Object? isOnline = null,
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
            allFaults: null == allFaults
                ? _value.allFaults
                : allFaults // ignore: cast_nullable_to_non_nullable
                      as List<FaultSummary>,
            selectedFault: freezed == selectedFault
                ? _value.selectedFault
                : selectedFault // ignore: cast_nullable_to_non_nullable
                      as FaultDetail?,
            isLoadingDetail: null == isLoadingDetail
                ? _value.isLoadingDetail
                : isLoadingDetail // ignore: cast_nullable_to_non_nullable
                      as bool,
            activeFilters: null == activeFilters
                ? _value.activeFilters
                : activeFilters // ignore: cast_nullable_to_non_nullable
                      as FaultFilters,
            sortBy: null == sortBy
                ? _value.sortBy
                : sortBy // ignore: cast_nullable_to_non_nullable
                      as FaultSortBy,
            errorMessage: freezed == errorMessage
                ? _value.errorMessage
                : errorMessage // ignore: cast_nullable_to_non_nullable
                      as String?,
            isOnline: null == isOnline
                ? _value.isOnline
                : isOnline // ignore: cast_nullable_to_non_nullable
                      as bool,
          )
          as $Val,
    );
  }

  /// Create a copy of FaultState
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $FaultDetailCopyWith<$Res>? get selectedFault {
    if (_value.selectedFault == null) {
      return null;
    }

    return $FaultDetailCopyWith<$Res>(_value.selectedFault!, (value) {
      return _then(_value.copyWith(selectedFault: value) as $Val);
    });
  }

  /// Create a copy of FaultState
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $FaultFiltersCopyWith<$Res> get activeFilters {
    return $FaultFiltersCopyWith<$Res>(_value.activeFilters, (value) {
      return _then(_value.copyWith(activeFilters: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$FaultStateImplCopyWith<$Res>
    implements $FaultStateCopyWith<$Res> {
  factory _$$FaultStateImplCopyWith(
    _$FaultStateImpl value,
    $Res Function(_$FaultStateImpl) then,
  ) = _$$FaultStateImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    bool isLoading,
    bool isRefreshing,
    List<FaultSummary> allFaults,
    FaultDetail? selectedFault,
    bool isLoadingDetail,
    FaultFilters activeFilters,
    FaultSortBy sortBy,
    String? errorMessage,
    bool isOnline,
  });

  @override
  $FaultDetailCopyWith<$Res>? get selectedFault;
  @override
  $FaultFiltersCopyWith<$Res> get activeFilters;
}

/// @nodoc
class _$$FaultStateImplCopyWithImpl<$Res>
    extends _$FaultStateCopyWithImpl<$Res, _$FaultStateImpl>
    implements _$$FaultStateImplCopyWith<$Res> {
  _$$FaultStateImplCopyWithImpl(
    _$FaultStateImpl _value,
    $Res Function(_$FaultStateImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of FaultState
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? isLoading = null,
    Object? isRefreshing = null,
    Object? allFaults = null,
    Object? selectedFault = freezed,
    Object? isLoadingDetail = null,
    Object? activeFilters = null,
    Object? sortBy = null,
    Object? errorMessage = freezed,
    Object? isOnline = null,
  }) {
    return _then(
      _$FaultStateImpl(
        isLoading: null == isLoading
            ? _value.isLoading
            : isLoading // ignore: cast_nullable_to_non_nullable
                  as bool,
        isRefreshing: null == isRefreshing
            ? _value.isRefreshing
            : isRefreshing // ignore: cast_nullable_to_non_nullable
                  as bool,
        allFaults: null == allFaults
            ? _value._allFaults
            : allFaults // ignore: cast_nullable_to_non_nullable
                  as List<FaultSummary>,
        selectedFault: freezed == selectedFault
            ? _value.selectedFault
            : selectedFault // ignore: cast_nullable_to_non_nullable
                  as FaultDetail?,
        isLoadingDetail: null == isLoadingDetail
            ? _value.isLoadingDetail
            : isLoadingDetail // ignore: cast_nullable_to_non_nullable
                  as bool,
        activeFilters: null == activeFilters
            ? _value.activeFilters
            : activeFilters // ignore: cast_nullable_to_non_nullable
                  as FaultFilters,
        sortBy: null == sortBy
            ? _value.sortBy
            : sortBy // ignore: cast_nullable_to_non_nullable
                  as FaultSortBy,
        errorMessage: freezed == errorMessage
            ? _value.errorMessage
            : errorMessage // ignore: cast_nullable_to_non_nullable
                  as String?,
        isOnline: null == isOnline
            ? _value.isOnline
            : isOnline // ignore: cast_nullable_to_non_nullable
                  as bool,
      ),
    );
  }
}

/// @nodoc

class _$FaultStateImpl extends _FaultState {
  const _$FaultStateImpl({
    this.isLoading = true,
    this.isRefreshing = false,
    final List<FaultSummary> allFaults = const [],
    this.selectedFault,
    this.isLoadingDetail = false,
    this.activeFilters = const FaultFilters(),
    this.sortBy = FaultSortBy.sla,
    this.errorMessage,
    this.isOnline = true,
  }) : _allFaults = allFaults,
       super._();

  // Loading
  @override
  @JsonKey()
  final bool isLoading;
  @override
  @JsonKey()
  final bool isRefreshing;
  // List data
  final List<FaultSummary> _allFaults;
  // List data
  @override
  @JsonKey()
  List<FaultSummary> get allFaults {
    if (_allFaults is EqualUnmodifiableListView) return _allFaults;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_allFaults);
  }

  // Detail (when viewing a fault)
  @override
  final FaultDetail? selectedFault;
  @override
  @JsonKey()
  final bool isLoadingDetail;
  // Filters + Sort
  @override
  @JsonKey()
  final FaultFilters activeFilters;
  @override
  @JsonKey()
  final FaultSortBy sortBy;
  // Error
  @override
  final String? errorMessage;
  // Online state
  @override
  @JsonKey()
  final bool isOnline;

  @override
  String toString() {
    return 'FaultState(isLoading: $isLoading, isRefreshing: $isRefreshing, allFaults: $allFaults, selectedFault: $selectedFault, isLoadingDetail: $isLoadingDetail, activeFilters: $activeFilters, sortBy: $sortBy, errorMessage: $errorMessage, isOnline: $isOnline)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$FaultStateImpl &&
            (identical(other.isLoading, isLoading) ||
                other.isLoading == isLoading) &&
            (identical(other.isRefreshing, isRefreshing) ||
                other.isRefreshing == isRefreshing) &&
            const DeepCollectionEquality().equals(
              other._allFaults,
              _allFaults,
            ) &&
            (identical(other.selectedFault, selectedFault) ||
                other.selectedFault == selectedFault) &&
            (identical(other.isLoadingDetail, isLoadingDetail) ||
                other.isLoadingDetail == isLoadingDetail) &&
            (identical(other.activeFilters, activeFilters) ||
                other.activeFilters == activeFilters) &&
            (identical(other.sortBy, sortBy) || other.sortBy == sortBy) &&
            (identical(other.errorMessage, errorMessage) ||
                other.errorMessage == errorMessage) &&
            (identical(other.isOnline, isOnline) ||
                other.isOnline == isOnline));
  }

  @override
  int get hashCode => Object.hash(
    runtimeType,
    isLoading,
    isRefreshing,
    const DeepCollectionEquality().hash(_allFaults),
    selectedFault,
    isLoadingDetail,
    activeFilters,
    sortBy,
    errorMessage,
    isOnline,
  );

  /// Create a copy of FaultState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$FaultStateImplCopyWith<_$FaultStateImpl> get copyWith =>
      _$$FaultStateImplCopyWithImpl<_$FaultStateImpl>(this, _$identity);
}

abstract class _FaultState extends FaultState {
  const factory _FaultState({
    final bool isLoading,
    final bool isRefreshing,
    final List<FaultSummary> allFaults,
    final FaultDetail? selectedFault,
    final bool isLoadingDetail,
    final FaultFilters activeFilters,
    final FaultSortBy sortBy,
    final String? errorMessage,
    final bool isOnline,
  }) = _$FaultStateImpl;
  const _FaultState._() : super._();

  // Loading
  @override
  bool get isLoading;
  @override
  bool get isRefreshing; // List data
  @override
  List<FaultSummary> get allFaults; // Detail (when viewing a fault)
  @override
  FaultDetail? get selectedFault;
  @override
  bool get isLoadingDetail; // Filters + Sort
  @override
  FaultFilters get activeFilters;
  @override
  FaultSortBy get sortBy; // Error
  @override
  String? get errorMessage; // Online state
  @override
  bool get isOnline;

  /// Create a copy of FaultState
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$FaultStateImplCopyWith<_$FaultStateImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
