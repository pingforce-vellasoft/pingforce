import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'app_colors.dart';
import 'app_typography.dart';
import 'app_dimensions.dart';

/// PingForce Design Token System — ThemeData Assembly
///
/// This file assembles the full [ThemeData] for light and dark modes
/// using all tokens from the PingForce design system.
///
/// Usage in MaterialApp:
///   MaterialApp(
///     theme: AppTheme.light,
///     darkTheme: AppTheme.dark,
///     themeMode: ThemeMode.system,
///   )
abstract final class AppTheme {
  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC ENTRY POINTS
  // ─────────────────────────────────────────────────────────────────────────

  static ThemeData get light => _buildTheme(Brightness.light);
  static ThemeData get dark => _buildTheme(Brightness.dark);

  // ─────────────────────────────────────────────────────────────────────────
  // THEME BUILDER
  // ─────────────────────────────────────────────────────────────────────────

  static ThemeData _buildTheme(Brightness brightness) {
    final bool isLight = brightness == Brightness.light;
    final ColorScheme colorScheme = isLight
        ? PingForceColors.lightColorScheme()
        : PingForceColors.darkColorScheme();

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: colorScheme,
      textTheme: AppTypography.toTextTheme(),
      primaryTextTheme: AppTypography.toTextTheme(),

      // ── Scaffold ──────────────────────────────────────────────────────────
      scaffoldBackgroundColor: colorScheme.surface,

      // ── AppBar ────────────────────────────────────────────────────────────
      appBarTheme: AppBarTheme(
        elevation: AppElevation.flat,
        scrolledUnderElevation: AppElevation.level1,
        backgroundColor: colorScheme.surfaceContainerLow,
        foregroundColor: colorScheme.onSurface,
        surfaceTintColor: colorScheme.primary,
        titleTextStyle: AppTypography.titleLarge.copyWith(
          color: colorScheme.onSurface,
        ),
        iconTheme: IconThemeData(
          color: colorScheme.onSurface,
          size: AppIconSize.md,
        ),
        actionsIconTheme: IconThemeData(
          color: colorScheme.onSurface,
          size: AppIconSize.md,
        ),
        systemOverlayStyle: isLight
            ? SystemUiOverlayStyle.dark.copyWith(
                statusBarColor: Colors.transparent,
                systemNavigationBarColor: colorScheme.surfaceContainerLow,
              )
            : SystemUiOverlayStyle.light.copyWith(
                statusBarColor: Colors.transparent,
                systemNavigationBarColor: colorScheme.surfaceContainerLow,
              ),
        centerTitle: false,
        toolbarHeight: AppSpacing.appBarHeight,
      ),

      // ── Bottom Navigation Bar ─────────────────────────────────────────────
      navigationBarTheme: NavigationBarThemeData(
        elevation: AppElevation.level2,
        height: AppSpacing.bottomNavHeight,
        backgroundColor: colorScheme.surfaceContainerLow,
        indicatorColor: colorScheme.secondaryContainer,
        indicatorShape: const RoundedRectangleBorder(
          borderRadius: AppRadius.pillAll,
        ),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return IconThemeData(
              color: colorScheme.onSecondaryContainer,
              size: AppIconSize.md,
            );
          }
          return IconThemeData(
            color: colorScheme.onSurfaceVariant,
            size: AppIconSize.md,
          );
        }),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return AppTypography.labelMedium.copyWith(
              color: colorScheme.onSecondaryContainer,
            );
          }
          return AppTypography.labelMedium.copyWith(
            color: colorScheme.onSurfaceVariant,
          );
        }),
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
      ),

      // ── Elevated Button ───────────────────────────────────────────────────
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: colorScheme.primary,
          foregroundColor: colorScheme.onPrimary,
          elevation: AppElevation.flat,
          shadowColor: Colors.transparent,
          textStyle: AppTypography.labelLarge,
          padding: AppSpacing.buttonPaddingAll,
          minimumSize: const Size(120, 48),
          shape: const RoundedRectangleBorder(
            borderRadius: AppRadius.pillAll,
          ),
        ).copyWith(
          elevation: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.hovered)) return AppElevation.level1;
            if (states.contains(WidgetState.pressed)) return AppElevation.flat;
            return AppElevation.flat;
          }),
        ),
      ),

      // ── Filled Button (primary action) ────────────────────────────────────
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: colorScheme.primary,
          foregroundColor: colorScheme.onPrimary,
          textStyle: AppTypography.labelLarge,
          padding: AppSpacing.buttonPaddingAll,
          minimumSize: const Size(120, 48),
          shape: const RoundedRectangleBorder(
            borderRadius: AppRadius.pillAll,
          ),
        ),
      ),

      // ── Tonal Button (secondary action) ──────────────────────────────────
      // Using FilledButtonTheme with tonal variant via copyWith in code

      // ── Outlined Button ───────────────────────────────────────────────────
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: colorScheme.primary,
          side: BorderSide(color: colorScheme.outline, width: 1.5),
          textStyle: AppTypography.labelLarge,
          padding: AppSpacing.buttonPaddingAll,
          minimumSize: const Size(120, 48),
          shape: const RoundedRectangleBorder(
            borderRadius: AppRadius.pillAll,
          ),
        ),
      ),

      // ── Text Button ───────────────────────────────────────────────────────
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: colorScheme.primary,
          textStyle: AppTypography.labelLarge,
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.space3,
            vertical: AppSpacing.space2,
          ),
          minimumSize: const Size(48, 48),
          shape: const RoundedRectangleBorder(
            borderRadius: AppRadius.smAll,
          ),
        ),
      ),

      // ── FAB ───────────────────────────────────────────────────────────────
      floatingActionButtonTheme: FloatingActionButtonThemeData(
        backgroundColor: colorScheme.secondary,
        foregroundColor: colorScheme.onSecondary,
        elevation: AppElevation.level3,
        shape: const RoundedRectangleBorder(
          borderRadius: AppRadius.pillAll,
        ),
        iconSize: AppIconSize.md,
        sizeConstraints: const BoxConstraints.tightFor(
          width: 56,
          height: 56,
        ),
      ),

      // ── Card ──────────────────────────────────────────────────────────────
      cardTheme: CardThemeData(
        elevation: AppElevation.level1,
        color: colorScheme.surfaceContainerLowest,
        surfaceTintColor: Colors.transparent,
        margin: const EdgeInsets.only(bottom: AppSpacing.cardMargin),
        shape: const RoundedRectangleBorder(
          borderRadius: AppRadius.lgAll,
        ),
        clipBehavior: Clip.antiAlias,
      ),

      // ── Input Decoration ──────────────────────────────────────────────────
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: colorScheme.surfaceContainer,
        hintStyle: AppTypography.bodyLarge.copyWith(
          color: colorScheme.onSurfaceVariant,
        ),
        labelStyle: AppTypography.bodySmall.copyWith(
          color: colorScheme.onSurfaceVariant,
        ),
        floatingLabelStyle: AppTypography.bodySmall.copyWith(
          color: colorScheme.primary,
        ),
        errorStyle: AppTypography.bodySmall.copyWith(
          color: colorScheme.error,
        ),
        helperStyle: AppTypography.bodySmall.copyWith(
          color: colorScheme.onSurfaceVariant,
        ),
        border: OutlineInputBorder(
          borderRadius: AppRadius.smAll,
          borderSide: BorderSide(color: colorScheme.outline, width: 1.5),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: AppRadius.smAll,
          borderSide: BorderSide(color: colorScheme.outline, width: 1.5),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: AppRadius.smAll,
          borderSide: BorderSide(color: colorScheme.primary, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: AppRadius.smAll,
          borderSide: BorderSide(color: colorScheme.error, width: 1.5),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: AppRadius.smAll,
          borderSide: BorderSide(color: colorScheme.error, width: 2),
        ),
        disabledBorder: OutlineInputBorder(
          borderRadius: AppRadius.smAll,
          borderSide: BorderSide(
            color: colorScheme.onSurface.withValues(alpha: 0.12),
            width: 1.5,
          ),
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.inputHorizontal,
          vertical: AppSpacing.inputVertical,
        ),
        isDense: false,
        constraints: const BoxConstraints(minHeight: 56),
      ),

      // ── Chip ──────────────────────────────────────────────────────────────
      chipTheme: ChipThemeData(
        backgroundColor: colorScheme.surfaceContainerHighest,
        selectedColor: colorScheme.secondaryContainer,
        labelStyle: AppTypography.labelMedium,
        padding: AppSpacing.chipPaddingAll,
        shape: const RoundedRectangleBorder(
          borderRadius: AppRadius.xsAll,
        ),
        side: BorderSide.none,
      ),

      // ── Dialog ────────────────────────────────────────────────────────────
      dialogTheme: DialogThemeData(
        elevation: AppElevation.level4,
        backgroundColor: colorScheme.surfaceContainerHigh,
        surfaceTintColor: Colors.transparent,
        titleTextStyle: AppTypography.headlineSmall.copyWith(
          color: colorScheme.onSurface,
        ),
        contentTextStyle: AppTypography.bodyMedium.copyWith(
          color: colorScheme.onSurfaceVariant,
        ),
        shape: const RoundedRectangleBorder(
          borderRadius: AppRadius.lgAll,
        ),
        insetPadding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.space6,
          vertical: AppSpacing.space8,
        ),
      ),

      // ── Bottom Sheet ──────────────────────────────────────────────────────
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: colorScheme.surfaceContainerLow,
        surfaceTintColor: Colors.transparent,
        elevation: AppElevation.level3,
        shape: const RoundedRectangleBorder(
          borderRadius: AppRadius.bottomSheetTop,
        ),
        showDragHandle: true,
        dragHandleColor: colorScheme.outlineVariant,
        dragHandleSize: const Size(32, 4),
        modalElevation: AppElevation.level3,
        clipBehavior: Clip.antiAlias,
      ),

      // ── List Tile ─────────────────────────────────────────────────────────
      listTileTheme: ListTileThemeData(
        contentPadding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.listItemPadding,
          vertical: AppSpacing.space2,
        ),
        minLeadingWidth: AppIconSize.md,
        minVerticalPadding: AppSpacing.space3,
        titleTextStyle: AppTypography.titleMedium.copyWith(
          color: colorScheme.onSurface,
        ),
        subtitleTextStyle: AppTypography.bodyMedium.copyWith(
          color: colorScheme.onSurfaceVariant,
        ),
        leadingAndTrailingTextStyle: AppTypography.labelMedium,
        iconColor: colorScheme.onSurfaceVariant,
        tileColor: Colors.transparent,
        shape: const RoundedRectangleBorder(
          borderRadius: AppRadius.smAll,
        ),
      ),

      // ── Divider ───────────────────────────────────────────────────────────
      dividerTheme: DividerThemeData(
        color: colorScheme.outlineVariant,
        thickness: 1,
        space: 1,
      ),

      // ── Snackbar ──────────────────────────────────────────────────────────
      snackBarTheme: SnackBarThemeData(
        backgroundColor: isLight
            ? const Color(0xFF313033)
            : const Color(0xFFE6E1E5),
        contentTextStyle: AppTypography.bodyMedium.copyWith(
          color: isLight ? Colors.white : const Color(0xFF313033),
        ),
        actionTextColor: isLight
            ? PingForceColors.primaryFixed
            : PingForceColors.primary,
        behavior: SnackBarBehavior.floating,
        shape: const RoundedRectangleBorder(
          borderRadius: AppRadius.smAll,
        ),
        elevation: AppElevation.level3,
        insetPadding: const EdgeInsets.all(AppSpacing.space4),
      ),

      // ── Progress Indicator ────────────────────────────────────────────────
      progressIndicatorTheme: ProgressIndicatorThemeData(
        color: colorScheme.primary,
        linearTrackColor: colorScheme.primaryContainer,
        circularTrackColor: colorScheme.primaryContainer,
        linearMinHeight: 4,
      ),

      // ── Switch ────────────────────────────────────────────────────────────
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) return colorScheme.primary;
          return colorScheme.outline;
        }),
        trackColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return colorScheme.primaryContainer;
          }
          return colorScheme.surfaceContainerHighest;
        }),
      ),

      // ── Checkbox ──────────────────────────────────────────────────────────
      checkboxTheme: CheckboxThemeData(
        fillColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) return colorScheme.primary;
          return Colors.transparent;
        }),
        checkColor: WidgetStateProperty.all(colorScheme.onPrimary),
        side: BorderSide(color: colorScheme.outline, width: 1.5),
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(AppRadius.xs)),
        ),
      ),

      // ── Radio ─────────────────────────────────────────────────────────────
      radioTheme: RadioThemeData(
        fillColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) return colorScheme.primary;
          return colorScheme.outline;
        }),
      ),

      // ── Tooltip ───────────────────────────────────────────────────────────
      tooltipTheme: TooltipThemeData(
        decoration: BoxDecoration(
          color: colorScheme.inverseSurface,
          borderRadius: AppRadius.xsAll,
        ),
        textStyle: AppTypography.bodySmall.copyWith(
          color: colorScheme.onInverseSurface,
        ),
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.space3,
          vertical: AppSpacing.space2,
        ),
      ),

      // ── Badge ─────────────────────────────────────────────────────────────
      badgeTheme: BadgeThemeData(
        backgroundColor: colorScheme.error,
        textColor: colorScheme.onError,
        textStyle: AppTypography.labelSmall,
        padding: const EdgeInsets.symmetric(horizontal: 6),
        largeSize: 20,
        smallSize: 8,
      ),

      // ── Icon ─────────────────────────────────────────────────────────────
      iconTheme: IconThemeData(
        color: colorScheme.onSurfaceVariant,
        size: AppIconSize.md,
      ),
      primaryIconTheme: IconThemeData(
        color: colorScheme.primary,
        size: AppIconSize.md,
      ),

      // ── PageTransitions ───────────────────────────────────────────────────
      // Platform defaults: iOS gets Cupertino transitions natively; Android
      // uses the Material zoom/predictive-back transition. (An explicit
      // CupertinoPageTransitionsBuilder mapping broke on newer Flutter SDKs.)

      // ── Visual Density ────────────────────────────────────────────────────
      visualDensity: VisualDensity.standard,

      // ── Material Tap / Splash ─────────────────────────────────────────────
      splashFactory: InkSparkle.splashFactory,
      splashColor: colorScheme.primary.withValues(alpha: 0.08),
      highlightColor: colorScheme.primary.withValues(alpha: 0.04),
    );
  }
}
