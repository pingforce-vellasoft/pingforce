import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'tenant_state.dart';
import '../network/connectivity_provider.dart';

// ─────────────────────────────────────────────────────────────────────────────
// TENANT PROVIDER  (AUDIT §2 — Splash & App Launch)
// ─────────────────────────────────────────────────────────────────────────────

final appLaunchProvider =
    NotifierProvider<AppLaunchNotifier, AppLaunchState>(AppLaunchNotifier.new);

class AppLaunchNotifier extends Notifier<AppLaunchState> {
  @override
  AppLaunchState build() => const AppLaunchState();

  // ── Main launch sequence ───────────────────────────────────────────────
  //
  // Called from SplashScreen after the logo animation completes.
  // Steps through every AppLaunchStep in order, updating state so the
  // TenantResolutionScreen can show accurate progress labels and skeleton.

  Future<void> runLaunchSequence() async {
    // ── Step 1: Check first-launch flag ───────────────────────────────
    _step(AppLaunchStep.checkingFirstLaunch);
    await _delay(300);
    final isFirstLaunch = await _readFirstLaunchFlag();

    // ── Step 2: Resolve tenant ─────────────────────────────────────────
    _step(AppLaunchStep.resolvingTenant,
        isFirstLaunch: isFirstLaunch);

    // For returning users, stored tenant code is used.
    // For first-launch, the tenant code will be entered on the login screen
    // after this sequence — we still try to pre-load a cached config.
    final savedTenantCode = await _readSavedTenantCode();

    if (savedTenantCode == null && isFirstLaunch) {
      // No tenant yet — skip to ready (will show login → tenant step)
      _step(AppLaunchStep.ready,
          isFirstLaunch: true,
          isAuthenticated: false);
      return;
    }

    // ── Step 3: Download tenant config ─────────────────────────────────
    _step(AppLaunchStep.downloadingConfig);
    await _delay(200);

    final connectivity = ref.read(connectivityProvider);
    if (!connectivity.isOnline) {
      // Offline — check local cache
      final cached = await _loadCachedConfig(savedTenantCode ?? '');
      if (cached == null) {
        state = state.copyWith(
          step: AppLaunchStep.errorNoNetwork,
          errorMessage:
              'No internet connection and no cached configuration found.',
        );
        return;
      }
      // Use cached config and proceed
      state = state.copyWith(tenantConfig: cached);
    } else {
      final result = await _fetchTenantConfig(savedTenantCode ?? '');
      if (result == null) return; // error already set in _fetchTenantConfig
      state = state.copyWith(tenantConfig: result);
    }

    // ── Step 4: Check auth token ───────────────────────────────────────
    _step(AppLaunchStep.checkingAuth);
    await _delay(200);
    final isAuthenticated = await _checkAuthToken();

    // ── Step 5: Permissions evaluation ────────────────────────────────
    _step(AppLaunchStep.evaluatingPermissions,
        isAuthenticated: isAuthenticated);
    await _delay(150);
    // TODO: Check GPS, Camera, Notification permission status
    // Store results for PermissionsFlow screen to use.

    // ── Step 6: Build menu ─────────────────────────────────────────────
    _step(AppLaunchStep.buildingMenu);
    await _delay(150);
    // TODO: ref.read(menuProvider.notifier).buildFromConfig(tenantConfig)

    // ── Done ───────────────────────────────────────────────────────────
    state = state.copyWith(
      step: AppLaunchStep.ready,
      isAuthenticated: isAuthenticated,
      isFirstLaunch: isFirstLaunch,
    );
  }

  // ── Retry after error ──────────────────────────────────────────────────

  Future<void> retry() async {
    state = state.copyWith(
      step: AppLaunchStep.resolvingTenant,
      errorMessage: null,
      errorCode: null,
      retryCount: state.retryCount + 1,
    );
    await runLaunchSequence();
  }

  // ── Tenant code resolution (called from Login screen step-1) ──────────

  Future<bool> resolveTenantCode(String code) async {
    state = state.copyWith(
      step: AppLaunchStep.resolvingTenant,
      errorMessage: null,
    );

    final connectivity = ref.read(connectivityProvider);
    if (!connectivity.isOnline) {
      state = state.copyWith(
        step: AppLaunchStep.errorNoNetwork,
        errorMessage: 'Cannot verify workspace code without an internet connection.',
      );
      return false;
    }

    final config = await _fetchTenantConfig(code);
    if (config == null) return false;

    await _saveTenantCode(code);
    state = state.copyWith(
      tenantConfig: config,
      step: AppLaunchStep.ready,
    );
    return true;
  }

  // ── Internal helpers ───────────────────────────────────────────────────

  void _step(
    AppLaunchStep step, {
    bool? isFirstLaunch,
    bool? isAuthenticated,
  }) {
    state = state.copyWith(
      step: step,
      isFirstLaunch: isFirstLaunch ?? state.isFirstLaunch,
      isAuthenticated: isAuthenticated ?? state.isAuthenticated,
    );
  }

  Future<void> _delay(int ms) =>
      Future<void>.delayed(Duration(milliseconds: ms));

  // ── Stub implementations — replace with real services ─────────────────

  Future<bool> _readFirstLaunchFlag() async {
    // TODO: SharedPreferences.getInstance().then((p) => !p.containsKey('launched'))
    return false; // stub: returning user
  }

  Future<String?> _readSavedTenantCode() async {
    // TODO: SharedPreferences / SecureStorage lookup
    return 'ACME'; // stub: saved tenant code
  }

  Future<void> _saveTenantCode(String code) async {
    // TODO: SharedPreferences.getInstance().then((p) => p.setString('tenantCode', code))
  }

  Future<TenantConfig?> _fetchTenantConfig(String tenantCode) async {
    try {
      // TODO: Dio/http GET /api/v1/tenants/resolve?code=$tenantCode
      await Future<void>.delayed(const Duration(milliseconds: 800));

      // Stub: simulate resolved config
      return TenantConfig(
        branding: TenantBranding(
          tenantName: 'ACME Corporation',
          tenantCode: tenantCode,
          tagline: 'Powering your field operations',
        ),
        enabledModules: ['attendance', 'faults', 'visits', 'leads', 'reports'],
        featureFlags: {
          'selfie_check_in': true,
          'nfc_check_in': false,
          'lead_kanban': true,
          'voice_notes': true,
        },
      );
    } on Exception catch (e) {
      // Differentiate error types
      final msg = e.toString();
      final (step, errMsg) = _classifyError(msg);
      state = state.copyWith(
        step: step,
        errorMessage: errMsg,
        errorCode: msg,
      );
      return null;
    }
  }

  Future<TenantConfig?> _loadCachedConfig(String tenantCode) async {
    // TODO: Hive / SQLite local cache lookup
    return null;
  }

  Future<bool> _checkAuthToken() async {
    // TODO: SecureStorage + token expiry check
    return true; // stub: valid session
  }

  (AppLaunchStep, String) _classifyError(String raw) {
    if (raw.contains('SocketException') ||
        raw.contains('NetworkException') ||
        raw.contains('TimeoutException')) {
      return (
        AppLaunchStep.errorNoNetwork,
        'Unable to connect. Please check your internet connection.',
      );
    }
    if (raw.contains('404') || raw.contains('not found')) {
      return (
        AppLaunchStep.errorTenantNotFound,
        'This workspace code was not found. Please check and try again.',
      );
    }
    if (raw.contains('403') || raw.contains('suspended')) {
      return (
        AppLaunchStep.errorTenantInactive,
        'This workspace has been suspended. Please contact your administrator.',
      );
    }
    return (
      AppLaunchStep.errorServerFailure,
      'A server error occurred. Please try again in a moment.',
    );
  }
}

// ── Convenience providers ──────────────────────────────────────────────────

final tenantConfigProvider = Provider<TenantConfig?>((ref) {
  return ref.watch(appLaunchProvider).tenantConfig;
});

final tenantBrandingProvider = Provider<TenantBranding?>((ref) {
  return ref.watch(appLaunchProvider).branding;
});

final isFirstLaunchProvider = Provider<bool>((ref) {
  return ref.watch(appLaunchProvider).isFirstLaunch;
});
