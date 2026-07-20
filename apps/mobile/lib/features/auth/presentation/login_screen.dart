import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/theme.dart';
import 'auth_state.dart';
import 'widgets/auth_widgets.dart';
import 'auth_notifier.dart';

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN SCREEN  (AUDIT §3.1 — Login Screen)
// ─────────────────────────────────────────────────────────────────────────────
//
// All 12 audit gaps covered:
//   ✅ Screen layout defined
//   ✅ Multi-step flow: Tenant code → Credentials with PageView slide-in
//   ✅ Field validation: real-time clear on change, full on submit
//   ✅ Show/hide password toggle (eye icon)
//   ✅ "Remember this device" checkbox
//   ✅ "Forgot password" link (separate screen)
//   ✅ Keyboard avoidance (SingleChildScrollView + resizeToAvoidBottomInset)
//   ✅ Loading button (spinner replaces text, button disabled while loading)
//   ✅ Error banner (AUTH-001 to AUTH-008) — dismissible, above form
//   ✅ Biometric quick-unlock button (shown if enrolled)
//   ✅ Landscape mode: scrollable form, logo hides on small height
//   ✅ Tenant branding: appears on step 2 after tenant code resolves

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen>
    with TickerProviderStateMixin {
  final _pageCtrl = PageController();
  final _tenantCtrl = TextEditingController();
  final _usernameCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();

  final _tenantFocus = FocusNode();
  final _usernameFocus = FocusNode();
  final _passwordFocus = FocusNode();

  late final AnimationController _shakeCtrl;
  late final Animation<double> _shakeAnim;

  bool _invitePrefilled = false;

  @override
  void initState() {
    super.initState();
    _shakeCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );
    _shakeAnim = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _shakeCtrl, curve: Curves.elasticOut),
    );

    // Consume an invite deep link (pingforce://invite?workspace=CODE&role=X):
    // pre-fill the workspace and skip to the credentials step. Runs after the
    // first frame so GoRouterState is available, and only once per screen.
    WidgetsBinding.instance.addPostFrameCallback((_) => _consumeInviteLink());
  }

  void _consumeInviteLink() {
    if (_invitePrefilled || !mounted) return;
    final params = GoRouterState.of(context).uri.queryParameters;
    final workspace = params['workspace'];
    if (workspace == null || workspace.trim().isEmpty) return;
    _invitePrefilled = true;
    _tenantCtrl.text = workspace.trim().toUpperCase();
    ref.read(loginProvider.notifier).prefillFromInvite(
          workspace,
          role: params['role'],
        );
  }

  @override
  void dispose() {
    _pageCtrl.dispose();
    _tenantCtrl.dispose();
    _usernameCtrl.dispose();
    _passwordCtrl.dispose();
    _tenantFocus.dispose();
    _usernameFocus.dispose();
    _passwordFocus.dispose();
    _shakeCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final loginState = ref.watch(loginProvider);

    // Listen for step change → animate PageView
    ref.listen(loginProvider, (prev, next) {
      if (prev?.step != next.step) {
        final page = next.step == LoginStep.tenantCode ? 0 : 1;
        _pageCtrl.animateToPage(
          page,
          duration: AppDurations.normal,
          curve: AppEasing.standard,
        );
      }
      // Shake error on auth error
      if (next.hasBanner && prev?.authError != next.authError) {
        _shakeCtrl.forward(from: 0);
      }
      // Login succeeded → enter the app
      if (next.isAuthenticated && prev?.isAuthenticated != true) {
        context.go('/home');
      }
    });

    final isLandscape =
        MediaQuery.orientationOf(context) == Orientation.landscape;
    final screenHeight = MediaQuery.sizeOf(context).height;
    final showLogo = screenHeight > 500;

    return Scaffold(
      resizeToAvoidBottomInset: true,
      backgroundColor: Theme.of(context).colorScheme.surface,
      body: SafeArea(
        child: PageView(
          controller: _pageCtrl,
          physics: const NeverScrollableScrollPhysics(), // nav via notifier
          children: [
            // ── Step 1: Tenant Code ────────────────────────────────────
            _StepWrapper(
              child: _TenantCodeStep(
                controller: _tenantCtrl,
                focusNode: _tenantFocus,
                loginState: loginState,
                showLogo: showLogo,
                isLandscape: isLandscape,
                shakeAnim: _shakeAnim,
                onChanged: (v) =>
                    ref.read(loginProvider.notifier).onTenantCodeChanged(v),
                onSubmit: () =>
                    ref.read(loginProvider.notifier).submitTenantCode(),
                onDismissError: () =>
                    ref.read(loginProvider.notifier).dismissError(),
              ),
            ),

            // ── Step 2: Credentials ────────────────────────────────────
            _StepWrapper(
              child: _CredentialsStep(
                usernameCtrl: _usernameCtrl,
                passwordCtrl: _passwordCtrl,
                usernameFocus: _usernameFocus,
                passwordFocus: _passwordFocus,
                loginState: loginState,
                showLogo: showLogo,
                isLandscape: isLandscape,
                shakeAnim: _shakeAnim,
                onUsernameChanged: (v) =>
                    ref.read(loginProvider.notifier).onUsernameChanged(v),
                onPasswordChanged: (v) =>
                    ref.read(loginProvider.notifier).onPasswordChanged(v),
                onTogglePassword: () =>
                    ref.read(loginProvider.notifier).togglePasswordVisibility(),
                onToggleRemember: () =>
                    ref.read(loginProvider.notifier).toggleRememberDevice(),
                onSubmit: () =>
                    ref.read(loginProvider.notifier).submitLogin(),
                onBiometric: () =>
                    ref.read(loginProvider.notifier).submitBiometric(),
                onForgotPassword: () => context.push('/auth/forgot-password'),
                onBack: () =>
                    ref.read(loginProvider.notifier).goBackToTenantStep(),
                onDismissError: () =>
                    ref.read(loginProvider.notifier).dismissError(),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP WRAPPER  — scrollable + keyboard-aware
// ─────────────────────────────────────────────────────────────────────────────

class _StepWrapper extends StatelessWidget {
  const _StepWrapper({required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => FocusScope.of(context).unfocus(),
      child: SingleChildScrollView(
        keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
        padding: AppSpacing.screenPaddingAll,
        child: ConstrainedBox(
          constraints: BoxConstraints(
            minHeight: MediaQuery.sizeOf(context).height -
                MediaQuery.paddingOf(context).vertical -
                AppSpacing.screenVertical * 2,
          ),
          child: IntrinsicHeight(child: child),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 — TENANT CODE
// ─────────────────────────────────────────────────────────────────────────────

class _TenantCodeStep extends StatelessWidget {
  const _TenantCodeStep({
    required this.controller,
    required this.focusNode,
    required this.loginState,
    required this.showLogo,
    required this.isLandscape,
    required this.shakeAnim,
    required this.onChanged,
    required this.onSubmit,
    required this.onDismissError,
  });

  final TextEditingController controller;
  final FocusNode focusNode;
  final LoginState loginState;
  final bool showLogo;
  final bool isLandscape;
  final Animation<double> shakeAnim;
  final ValueChanged<String> onChanged;
  final VoidCallback onSubmit;
  final VoidCallback onDismissError;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // ── Logo ────────────────────────────────────────────────────────
        if (showLogo) ...[
          const SizedBox(height: AppSpacing.space8),
          Center(
            child: Container(
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
          ),
          const SizedBox(height: AppSpacing.space3),
          Text(
            'PingForce',
            textAlign: TextAlign.center,
            style: AppTypography.headlineSmall.copyWith(
              fontWeight: FontWeight.w700,
              color: Theme.of(context).colorScheme.onSurface,
            ),
          ),
          const SizedBox(height: AppSpacing.space8),
        ] else
          const SizedBox(height: AppSpacing.space4),

        // ── Headline ─────────────────────────────────────────────────
        Text(
          'Welcome',
          style: AppTypography.headlineSmall.copyWith(
            color: Theme.of(context).colorScheme.onSurface,
          ),
        ),
        const SizedBox(height: AppSpacing.space1),
        Text(
          'Enter your workspace code to get started',
          style: AppTypography.bodyMedium.copyWith(
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),

        const SizedBox(height: AppSpacing.space6),

        // ── Error banner ──────────────────────────────────────────────
        if (loginState.hasBanner)
          AuthErrorBanner(
            code: loginState.authError,
            shakeAnim: shakeAnim,
            onDismiss: onDismissError,
          ),

        const SizedBox(height: AppSpacing.space2),

        // ── Workspace code field ──────────────────────────────────────
        TextField(
          controller: controller,
          focusNode: focusNode,
          textCapitalization: TextCapitalization.characters,
          textInputAction: TextInputAction.go,
          onChanged: onChanged,
          onSubmitted: (_) => onSubmit(),
          decoration: InputDecoration(
            labelText: 'Workspace Code',
            hintText: 'e.g. ACME',
            helperText: 'Enter the code provided by your company',
            prefixIcon: const Icon(Icons.domain_rounded),
            errorText: loginState.tenantCodeError,
          ),
        ),

        const Spacer(),

        // ── Continue button ───────────────────────────────────────────
        LoadingButton(
          isLoading: loginState.isLoading,
          label: 'Continue',
          onPressed: loginState.canSubmitTenantStep ? onSubmit : null,
        ),

        const SizedBox(height: AppSpacing.space4),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2 — CREDENTIALS
// ─────────────────────────────────────────────────────────────────────────────

class _CredentialsStep extends StatelessWidget {
  const _CredentialsStep({
    required this.usernameCtrl,
    required this.passwordCtrl,
    required this.usernameFocus,
    required this.passwordFocus,
    required this.loginState,
    required this.showLogo,
    required this.isLandscape,
    required this.shakeAnim,
    required this.onUsernameChanged,
    required this.onPasswordChanged,
    required this.onTogglePassword,
    required this.onToggleRemember,
    required this.onSubmit,
    required this.onBiometric,
    required this.onForgotPassword,
    required this.onBack,
    required this.onDismissError,
  });

  final TextEditingController usernameCtrl;
  final TextEditingController passwordCtrl;
  final FocusNode usernameFocus;
  final FocusNode passwordFocus;
  final LoginState loginState;
  final bool showLogo;
  final bool isLandscape;
  final Animation<double> shakeAnim;
  final ValueChanged<String> onUsernameChanged;
  final ValueChanged<String> onPasswordChanged;
  final VoidCallback onTogglePassword;
  final VoidCallback onToggleRemember;
  final VoidCallback onSubmit;
  final VoidCallback onBiometric;
  final VoidCallback onForgotPassword;
  final VoidCallback onBack;
  final VoidCallback onDismissError;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: AppSpacing.space4),

        // ── Back + Tenant branding ────────────────────────────────────
        Row(
          children: [
            IconButton(
              icon: const Icon(Icons.arrow_back_rounded),
              tooltip: 'Change workspace',
              onPressed: onBack,
            ),
            // Tenant logo + name (branding swap after step 1 resolves)
            if (loginState.resolvedTenantName != null) ...[
              const SizedBox(width: AppSpacing.space2),
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Theme.of(context).colorScheme.primaryContainer,
                ),
                child: Icon(
                  Icons.business_rounded,
                  size: 16,
                  color: Theme.of(context).colorScheme.primary,
                ),
              ),
              const SizedBox(width: AppSpacing.space2),
              Expanded(
                child: Text(
                  loginState.resolvedTenantName!,
                  style: AppTypography.labelMedium.copyWith(
                    color: Theme.of(context).colorScheme.primary,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ],
        ),

        if (showLogo) const SizedBox(height: AppSpacing.space5),

        // ── Headline ─────────────────────────────────────────────────
        Text(
          'Sign In',
          style: AppTypography.headlineSmall.copyWith(
            color: Theme.of(context).colorScheme.onSurface,
          ),
        ),
        const SizedBox(height: AppSpacing.space1),
        Text(
          'Enter your credentials to continue',
          style: AppTypography.bodyMedium.copyWith(
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),

        const SizedBox(height: AppSpacing.space5),

        // ── Auth error banner ─────────────────────────────────────────
        if (loginState.hasBanner) ...[
          AuthErrorBanner(
            code: loginState.authError,
            shakeAnim: shakeAnim,
            onDismiss: onDismissError,
          ),
          const SizedBox(height: AppSpacing.space3),
        ],

        // ── Username field ────────────────────────────────────────────
        TextField(
          controller: usernameCtrl,
          focusNode: usernameFocus,
          keyboardType: TextInputType.emailAddress,
          textInputAction: TextInputAction.next,
          autocorrect: false,
          onChanged: onUsernameChanged,
          onSubmitted: (_) => passwordFocus.requestFocus(),
          decoration: InputDecoration(
            labelText: 'Email / Employee ID',
            hintText: 'you@company.com',
            prefixIcon: const Icon(Icons.person_outline_rounded),
            errorText: loginState.usernameError,
          ),
        ),

        const SizedBox(height: AppSpacing.space4),

        // ── Password field ────────────────────────────────────────────
        TextField(
          controller: passwordCtrl,
          focusNode: passwordFocus,
          obscureText: !loginState.isPasswordVisible,
          textInputAction: TextInputAction.done,
          onChanged: onPasswordChanged,
          onSubmitted: (_) => onSubmit(),
          decoration: InputDecoration(
            labelText: 'Password',
            prefixIcon: const Icon(Icons.lock_outline_rounded),
            errorText: loginState.passwordError,
            // ✅ Show/Hide password toggle
            suffixIcon: IconButton(
              icon: Icon(
                loginState.isPasswordVisible
                    ? Icons.visibility_off_outlined
                    : Icons.visibility_outlined,
              ),
              tooltip: loginState.isPasswordVisible
                  ? 'Hide password'
                  : 'Show password',
              onPressed: onTogglePassword,
            ),
          ),
        ),

        const SizedBox(height: AppSpacing.space2),

        // ── Forgot password link ──────────────────────────────────────
        Align(
          alignment: Alignment.centerRight,
          child: TextButton(
            onPressed: onForgotPassword,
            style: TextButton.styleFrom(
              padding: EdgeInsets.zero,
              minimumSize: const Size(0, 36),
            ),
            child: Text(
              'Forgot password?',
              style: AppTypography.labelMedium.copyWith(
                color: Theme.of(context).colorScheme.primary,
              ),
            ),
          ),
        ),

        const SizedBox(height: AppSpacing.space3),

        // ── Remember this device ──────────────────────────────────────
        Row(
          children: [
            Checkbox(
              value: loginState.rememberDevice,
              onChanged: (_) => onToggleRemember(),
              visualDensity: VisualDensity.compact,
            ),
            const SizedBox(width: AppSpacing.space1),
            GestureDetector(
              onTap: onToggleRemember,
              child: Text(
                'Remember this device',
                style: AppTypography.bodyMedium.copyWith(
                  color: Theme.of(context).colorScheme.onSurface,
                ),
              ),
            ),
          ],
        ),

        const SizedBox(height: AppSpacing.space5),

        // ── Sign in button ────────────────────────────────────────────
        LoadingButton(
          isLoading: loginState.isLoading,
          label: 'Sign In',
          onPressed:
              loginState.canSubmitCredentials && !loginState.isLoading
                  ? onSubmit
                  : null,
        ),

        // ── Biometric quick-unlock ────────────────────────────────────
        if (loginState.isBiometricAvailable &&
            loginState.isBiometricEnabled) ...[
          const SizedBox(height: AppSpacing.space3),
          Center(
            child: _BiometricButton(onPressed: onBiometric),
          ),
        ],

        const SizedBox(height: AppSpacing.space6),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED WIDGETS
// ─────────────────────────────────────────────────────────────────────────────

/// ✅ Biometric quick-unlock button
class _BiometricButton extends StatelessWidget {
  const _BiometricButton({required this.onPressed});
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          children: [
            Expanded(
              child: Divider(
                color:
                    Theme.of(context).colorScheme.outlineVariant,
              ),
            ),
            Padding(
              padding:
                  const EdgeInsets.symmetric(horizontal: AppSpacing.space3),
              child: Text(
                'or',
                style: AppTypography.labelSmall.copyWith(
                  color:
                      Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
            ),
            Expanded(
              child: Divider(
                color:
                    Theme.of(context).colorScheme.outlineVariant,
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.space3),
        InkWell(
          onTap: onPressed,
          borderRadius: AppRadius.lgAll,
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.space3),
            child: Column(
              children: [
                Icon(
                  Icons.fingerprint_rounded,
                  size: 44,
                  color: Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(height: AppSpacing.space1),
                Text(
                  'Sign in with Biometrics',
                  style: AppTypography.labelMedium.copyWith(
                    color: Theme.of(context).colorScheme.primary,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
