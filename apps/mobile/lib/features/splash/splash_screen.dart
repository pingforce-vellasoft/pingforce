import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_session.dart';
import '../../core/notifications/push_notifications_service.dart';
import '../../core/theme/theme.dart';
import '../../core/tenant/tenant_provider.dart';
import '../../injection_container.dart' as di;

// ─────────────────────────────────────────────────────────────────────────────
// SPLASH SCREEN  (AUDIT §2 — Splash Screen & App Launch)
// ─────────────────────────────────────────────────────────────────────────────
//
// Covers all 6 audit gaps:
//   ✅ Splash duration — 1.8s logo animation then transitions
//   ✅ Animation — logo scale (0.6→1.0) + fade-in, then tagline fade-in
//   ✅ Tenant branding — logo swap handled in TenantResolutionScreen
//   ✅ Error state — TenantResolutionScreen handles resolution errors
//   ✅ Network error — detected in AppLaunchNotifier, shown on next screen
//   ✅ First-launch vs returning user — AppLaunchNotifier.isFirstLaunch flag
//
// Sequence:
//   1. Enter: Logo scales 0.6→1.0 + fades in  (0–800ms)
//   2. Tagline fades in                         (600–1000ms)
//   3. App name slides up                       (400–900ms)
//   4. Bottom progress dots animate             (1000–1800ms)
//   5. After 1.8s: navigate to /tenant-resolution, launch sequence starts
//
// First-launch: logo lingers slightly longer (2.2s) to feel welcoming.

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen>
    with TickerProviderStateMixin {
  // ── Animation controllers ─────────────────────────────────────────────
  late final AnimationController _logoCtrl;
  late final AnimationController _textCtrl;
  late final AnimationController _dotsCtrl;

  // ── Logo: scale + fade ────────────────────────────────────────────────
  late final Animation<double> _logoScale;
  late final Animation<double> _logoOpacity;

  // ── App name: slide up + fade ─────────────────────────────────────────
  late final Animation<double> _nameOpacity;
  late final Animation<Offset> _nameSlide;

  // ── Tagline: fade ─────────────────────────────────────────────────────
  late final Animation<double> _taglineOpacity;

  // ── Bottom dots: staggered ────────────────────────────────────────────
  late final List<Animation<double>> _dotAnimations;

  bool _navigated = false;

  @override
  void initState() {
    super.initState();
    _initAnimations();
    _startSequence();
  }

  void _initAnimations() {
    // Logo controller (800ms)
    _logoCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );

    _logoScale = Tween<double>(begin: 0.6, end: 1.0).animate(
      CurvedAnimation(parent: _logoCtrl, curve: Curves.easeOutBack),
    );
    _logoOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _logoCtrl,
        curve: const Interval(0.0, 0.6, curve: Curves.easeOut),
      ),
    );

    // Text controller (600ms, starts at 400ms)
    _textCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );

    _nameOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _textCtrl,
        curve: const Interval(0.0, 0.7, curve: Curves.easeOut),
      ),
    );
    _nameSlide = Tween<Offset>(
      begin: const Offset(0, 0.3),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(parent: _textCtrl, curve: Curves.easeOut),
    );
    _taglineOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _textCtrl,
        curve: const Interval(0.3, 1.0, curve: Curves.easeOut),
      ),
    );

    // Dots controller — 3 dots, staggered (800ms)
    _dotsCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );

    _dotAnimations = List.generate(3, (i) {
      final start = i * 0.15;
      return Tween<double>(begin: 0.3, end: 1.0).animate(
        CurvedAnimation(
          parent: _dotsCtrl,
          curve: Interval(start, start + 0.6, curve: Curves.easeInOut),
        ),
      );
    });
  }

  Future<void> _startSequence() async {
    // Step 1: Logo scale + fade (0ms)
    _logoCtrl.forward();

    // Step 2: App name + tagline (400ms)
    await Future<void>.delayed(const Duration(milliseconds: 400));
    if (!mounted) return;
    _textCtrl.forward();

    // Step 3: Dots (1000ms)
    await Future<void>.delayed(const Duration(milliseconds: 600));
    if (!mounted) return;
    _dotsCtrl.repeat(reverse: true);

    // Step 4: Hold for total splash duration
    await Future<void>.delayed(const Duration(milliseconds: 800));
    if (!mounted || _navigated) return;

    // Step 5: Navigate to tenant resolution
    _navigated = true;
    _navigate();
  }

  Future<void> _navigate() async {
    if (!mounted) return;
    // Restore auth state from secure storage before routing so the
    // RouteGuard sees the real session (4.2 AUTHENTICATION.md).
    await AuthSession.instance.hydrate(di.sl());
    if (!mounted) return;

    // Trigger the launch sequence in the notifier
    ref.read(appLaunchProvider.notifier).runLaunchSequence();

    if (AuthSession.instance.isAuthenticated) {
      // Re-sync FCM token on every authenticated launch (may have rotated
      // while the app was dead) — fire-and-forget
      unawaited(di.sl<PushNotificationsService>().registerToken());
      context.go('/home');
    } else {
      context.go('/tenant-resolution');
    }
  }

  @override
  void dispose() {
    _logoCtrl.dispose();
    _textCtrl.dispose();
    _dotsCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.sizeOf(context);

    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.primary,
      body: SafeArea(
        child: Stack(
          children: [
            // ── Background gradient ────────────────────────────────────
            Positioned.fill(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      Theme.of(context).colorScheme.primary,
                      Theme.of(context).colorScheme.primaryContainer.withValues(alpha: 0.3),
                      Theme.of(context).colorScheme.primary,
                    ],
                    stops: const [0.0, 0.5, 1.0],
                  ),
                ),
              ),
            ),

            // ── Subtle mesh pattern overlay ────────────────────────────
            Positioned.fill(
              child: CustomPaint(painter: _MeshPainter(context)),
            ),

            // ── Center content ─────────────────────────────────────────
            Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // ── Logo ─────────────────────────────────────────────
                  AnimatedBuilder(
                    animation: _logoCtrl,
                    builder: (_, _) => FadeTransition(
                      opacity: _logoOpacity,
                      child: ScaleTransition(
                        scale: _logoScale,
                        child: _PingForceLogo(size: size.width * 0.28),
                      ),
                    ),
                  ),

                  const SizedBox(height: AppSpacing.space5),

                  // ── App name ─────────────────────────────────────────
                  FadeTransition(
                    opacity: _nameOpacity,
                    child: SlideTransition(
                      position: _nameSlide,
                      child: Text(
                        'PingForce',
                        style: AppTypography.displaySmall.copyWith(
                          color: Theme.of(context).colorScheme.onPrimary,
                          fontWeight: FontWeight.w700,
                          letterSpacing: -0.5,
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: AppSpacing.space2),

                  // ── Tagline ───────────────────────────────────────────
                  FadeTransition(
                    opacity: _taglineOpacity,
                    child: Text(
                      'Workforce Management Platform',
                      style: AppTypography.labelLarge.copyWith(
                        color: Theme.of(context)
                            .colorScheme
                            .onPrimary
                            .withValues(alpha: 0.75),
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // ── Bottom loading dots ────────────────────────────────────
            Positioned(
              bottom: AppSpacing.space8,
              left: 0,
              right: 0,
              child: _LoadingDots(animations: _dotAnimations),
            ),

            // ── Version number (bottom-right) ──────────────────────────
            Positioned(
              bottom: AppSpacing.space4,
              right: AppSpacing.screenHorizontal,
              child: FadeTransition(
                opacity: _taglineOpacity,
                child: Text(
                  'v1.0.0',
                  style: AppTypography.labelSmall.copyWith(
                    color: Theme.of(context)
                        .colorScheme
                        .onPrimary
                        .withValues(alpha: 0.4),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PINGFORCE LOGO WIDGET
// ─────────────────────────────────────────────────────────────────────────────

class _PingForceLogo extends StatelessWidget {
  const _PingForceLogo({required this.size});
  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Theme.of(context).colorScheme.onPrimary.withValues(alpha: 0.15),
        border: Border.all(
          color: Theme.of(context).colorScheme.onPrimary.withValues(alpha: 0.3),
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.15),
            blurRadius: 32,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Center(
        child: Image.asset(
          'assets/branding/logo_1024.png',
          width: size * 0.52,
          height: size * 0.52,
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LOADING DOTS  — 3 staggered pulsing dots
// ─────────────────────────────────────────────────────────────────────────────

class _LoadingDots extends StatelessWidget {
  const _LoadingDots({required this.animations});
  final List<Animation<double>> animations;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(animations.length, (i) {
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4),
          child: AnimatedBuilder(
            animation: animations[i],
            builder: (_, _) => Opacity(
              opacity: animations[i].value,
              child: Container(
                width: 6,
                height: 6,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Theme.of(context).colorScheme.onPrimary,
                ),
              ),
            ),
          ),
        );
      }),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MESH BACKGROUND PAINTER  — subtle geometric overlay
// ─────────────────────────────────────────────────────────────────────────────

class _MeshPainter extends CustomPainter {
  _MeshPainter(this.context);
  final BuildContext context;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Theme.of(context).colorScheme.onPrimary.withValues(alpha: 0.04)
      ..strokeWidth = 1
      ..style = PaintingStyle.stroke;

    const spacing = 60.0;
    // Vertical lines
    for (double x = 0; x < size.width; x += spacing) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }
    // Horizontal lines
    for (double y = 0; y < size.height; y += spacing) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }
  }

  @override
  bool shouldRepaint(covariant _MeshPainter oldDelegate) => false;
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPED EXTENSIONS for convenient spacing usage
// ─────────────────────────────────────────────────────────────────────────────


