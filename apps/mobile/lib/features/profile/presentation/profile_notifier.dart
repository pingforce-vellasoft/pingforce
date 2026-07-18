import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../injection_container.dart';
import '../data/profile_remote_data_source.dart';
import 'profile_models.dart';

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE NOTIFIER — loads the current user (GET /auth/me).
// ─────────────────────────────────────────────────────────────────────────────

class ProfileState {
  const ProfileState({
    this.isLoading = true,
    this.profile,
    this.errorMessage,
  });

  final bool isLoading;
  final ProfileInfo? profile;
  final String? errorMessage;

  ProfileState copyWith({
    bool? isLoading,
    ProfileInfo? profile,
    String? errorMessage,
  }) {
    return ProfileState(
      isLoading: isLoading ?? this.isLoading,
      profile: profile ?? this.profile,
      errorMessage: errorMessage,
    );
  }
}

final profileNotifierProvider =
    NotifierProvider<ProfileNotifier, ProfileState>(ProfileNotifier.new);

class ProfileNotifier extends Notifier<ProfileState> {
  @override
  ProfileState build() => const ProfileState();

  Future<void> load() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final me = await sl<ProfileRemoteDataSource>().fetchMe();
      state = state.copyWith(isLoading: false, profile: me);
    } catch (_) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Could not load your profile. Pull to retry.',
      );
    }
  }
}
