import '../domain/entities/complaint.dart';

/// State for the customer complaint surface.
///
/// Hand-written rather than freezed: the feature has one flat state class and
/// adding it to the codegen set would mean regenerating every `.freezed.dart`
/// in the app for no gain.
class ComplaintState {
  const ComplaintState({
    this.isLoading = true,
    this.isRefreshing = false,
    this.isSubmitting = false,
    this.complaints = const [],
    this.selected,
    this.isLoadingDetail = false,
    this.errorMessage,
  });

  final bool isLoading;
  final bool isRefreshing;

  /// True while a create/comment/reopen/rate call is in flight, so the UI can
  /// disable the action instead of allowing a double submission.
  final bool isSubmitting;

  final List<Complaint> complaints;
  final Complaint? selected;
  final bool isLoadingDetail;
  final String? errorMessage;

  List<Complaint> get open =>
      complaints.where((c) => c.isOpen).toList(growable: false);

  List<Complaint> get closed =>
      complaints.where((c) => !c.isOpen).toList(growable: false);

  int get openCount => open.length;

  ComplaintState copyWith({
    bool? isLoading,
    bool? isRefreshing,
    bool? isSubmitting,
    List<Complaint>? complaints,
    Complaint? selected,
    bool? isLoadingDetail,
    String? errorMessage,
    bool clearError = false,
    bool clearSelected = false,
  }) {
    return ComplaintState(
      isLoading: isLoading ?? this.isLoading,
      isRefreshing: isRefreshing ?? this.isRefreshing,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      complaints: complaints ?? this.complaints,
      selected: clearSelected ? null : (selected ?? this.selected),
      isLoadingDetail: isLoadingDetail ?? this.isLoadingDetail,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}
