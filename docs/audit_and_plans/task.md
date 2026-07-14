# Architecture Cleanup Tasks

- `[/]` Purge Legacy BLoC Files
  - `[ ]` Remove `auth/presentation/bloc/` and legacy `pages/`
  - `[ ]` Remove `attendance/presentation/bloc/` and legacy `pages/`
  - `[ ]` Clean out any other legacy BLoC implementations
- `[ ]` Update Core Infrastructure
  - `[ ]` Remove `get_it` (Service Locator) from `injection_container.dart` if fully replaced by Riverpod
  - `[ ]` Update `main.dart` to replace `MultiBlocProvider` with `ProviderScope`
- `[ ]` Compilation & Verification
  - `[ ]` Fix any dangling imports in `app_router.dart` and feature modules
  - `[ ]` Run `flutter analyze` to verify clean compilation
- `[ ]` Commit Changes
  - `[ ]` `chore: consolidate mobile architecture to Riverpod and clean up legacy BLoC files`
