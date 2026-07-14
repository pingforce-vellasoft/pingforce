import 'package:flutter/material.dart';

/// PingForce Design Token System — Color Definitions
///
/// All color values in this file map directly to DESIGN_TOKENS.md §3.
/// NO other file in this codebase should contain hardcoded color values.
/// Every widget and screen MUST consume tokens from this file or
/// from the active [ColorScheme] derived from these tokens.
///
/// White-label overrides: only [PingForceColors.primary] group and
/// [PingForceColors.secondary] group may be overridden at runtime
/// by the tenant branding engine (§13 of DESIGN_TOKENS.md).
abstract final class PingForceColors {
  // ─────────────────────────────────────────────────────────────────────────
  // SEED COLORS — Material 3 scheme generator inputs
  // ─────────────────────────────────────────────────────────────────────────

  static const Color seedPrimary = Color(0xFF1B72E8);
  static const Color seedSecondary = Color(0xFFF57C00);
  static const Color seedTertiary = Color(0xFF00897B);

  // ─────────────────────────────────────────────────────────────────────────
  // LIGHT THEME — Primary
  // ─────────────────────────────────────────────────────────────────────────

  static const Color primary = Color(0xFF1B72E8);
  static const Color onPrimary = Color(0xFFFFFFFF);
  static const Color primaryContainer = Color(0xFFD3E4FF);
  static const Color onPrimaryContainer = Color(0xFF001D4A);
  static const Color primaryFixed = Color(0xFFD3E4FF);
  static const Color primaryFixedDim = Color(0xFFA3C5FF);

  // ─────────────────────────────────────────────────────────────────────────
  // LIGHT THEME — Secondary
  // ─────────────────────────────────────────────────────────────────────────

  static const Color secondary = Color(0xFFF57C00);
  static const Color onSecondary = Color(0xFFFFFFFF);
  static const Color secondaryContainer = Color(0xFFFFE0B2);
  static const Color onSecondaryContainer = Color(0xFF3E1900);

  // ─────────────────────────────────────────────────────────────────────────
  // LIGHT THEME — Tertiary
  // ─────────────────────────────────────────────────────────────────────────

  static const Color tertiary = Color(0xFF00897B);
  static const Color onTertiary = Color(0xFFFFFFFF);
  static const Color tertiaryContainer = Color(0xFFB2DFDB);
  static const Color onTertiaryContainer = Color(0xFF002420);

  // ─────────────────────────────────────────────────────────────────────────
  // LIGHT THEME — Surface & Background
  // ─────────────────────────────────────────────────────────────────────────

  static const Color surface = Color(0xFFFAFCFF);
  static const Color onSurface = Color(0xFF1A1C1E);
  static const Color surfaceVariant = Color(0xFFE1E9F4);
  static const Color onSurfaceVariant = Color(0xFF44474F);
  static const Color surfaceDim = Color(0xFFD9DBE0);
  static const Color surfaceBright = Color(0xFFFAFCFF);
  static const Color surfaceContainerLowest = Color(0xFFFFFFFF);
  static const Color surfaceContainerLow = Color(0xFFF3F6FB);
  static const Color surfaceContainer = Color(0xFFEDF1F6);
  static const Color surfaceContainerHigh = Color(0xFFE7ECF1);
  static const Color surfaceContainerHighest = Color(0xFFE1E6EB);
  static const Color background = Color(0xFFFAFCFF);
  static const Color onBackground = Color(0xFF1A1C1E);

  // ─────────────────────────────────────────────────────────────────────────
  // LIGHT THEME — Outline
  // ─────────────────────────────────────────────────────────────────────────

  static const Color outline = Color(0xFF74777F);
  static const Color outlineVariant = Color(0xFFC4C7CF);

  // ─────────────────────────────────────────────────────────────────────────
  // LIGHT THEME — Error
  // ─────────────────────────────────────────────────────────────────────────

  static const Color error = Color(0xFFB3261E);
  static const Color onError = Color(0xFFFFFFFF);
  static const Color errorContainer = Color(0xFFF9DEDC);
  static const Color onErrorContainer = Color(0xFF410E0B);

  // ─────────────────────────────────────────────────────────────────────────
  // DARK THEME — Primary
  // ─────────────────────────────────────────────────────────────────────────

  static const Color darkPrimary = Color(0xFFA3C5FF);
  static const Color darkOnPrimary = Color(0xFF002E6E);
  static const Color darkPrimaryContainer = Color(0xFF004399);
  static const Color darkOnPrimaryContainer = Color(0xFFD3E4FF);

  // ─────────────────────────────────────────────────────────────────────────
  // DARK THEME — Secondary
  // ─────────────────────────────────────────────────────────────────────────

  static const Color darkSecondary = Color(0xFFFFBA78);
  static const Color darkOnSecondary = Color(0xFF4A2800);
  static const Color darkSecondaryContainer = Color(0xFF6B3A00);
  static const Color darkOnSecondaryContainer = Color(0xFFFFE0B2);

  // ─────────────────────────────────────────────────────────────────────────
  // DARK THEME — Tertiary
  // ─────────────────────────────────────────────────────────────────────────

  static const Color darkTertiary = Color(0xFF80CBC4);
  static const Color darkOnTertiary = Color(0xFF00403A);
  static const Color darkTertiaryContainer = Color(0xFF005F56);
  static const Color darkOnTertiaryContainer = Color(0xFFB2DFDB);

  // ─────────────────────────────────────────────────────────────────────────
  // DARK THEME — Surface & Background
  // ─────────────────────────────────────────────────────────────────────────

  static const Color darkSurface = Color(0xFF111318);
  static const Color darkOnSurface = Color(0xFFE2E2E9);
  static const Color darkSurfaceVariant = Color(0xFF44474F);
  static const Color darkOnSurfaceVariant = Color(0xFFC4C7CF);
  static const Color darkSurfaceContainerLowest = Color(0xFF0C0F14);
  static const Color darkSurfaceContainerLow = Color(0xFF191C22);
  static const Color darkSurfaceContainer = Color(0xFF1E2026);
  static const Color darkSurfaceContainerHigh = Color(0xFF282B31);
  static const Color darkSurfaceContainerHighest = Color(0xFF33363C);
  static const Color darkBackground = Color(0xFF111318);
  static const Color darkOnBackground = Color(0xFFE2E2E9);

  // ─────────────────────────────────────────────────────────────────────────
  // DARK THEME — Outline & Error
  // ─────────────────────────────────────────────────────────────────────────

  static const Color darkOutline = Color(0xFF8E9099);
  static const Color darkOutlineVariant = Color(0xFF44474F);
  static const Color darkError = Color(0xFFF2B8B5);
  static const Color darkOnError = Color(0xFF601410);
  static const Color darkErrorContainer = Color(0xFF8C1D18);
  static const Color darkOnErrorContainer = Color(0xFFF9DEDC);

  // ─────────────────────────────────────────────────────────────────────────
  // SEMANTIC STATUS COLORS — Light Theme
  // NEVER override these. NEVER replace with generic red/green/orange.
  // ─────────────────────────────────────────────────────────────────────────

  static const Color statusSuccess = Color(0xFF2E7D32);
  static const Color statusOnSuccess = Color(0xFFFFFFFF);
  static const Color statusSuccessContainer = Color(0xFFE8F5E9);
  static const Color statusOnSuccessContainer = Color(0xFF1B5E20);

  static const Color statusWarning = Color(0xFFE65100);
  static const Color statusOnWarning = Color(0xFFFFFFFF);
  static const Color statusWarningContainer = Color(0xFFFFF3E0);
  static const Color statusOnWarningContainer = Color(0xFF4E2900);

  static const Color statusCritical = Color(0xFFC62828);
  static const Color statusOnCritical = Color(0xFFFFFFFF);
  static const Color statusCriticalContainer = Color(0xFFFFEBEE);
  static const Color statusOnCriticalContainer = Color(0xFF7F0000);

  static const Color statusInfo = Color(0xFF0277BD);
  static const Color statusOnInfo = Color(0xFFFFFFFF);
  static const Color statusInfoContainer = Color(0xFFE1F5FE);
  static const Color statusOnInfoContainer = Color(0xFF00344A);

  static const Color statusOffline = Color(0xFF616161);
  static const Color statusOfflineContainer = Color(0xFFF5F5F5);

  // ─────────────────────────────────────────────────────────────────────────
  // SEMANTIC STATUS COLORS — Dark Theme
  // ─────────────────────────────────────────────────────────────────────────

  static const Color darkStatusSuccess = Color(0xFF81C784);
  static const Color darkStatusSuccessContainer = Color(0xFF1B5E20);
  static const Color darkStatusWarning = Color(0xFFFFB74D);
  static const Color darkStatusWarningContainer = Color(0xFF4E2900);
  static const Color darkStatusCritical = Color(0xFFEF9A9A);
  static const Color darkStatusCriticalContainer = Color(0xFF7F0000);
  static const Color darkStatusInfo = Color(0xFF80DEEA);
  static const Color darkStatusInfoContainer = Color(0xFF00344A);

  // ─────────────────────────────────────────────────────────────────────────
  // SLA TRAFFIC LIGHT — NEVER override
  // ─────────────────────────────────────────────────────────────────────────

  static const Color slaHealthy = Color(0xFF2E7D32);
  static const Color slaWarning = Color(0xFFF57C00);
  static const Color slaBreached = Color(0xFFC62828);
  static const Color slaHealthyContainer = Color(0xFFE8F5E9);
  static const Color slaWarningContainer = Color(0xFFFFF3E0);
  static const Color slaBreachedContainer = Color(0xFFFFEBEE);

  // ─────────────────────────────────────────────────────────────────────────
  // GPS ACCURACY COLORS — NEVER override
  // ─────────────────────────────────────────────────────────────────────────

  static const Color gpsExcellent = Color(0xFF2E7D32);
  static const Color gpsGood = Color(0xFF558B2F);
  static const Color gpsFair = Color(0xFFF57C00);
  static const Color gpsPoor = Color(0xFFC62828);
  static const Color gpsUnavailable = Color(0xFF757575);

  static const Color gpsGeofenceInside = Color(0x332E7D32);  // 20% opacity
  static const Color gpsGeofenceOutside = Color(0x33C62828); // 20% opacity
  static const Color gpsGeofenceInsideBorder = Color(0xFF2E7D32);
  static const Color gpsGeofenceOutsideBorder = Color(0xFFC62828);

  // ─────────────────────────────────────────────────────────────────────────
  // SKELETON / SHIMMER — theme-aware helper
  // ─────────────────────────────────────────────────────────────────────────

  static const Color skeletonBase = surfaceContainerHigh;
  static const Color skeletonHighlight = surfaceContainerHighest;
  static const Color darkSkeletonBase = darkSurfaceContainerHigh;
  static const Color darkSkeletonHighlight = darkSurfaceContainerHighest;

  // ─────────────────────────────────────────────────────────────────────────
  // OFFLINE BANNER
  // ─────────────────────────────────────────────────────────────────────────

  static const Color offlineBannerBg = Color(0xFF795548);
  static const Color offlineBannerFg = Color(0xFFFFFFFF);

  // ─────────────────────────────────────────────────────────────────────────
  // STATIC FACTORY METHODS
  // ─────────────────────────────────────────────────────────────────────────

  /// Returns the light [ColorScheme] for the PingForce app.
  static ColorScheme lightColorScheme() => const ColorScheme(
        brightness: Brightness.light,
        primary: primary,
        onPrimary: onPrimary,
        primaryContainer: primaryContainer,
        onPrimaryContainer: onPrimaryContainer,
        secondary: secondary,
        onSecondary: onSecondary,
        secondaryContainer: secondaryContainer,
        onSecondaryContainer: onSecondaryContainer,
        tertiary: tertiary,
        onTertiary: onTertiary,
        tertiaryContainer: tertiaryContainer,
        onTertiaryContainer: onTertiaryContainer,
        surface: surface,
        onSurface: onSurface,
        surfaceVariant: surfaceVariant,
        onSurfaceVariant: onSurfaceVariant,
        surfaceContainerLowest: surfaceContainerLowest,
        surfaceContainerLow: surfaceContainerLow,
        surfaceContainer: surfaceContainer,
        surfaceContainerHigh: surfaceContainerHigh,
        surfaceContainerHighest: surfaceContainerHighest,
        outline: outline,
        outlineVariant: outlineVariant,
        error: error,
        onError: onError,
        errorContainer: errorContainer,
        onErrorContainer: onErrorContainer,
      );

  /// Returns the dark [ColorScheme] for the PingForce app.
  static ColorScheme darkColorScheme() => const ColorScheme(
        brightness: Brightness.dark,
        primary: darkPrimary,
        onPrimary: darkOnPrimary,
        primaryContainer: darkPrimaryContainer,
        onPrimaryContainer: darkOnPrimaryContainer,
        secondary: darkSecondary,
        onSecondary: darkOnSecondary,
        secondaryContainer: darkSecondaryContainer,
        onSecondaryContainer: darkOnSecondaryContainer,
        tertiary: darkTertiary,
        onTertiary: darkOnTertiary,
        tertiaryContainer: darkTertiaryContainer,
        onTertiaryContainer: darkOnTertiaryContainer,
        surface: darkSurface,
        onSurface: darkOnSurface,
        surfaceVariant: darkSurfaceVariant,
        onSurfaceVariant: darkOnSurfaceVariant,
        surfaceContainerLowest: darkSurfaceContainerLowest,
        surfaceContainerLow: darkSurfaceContainerLow,
        surfaceContainer: darkSurfaceContainer,
        surfaceContainerHigh: darkSurfaceContainerHigh,
        surfaceContainerHighest: darkSurfaceContainerHighest,
        outline: darkOutline,
        outlineVariant: darkOutlineVariant,
        error: darkError,
        onError: darkOnError,
        errorContainer: darkErrorContainer,
        onErrorContainer: darkOnErrorContainer,
      );

  /// Returns the SLA color for a given percentage of time remaining.
  /// [percentRemaining] is 0.0 (breached) to 1.0 (full time left).
  static Color slaColor(double percentRemaining) {
    if (percentRemaining <= 0) return slaBreached;
    if (percentRemaining < 0.10) return slaBreached;
    if (percentRemaining < 0.50) return slaWarning;
    return slaHealthy;
  }

  /// Returns the GPS accuracy color for a given accuracy in meters.
  static Color gpsAccuracyColor(double accuracyMeters) {
    if (accuracyMeters < 10) return gpsExcellent;
    if (accuracyMeters < 25) return gpsGood;
    if (accuracyMeters < 50) return gpsFair;
    return gpsPoor;
  }
}
