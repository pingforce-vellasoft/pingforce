import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/connectivity_provider.dart';
import '../../../injection_container.dart';
import '../data/visits_remote_data_source.dart';
import 'visit_state.dart';

// ─────────────────────────────────────────────────────────────────────────────
// CREATE VISIT NOTIFIER — POST /visits from the manager's phone.
// Online only: /visits/sync replays lifecycle actions, not creations, so an
// offline create would have nothing to sync through.
// ─────────────────────────────────────────────────────────────────────────────

final createVisitProvider =
    NotifierProvider.autoDispose<CreateVisitNotifier, CreateVisitState>(
  CreateVisitNotifier.new,
);

class CreateVisitNotifier extends AutoDisposeNotifier<CreateVisitState> {
  @override
  CreateVisitState build() => const CreateVisitState();

  Future<void> submit(CreateVisitRequest request) async {
    if (state.isSubmitting) return;
    if (!ref.read(isOnlineProvider)) {
      state = const CreateVisitState(
        errorMessage: 'You are offline. Creating a visit needs a connection.',
      );
      return;
    }

    state = const CreateVisitState(isSubmitting: true);
    try {
      final id = await sl<VisitsRemoteDataSource>().createVisit(request);
      state = CreateVisitState(createdVisitId: id);
    } on DioException catch (e) {
      final code = e.response?.statusCode;
      state = CreateVisitState(
        errorMessage: switch (code) {
          403 => 'Your role cannot create visits.',
          400 => 'Some details are invalid. Check the form and retry.',
          _ => 'Could not create the visit. Try again.',
        },
      );
    } catch (_) {
      state = const CreateVisitState(
        errorMessage: 'Could not create the visit. Try again.',
      );
    }
  }
}
