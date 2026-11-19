import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/hardware/hardware_service.dart';
import '../../../core/network/connectivity_provider.dart';
import '../../../core/sync/sync_provider.dart';
import '../../../core/sync/sync_state.dart';
import '../../../injection_container.dart';
import '../data/faults_remote_data_source.dart';
import 'create_attempt_state.dart';
import 'fault_notifier.dart';

// ─────────────────────────────────────────────────────────────────────────────
// CREATE ATTEMPT NOTIFIER — POST /faults/:id/attempts.
// Offline (or when the connection drops mid-request) the attempt is queued
// and replayed through POST /faults/sync as ADD_ATTEMPT. The clientRef is
// fixed for the life of the screen and the API dedupes on it, so a retry or a
// request that did reach the server never records a second attempt.
// ─────────────────────────────────────────────────────────────────────────────

final createAttemptProvider = NotifierProvider.autoDispose
    .family<CreateAttemptNotifier, CreateAttemptState, String>(
      CreateAttemptNotifier.new,
    );

class CreateAttemptNotifier
    extends AutoDisposeFamilyNotifier<CreateAttemptState, String> {
  String? _clientRef;

  @override
  CreateAttemptState build(String faultId) {
    _clientRef ??= 'att-$faultId-${DateTime.now().microsecondsSinceEpoch}';
    return const CreateAttemptState();
  }

  Future<void> submit({
    required String attemptType,
    required String outcome,
    required DateTime startedAt,
    DateTime? endedAt,
    String? workNotes,
    String? nextAction,
    required bool captureLocation,
  }) async {
    if (state.isSubmitting) return;
    state = const CreateAttemptState(isSubmitting: true);

    double? latitude;
    double? longitude;
    if (captureLocation) {
      try {
        final position = await sl<HardwareService>().getCurrentLocation();
        latitude = position.latitude;
        longitude = position.longitude;
      } catch (_) {
        // Location is evidence, not a gate: record the attempt without it.
      }
    }

    final request = CreateAttemptRequest(
      attemptType: attemptType,
      outcome: outcome,
      startedAt: startedAt,
      endedAt: endedAt,
      latitude: latitude,
      longitude: longitude,
      workNotes: workNotes?.trim(),
      nextAction: nextAction?.trim(),
      clientRef: _clientRef!,
    );

    if (!ref.read(isOnlineProvider)) {
      _queueOffline(request);
      return;
    }

    try {
      await sl<FaultsRemoteDataSource>().createAttempt(arg, request);
      // Refresh the detail behind this screen so the new attempt shows.
      await ref.read(faultNotifierProvider.notifier).loadDetail(arg);
      state = const CreateAttemptState(saved: true);
    } on DioException catch (e) {
      if (e.response == null) {
        // Connection dropped: queue it; the clientRef makes a replay of a
        // request that did reach the server a DUPLICATE, not a second row.
        _queueOffline(request);
        return;
      }
      state = CreateAttemptState(errorMessage: _messageFor(e));
    } catch (_) {
      state = const CreateAttemptState(
        errorMessage: 'Could not save the attempt. Try again.',
      );
    }
  }

  void _queueOffline(CreateAttemptRequest request) {
    final now = DateTime.now();
    ref
        .read(syncProvider.notifier)
        .enqueue(
          SyncQueueItem(
            id: request.clientRef,
            module: SyncItemModule.faults,
            entityId: arg,
            operationType: 'create',
            description:
                'Fault attempt: ${prettyAttemptValue(request.outcome)}',
            queuedAt: now,
            payload: offlineAttemptAction(arg, request, now),
          ),
        );
    state = const CreateAttemptState(queuedOffline: true);
  }

  String _messageFor(DioException e) {
    final data = e.response?.data;
    final serverMessage = data is Map ? data['message'] : null;
    return switch (e.response?.statusCode) {
      400 when serverMessage is String => serverMessage,
      400 => 'Some details are invalid. Check the form and retry.',
      403 => 'Your role cannot record attempts.',
      404 => 'This fault is not available to you.',
      409 => 'Another attempt was saved at the same time. Try again.',
      _ => 'Could not save the attempt. Try again.',
    };
  }
}
