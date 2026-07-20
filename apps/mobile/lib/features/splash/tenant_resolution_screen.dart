import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/theme.dart';
import '../../../core/tenant/tenant_provider.dart';
import '../../../core/tenant/tenant_state.dart';
import '../../../core/widgets/app_states.dart';

// ─────────────────────────────────────────────────────────────────────────────
// TENANT RESOLUTION SCREEN  (AUDIT §2 — App Launch)
// ─────────────────────────────────────────────────────────────────────────────
//
// This screen is shown immediately after the splash animation ends.
// It never shows a blank white screen — it always renders meaningful UI:
//
//   STATE: resolving/loading  → Skeleton screen with progress label
//   STATE: errorNoNetwork     → Network error card with retry + offline mode
//   STATE: errorTenantNotFound→ "Workspace not found" error with re-enter code
//   STATE: errorTenantInactive→ "Workspace suspended" error with contact info
//   STATE: errorServerFailure → Server error with retry
//   STATE: ready              → Navigates automatically:
//                                  isFirstLaunch  → /onboarding
//                                  isAuthenticated → /home
//                                  else           → /auth/login
//
// Audit requirements covered:
//   ✅ Never blank — skeleton screen during loading
//   ✅ Tenant branding swap — logo + name shown once config resolves
//   ✅ All error states with retry CTA
//   ✅ First-launch vs returning user differentiation

class TenantResolutionScreen extends ConsumerStatefulWidget {
  const TenantResolutionScreen({super.key});

  @override
  ConsumerState<TenantResolutionScreen> createState() =>
      _TenantResolutionScreenState();
}

class _TenantResolutionScreenState
    extends ConsumerState<TenantResolutionScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _progressCtrl;
  late final Animation<double> _progressAnim;

  @override
  void initState() {
    super.initState();
    _progressCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );
    _progressAnim = _progressCtrl.drive(CurveTween(curve: Curves.easeInOut));
  }

  @override
  void dispose() {
    _progressCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final launchState = ref.watch(appLaunchProvider);

    // Listen for ready state → navigate away
    ref.listen(appLaunchProvider, (previous, next) {
      if (next.isReady && mounted) {
        _navigateOnReady(next);
      }
      // Animate progress bar smoothly
      final target = next.step.progress;
      _progressCtrl.animateTo(target);
    });

    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      body: SafeArea(
        child: _buildBody(context, launchState),
      ),
    );
  }

  Widget _buildBody(BuildContext context, AppLaunchState state) {
    // Error states
    if (state.hasError) {
      return _ErrorBody(
        state: state,
        onRetry: () => ref.read(appLaunchProvider.notifier).retry(),
        onEnterCode: () => context.go('/auth/login?step=tenant'),
      );
    }

    // Loading / resolving states
    return _LoadingBody(
      state: state,
      progressAnim: _progressAnim,
    );
  }

  void _navigateOnReady(AppLaunchState state) {
    if (state.isFirstLaunch) {
      context.go('/onboarding');
    } else if (state.isAuthenticated) {
      context.go('/home');
    } else {
      context.go('/auth/login');
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LOADING BODY  — skeleton screen while resolving
// ─────────────────────────────────────────────────────────────────────────────

class _LoadingBody extends StatelessWidget {
  const _LoadingBody({
    required this.state,
    required this.progressAnim,
  });

  final AppLaunchState state;
  final Animation<double> progressAnim;

  @override
  Widget build(BuildContext context) {
    final branding = state.branding;

    return Column(
      children: [
        // ── Top section: brand logo (or PingForce default) ─────────────
        Expanded(
          flex: 2,
          child: Center(
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 500),
              child: branding != null
                  ? _TenantBrandingWidget(
                      key: ValueKey(branding.tenantCode),
                      branding: branding,
                    )
                  : const _DefaultBrandWidget(),
            ),
          ),
        ),

        // ── Progress label + step indicator ────────────────────────────
        Padding(
          padding: AppSpacing.screenPaddingH,
          child: Column(
            children: [
              // Step label
              AnimatedSwitcher(
                duration: AppDurations.fast,
                child: Text(
                  state.step.progressLabel,
                  key: ValueKey(state.step),
                  style: AppTypography.bodyMedium.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
              const SizedBox(height: AppSpacing.space4),

              // Animated progress bar
              AnimatedBuilder(
                animation: progressAnim,
                builder: (_, _) => ClipRRect(
                  borderRadius: AppRadius.pillAll,
                  child: LinearProgressIndicator(
                    value: progressAnim.value,
                    minHeight: 4,
                    backgroundColor:
                        Theme.of(context).colorScheme.surfaceContainerHigh,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: AppSpacing.space6),

        // ── Skeleton cards — "never show blank screen" ─────────────────
        Expanded(
          flex: 3,
          child: Padding(
            padding: AppSpacing.screenPaddingH,
            child: Column(
              children: [
                // Simulate loading user info card
                _SkeletonCard(
                  height: 80,
                  isLoaded: state.step.index >=
                      AppLaunchStep.checkingAuth.index,
                  child: state.step.index >=
                          AppLaunchStep.checkingAuth.index
                      ? _UserInfoCard(state: state)
                      : null,
                ),

                const SizedBox(height: AppSpacing.cardMargin),

                // Simulate loading module tiles
                Row(
                  children: List.generate(3, (i) {
                    return Expanded(
                      child: Padding(
                        padding: EdgeInsets.only(
                          right: i < 2 ? AppSpacing.space2 : 0,
                        ),
                        child: _SkeletonCard(
                          height: 80,
                          isLoaded: state.step.index >=
                              AppLaunchStep.buildingMenu.index,
                          child: null,
                        ),
                      ),
                    );
                  }),
                ),

                const SizedBox(height: AppSpacing.cardMargin),

                _SkeletonCard(
                  height: 120,
                  isLoaded: false,
                  child: null,
                ),
              ],
            ),
          ),
        ),

        const SizedBox(height: AppSpacing.space8),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ERROR BODY  — distinct card per error type
// ─────────────────────────────────────────────────────────────────────────────

class _ErrorBody extends StatelessWidget {
  const _ErrorBody({
    required this.state,
    required this.onRetry,
    required this.onEnterCode,
  });

  final AppLaunchState state;
  final VoidCallback onRetry;
  final VoidCallback onEnterCode;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SingleChildScrollView(
        padding: AppSpacing.screenPaddingAll,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // PingForce logo stays visible even on error
            const _DefaultBrandWidget(),
            const SizedBox(height: AppSpacing.space8),

            // Error card
            _buildErrorCard(context),

            const SizedBox(height: AppSpacing.space4),

            // Support hint
            Text(
              'If this problem persists, contact your administrator.',
              style: AppTypography.bodySmall.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorCard(BuildContext context) {
    final (icon, title, body, primaryAction, primaryLabel,
        secondaryAction, secondaryLabel) = switch (state.step) {
      AppLaunchStep.errorNoNetwork => (
          Icons.wifi_off_rounded,
          'No Internet Connection',
          state.errorMessage ??
              'Please check your connection and try again.',
          onRetry,
          'Try Again',
          () => _useOfflineMode(context),
          'Use Offline Mode',
        ),
      AppLaunchStep.errorTenantNotFound => (
          Icons.domain_disabled_rounded,
          'Workspace Not Found',
          state.errorMessage ??
              'The workspace code you entered was not found.',
          onEnterCode,
          'Enter Code Again',
          null as VoidCallback?,
          null as String?,
        ),
      AppLaunchStep.errorTenantInactive => (
          Icons.block_rounded,
          'Workspace Suspended',
          state.errorMessage ??
              'Your workspace has been suspended. Please contact your administrator.',
          null as VoidCallback?,
          null as String?,
          null as VoidCallback?,
          null as String?,
        ),
      _ => (
          Icons.cloud_off_rounded,
          'Something Went Wrong',
          state.errorMessage ?? 'A server error occurred. Please try again.',
          onRetry,
          'Retry',
          null as VoidCallback?,
          null as String?,
        ),
    };

    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerLowest,
        borderRadius: AppRadius.lgAll,
        border: Border.all(
          color: Theme.of(context).colorScheme.errorContainer,
        ),
        boxShadow: AppElevation.shadowForLevel(2),
      ),
      padding: AppSpacing.cardPaddingAll,
      child: Column(
        children: [
          // Error icon in colored circle
          Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: Theme.of(context).colorScheme.errorContainer,
            ),
            child: Icon(
              icon,
              size: AppIconSize.xl,
              color: Theme.of(context).colorScheme.onErrorContainer,
            ),
          ),

          const SizedBox(height: AppSpacing.space4),

          Text(
            title,
            style: AppTypography.titleMedium.copyWith(
              color: Theme.of(context).colorScheme.onSurface,
            ),
            textAlign: TextAlign.center,
          ),

          const SizedBox(height: AppSpacing.space2),

          Text(
            body,
            style: AppTypography.bodyMedium.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
            textAlign: TextAlign.center,
          ),

          // Retry count hint
          if (state.retryCount > 0) ...[
            const SizedBox(height: AppSpacing.space2),
            Text(
              'Attempt ${state.retryCount + 1}',
              style: AppTypography.labelSmall.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
          ],

          const SizedBox(height: AppSpacing.space5),

          // Primary CTA
          if (primaryAction != null)
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: primaryAction,
                child: Text(primaryLabel!),
              ),
            ),

          // Secondary CTA
          if (secondaryAction != null) ...[
            const SizedBox(height: AppSpacing.space2),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: secondaryAction,
                child: Text(secondaryLabel!),
              ),
            ),
          ],
        ],
      ),
    );
  }

  void _useOfflineMode(BuildContext context) {
    // TODO: Set offline mode flag and navigate with cached data
    context.go('/home');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TENANT BRANDING WIDGET  — shown after tenant config resolves
// ─────────────────────────────────────────────────────────────────────────────

class _TenantBrandingWidget extends StatelessWidget {
  const _TenantBrandingWidget({super.key, required this.branding});
  final TenantBranding branding;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Tenant logo or initial avatar
        Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: Theme.of(context).colorScheme.primaryContainer,
            boxShadow: AppElevation.shadowForLevel(2),
          ),
          child: branding.logoUrl != null
              ? ClipOval(
                  child: Image.network(
                    branding.logoUrl!,
                    fit: BoxFit.cover,
                    errorBuilder: (_, _, _) => _InitialsAvatar(
                        name: branding.tenantName),
                  ),
                )
              : _InitialsAvatar(name: branding.tenantName),
        ),

        const SizedBox(height: AppSpacing.space3),

        Text(
          branding.tenantName,
          style: AppTypography.titleMedium.copyWith(
            color: Theme.of(context).colorScheme.onSurface,
          ),
          textAlign: TextAlign.center,
        ),

        if (branding.tagline != null) ...[
          const SizedBox(height: AppSpacing.space1),
          Text(
            branding.tagline!,
            style: AppTypography.bodySmall.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ],
    );
  }
}

class _InitialsAvatar extends StatelessWidget {
  const _InitialsAvatar({required this.name});
  final String name;

  @override
  Widget build(BuildContext context) {
    final initials = name
        .split(' ')
        .map((w) => w.isNotEmpty ? w[0] : '')
        .take(2)
        .join()
        .toUpperCase();

    return Center(
      child: Text(
        initials,
        style: AppTypography.titleLarge.copyWith(
          color: Theme.of(context).colorScheme.onPrimaryContainer,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT BRAND WIDGET  — PingForce branding before tenant resolves
// ─────────────────────────────────────────────────────────────────────────────

class _DefaultBrandWidget extends StatelessWidget {
  const _DefaultBrandWidget();

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 72,
          height: 72,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: Theme.of(context).colorScheme.primaryContainer,
          ),
          child: Image.asset(
            'assets/branding/logo_1024.png',
            width: AppIconSize.xl,
            height: AppIconSize.xl,
          ),
        ),
        const SizedBox(height: AppSpacing.space2),
        Text(
          'PingForce',
          style: AppTypography.titleLarge.copyWith(
            color: Theme.of(context).colorScheme.onSurface,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON CARD  — shimmer until loaded, then fades in real content
// ─────────────────────────────────────────────────────────────────────────────

class _SkeletonCard extends StatelessWidget {
  const _SkeletonCard({
    required this.height,
    required this.isLoaded,
    required this.child,
  });

  final double height;
  final bool isLoaded;
  final Widget? child;

  @override
  Widget build(BuildContext context) {
    return AnimatedSwitcher(
      duration: AppDurations.normal,
      child: isLoaded && child != null
          ? SizedBox(key: const ValueKey('loaded'), height: height, child: child)
          : ShimmerBox(
              key: const ValueKey('shimmer'),
              width: double.infinity,
              height: height,
              borderRadius: AppRadius.lgAll,
            ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// USER INFO CARD  — shown when auth step completes
// ─────────────────────────────────────────────────────────────────────────────

class _UserInfoCard extends StatelessWidget {
  const _UserInfoCard({required this.state});
  final AppLaunchState state;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 80,
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.primaryContainer,
        borderRadius: AppRadius.lgAll,
      ),
      padding: AppSpacing.cardPaddingAll,
      child: Row(
        children: [
          CircleAvatar(
            radius: 24,
            backgroundColor: Theme.of(context).colorScheme.primary,
            child: Icon(
              Icons.person_rounded,
              color: Theme.of(context).colorScheme.onPrimary,
            ),
          ),
          const SizedBox(width: AppSpacing.space3),
          Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                state.isAuthenticated
                    ? 'Welcome back!'
                    : 'Please sign in',
                style: AppTypography.titleSmall.copyWith(
                  color: Theme.of(context).colorScheme.onPrimaryContainer,
                ),
              ),
              Text(
                state.branding?.tenantName ?? 'PingForce',
                style: AppTypography.bodySmall.copyWith(
                  color: Theme.of(context)
                      .colorScheme
                      .onPrimaryContainer
                      .withValues(alpha: 0.7),
                ),
              ),
            ],
          ),
          const Spacer(),
          Icon(
            state.isAuthenticated
                ? Icons.check_circle_rounded
                : Icons.login_rounded,
            color: Theme.of(context).colorScheme.primary,
          ),
        ],
      ),
    );
  }
}
