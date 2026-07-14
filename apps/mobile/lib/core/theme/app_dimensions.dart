import 'package:flutter/material.dart';

/// PingForce Design Token System — Spacing, Radius, Elevation, Animation
///
/// Maps directly to DESIGN_TOKENS.md §5, §6, §7, §8.
/// All spacing uses 4dp base grid.
/// All animation durations use named tokens.
///
/// Usage:
///   Padding(padding: EdgeInsets.all(AppSpacing.space4))
///   borderRadius: BorderRadius.circular(AppRadius.lg)
///   Duration(milliseconds: AppDurations.medium)

// ═══════════════════════════════════════════════════════════════════════════
// SPACING — 4dp base grid
// ═══════════════════════════════════════════════════════════════════════════

abstract final class AppSpacing {
  static const double space0 = 0;
  static const double space1 = 4;
  static const double space2 = 8;
  static const double space3 = 12;
  static const double space4 = 16;   // Default padding
  static const double space5 = 20;
  static const double space6 = 24;
  static const double space8 = 32;
  static const double space10 = 40;
  static const double space12 = 48;
  static const double space16 = 64;
  static const double space20 = 80;

  // ─── Semantic Spacing ────────────────────────────────────────────────────

  /// Horizontal padding applied to every screen edge
  static const double screenHorizontal = space4;       // 16dp

  /// Vertical padding applied to screen top/bottom
  static const double screenVertical = space4;         // 16dp

  /// Padding inside a card's content area
  static const double cardPadding = space4;            // 16dp

  /// Vertical gap between cards in a list
  static const double cardMargin = space3;             // 12dp

  /// Gap between major screen sections
  static const double sectionGap = space6;             // 24dp

  /// Input field internal vertical padding
  static const double inputVertical = space4;          // 16dp

  /// Input field internal horizontal padding
  static const double inputHorizontal = space4;        // 16dp

  /// Button horizontal padding (left + right)
  static const double buttonHorizontal = space6;       // 24dp

  /// Button vertical padding (top + bottom)
  static const double buttonVertical = 14;             // 14dp

  /// Chip horizontal padding
  static const double chipPaddingH = space3;           // 12dp

  /// Chip vertical padding
  static const double chipPaddingV = 6;                // 6dp

  /// List item padding
  static const double listItemPadding = space4;        // 16dp

  /// Gap between an icon and its label
  static const double iconGap = space2;                // 8dp

  /// FAB distance from screen edges
  static const double fabMargin = space4;              // 16dp

  /// Bottom navigation bar height (including safe area space)
  static const double bottomNavHeight = space20;       // 80dp

  /// App bar height
  static const double appBarHeight = 64;               // 64dp

  /// Minimum touch target for all interactive elements (accessibility)
  static const double minTouchTarget = space12;        // 48dp

  // ─── EdgeInsets Helpers ──────────────────────────────────────────────────

  /// Screen-level padding (horizontal only)
  static const EdgeInsets screenPaddingH =
      EdgeInsets.symmetric(horizontal: screenHorizontal);

  /// Screen-level padding (all sides)
  static const EdgeInsets screenPaddingAll = EdgeInsets.symmetric(
    horizontal: screenHorizontal,
    vertical: screenVertical,
  );

  /// Card content padding
  static const EdgeInsets cardPaddingAll = EdgeInsets.all(cardPadding);

  /// List item padding
  static const EdgeInsets listItemPaddingAll = EdgeInsets.symmetric(
    horizontal: listItemPadding,
    vertical: space3,
  );

  /// Button padding
  static const EdgeInsets buttonPaddingAll = EdgeInsets.symmetric(
    horizontal: buttonHorizontal,
    vertical: buttonVertical,
  );

  /// Chip padding
  static const EdgeInsets chipPaddingAll = EdgeInsets.symmetric(
    horizontal: chipPaddingH,
    vertical: chipPaddingV,
  );

  /// Section gap as SizedBox helper
  static const SizedBox sectionGapBox = SizedBox(height: sectionGap);
  static const SizedBox cardGapBox = SizedBox(height: cardMargin);
  static const SizedBox iconGapBox = SizedBox(width: iconGap);
  static const SizedBox tinyGapBox = SizedBox(height: space1);
  static const SizedBox smallGapBox = SizedBox(height: space2);
  static const SizedBox mediumGapBox = SizedBox(height: space4);
}

// ═══════════════════════════════════════════════════════════════════════════
// BORDER RADIUS
// ═══════════════════════════════════════════════════════════════════════════

abstract final class AppRadius {
  static const double none = 0;
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 24;
  static const double xxl = 28;
  static const double pill = 999;

  // ─── BorderRadius Helpers ────────────────────────────────────────────────

  static const BorderRadius noneAll = BorderRadius.zero;

  static const BorderRadius xsAll =
      BorderRadius.all(Radius.circular(xs));

  static const BorderRadius smAll =
      BorderRadius.all(Radius.circular(sm));

  static const BorderRadius mdAll =
      BorderRadius.all(Radius.circular(md));

  static const BorderRadius lgAll =
      BorderRadius.all(Radius.circular(lg));

  static const BorderRadius xlAll =
      BorderRadius.all(Radius.circular(xl));

  static const BorderRadius xxlAll =
      BorderRadius.all(Radius.circular(xxl));

  static const BorderRadius pillAll =
      BorderRadius.all(Radius.circular(pill));

  /// Top corners only — bottom sheet top border radius
  static const BorderRadius bottomSheetTop = BorderRadius.only(
    topLeft: Radius.circular(xxl),
    topRight: Radius.circular(xxl),
  );

  /// RoundedRectangleBorder helpers
  static RoundedRectangleBorder cardShape = const RoundedRectangleBorder(
    borderRadius: lgAll,
  );

  static RoundedRectangleBorder buttonShape = const RoundedRectangleBorder(
    borderRadius: pillAll,
  );

  static RoundedRectangleBorder inputShape = const RoundedRectangleBorder(
    borderRadius: smAll,
  );

  static RoundedRectangleBorder chipShape = const RoundedRectangleBorder(
    borderRadius: xsAll,
  );

  static RoundedRectangleBorder dialogShape = const RoundedRectangleBorder(
    borderRadius: lgAll,
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ELEVATION
// ═══════════════════════════════════════════════════════════════════════════

abstract final class AppElevation {
  static const double level0 = 0;
  static const double level1 = 1;
  static const double level2 = 3;
  static const double level3 = 6;
  static const double level4 = 8;
  static const double level5 = 12;

  // Semantic aliases
  static const double flat = level0;
  static const double card = level1;
  static const double raisedCard = level2;
  static const double fab = level3;
  static const double dialog = level4;
  static const double overlay = level5;

  /// Returns BoxShadow for a given elevation level (light mode).
  /// For dark mode, reduce opacity by 50%.
  static List<BoxShadow> shadowForLevel(int level, {bool dark = false}) {
    final double opacity = dark ? 0.5 : 1.0;
    switch (level) {
      case 0:
        return [];
      case 1:
        return [
          BoxShadow(
            color: const Color(0xFF000000).withValues(alpha: 0.08 * opacity),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ];
      case 2:
        return [
          BoxShadow(
            color: const Color(0xFF000000).withValues(alpha: 0.10 * opacity),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ];
      case 3:
        return [
          BoxShadow(
            color: const Color(0xFF000000).withValues(alpha: 0.12 * opacity),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ];
      case 4:
        return [
          BoxShadow(
            color: const Color(0xFF000000).withValues(alpha: 0.14 * opacity),
            blurRadius: 24,
            offset: const Offset(0, 6),
          ),
        ];
      case 5:
      default:
        return [
          BoxShadow(
            color: const Color(0xFF000000).withValues(alpha: 0.16 * opacity),
            blurRadius: 32,
            offset: const Offset(0, 8),
          ),
        ];
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ANIMATION & MOTION
// ═══════════════════════════════════════════════════════════════════════════

abstract final class AppDurations {
  /// 0ms — No animation (accessibility: reduced motion)
  static const Duration instant = Duration.zero;

  /// 100ms — Micro interactions (button press, checkbox)
  static const Duration fast = Duration(milliseconds: 100);

  /// 200ms — State changes (card expand, chip select)
  static const Duration normal = Duration(milliseconds: 200);

  /// 300ms — Screen transitions, bottom sheet
  static const Duration medium = Duration(milliseconds: 300);

  /// 450ms — Complex transitions, shared elements
  static const Duration slow = Duration(milliseconds: 450);

  /// 600ms — Lottie intros, splash animations
  static const Duration verySlow = Duration(milliseconds: 600);

  /// 1200ms — Shimmer sweep cycle
  static const Duration shimmer = Duration(milliseconds: 1200);
}

abstract final class AppEasing {
  /// General transitions
  static const Curve standard = Curves.easeInOut;

  /// Elements entering the screen
  static const Curve decelerate = Curves.easeOut;

  /// Elements leaving the screen
  static const Curve accelerate = Curves.easeIn;

  /// Material 3 emphasized transitions (forward navigation)
  static const Curve emphasized = Curves.easeInOutCubicEmphasized;

  /// Success animations, bouncy feedback
  static const Curve spring = Curves.elasticOut;

  /// Progress bars, shimmer loaders
  static const Curve linear = Curves.linear;
}

// ═══════════════════════════════════════════════════════════════════════════
// ICON SIZES
// ═══════════════════════════════════════════════════════════════════════════

abstract final class AppIconSize {
  /// 16dp — Inline metadata icons
  static const double xs = 16;

  /// 20dp — Chip icons, dense list icons
  static const double sm = 20;

  /// 24dp — Standard list icons, nav icons, button icons
  static const double md = 24;

  /// 32dp — Feature icon in cards, dialog icons
  static const double lg = 32;

  /// 40dp — Empty state icons, onboarding
  static const double xl = 40;

  /// 64dp — Hero illustrations, large empty states
  static const double xxl = 64;
}

// ═══════════════════════════════════════════════════════════════════════════
// BREAKPOINTS
// ═══════════════════════════════════════════════════════════════════════════

abstract final class AppBreakpoints {
  /// 0–599dp: Phones (primary target)
  static const double compact = 0;

  /// 600–839dp: Large phones, small tablets
  static const double medium = 600;

  /// 840dp+: Tablets, rugged enterprise devices
  static const double expanded = 840;

  /// Helper: returns true if the screen is compact (phone)
  static bool isCompact(BuildContext context) =>
      MediaQuery.sizeOf(context).width < medium;

  /// Helper: returns true if the screen is expanded (tablet)
  static bool isExpanded(BuildContext context) =>
      MediaQuery.sizeOf(context).width >= expanded;
}
