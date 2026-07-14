# PingForce Mobile — pubspec.yaml dependency additions

#

# Add these to your pubspec.yaml to support the theme system.

# Only the theme-relevant packages are listed here.

#

# ─────────────────────────────────────────────────────────────────

# In pubspec.yaml → dependencies:

# ─────────────────────────────────────────────────────────────────

dependencies:
flutter:
sdk: flutter

# Typography — Inter & JetBrains Mono

google_fonts: ^6.2.1

# Material Symbols icon pack (Rounded style)

material_symbols_icons: ^4.2719.3

# ─────────────────────────────────────────────────────────────────

# After adding, run:

# flutter pub get

# ─────────────────────────────────────────────────────────────────

# ─────────────────────────────────────────────────────────────────

# In main.dart — minimal setup:

# ─────────────────────────────────────────────────────────────────

# import 'package:flutter/material.dart';

# import 'core/theme/theme.dart';

#

# void main() {

# runApp(const PingForceApp());

# }

#

# class PingForceApp extends StatelessWidget {

# const PingForceApp({super.key});

#

# @override

# Widget build(BuildContext context) {

# return MaterialApp(

# title: 'PingForce',

# debugShowCheckedModeBanner: false,

# theme: AppTheme.light,

# darkTheme: AppTheme.dark,

# themeMode: ThemeMode.system, // or from user preferences

# home: const YourHomeScreen(),

# );

# }

# }

# ─────────────────────────────────────────────────────────────────

# Font caching — add to main() for performance:

# ─────────────────────────────────────────────────────────────────

# import 'package:google_fonts/google_fonts.dart';

#

# void main() {

# WidgetsFlutterBinding.ensureInitialized();

# GoogleFonts.config.allowRuntimeFetching = false; // use bundled fonts

# runApp(const PingForceApp());

# }

# ─────────────────────────────────────────────────────────────────

# Font assets — add to pubspec.yaml flutter section

# if using offline/bundled fonts (recommended for production):

# ─────────────────────────────────────────────────────────────────

# flutter:

# fonts:

# - family: Inter

# fonts:

# - asset: assets/fonts/Inter-Regular.ttf

# weight: 400

# - asset: assets/fonts/Inter-Medium.ttf

# weight: 500

# - asset: assets/fonts/Inter-SemiBold.ttf

# weight: 600

# - asset: assets/fonts/Inter-Bold.ttf

# weight: 700

# - asset: assets/fonts/Inter-ExtraBold.ttf

# weight: 800

# - family: JetBrainsMono

# fonts:

# - asset: assets/fonts/JetBrainsMono-Regular.ttf

# weight: 400
