import 'package:flutter/material.dart';

import '../../../../../core/theme/theme.dart';

// ─────────────────────────────────────────────────────────────────────────────
// OFFLINE BANNER  (CHECKIN_FLOW_SPEC.md §6 S7)
// ─────────────────────────────────────────────────────────────────────────────

class OfflineBanner extends StatelessWidget {
  const OfflineBanner({super.key});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: PingForceColors.offlineBannerBg,
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.screenHorizontal,
            vertical: AppSpacing.space2,
          ),
          child: Row(
            children: [
              const Icon(
                Icons.cloud_off_rounded,
                size: AppIconSize.sm,
                color: PingForceColors.offlineBannerFg,
              ),
              AppSpacing.iconGapBox,
              Expanded(
                child: Text(
                  'You are offline — check-in will sync when connected',
                  style: AppTypography.labelMedium.copyWith(
                    color: PingForceColors.offlineBannerFg,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
