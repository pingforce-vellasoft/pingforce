# PingForce Flutter — Audit Progress Tracker

> Mapped against the **official Priority Matrix (§21)** from the audit.  
> Updated after each session.

---

## ✅ Priority #1 — Design Token System (§1) — COMPLETE

| File                                                                                                                                                                                | What it covers                               |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| [DESIGN_TOKENS.md](file:///c:/Users/rahee/.gemini/antigravity/scratch/PingForce/DESIGN_TOKENS.md)                                                                                   | Master spec                                  |
| [app_colors.dart](file:///c:/Users/rahee/.gemini/antigravity/scratch/PingForce/Milestone-4-Development-Architecture/4.2_Flutter_Mobile/code/lib/core/theme/app_colors.dart)         | Palette, status colors, GPS colors           |
| [app_typography.dart](file:///c:/Users/rahee/.gemini/antigravity/scratch/PingForce/Milestone-4-Development-Architecture/4.2_Flutter_Mobile/code/lib/core/theme/app_typography.dart) | Full M3 type scale                           |
| [app_dimensions.dart](file:///c:/Users/rahee/.gemini/antigravity/scratch/PingForce/Milestone-4-Development-Architecture/4.2_Flutter_Mobile/code/lib/core/theme/app_dimensions.dart) | Spacing, radius, elevation, icons, durations |
| [app_theme.dart](file:///c:/Users/rahee/.gemini/antigravity/scratch/PingForce/Milestone-4-Development-Architecture/4.2_Flutter_Mobile/code/lib/core/theme/app_theme.dart)           | Material 3 ThemeData                         |
| [theme.dart](file:///c:/Users/rahee/.gemini/antigravity/scratch/PingForce/Milestone-4-Development-Architecture/4.2_Flutter_Mobile/code/lib/core/theme/theme.dart)                   | Barrel export                                |

**Audit §1 gaps resolved:** Color palette ✅ · Typography ✅ · Spacing grid ✅ · Elevation ✅ · Radius ✅ · Durations ✅ · Dark mode ✅

---

## ✅ Priority #2 — Offline Mode UX (§13) — COMPLETE

All 8 audit gaps now resolved:

| Audit Gap                                    | Severity | Status | File                                                                                                                                                                                                                       |
| -------------------------------------------- | -------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Offline banner (color, placement, animation) | 🔴       | ✅     | [offline_aware_scaffold.dart](file:///c:/Users/rahee/.gemini/antigravity/scratch/PingForce/Milestone-4-Development-Architecture/4.2_Flutter_Mobile/code/lib/core/widgets/offline_aware_scaffold.dart)                      |
| Sync queue progress indicator                | 🔴       | ✅     | [sync_monitor_screen.dart](file:///c:/Users/rahee/.gemini/antigravity/scratch/PingForce/Milestone-4-Development-Architecture/4.2_Flutter_Mobile/code/lib/features/sync/sync_monitor_screen.dart) + `SyncStatusChip`        |
| Conflict resolution dialog UX                | 🟠       | ✅     | `ConflictResolutionDialog` in [app_states.dart](file:///c:/Users/rahee/.gemini/antigravity/scratch/PingForce/Milestone-4-Development-Architecture/4.2_Flutter_Mobile/code/lib/core/widgets/app_states.dart) + Sync Monitor |
| Pending sync badge on records                | 🟠       | ✅     | `PendingSyncBadge` in app_states.dart                                                                                                                                                                                      |
| Network recovery animation                   | 🟡       | ✅     | `NetworkRecoveryOverlay` auto-shown by OfflineAwareScaffold                                                                                                                                                                |
| Manual sync button placement                 | 🟠       | ✅     | "Sync Now" in Sync Monitor AppBar + `SyncStatusChip` tap                                                                                                                                                                   |
| Last synced timestamp                        | 🟡       | ✅     | `LastSyncedLabel` widget + SyncMonitor status card                                                                                                                                                                         |
| Which actions disabled offline               | 🔴       | ✅     | `OfflineGuard` + `OfflineBlockReason` enum (exhaustive list documented)                                                                                                                                                    |

**Files delivering Priority #2:**

| File                                                                                                                                                                                                  | Purpose                                                                                                                                                          |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [connectivity_provider.dart](file:///c:/Users/rahee/.gemini/antigravity/scratch/PingForce/Milestone-4-Development-Architecture/4.2_Flutter_Mobile/code/lib/core/network/connectivity_provider.dart)   | Real-time network detection (polls 15s, stream-ready for connectivity_plus)                                                                                      |
| [sync_state.dart](file:///c:/Users/rahee/.gemini/antigravity/scratch/PingForce/Milestone-4-Development-Architecture/4.2_Flutter_Mobile/code/lib/core/sync/sync_state.dart)                            | Queue model — SyncQueueItem, SyncConflict, per-module breakdown, lastSyncedLabel                                                                                 |
| [sync_provider.dart](file:///c:/Users/rahee/.gemini/antigravity/scratch/PingForce/Milestone-4-Development-Architecture/4.2_Flutter_Mobile/code/lib/core/sync/sync_provider.dart)                      | SyncNotifier — enqueue/dequeue/retry/conflict-resolve/auto-sync on recovery                                                                                      |
| [offline_aware_scaffold.dart](file:///c:/Users/rahee/.gemini/antigravity/scratch/PingForce/Milestone-4-Development-Architecture/4.2_Flutter_Mobile/code/lib/core/widgets/offline_aware_scaffold.dart) | **Global scaffold wrapper** — auto banner + sync bar + recovery overlay + `OfflineGuard` + `SyncStatusChip` + `PermissionDeniedState` + `InlinePermissionBanner` |
| [sync_monitor_screen.dart](file:///c:/Users/rahee/.gemini/antigravity/scratch/PingForce/Milestone-4-Development-Architecture/4.2_Flutter_Mobile/code/lib/features/sync/sync_monitor_screen.dart)      | §20 missing screen — full queue view, conflicts, failed items, module breakdown                                                                                  |
| [offline_ux.dart](file:///c:/Users/rahee/.gemini/antigravity/scratch/PingForce/Milestone-4-Development-Architecture/4.2_Flutter_Mobile/code/lib/core/offline/offline_ux.dart)                         | Barrel export — single import for all offline UX                                                                                                                 |

> **How to use in a feature screen:**
>
> ```dart
> import 'package:pingforce/core/offline/offline_ux.dart';
>
> // Replace Scaffold with:
> return OfflineAwareScaffold(
>   appBar: AppBar(
>     title: Text('My Screen'),
>     actions: [SyncStatusChip(onTap: () => context.push('/sync'))],
>   ),
>   body: Column(children: [
>     // Disable check-in button when offline:
>     OfflineGuard(
>       reason: OfflineBlockReason.checkIn,
>       child: FilledButton(onPressed: _checkIn, child: Text('Check In')),
>     ),
>   ]),
> );
> ```

---

## ✅ Priority #3 — Check-In GPS Flow (§5.1) — COMPLETE

| File                                                                                                                                                                                                                                                       | What it covers                           |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| [CHECKIN_FLOW_SPEC.md](file:///c:/Users/rahee/.gemini/antigravity/scratch/PingForce/Milestone-3-Business-Modules/3.1_AttendanceManagement/CHECKIN_FLOW_SPEC.md)                                                                                            | 17-section spec                          |
| [check_in_state.dart](file:///c:/Users/rahee/.gemini/antigravity/scratch/PingForce/Milestone-4-Development-Architecture/4.2_Flutter_Mobile/code/lib/features/attendance/presentation/check_in/check_in_state.dart)                                         | 14 screen states                         |
| [attendance_screen.dart](file:///c:/Users/rahee/.gemini/antigravity/scratch/PingForce/Milestone-4-Development-Architecture/4.2_Flutter_Mobile/code/lib/features/attendance/presentation/check_in/attendance_screen.dart)                                   | Main check-in screen                     |
| [gps_map_panel.dart](file:///c:/Users/rahee/.gemini/antigravity/scratch/PingForce/Milestone-4-Development-Architecture/4.2_Flutter_Mobile/code/lib/features/attendance/presentation/check_in/widgets/gps_map_panel.dart)                                   | Live map, accuracy ring, geofence circle |
| [check_in_button.dart](file:///c:/Users/rahee/.gemini/antigravity/scratch/PingForce/Milestone-4-Development-Architecture/4.2_Flutter_Mobile/code/lib/features/attendance/presentation/check_in/widgets/check_in_button.dart)                               | 10 button modes with animations          |
| [check_in_success_overlay.dart](file:///c:/Users/rahee/.gemini/antigravity/scratch/PingForce/Milestone-4-Development-Architecture/4.2_Flutter_Mobile/code/lib/features/attendance/presentation/check_in/widgets/check_in_success_overlay.dart)             | Slide-up success animation               |
| [shift_card.dart](file:///c:/Users/rahee/.gemini/antigravity/scratch/PingForce/Milestone-4-Development-Architecture/4.2_Flutter_Mobile/code/lib/features/attendance/presentation/check_in/widgets/shift_card.dart)                                         | Shift info + grace period pulse          |
| [attendance_active_session_card.dart](file:///c:/Users/rahee/.gemini/antigravity/scratch/PingForce/Milestone-4-Development-Architecture/4.2_Flutter_Mobile/code/lib/features/attendance/presentation/check_in/widgets/attendance_active_session_card.dart) | Live timer, break/checkout               |

---

## ✅ Priority #4 — Empty States & Skeleton Loaders (§14, §15) — COMPLETE

All 8 module empty states + 4 full-page skeleton layouts in [app_states.dart](file:///c:/Users/rahee/.gemini/antigravity/scratch/PingForce/Milestone-4-Development-Architecture/4.2_Flutter_Mobile/code/lib/core/widgets/app_states.dart)

Also covers **Priority #6 — Error States (§16):**  
`AppErrorState` (8 types: network/401/403/404/5xx/GPS/Camera/conflict) ✅  
`PermissionDeniedState` (GPS/Camera/Mic/Storage/Notifications) ✅  
`InlinePermissionBanner` (compact inline variant) ✅

---

## ✅ Priority #8 — Fault Management (§7.1 + §7.2) — PARTIAL

| File                                                                                                                                                                                                            | Coverage                                                     |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| [fault_state.dart](file:///c:/Users/rahee/.gemini/antigravity/scratch/PingForce/Milestone-4-Development-Architecture/4.2_Flutter_Mobile/code/lib/features/faults/presentation/fault_state.dart)                 | Full state model with SLA logic                              |
| [fault_list_screen.dart](file:///c:/Users/rahee/.gemini/antigravity/scratch/PingForce/Milestone-4-Development-Architecture/4.2_Flutter_Mobile/code/lib/features/faults/presentation/fault_list_screen.dart)     | §7.1 — tabs, search, filter, sort                            |
| [fault_list_card.dart](file:///c:/Users/rahee/.gemini/antigravity/scratch/PingForce/Milestone-4-Development-Architecture/4.2_Flutter_Mobile/code/lib/features/faults/presentation/widgets/fault_list_card.dart) | SLA traffic-light badge, priority/status chips, filter sheet |
| [fault_detail_screen.dart](file:///c:/Users/rahee/.gemini/antigravity/scratch/PingForce/Milestone-4-Development-Architecture/4.2_Flutter_Mobile/code/lib/features/faults/presentation/fault_detail_screen.dart) | §7.2 — SLA countdown, tabs, attempts, timeline, attachments  |

❌ **Still missing:** §7.3 Create Fault Screen · §7.4 Attempt Management Screen

---

## ✅ Dashboard (§4) — COMPLETE

[dashboard_screen.dart](file:///c:/Users/rahee/.gemini/antigravity/scratch/PingForce/Milestone-4-Development-Architecture/4.2_Flutter_Mobile/code/lib/features/dashboard/presentation/dashboard_screen.dart) · [dashboard_notifier.dart](file:///c:/Users/rahee/.gemini/antigravity/scratch/PingForce/Milestone-4-Development-Architecture/4.2_Flutter_Mobile/code/lib/features/dashboard/presentation/dashboard_notifier.dart) · [attendance_hero_card.dart](file:///c:/Users/rahee/.gemini/antigravity/scratch/PingForce/Milestone-4-Development-Architecture/4.2_Flutter_Mobile/code/lib/features/dashboard/presentation/widgets/attendance_hero_card.dart) · [dashboard_widgets.dart](file:///c:/Users/rahee/.gemini/antigravity/scratch/PingForce/Milestone-4-Development-Architecture/4.2_Flutter_Mobile/code/lib/features/dashboard/presentation/widgets/dashboard_widgets.dart)

---

## ✅ Priority #5 — Navigation & App Shell (§17) — COMPLETE

All 8 audit gaps resolved:

| Audit Gap                             | Severity | Status | Resolution                                                      |
| ------------------------------------- | -------- | ------ | --------------------------------------------------------------- |
| Bottom nav vs drawer — which pattern? | 🔴       | ✅     | `NavigationBar` (M3) + "More" bottom sheet                      |
| Bottom nav item count and labels      | 🔴       | ✅     | Max 4 items per role (Home + Attendance + Role-specific + More) |
| No back navigation consistency spec   | 🟠       | ✅     | `BackNavigationHandler` — double-back-to-exit for roots         |
| No breadcrumb for deep nested flows   | 🟡       | ✅     | GoRouter named routes (appBar back arrow handles hierarchy)     |
| No tab bar designs within modules     | 🟠       | ✅     | Per-screen TabBar from `OfflineAwareScaffold`                   |
| No search bar placement consistency   | 🟡       | ✅     | Defined in each feature's `appBar` slot                         |
| No FAB behavior during scroll         | 🟡       | ✅     | Extended↔compact FAB controlled by scroll offset (>80dp)       |
| Role-driven visibility                | 🔴       | ✅     | `NavDestinations.bottomNavFor(role:)` — 5 role configs          |

**Files delivering Priority #5:**

| File                                                                                                                                                                                         | Purpose                                                                                                                                    |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| [nav_destinations.dart](file:///c:/Users/rahee/.gemini/antigravity/scratch/PingForce/Milestone-4-Development-Architecture/4.2_Flutter_Mobile/code/lib/core/navigation/nav_destinations.dart) | All destination definitions + role→bottom-nav mapping + FAB configs                                                                        |
| [app_shell.dart](file:///c:/Users/rahee/.gemini/antigravity/scratch/PingForce/Milestone-4-Development-Architecture/4.2_Flutter_Mobile/code/lib/core/navigation/app_shell.dart)               | AppShell + animated badge NavigationBar + "More" bottom sheet (3-col grid) + SimpleFab + SpeedDialFab + BackNavigationHandler + RouteGuard |
| [app_router.dart](file:///c:/Users/rahee/.gemini/antigravity/scratch/PingForce/Milestone-4-Development-Architecture/4.2_Flutter_Mobile/code/lib/core/navigation/app_router.dart)             | Full GoRouter tree — 4 shell branches, all modal routes, pre-auth routes, 404 handler                                                      |

> **Role → Bottom Nav:**
> | Role | Tab 1 | Tab 2 | Tab 3 | Tab 4 |
> |------|-------|-------|-------|-------|
> | Field Employee | Home | Attendance | Visits 🔴 | More |
> | Field Technician | Home | Attendance | Faults 🔴 | More |
> | Sales Rep | Home | Attendance | Leads 🔴 | More |
> | Manager | Home | Team | Reports | More |
> | Admin | Home | Reports | Settings | More |
>
> **"More" sheet contains:** Notifications · Reports · Leave · Documents · Announcements · Sync Monitor · Profile · Settings

---

## ✅ Priority #7a — Splash Screen & App Launch (§2) — COMPLETE

All 6 audit gaps resolved:

| Audit Gap                             | Status | Resolution                                                                      |
| ------------------------------------- | ------ | ------------------------------------------------------------------------------- |
| Splash duration (1.5–2.5s?)           | ✅     | 1.8s total — logo 0-800ms, text 400ms, dots 1000-1800ms                         |
| Animation (logo fade-in vs scale?)    | ✅     | Scale `0.6→1.0` with `easeOutBack` + simultaneous fade-in                       |
| Tenant branding: when does logo swap? | ✅     | After config resolves: `AnimatedSwitcher` swaps PingForce → tenant logo         |
| Error state: tenant resolution fails  | ✅     | 4 distinct error cards: no-network / not-found / inactive / server              |
| Network error during startup          | ✅     | Offline → uses cached config if available, else `errorNoNetwork` card           |
| First-launch vs returning user        | ✅     | `AppLaunchNotifier` reads SharedPrefs flag → routes to `/onboarding` or `/home` |

**Files delivering Priority #7a:**

| File                                                                                                                                                                                                         | Purpose                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| [tenant_state.dart](file:///c:/Users/rahee/.gemini/antigravity/scratch/PingForce/Milestone-4-Development-Architecture/4.2_Flutter_Mobile/code/lib/core/tenant/tenant_state.dart)                             | `AppLaunchStep` (12 states with progress, labels, isError), `TenantBranding`, `TenantConfig`, `AppLaunchState`                             |
| [tenant_provider.dart](file:///c:/Users/rahee/.gemini/antigravity/scratch/PingForce/Milestone-4-Development-Architecture/4.2_Flutter_Mobile/code/lib/core/tenant/tenant_provider.dart)                       | `AppLaunchNotifier` — sequential 7-step pipeline, offline fallback, error classification, retry, convenience providers                     |
| [splash_screen.dart](file:///c:/Users/rahee/.gemini/antigravity/scratch/PingForce/Milestone-4-Development-Architecture/4.2_Flutter_Mobile/code/lib/features/splash/splash_screen.dart)                       | Animated splash — logo scale+fade, name slide-up, tagline fade, 3 pulsing dots, mesh background, 1.8s then navigates                       |
| [tenant_resolution_screen.dart](file:///c:/Users/rahee/.gemini/antigravity/scratch/PingForce/Milestone-4-Development-Architecture/4.2_Flutter_Mobile/code/lib/features/splash/tenant_resolution_screen.dart) | Loading skeleton (shimmer cards + animated progress bar + step label), tenant branding swap, 4 error card variants, auto-navigate on ready |

> **Startup flow (fully implemented):**
>
> ```
> /splash (1.8s animation)
>    ↓ triggers AppLaunchNotifier.runLaunchSequence()
> /tenant-resolution
>    ├── loading: shimmer skeleton + progress bar
>    ├── errorNoNetwork  → retry + "Use Offline Mode"
>    ├── errorTenantNotFound → re-enter code
>    ├── errorTenantInactive → contact admin
>    └── ready →  isFirstLaunch  → /onboarding
>                 isAuthenticated → /home
>                 else           → /auth/login
> ```

---

## ✅ Priority #7b — Authentication Screens (§3) — COMPLETE

All 15 audit gaps resolved across §3.1, §3.2, §3.3:

| Audit Gap                              | Status | Resolution                                                                        |
| -------------------------------------- | ------ | --------------------------------------------------------------------------------- |
| No screen layout defined               | ✅     | Full portrait + landscape-aware layout                                            |
| No multi-step flow wireframe           | ✅     | `PageView` with `NeverScrollableScrollPhysics` — `animateToPage()` on step change |
| No field validation feedback           | ✅     | Real-time clear-on-type + full validate-on-submit                                 |
| No show/hide password toggle           | ✅     | `suffixIcon` `IconButton` with `obscureText` toggle                               |
| No "Remember this device"              | ✅     | `Checkbox` row wired to `LoginNotifier.toggleRememberDevice()`                    |
| No forgot password flow                | ✅     | Separate screen, separate GoRoute, 3-step indexed flow                            |
| No keyboard avoidance                  | ✅     | `SingleChildScrollView` + `resizeToAvoidBottomInset: true`                        |
| No loading state on button             | ✅     | `AnimatedSwitcher` text ↔ `CircularProgressIndicator`                            |
| No error banner (AUTH-001 to AUTH-008) | ✅     | `_AuthErrorBanner` with shake animation + dismiss                                 |
| No biometric prompt UI                 | ✅     | Custom branded screen (not just system sheet)                                     |
| No landscape mode handling             | ✅     | `showLogo` hides logo when `screenHeight < 500`                                   |
| No tenant branding timing              | ✅     | Logo/name revealed on step 2 after tenant resolves                                |
| OTP delivery channel selection         | ✅     | Email vs SMS chip selector                                                        |
| OTP countdown + resend                 | ✅     | 60s `Timer.periodic` countdown, `canResend` flag                                  |
| Password strength indicator            | ✅     | 4-segment colour bar (weak/fair/strong/veryStrong)                                |
| Biometric fallback to password         | ✅     | After 3 failures → "Use Password Instead" prominent                               |
| "Use a different account"              | ✅     | Link below divider → `/auth/login?step=tenant`                                    |

**Files delivering Priority #7b:**

| File                                                                                                                                                                                                                | Purpose                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| [auth_state.dart](file:///c:/Users/rahee/.gemini/antigravity/scratch/PingForce/Milestone-4-Development-Architecture/4.2_Flutter_Mobile/code/lib/features/auth/presentation/auth_state.dart)                         | `LoginStep`, `AuthErrorCode` (AUTH-001–008 with titles/messages), `PasswordStrength`, `OtpChannel`, `LoginState`, `ForgotPasswordState` |
| [auth_notifier.dart](file:///c:/Users/rahee/.gemini/antigravity/scratch/PingForce/Milestone-4-Development-Architecture/4.2_Flutter_Mobile/code/lib/features/auth/presentation/auth_notifier.dart)                   | `LoginNotifier` + `ForgotPasswordNotifier` (OTP countdown, strength calc, error classification)                                         |
| [login_screen.dart](file:///c:/Users/rahee/.gemini/antigravity/scratch/PingForce/Milestone-4-Development-Architecture/4.2_Flutter_Mobile/code/lib/features/auth/presentation/login_screen.dart)                     | 2-step `PageView` login — tenant code + credentials, all toggles, biometric button, error banner                                        |
| [forgot_password_screen.dart](file:///c:/Users/rahee/.gemini/antigravity/scratch/PingForce/Milestone-4-Development-Architecture/4.2_Flutter_Mobile/code/lib/features/auth/presentation/forgot_password_screen.dart) | 3-step forgot-password (identifier + channel → 6-box OTP → new password) + success state                                                |
| [biometric_screen.dart](file:///c:/Users/rahee/.gemini/antigravity/scratch/PingForce/Milestone-4-Development-Architecture/4.2_Flutter_Mobile/code/lib/features/auth/presentation/biometric_screen.dart)             | Pulsing fingerprint overlay, shake on failure, progressive password fallback                                                            |

---

## ✅ Priority #7c — Missing Screens (§20) — COMPLETE

All 7 critical missing screens from §20 + Priority Matrix §7 resolved:

| Screen                  | Audit Status | What Was Built                                                                                                                                                      |
| ----------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Onboarding**          | ❌ → ✅      | 4-slide gradient PageView, layered circle hero icons, expanding dot indicator, Skip + Next/Get Started                                                              |
| **Permissions Flow**    | ❌ → ✅      | One-permission-per-step, WHY explanation, benefit chip, granted/denied/permanently-denied states, GPS critical warning dialog, progress bar                         |
| **Session Expired**     | ❌ → ✅      | Lock-clock icon, "data is safe" reassurance chip, Sign In Again + Use Biometrics CTAs                                                                               |
| **Device Registration** | ❌ → ✅      | Device info card, custom name field, biometric toggle, security notice, register with loading                                                                       |
| **Maintenance Mode**    | ❌ → ✅      | Pulsing build icon, estimated ETA chip, check-again button                                                                                                          |
| **App Update Required** | ❌ → ✅      | Version comparison card (current → required), what's-new notes, Update Now store link                                                                               |
| **Leave Application**   | ❌ → ✅      | 3-tab screen (Apply/Balance/History), FilterChip type selector, DateRangePicker, stacked balance progress bars, history cards with status badges + rejection reason |
| **Document Management** | ❌ → ✅      | 4-tab list with search, file type icons, upload sheet with progress, DraggableScrollableSheet preview with download/share                                           |

**Files delivering Priority #7c:**

| File                                                                                                                                                                                                           | Screens                                                                                                |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| [onboarding_screen.dart](file:///c:/Users/rahee/.gemini/antigravity/scratch/PingForce/Milestone-4-Development-Architecture/4.2_Flutter_Mobile/code/lib/features/onboarding/onboarding_screen.dart)             | `OnboardingScreen`                                                                                     |
| [permissions_flow_screen.dart](file:///c:/Users/rahee/.gemini/antigravity/scratch/PingForce/Milestone-4-Development-Architecture/4.2_Flutter_Mobile/code/lib/features/onboarding/permissions_flow_screen.dart) | `PermissionsFlowScreen`                                                                                |
| [system_screens.dart](file:///c:/Users/rahee/.gemini/antigravity/scratch/PingForce/Milestone-4-Development-Architecture/4.2_Flutter_Mobile/code/lib/features/system/system_screens.dart)                       | `SessionExpiredScreen`, `DeviceRegistrationScreen`, `MaintenanceModeScreen`, `AppUpdateRequiredScreen` |
| [leave_screen.dart](file:///c:/Users/rahee/.gemini/antigravity/scratch/PingForce/Milestone-4-Development-Architecture/4.2_Flutter_Mobile/code/lib/features/leave/leave_screen.dart)                            | `LeaveScreen` (Apply + Balance + History tabs)                                                         |
| [document_screen.dart](file:///c:/Users/rahee/.gemini/antigravity/scratch/PingForce/Milestone-4-Development-Architecture/4.2_Flutter_Mobile/code/lib/features/documents/document_screen.dart)                  | `DocumentListScreen` + `_UploadSheet` + `_PreviewSheet`                                                |

> **Complete startup → auth → home flow now wired:**
>
> ```
> /splash → /tenant-resolution
>   → /onboarding (first launch)
>   → /permissions
>   → /auth/login → /home
>
> Error paths:
>   /auth/session-expired → re-login or biometric
>   /device-registration  → enroll new device
>   /maintenance          → retry
>   /update-required      → store link
> ```

---

## 🔜 Remaining Priority Items (in order)

| #          | Audit Priority                   | Next Action                                                        |
| ---------- | -------------------------------- | ------------------------------------------------------------------ |
| **8 cont** | 🟠 Fault §7.3 + §7.4             | Create Fault form + Attempt Management                             |
| **9**      | 🟠 Visit Management (§6)         | Visit list with ETA/distance, active visit map + progress steps    |
| **10**     | 🟠 Lead Kanban (§8)              | Pipeline board, lead detail, follow-up calendar                    |
| **11**     | 🟠 Notification Center (§10)     | Card design, category tabs, deep-link nav                          |
| **12**     | 🟠 Reports (§9)                  | Chart library selection, drill-down, report execution              |
| **13**     | 🟡 Attendance History (§5.2–5.4) | Calendar view, correction flow, break management                   |
| **14**     | 🟡 Profile + Settings (§11–12)   | Session list, theme toggle, notification preferences               |
| **15**     | 🟡 Micro-animations (§18)        | Page transitions, FAB expand, form submit animation                |
| **16**     | 🟡 Accessibility (§19)           | Touch targets, contrast checks, semantic labels                    |
| **8 cont** | 🟠 Fault §7.3 + §7.4             | Create Fault form + Attempt Management                             |
| **9**      | 🟠 Visit Management (§6)         | Visit list with ETA/distance, active visit map + progress steps    |
| **10**     | 🟠 Lead Kanban (§8)              | Pipeline board, lead detail, follow-up calendar                    |
| **11**     | 🟠 Notification Center (§10)     | Card design, category tabs, deep-link nav                          |
| **12**     | 🟠 Reports (§9)                  | Chart library selection, drill-down, report execution              |
| **13**     | 🟡 Attendance History (§5.2–5.4) | Calendar view, correction flow, break management                   |
| **14**     | 🟡 Profile + Settings (§11–12)   | Session list, theme toggle, notification preferences               |
| **15**     | 🟡 Micro-animations (§18)        | Page transitions, FAB expand, form submit animation                |
| **16**     | 🟡 Accessibility (§19)           | Touch targets, contrast checks, semantic labels                    |
| **7c**     | 🔴 Missing Screens (§20)         | Onboarding, Permissions flow, Session Expired, Device Registration |
| **8 cont** | 🟠 Fault §7.3 + §7.4             | Create Fault form + Attempt Management                             |
| **9**      | 🟠 Visit Management (§6)         | Visit list with ETA/distance, active visit map + progress steps    |
| **10**     | 🟠 Lead Kanban (§8)              | Pipeline board, lead detail, follow-up calendar                    |
| **11**     | 🟠 Notification Center (§10)     | Card design, category tabs, deep-link nav                          |
| **12**     | 🟠 Reports (§9)                  | Chart library selection, drill-down, report execution              |
| **13**     | 🟡 Attendance History (§5.2–5.4) | Calendar view, correction flow, break management                   |
| **14**     | 🟡 Profile + Settings (§11–12)   | Session list, theme toggle, notification preferences               |
| **15**     | 🟡 Micro-animations (§18)        | Page transitions, FAB expand, form submit animation                |
| **16**     | 🟡 Accessibility (§19)           | Touch targets, contrast checks, semantic labels                    |

---

## File Count

| Category                       | Count  |
| ------------------------------ | ------ |
| Specs (Markdown)               | 3      |
| Core Theme                     | 6      |
| Core Widgets (states, offline) | 2      |
| Core Network                   | 1      |
| Core Sync                      | 2      |
| Core Offline barrel            | 1      |
| Attendance Feature             | 8      |
| Dashboard Feature              | 6      |
| Fault Feature                  | 4      |
| Sync Feature                   | 1      |
| **Total**                      | **34** |
