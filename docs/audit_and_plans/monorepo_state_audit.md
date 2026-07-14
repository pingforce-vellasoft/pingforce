# Monorepo State & Git History Audit

We encountered a significant structural issue because two parallel Flutter codebases were inadvertently merged into one directory. This document outlines exactly where we are, what the Git history looks like, and how we will fix the file structure before proceeding with Priority #8.

## 1. Git History Mapping

Your backend/web monorepo (`pingforce_monorepo`) Git history is **perfectly intact**. No backend commits were lost.

Here is the current state of the `main` branch:

```text
6351a4f (HEAD -> main) feat: migrate and complete missing screens from audit priority 7c
cb5e95f (origin/main) feat: Add global email uniqueness check on tenant registration
2c8c657 feat: Add toaster for workspace completion and skip attendance for admin
8e0e876 feat: handle existing account error on signup
...
```

- **`cb5e95f`**: This was your last backend commit before the migration. It is safely synced with GitHub (`origin/main`).
- **`6351a4f`**: This is my latest commit that forcefully injected the Flutter mobile screens we just built into `apps/mobile`.

## 2. The File State Conflict (The Problem)

Because I blindly copied all my work from the temporary `PingForce` folder into your `pingforce_monorepo/apps/mobile/lib` folder, we now have a **hybrid, conflicting codebase**.

The original mobile app scaffold used **BLoC**, while the new UI/UX audit code we have been writing uses **Riverpod**. We now have duplicates of both architectures living side-by-side.

For example, looking at the `auth` feature:

```text
/auth
├── /presentation/
│   ├── login_screen.dart (New Riverpod UI)
│   ├── auth_notifier.dart (New Riverpod Logic)
│   ├── auth_state.dart (New State)
│   ├── /pages/
│   │   ├── login_screen.dart (OLD duplicate screen)
│   │   ├── signup_screen.dart (OLD screen)
│   └── /bloc/
│       ├── auth_bloc.dart (OLD BLoC logic)
│       ├── auth_state.dart (OLD duplicate state)
```

This exact duplication exists across `auth`, `attendance`, `onboarding`, and `dashboard`. If we try to run the app right now, it will fail to compile due to conflicting class names and duplicate imports.

## 3. How We Proceed Further (The Cleanup Plan)

> [!WARNING]
> We must clean up the architecture before writing any new code for Priority #8.

We have already established that the new **Riverpod (Feature-First) Architecture** is what we are using for the UI/UX Audit. We need to purge the old BLoC scaffolding.

### Step 1: Purge Old Architectural Scaffolding

I will delete the following legacy folders that conflict with our new approach:

- `/features/*/presentation/bloc/` (Remove all BLoC files)
- `/features/*/presentation/pages/` (Consolidate into the root presentation folders)
- Remove duplicate screens like the old `login_screen.dart` in favor of the new one.

### Step 2: Fix Imports and Main Runner

- Update `main.dart` and `injection_container.dart` to drop any references to `flutter_bloc`.
- Ensure the `AppShell` and `app_router.dart` are the single source of truth for navigation.

### Step 3: Verify Compilation

- Run `flutter analyze` inside `apps/mobile` to ensure there are no duplicate classes, missing imports, or conflicting state models.
- Once clean, make a commit: `chore: consolidate mobile architecture to Riverpod and clean up legacy BLoC files`.

### Step 4: Resume UI/UX Audit

- Once the foundation is clean, we will immediately resume **Priority #8: Fault Management** within the correct `pingforce_monorepo/apps/mobile` directory.

---

**Do you approve this cleanup plan to safely resolve the folder merge conflicts?**
