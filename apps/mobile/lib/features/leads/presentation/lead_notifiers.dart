import 'dart:math';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/connectivity_provider.dart';
import '../../../core/sync/sync_provider.dart';
import '../../../core/sync/sync_state.dart';
import '../../../injection_container.dart';
import '../data/leads_remote_data_source.dart';
import 'lead_state.dart';

// ─────────────────────────────────────────────────────────────────────────────
// LEADS — notifiers. Remote calls go through LeadsRemoteDataSource only.
// ─────────────────────────────────────────────────────────────────────────────

LeadsRemoteDataSource get _remote => sl<LeadsRemoteDataSource>();

String _messageFor(Object error, String fallback) {
  if (error is DioException) {
    final data = error.response?.data;
    final serverMessage = data is Map ? data['message'] : null;
    return switch (error.response?.statusCode) {
      400 when serverMessage is String => serverMessage,
      403 => 'Your role cannot do this for leads.',
      404 => 'This lead is not available to you.',
      _ => fallback,
    };
  }
  return fallback;
}

// ── List ─────────────────────────────────────────────────────────────────────

final leadListProvider = NotifierProvider<LeadListNotifier, LeadListState>(
  LeadListNotifier.new,
);

class LeadListNotifier extends Notifier<LeadListState> {
  @override
  LeadListState build() {
    Future.microtask(load);
    return const LeadListState(isLoading: true);
  }

  /// Leads captured offline that the server has not confirmed yet.
  List<LeadSummary> get _pending =>
      state.leads.where((l) => l.pendingSync).toList(growable: false);

  Future<void> load() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final results = await Future.wait([
        _remote.fetchStages(),
        _remote.fetchLeads(),
      ]);
      final stages = results[0] as List<PipelineStageItem>;
      final leads = results[1] as List<LeadSummary>;
      final serverNumbers = leads.map((l) => l.leadNumber).toSet();
      state = state.copyWith(
        stages: stages,
        // Keep offline captures until the server list contains them.
        leads: [
          ..._pending.where((p) => !serverNumbers.contains(p.leadNumber)),
          ...leads,
        ],
        isLoading: false,
        hasMore: leads.length == leadPageSize,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: _messageFor(e, 'Could not load leads. Pull to retry.'),
      );
    }
  }

  Future<void> loadMore() async {
    if (state.isLoadingMore || !state.hasMore) return;
    final server = state.leads.where((l) => !l.pendingSync).toList();
    if (server.isEmpty) return;
    state = state.copyWith(isLoadingMore: true);
    try {
      final page = await _remote.fetchLeads(cursor: server.last.id);
      state = state.copyWith(
        leads: [...state.leads, ...page],
        isLoadingMore: false,
        hasMore: page.length == leadPageSize,
      );
    } catch (e) {
      state = state.copyWith(
        isLoadingMore: false,
        errorMessage: _messageFor(e, 'Could not load more leads.'),
      );
    }
  }

  void setStageFilter(String? stageId) {
    state = state.copyWith(stageFilter: stageId);
  }

  void addLocal(LeadSummary lead) {
    state = state.copyWith(leads: [lead, ...state.leads]);
  }

  void replaceLocal(LeadSummary lead) {
    state = state.copyWith(
      leads: [for (final l in state.leads) l.id == lead.id ? lead : l],
    );
  }
}

// ── Detail ───────────────────────────────────────────────────────────────────

final leadDetailProvider = NotifierProvider.autoDispose
    .family<LeadDetailNotifier, LeadDetailState, String>(
      LeadDetailNotifier.new,
    );

class LeadDetailNotifier
    extends AutoDisposeFamilyNotifier<LeadDetailState, String> {
  @override
  LeadDetailState build(String leadId) {
    Future.microtask(load);
    return const LeadDetailState(isLoading: true);
  }

  Future<void> load() async {
    state = LeadDetailState(lead: state.lead, isLoading: true);
    try {
      final lead = await _remote.fetchLead(arg);
      state = LeadDetailState(lead: lead);
    } catch (e) {
      state = LeadDetailState(
        lead: state.lead,
        errorMessage: _messageFor(e, 'Could not load the lead. Pull to retry.'),
      );
    }
  }

  /// Online only: stage moves are not in the offline queue.
  Future<bool> moveToStage(PipelineStageItem stage) async {
    final lead = state.lead;
    if (lead == null || state.isMoving) return false;
    if (!ref.read(isOnlineProvider)) {
      state = LeadDetailState(
        lead: lead,
        errorMessage: 'You are offline. Changing the stage needs a connection.',
      );
      return false;
    }
    state = LeadDetailState(lead: lead, isMoving: true);
    try {
      await _remote.updateStage(lead.id, stage.id);
      final moved = lead.copyWith(stageId: stage.id, stageName: stage.name);
      state = LeadDetailState(lead: moved);
      ref.read(leadListProvider.notifier).replaceLocal(moved);
      return true;
    } catch (e) {
      state = LeadDetailState(
        lead: lead,
        errorMessage: _messageFor(e, 'Could not change the stage.'),
      );
      return false;
    }
  }

  void clearError() {
    state = LeadDetailState(lead: state.lead);
  }
}

// ── Create ───────────────────────────────────────────────────────────────────

final createLeadProvider =
    NotifierProvider.autoDispose<CreateLeadNotifier, CreateLeadState>(
      CreateLeadNotifier.new,
    );

class CreateLeadNotifier extends AutoDisposeNotifier<CreateLeadState> {
  String? _leadNumber;

  @override
  CreateLeadState build() {
    // Fixed for the life of the screen: a retry after a dropped response or
    // an offline replay reuses it, and the API dedupes on it.
    _leadNumber ??= generateLeadNumber(
      DateTime.now(),
      Random().nextInt(1 << 30),
    );
    return const CreateLeadState();
  }

  Future<void> submit({
    required String firstName,
    String? lastName,
    String? companyName,
    String? mobile,
    String? email,
    double? expectedValue,
    String? pipelineStageId,
  }) async {
    if (state.isSubmitting) return;
    final request = CreateLeadRequest(
      leadNumber: _leadNumber!,
      firstName: firstName,
      lastName: lastName,
      companyName: companyName,
      mobile: mobile,
      email: email,
      expectedValue: expectedValue,
      pipelineStageId: pipelineStageId,
    );

    if (!ref.read(isOnlineProvider)) {
      _queueOffline(request);
      return;
    }

    state = const CreateLeadState(isSubmitting: true);
    try {
      final lead = await _remote.createLead(request);
      ref.read(leadListProvider.notifier).addLocal(lead);
      state = const CreateLeadState(savedOnline: true);
    } on DioException catch (e) {
      if (e.response == null) {
        // Connection dropped mid-request: queue it. The lead number makes a
        // replay a DUPLICATE if the first request did reach the server.
        _queueOffline(request);
        return;
      }
      final data = e.response?.data;
      final serverMessage = data is Map ? data['message'] : null;
      state = CreateLeadState(
        errorMessage: switch (e.response?.statusCode) {
          400 when serverMessage is String => serverMessage,
          400 => 'Some details are invalid. Check the form and retry.',
          403 => 'Your role cannot create leads.',
          _ => 'Could not save the lead. Try again.',
        },
      );
    } catch (_) {
      state = const CreateLeadState(
        errorMessage: 'Could not save the lead. Try again.',
      );
    }
  }

  void _queueOffline(CreateLeadRequest request) {
    final now = DateTime.now();
    final clientRef = 'lead-${request.leadNumber}';
    ref
        .read(syncProvider.notifier)
        .enqueue(
          SyncQueueItem(
            id: clientRef,
            module: SyncItemModule.leads,
            entityId: request.leadNumber,
            operationType: 'create',
            description: 'New lead: ${request.firstName.trim()}',
            queuedAt: now,
            payload: {
              ...request.toJson(),
              'clientRef': clientRef,
              'timestamp': now.toUtc().toIso8601String(),
            },
          ),
        );
    ref
        .read(leadListProvider.notifier)
        .addLocal(
          LeadSummary(
            id: clientRef,
            leadNumber: request.leadNumber,
            firstName: request.firstName.trim(),
            lastName: request.lastName,
            companyName: request.companyName,
            mobile: request.mobile,
            email: request.email,
            expectedValue: request.expectedValue,
            stageId: request.pipelineStageId,
            pendingSync: true,
            createdAt: now,
          ),
        );
    state = const CreateLeadState(queuedOffline: true);
  }
}
