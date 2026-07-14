import 'package:flutter/material.dart';

import '../../../../../core/theme/theme.dart';

// ─────────────────────────────────────────────────────────────────────────────
// MOCK LOCATION BLOCKER  (CHECKIN_FLOW_SPEC.md §6 S14)
// ─────────────────────────────────────────────────────────────────────────────

class MockLocationBlocker extends StatelessWidget {
  const MockLocationBlocker({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      body: SafeArea(
        child: Padding(
          padding: AppSpacing.screenPaddingAll,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Icon(
                Icons.shield_rounded,
                size: AppIconSize.xxl,
                color: Theme.of(context).colorScheme.error,
              ),

              AppSpacing.sectionGapBox,

              Text(
                'Location Spoofing Detected',
                style: AppTypography.headlineMedium.copyWith(
                  color: Theme.of(context).colorScheme.onSurface,
                ),
                textAlign: TextAlign.center,
              ),

              AppSpacing.mediumGapBox,

              Text(
                'Your device appears to be using a simulated location. '
                'Attendance cannot be recorded for security reasons.\n\n'
                'Disable developer location settings and try again.',
                style: AppTypography.bodyMedium.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ),

              AppSpacing.sectionGapBox,

              FilledButton.icon(
                onPressed: () {
                  // TODO: open app settings via app_settings package
                },
                icon: const Icon(Icons.settings_rounded),
                label: const Text('Open Settings'),
              ),

              AppSpacing.smallGapBox,

              OutlinedButton.icon(
                onPressed: () {
                  // TODO: open HR contact or in-app support
                },
                icon: const Icon(Icons.support_agent_rounded),
                label: const Text('Contact HR'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
