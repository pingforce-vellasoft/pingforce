import 'package:flutter/material.dart';

import '../../../../core/theme/theme.dart';
import '../auth_state.dart';

// ─────────────────────────────────────────────────────────────────────────────
// SHARED AUTH WIDGETS  (used by login, forgot-password and biometric screens)
// ─────────────────────────────────────────────────────────────────────────────

/// AUTH-001 to AUTH-008 error banner — dismissible, shake animation
class AuthErrorBanner extends StatelessWidget {
  const AuthErrorBanner({
    super.key,
    required this.code,
    required this.shakeAnim,
    required this.onDismiss,
  });

  final AuthErrorCode code;
  final Animation<double> shakeAnim;
  final VoidCallback onDismiss;

  @override
  Widget build(BuildContext context) {
    final isCritical = code.isCritical;

    return AnimatedBuilder(
      animation: shakeAnim,
      builder: (_, child) => Transform.translate(
        offset: Offset(
          shakeAnim.value * 6 * (shakeAnim.value < 0.5 ? -1 : 1),
          0,
        ),
        child: child,
      ),
      child: Container(
        decoration: BoxDecoration(
          color: isCritical
              ? Theme.of(context).colorScheme.errorContainer
              : Theme.of(context).colorScheme.errorContainer.withValues(alpha: 0.7),
          borderRadius: AppRadius.mdAll,
          border: Border.all(
            color: Theme.of(context).colorScheme.error.withValues(alpha: 0.5),
          ),
        ),
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.space4,
          vertical: AppSpacing.space3,
        ),
        child: Row(
          children: [
            Icon(
              isCritical ? Icons.block_rounded : Icons.error_outline_rounded,
              color: Theme.of(context).colorScheme.onErrorContainer,
              size: AppIconSize.sm,
            ),
            const SizedBox(width: AppSpacing.space3),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    code.title,
                    style: AppTypography.labelMedium.copyWith(
                      color: Theme.of(context).colorScheme.onErrorContainer,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  Text(
                    code.message,
                    style: AppTypography.bodySmall.copyWith(
                      color: Theme.of(context)
                          .colorScheme
                          .onErrorContainer
                          .withValues(alpha: 0.85),
                    ),
                  ),
                ],
              ),
            ),
            IconButton(
              icon: Icon(
                Icons.close_rounded,
                size: AppIconSize.sm,
                color: Theme.of(context).colorScheme.onErrorContainer,
              ),
              onPressed: onDismiss,
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
            ),
          ],
        ),
      ),
    );
  }
}

/// Loading button — text → spinner on submit, re-enables on failure
class LoadingButton extends StatelessWidget {
  const LoadingButton({
    super.key,
    required this.isLoading,
    required this.label,
    required this.onPressed,
  });

  final bool isLoading;
  final String label;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 52,
      child: FilledButton(
        onPressed: isLoading ? null : onPressed,
        child: AnimatedSwitcher(
          duration: AppDurations.fast,
          child: isLoading
              ? SizedBox(
                  key: const ValueKey('spinner'),
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.5,
                    color: Theme.of(context).colorScheme.onPrimary,
                  ),
                )
              : Text(key: ValueKey(label), label),
        ),
      ),
    );
  }
}
