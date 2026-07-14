import 'package:freezed_annotation/freezed_annotation.dart';

part 'tenant_state.freezed.dart';

// ─────────────────────────────────────────────────────────────────────────────
// TENANT STATE  (AUDIT §2 — Splash & App Launch)
// ─────────────────────────────────────────────────────────────────────────────
//
// Covers:
//   • Tenant resolution states (idle → resolving → resolved / failed)
//   • Tenant config model (branding, modules, feature flags)
//   • First-launch detection
//   • Network error vs tenant-not-found differentiation

// ── Launch step enum ───────────────────────────────────────────────────────

enum AppLaunchStep {
  idle,               // Nothing started yet
  splashAnimating,    // Splash logo animation playing (1.8s)
  checkingFirstLaunch,// Reading SharedPreferences for first-launch flag
  resolvingTenant,    // Fetching tenant config from backend
  downloadingConfig,  // Pulling tenant-specific feature flags / modules
  checkingAuth,       // Verifying stored token
  evaluatingPermissions, // GPS / Camera / Notification permission checks
  buildingMenu,       // Assembling RBAC-driven navigation
  ready,              // Navigate to home or onboarding
  // Error states
  errorNoNetwork,     // No internet during startup
  errorTenantNotFound,// Tenant code invalid / not found
  errorTenantInactive,// Tenant suspended or plan expired
  errorServerFailure, // 5xx during config download
}

extension AppLaunchStepX on AppLaunchStep {
  bool get isError => switch (this) {
        AppLaunchStep.errorNoNetwork ||
        AppLaunchStep.errorTenantNotFound ||
        AppLaunchStep.errorTenantInactive ||
        AppLaunchStep.errorServerFailure =>
          true,
        _ => false,
      };

  String get progressLabel => switch (this) {
        AppLaunchStep.idle => '',
        AppLaunchStep.splashAnimating => '',
        AppLaunchStep.checkingFirstLaunch => 'Starting up…',
        AppLaunchStep.resolvingTenant => 'Connecting to your workspace…',
        AppLaunchStep.downloadingConfig => 'Loading your configuration…',
        AppLaunchStep.checkingAuth => 'Verifying your session…',
        AppLaunchStep.evaluatingPermissions => 'Checking permissions…',
        AppLaunchStep.buildingMenu => 'Preparing your workspace…',
        AppLaunchStep.ready => 'Ready!',
        AppLaunchStep.errorNoNetwork => 'No internet connection',
        AppLaunchStep.errorTenantNotFound => 'Workspace not found',
        AppLaunchStep.errorTenantInactive => 'Workspace suspended',
        AppLaunchStep.errorServerFailure => 'Server error',
      };

  /// 0.0 → 1.0 progress for the startup progress indicator
  double get progress => switch (this) {
        AppLaunchStep.idle => 0.0,
        AppLaunchStep.splashAnimating => 0.0,
        AppLaunchStep.checkingFirstLaunch => 0.1,
        AppLaunchStep.resolvingTenant => 0.3,
        AppLaunchStep.downloadingConfig => 0.55,
        AppLaunchStep.checkingAuth => 0.7,
        AppLaunchStep.evaluatingPermissions => 0.85,
        AppLaunchStep.buildingMenu => 0.95,
        AppLaunchStep.ready => 1.0,
        _ => 0.0,
      };
}

// ── Tenant branding model ──────────────────────────────────────────────────

@freezed
class TenantBranding with _$TenantBranding {
  const factory TenantBranding({
    required String tenantName,
    required String tenantCode,
    String? logoUrl,            // Remote URL for tenant logo
    String? primaryColorHex,   // Override theme seed color
    String? tagline,           // Custom tagline shown on splash
    @Default(false) bool isWhiteLabel,
  }) = _TenantBranding;
}

// ── Tenant config (modules + feature flags) ────────────────────────────────

@freezed
class TenantConfig with _$TenantConfig {
  const factory TenantConfig({
    required TenantBranding branding,
    @Default([]) List<String> enabledModules,
    @Default({}) Map<String, bool> featureFlags,
    @Default({}) Map<String, dynamic> settings,
    String? supportEmail,
    String? supportPhone,
  }) = _TenantConfig;

  const TenantConfig._();

  bool hasModule(String moduleId) => enabledModules.contains(moduleId);
  bool flag(String key) => featureFlags[key] ?? false;
}

// ── App launch state ───────────────────────────────────────────────────────

@freezed
class AppLaunchState with _$AppLaunchState {
  const factory AppLaunchState({
    @Default(AppLaunchStep.idle) AppLaunchStep step,
    TenantConfig? tenantConfig,
    @Default(false) bool isFirstLaunch,
    @Default(false) bool isAuthenticated,
    String? errorMessage,
    String? errorCode,
    @Default(0) int retryCount,
  }) = _AppLaunchState;

  const AppLaunchState._();

  bool get hasError => step.isError;
  bool get isReady => step == AppLaunchStep.ready;
  bool get isSplashPlaying => step == AppLaunchStep.splashAnimating;

  TenantBranding? get branding => tenantConfig?.branding;
}
