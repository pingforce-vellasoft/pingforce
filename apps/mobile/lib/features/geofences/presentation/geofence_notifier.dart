import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../injection_container.dart';
import '../domain/entities/geofence.dart';
import '../domain/repositories/geofence_repository.dart';

// ─────────────────────────────────────────────────────────────────────────────
// GEOFENCE STATE
// ─────────────────────────────────────────────────────────────────────────────

class GeofenceState {
  const GeofenceState({
    this.isLoading = true,
    this.isSaving = false,
    this.errorMessage,
    this.items = const [],
  });

  final bool isLoading;
  final bool isSaving;
  final String? errorMessage;
  final List<Geofence> items;

  GeofenceState copyWith({
    bool? isLoading,
    bool? isSaving,
    String? errorMessage,
    bool clearError = false,
    List<Geofence>? items,
  }) {
    return GeofenceState(
      isLoading: isLoading ?? this.isLoading,
      isSaving: isSaving ?? this.isSaving,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      items: items ?? this.items,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GEOFENCE NOTIFIER
// ─────────────────────────────────────────────────────────────────────────────

final geofenceNotifierProvider =
    NotifierProvider<GeofenceNotifier, GeofenceState>(GeofenceNotifier.new);

class GeofenceNotifier extends Notifier<GeofenceState> {
  GeofenceRepository get _repo => sl<GeofenceRepository>();

  @override
  GeofenceState build() => const GeofenceState();

  Future<void> load() async {
    state = state.copyWith(isLoading: true, clearError: true);
    final result = await _repo.getGeofences();
    result.fold(
      (f) => state = state.copyWith(isLoading: false, errorMessage: f.message),
      (items) => state =
          state.copyWith(isLoading: false, items: items, clearError: true),
    );
  }

  Future<void> refresh() => load();

  /// Creates a geofence and reloads the list. Returns null on success or an
  /// error message the caller can surface (e.g. via SnackBar).
  Future<String?> create({
    required String name,
    required double latitude,
    required double longitude,
    required int radiusMeters,
  }) async {
    state = state.copyWith(isSaving: true, clearError: true);
    final result = await _repo.createGeofence(
      name: name,
      latitude: latitude,
      longitude: longitude,
      radiusMeters: radiusMeters,
    );
    return result.fold(
      (f) {
        state = state.copyWith(isSaving: false);
        return f.message;
      },
      (created) {
        state = state.copyWith(isSaving: false, items: [...state.items, created]);
        return null;
      },
    );
  }

  /// Optimistically removes the geofence, persists, reverts on failure.
  Future<String?> delete(String id) async {
    final previous = state.items;
    state = state.copyWith(items: state.items.where((g) => g.id != id).toList());
    final result = await _repo.deleteGeofence(id);
    return result.fold(
      (f) {
        state = state.copyWith(items: previous);
        return f.message;
      },
      (_) => null,
    );
  }
}
