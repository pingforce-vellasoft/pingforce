import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../injection_container.dart';
import '../data/customer_faults_remote_data_source.dart';
import 'complaint_state.dart';

final complaintNotifierProvider =
    NotifierProvider<ComplaintNotifier, ComplaintState>(ComplaintNotifier.new);

/// Drives the customer complaint surface.
///
/// Mutations re-fetch rather than patching state locally: the API applies the
/// lifecycle rules (reopen window, rate-once, comment-unless-closed), so the
/// server's view is the only trustworthy one after a write.
class ComplaintNotifier extends Notifier<ComplaintState> {
  @override
  ComplaintState build() => const ComplaintState();

  CustomerFaultsRemoteDataSource get _remote =>
      sl<CustomerFaultsRemoteDataSource>();

  Future<void> load() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final complaints = await _remote.list();
      state = state.copyWith(isLoading: false, complaints: complaints);
    } on DioException catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: _message(e, 'Could not load your complaints.'),
      );
    }
  }

  Future<void> refresh() async {
    state = state.copyWith(isRefreshing: true);
    await load();
    state = state.copyWith(isRefreshing: false);
  }

  Future<void> loadDetail(String id) async {
    state = state.copyWith(isLoadingDetail: true, clearError: true);
    try {
      final complaint = await _remote.getById(id);
      state = state.copyWith(isLoadingDetail: false, selected: complaint);
    } on DioException catch (e) {
      state = state.copyWith(
        isLoadingDetail: false,
        errorMessage: _message(e, 'Could not open this complaint.'),
      );
    }
  }

  /// Returns the new complaint id, or null when the submission failed.
  Future<String?> raise({
    required String title,
    required String description,
    String? connectionId,
  }) async {
    state = state.copyWith(isSubmitting: true, clearError: true);
    try {
      final created = await _remote.create(
        title: title,
        description: description,
        connectionId: connectionId,
      );
      state = state.copyWith(isSubmitting: false);
      await load();
      return created.id;
    } on DioException catch (e) {
      state = state.copyWith(
        isSubmitting: false,
        errorMessage: _message(e, 'Could not submit your complaint.'),
      );
      return null;
    }
  }

  Future<bool> comment(String id, String notes) =>
      _mutate(id, () => _remote.comment(id, notes), 'Could not add your note.');

  Future<bool> reopen(String id, String notes) =>
      _mutate(id, () => _remote.reopen(id, notes), 'Could not reopen this complaint.');

  Future<bool> rate(String id, int rating, String? comment) => _mutate(
        id,
        () => _remote.rate(id, rating, comment),
        'Could not save your rating.',
      );

  Future<bool> _mutate(
    String id,
    Future<void> Function() action,
    String fallbackMessage,
  ) async {
    state = state.copyWith(isSubmitting: true, clearError: true);
    try {
      await action();
      await loadDetail(id);
      await load();
      state = state.copyWith(isSubmitting: false);
      return true;
    } on DioException catch (e) {
      state = state.copyWith(
        isSubmitting: false,
        errorMessage: _message(e, fallbackMessage),
      );
      return false;
    }
  }

  void clearError() => state = state.copyWith(clearError: true);

  /// Prefers the API's message: it carries the actionable detail (reopen
  /// window elapsed, too many open complaints) that a generic string loses.
  String _message(DioException e, String fallback) {
    final data = e.response?.data;
    if (data is Map<String, dynamic>) {
      final message = data['message'];
      if (message is String && message.isNotEmpty) return message;
      if (message is List && message.isNotEmpty) return message.first.toString();
    }
    return fallback;
  }
}
