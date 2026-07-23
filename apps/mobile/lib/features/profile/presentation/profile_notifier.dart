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
}

final profileNotifierProvider =
    NotifierProvider<ProfileNotifier, ProfileState>(ProfileNotifier.new);

class ProfileNotifier extends Notifier<ProfileState> {
  @override
  ProfileState build() => const ProfileState();

  Future<void> load() async {
    // Keep any already-loaded profile visible while refreshing so a pull-to-
    // refresh does not flash the spinner over good data.
    state = ProfileState(
      isLoading: state.profile == null,
      profile: state.profile,
    );
    try {
      final me = await sl<ProfileRemoteDataSource>().fetchMe();
      state = ProfileState(isLoading: false, profile: me);
    } catch (_) {
      state = ProfileState(
        isLoading: false,
        // A failed refresh must not wipe a profile we already have.
        profile: state.profile,
        errorMessage: state.profile == null
            ? 'Could not load your profile. Pull to retry.'
            : null,
      );
    }
  }
}
