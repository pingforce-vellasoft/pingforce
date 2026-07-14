import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/theme.dart';

// ─────────────────────────────────────────────────────────────────────────────
// ONBOARDING SCREEN  (AUDIT §20 — Missing Screens)
// ─────────────────────────────────────────────────────────────────────────────
//
// Shown on first launch only (AppLaunchNotifier.isFirstLaunch == true).
// 4 slides:
//   1. Welcome         — hero illustration, app value proposition
//   2. GPS Check-In    — field attendance feature
//   3. Fault & Visits  — core daily workflows
//   4. Works Offline   — offline-first reassurance
//
// UX features:
//   • PageView with dot indicator
//   • "Skip" top-right on slides 1-3
//   • "Next" / "Get Started" button
//   • Auto-saves "launched" flag so it never shows again
//   • Slide-in hero illustrations (icon-based, no external assets needed)

class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen>
    with TickerProviderStateMixin {
  final _pageCtrl = PageController();
  int _currentPage = 0;

  static const _slides = [
    _OnboardingSlide(
      icon: Icons.bolt_rounded,
      title: 'Welcome to PingForce',
      subtitle:
          'Your complete field workforce management platform — built for teams on the move.',
      gradient: [Color(0xFF6750A4), Color(0xFF9C84CF)],
    ),
    _OnboardingSlide(
      icon: Icons.fingerprint_rounded,
      title: 'One-Tap Check-In',
      subtitle:
          'GPS-verified attendance from anywhere. Clock in instantly with your location confirmed.',
      gradient: [Color(0xFF00639B), Color(0xFF0090D6)],
    ),
    _OnboardingSlide(
      icon: Icons.build_circle_rounded,
      title: 'Faults & Visits, Simplified',
      subtitle:
          'Manage service requests, log site visits, and track SLAs — all from your phone.',
      gradient: [Color(0xFF2E7D32), Color(0xFF60AD5E)],
    ),
    _OnboardingSlide(
      icon: Icons.wifi_off_rounded,
      title: 'Works Even Offline',
      subtitle:
          'Keep working without signal. Your data syncs automatically when you\'re back online.',
      gradient: [Color(0xFFB45309), Color(0xFFD97706)],
    ),
  ];

  @override
  void dispose() {
    _pageCtrl.dispose();
    super.dispose();
  }

  void _next() {
    if (_currentPage < _slides.length - 1) {
      _pageCtrl.nextPage(
        duration: const Duration(milliseconds: 350),
        curve: Curves.easeInOut,
      );
    } else {
      _finish();
    }
  }

  void _finish() {
    // TODO: SharedPreferences.setString('launched', 'true')
    context.go('/auth/login');
  }

  @override
  Widget build(BuildContext context) {
    final isLast = _currentPage == _slides.length - 1;

    return Scaffold(
      body: Stack(
        children: [
          // ── Slides ────────────────────────────────────────────────────
          PageView.builder(
            controller: _pageCtrl,
            itemCount: _slides.length,
            onPageChanged: (i) => setState(() => _currentPage = i),
            itemBuilder: (_, i) => _SlideView(slide: _slides[i]),
          ),

          // ── Top bar: Skip ─────────────────────────────────────────────
          SafeArea(
            child: Align(
              alignment: Alignment.topRight,
              child: AnimatedOpacity(
                opacity: isLast ? 0 : 1,
                duration: const Duration(milliseconds: 200),
                child: TextButton(
                  onPressed: isLast ? null : _finish,
                  child: const Text(
                    'Skip',
                    style: TextStyle(color: Colors.white70),
                  ),
                ),
              ),
            ),
          ),

          // ── Bottom controls ───────────────────────────────────────────
          SafeArea(
            child: Align(
              alignment: Alignment.bottomCenter,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Dot indicator
                    _DotIndicator(
                      count: _slides.length,
                      current: _currentPage,
                    ),

                    const SizedBox(height: AppSpacing.space5),

                    // Next / Get Started
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: FilledButton(
                        style: FilledButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: _slides[_currentPage].gradient[0],
                        ),
                        onPressed: _next,
                        child: Text(
                          isLast ? 'Get Started' : 'Next',
                          style: AppTypography.labelLarge.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Slide data ─────────────────────────────────────────────────────────────

class _OnboardingSlide {
  const _OnboardingSlide({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.gradient,
  });
  final IconData icon;
  final String title;
  final String subtitle;
  final List<Color> gradient;
}

// ── Slide view ─────────────────────────────────────────────────────────────

class _SlideView extends StatelessWidget {
  const _SlideView({required this.slide});
  final _OnboardingSlide slide;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: slide.gradient,
        ),
      ),
      child: SafeArea(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // ── Hero icon in layered circles ─────────────────────────
            Stack(
              alignment: Alignment.center,
              children: [
                Container(
                  width: 200,
                  height: 200,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white.withOpacity(0.08),
                  ),
                ),
                Container(
                  width: 150,
                  height: 150,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white.withOpacity(0.12),
                  ),
                ),
                Container(
                  width: 100,
                  height: 100,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white.withOpacity(0.20),
                  ),
                  child: Icon(
                    slide.icon,
                    size: 52,
                    color: Colors.white,
                  ),
                ),
              ],
            ),

            const SizedBox(height: AppSpacing.space8),

            // ── Text ─────────────────────────────────────────────────
            Padding(
              padding: AppSpacing.screenPaddingH,
              child: Column(
                children: [
                  Text(
                    slide.title,
                    textAlign: TextAlign.center,
                    style: AppTypography.headlineMedium.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.space3),
                  Text(
                    slide.subtitle,
                    textAlign: TextAlign.center,
                    style: AppTypography.bodyLarge.copyWith(
                      color: Colors.white.withOpacity(0.85),
                      height: 1.5,
                    ),
                  ),
                ],
              ),
            ),

            // Space for bottom controls
            const SizedBox(height: 120),
          ],
        ),
      ),
    );
  }
}

// ── Dot indicator ──────────────────────────────────────────────────────────

class _DotIndicator extends StatelessWidget {
  const _DotIndicator({required this.count, required this.current});
  final int count;
  final int current;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(count, (i) {
        final isActive = i == current;
        return AnimatedContainer(
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeInOut,
          margin: const EdgeInsets.symmetric(horizontal: 4),
          width: isActive ? 24 : 8,
          height: 8,
          decoration: BoxDecoration(
            color:
                isActive ? Colors.white : Colors.white.withOpacity(0.4),
            borderRadius: BorderRadius.circular(4),
          ),
        );
      }),
    );
  }
}
