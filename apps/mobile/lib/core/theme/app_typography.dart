import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// PingForce Design Token System — Typography Definitions
///
/// All text styles in this file map directly to DESIGN_TOKENS.md §4.
/// Font: Inter (Primary), JetBrains Mono (Monospace)
/// Base grid: Material 3 TypeScale
///
/// Usage:
///   Text('Hello', style: AppTypography.bodyLarge)
///   Text('42', style: AppTypography.numericHero)
abstract final class AppTypography {
  // ─────────────────────────────────────────────────────────────────────────
  // FONT FAMILIES
  // ─────────────────────────────────────────────────────────────────────────

  static const String _primaryFamily = 'Inter';
  static const String _monoFamily = 'JetBrains Mono';

  // ─────────────────────────────────────────────────────────────────────────
  // FONT WEIGHTS (named for semantic clarity)
  // ─────────────────────────────────────────────────────────────────────────

  static const FontWeight regular = FontWeight.w400;
  static const FontWeight medium = FontWeight.w500;
  static const FontWeight semiBold = FontWeight.w600;
  static const FontWeight bold = FontWeight.w700;
  static const FontWeight extraBold = FontWeight.w800;

  // ─────────────────────────────────────────────────────────────────────────
  // DISPLAY — Hero content, splash screens, very large KPIs
  // ─────────────────────────────────────────────────────────────────────────

  /// 57dp / Regular / LineHeight 1.12 — Splash branding only
  static TextStyle get displayLarge => GoogleFonts.inter(
        fontSize: 57,
        fontWeight: regular,
        height: 1.12,
        letterSpacing: -0.25,
      );

  /// 45dp / Regular / LineHeight 1.16 — Large number KPIs
  static TextStyle get displayMedium => GoogleFonts.inter(
        fontSize: 45,
        fontWeight: regular,
        height: 1.16,
        letterSpacing: 0,
      );

  /// 36dp / Regular / LineHeight 1.22 — Report totals
  static TextStyle get displaySmall => GoogleFonts.inter(
        fontSize: 36,
        fontWeight: regular,
        height: 1.22,
        letterSpacing: 0,
      );

  // ─────────────────────────────────────────────────────────────────────────
  // HEADLINE — Section headers, screen titles
  // ─────────────────────────────────────────────────────────────────────────

  /// 32dp / SemiBold / LineHeight 1.25 — Screen main titles
  static TextStyle get headlineLarge => GoogleFonts.inter(
        fontSize: 32,
        fontWeight: semiBold,
        height: 1.25,
        letterSpacing: 0,
      );

  /// 28dp / SemiBold / LineHeight 1.29 — Section headers
  static TextStyle get headlineMedium => GoogleFonts.inter(
        fontSize: 28,
        fontWeight: semiBold,
        height: 1.29,
        letterSpacing: 0,
      );

  /// 24dp / SemiBold / LineHeight 1.33 — Card titles, dialog titles
  static TextStyle get headlineSmall => GoogleFonts.inter(
        fontSize: 24,
        fontWeight: semiBold,
        height: 1.33,
        letterSpacing: 0,
      );

  // ─────────────────────────────────────────────────────────────────────────
  // TITLE — Component headers, list items
  // ─────────────────────────────────────────────────────────────────────────

  /// 22dp / SemiBold / LineHeight 1.27 — App bar title, module name
  static TextStyle get titleLarge => GoogleFonts.inter(
        fontSize: 22,
        fontWeight: semiBold,
        height: 1.27,
        letterSpacing: 0,
      );

  /// 16dp / SemiBold / LineHeight 1.50 — List item primary text
  static TextStyle get titleMedium => GoogleFonts.inter(
        fontSize: 16,
        fontWeight: semiBold,
        height: 1.50,
        letterSpacing: 0.15,
      );

  /// 14dp / SemiBold / LineHeight 1.43 — Card label, tab text
  static TextStyle get titleSmall => GoogleFonts.inter(
        fontSize: 14,
        fontWeight: semiBold,
        height: 1.43,
        letterSpacing: 0.1,
      );

  // ─────────────────────────────────────────────────────────────────────────
  // BODY — Content, descriptions
  // ─────────────────────────────────────────────────────────────────────────

  /// 16dp / Regular / LineHeight 1.50 — Primary body text, input text
  static TextStyle get bodyLarge => GoogleFonts.inter(
        fontSize: 16,
        fontWeight: regular,
        height: 1.50,
        letterSpacing: 0.5,
      );

  /// 14dp / Regular / LineHeight 1.43 — Secondary body text
  static TextStyle get bodyMedium => GoogleFonts.inter(
        fontSize: 14,
        fontWeight: regular,
        height: 1.43,
        letterSpacing: 0.25,
      );

  /// 12dp / Regular / LineHeight 1.33 — Helper text, timestamps
  static TextStyle get bodySmall => GoogleFonts.inter(
        fontSize: 12,
        fontWeight: regular,
        height: 1.33,
        letterSpacing: 0.4,
      );

  // ─────────────────────────────────────────────────────────────────────────
  // LABEL — Buttons, chips, metadata
  // ─────────────────────────────────────────────────────────────────────────

  /// 14dp / SemiBold / LineHeight 1.43 — Button text, nav labels
  static TextStyle get labelLarge => GoogleFonts.inter(
        fontSize: 14,
        fontWeight: semiBold,
        height: 1.43,
        letterSpacing: 0.1,
      );

  /// 12dp / Medium / LineHeight 1.33 — Chip text, badge text
  static TextStyle get labelMedium => GoogleFonts.inter(
        fontSize: 12,
        fontWeight: medium,
        height: 1.33,
        letterSpacing: 0.5,
      );

  /// 11dp / Medium / LineHeight 1.45 — Caption, micro-labels
  static TextStyle get labelSmall => GoogleFonts.inter(
        fontSize: 11,
        fontWeight: medium,
        height: 1.45,
        letterSpacing: 0.5,
      );

  // ─────────────────────────────────────────────────────────────────────────
  // NUMERIC — KPI displays, timers, counters (tabular-nums)
  // ─────────────────────────────────────────────────────────────────────────

  /// 48dp / Bold — Dashboard KPI hero number (attendance count, fault count)
  static TextStyle get numericHero => GoogleFonts.inter(
        fontSize: 48,
        fontWeight: bold,
        height: 1.0,
        fontFeatures: const [FontFeature.tabularFigures()],
      );

  /// 32dp / Bold — SLA countdown, session timer
  static TextStyle get numericLarge => GoogleFonts.inter(
        fontSize: 32,
        fontWeight: bold,
        height: 1.1,
        fontFeatures: const [FontFeature.tabularFigures()],
      );

  /// 24dp / SemiBold — Card metrics, check-in time display
  static TextStyle get numericMedium => GoogleFonts.inter(
        fontSize: 24,
        fontWeight: semiBold,
        height: 1.2,
        fontFeatures: const [FontFeature.tabularFigures()],
      );

  /// 16dp / SemiBold — Inline stats
  static TextStyle get numericSmall => GoogleFonts.inter(
        fontSize: 16,
        fontWeight: semiBold,
        height: 1.3,
        fontFeatures: const [FontFeature.tabularFigures()],
      );

  // ─────────────────────────────────────────────────────────────────────────
  // MONOSPACE — IDs, codes, technical data
  // ─────────────────────────────────────────────────────────────────────────

  /// 14dp Monospace — Employee IDs, fault IDs, device codes
  static TextStyle get monoMedium => GoogleFonts.jetBrainsMono(
        fontSize: 14,
        fontWeight: regular,
        height: 1.5,
        letterSpacing: 0.5,
      );

  /// 12dp Monospace — GPS coordinates, technical metadata
  static TextStyle get monoSmall => GoogleFonts.jetBrainsMono(
        fontSize: 12,
        fontWeight: regular,
        height: 1.4,
        letterSpacing: 0.5,
      );

  // ─────────────────────────────────────────────────────────────────────────
  // MATERIAL 3 TEXTTHEME FACTORY
  // ─────────────────────────────────────────────────────────────────────────

  /// Returns a complete [TextTheme] aligned with Material 3 naming.
  /// Pass to [ThemeData.textTheme] and [ThemeData.primaryTextTheme].
  static TextTheme toTextTheme() => TextTheme(
        displayLarge: displayLarge,
        displayMedium: displayMedium,
        displaySmall: displaySmall,
        headlineLarge: headlineLarge,
        headlineMedium: headlineMedium,
        headlineSmall: headlineSmall,
        titleLarge: titleLarge,
        titleMedium: titleMedium,
        titleSmall: titleSmall,
        bodyLarge: bodyLarge,
        bodyMedium: bodyMedium,
        bodySmall: bodySmall,
        labelLarge: labelLarge,
        labelMedium: labelMedium,
        labelSmall: labelSmall,
      );
}
