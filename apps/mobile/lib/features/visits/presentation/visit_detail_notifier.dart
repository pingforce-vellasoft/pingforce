import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../injection_container.dart';
import '../data/visits_remote_data_source.dart';
import 'visit_state.dart';

// ─────────────────────────────────────────────────────────────────────────────
// VISIT DETAIL NOTIFIER — one visit's detail, history and notes
// (3.2 MOBILE_APP.md). Lifecycle actions still run through VisitNotifier so
// the online/offline queue logic lives in one place; this notifier reloads
// after them.
// ─────────────────────────────────────────────────────────────────────────────

final visitDetailProvider =
    NotifierProvider.family<VisitDetailNotifier, VisitDetailState, String>(
  VisitDetailNotifier.new,
);

class VisitDetailNotifier extends FamilyNotifier<VisitDetailState, String> {
  @override
  VisitDetailState build(String visitId) {
    Future.microtask(load);
    return const VisitDetailState();
  }

  VisitsRemoteDataSource get _remote => sl<VisitsRemoteDataSource>();

  Future<void> load() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final detail = await _remote.fetchVisit(arg);
      state = state.copyWith(isLoading: false, detail: detail);
    } on DioException catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: e.response?.statusCode == 404
            ? 'This visit is not available to you.'
            : 'Could not load the visit. Pull to retry.',
      );
    } catch (_) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Could not load the visit. Pull to retry.',
      );
    }
  }

  /// Returns true when the note was saved. Notes need a connection: the
  /// offline queue only carries lifecycle actions (/visits/sync).
  Future<bool> addNote(String text) async {
    final note = text.trim();
    final detail = state.detail;
    if (note.isEmpty || detail == null) return false;

    state = state.copyWith(isSavingNote: true, errorMessage: null);
    try {
      final saved = await _remote.addNote(arg, note);
      state = state.copyWith(
        isSavingNote: false,
        detail: VisitDetail(
          summary: detail.summary,
          geofenceName: detail.geofenceName,
          outcome: detail.outcome,
          history: detail.history,
          notes: [...detail.notes, saved],
        ),
      );
      return true;
    } catch (_) {
      state = state.copyWith(
        isSavingNote: false,
        errorMessage: 'Note not saved — check your connection and retry.',
      );
      return false;
    }
  }

  void clearError() {
    state = state.copyWith(errorMessage: null);
  }
}
