import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/auth/presentation/auth_notifier.dart';
import 'package:mobile/features/auth/presentation/auth_state.dart';

/// Regression coverage for the dead sign-in button after a forced password
/// change.
///
/// `loginProvider` is keep-alive, so the `isAuthenticated: true` written by the
/// first sign-in outlived the session that set it. The change-password screen
/// then sent the user back to `/auth/login` with that flag still set, and the
/// login screen only navigated on the `false => true` edge — so the second
/// sign-in was a `true => true` no-op and the button did nothing.
///
/// The two halves of the fix are: whoever returns the user to the login screen
/// invalidates the provider, and the login screen clears a stale flag on entry.
/// Both rely on `invalidate` actually resetting the flag, which is what these
/// assert.
void main() {
  group('loginProvider authenticated flag', () {
    test('survives across reads — it is keep-alive, not autoDispose', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      container.read(loginProvider.notifier).state =
          const LoginState(isAuthenticated: true);

      // No listeners, and the provider is still holding the flag. This is the
      // property that made the bug possible; asserting it means a later switch
      // to autoDispose does not silently make the reset calls dead code.
      expect(container.read(loginProvider).isAuthenticated, isTrue);
    });

    test('invalidate clears it, so the next sign-in is a real transition', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      container.read(loginProvider.notifier).state =
          const LoginState(isAuthenticated: true);
      expect(container.read(loginProvider).isAuthenticated, isTrue);

      container.invalidate(loginProvider);

      expect(container.read(loginProvider).isAuthenticated, isFalse);
    });

    test('a stale flag makes an edge-gated listener miss the second sign-in',
        () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      // Sign-in #1.
      container.read(loginProvider.notifier).state =
          const LoginState(isAuthenticated: true);

      final edgeGatedNavigations = <String>[];
      final flagNavigations = <String>[];
      container.listen<LoginState>(loginProvider, (prev, next) {
        if (next.isAuthenticated && prev?.isAuthenticated != true) {
          edgeGatedNavigations.add('/home');
        }
        if (next.isAuthenticated) {
          flagNavigations.add('/home');
        }
      });

      // Forced password change lands the user back on login WITHOUT resetting
      // the provider, then sign-in #2 succeeds.
      container.read(loginProvider.notifier).state =
          const LoginState(isAuthenticated: true, tenantCode: 'GATE100');

      // The old edge check sees true => true and never navigates: the bug.
      expect(edgeGatedNavigations, isEmpty);
      // The shipped check navigates on the flag itself.
      expect(flagNavigations, hasLength(1));
    });
  });
}
