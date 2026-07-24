import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';

// ─────────────────────────────────────────────────────────────────────────────
// BACKGROUND LOCATION PERMISSION  (Google Play sensitive-permission compliance)
// ─────────────────────────────────────────────────────────────────────────────
//
// Single acquisition path for ACCESS_BACKGROUND_LOCATION ("Allow all the time")
// and the Android 13+ POST_NOTIFICATIONS grant that the tracking foreground
// service needs. Google Play requires a prominent in-app disclosure shown BEFORE
// the OS "Allow all the time" dialog, describing background collection in its
// own right and letting the user decline. Requesting locationAlways without it
// is grounds for policy rejection.
//
// Both the onboarding permissions flow and the in-context check-in gate route
// through here so the disclosure is never bypassed.

class BackgroundLocationPermission {
  BackgroundLocationPermission._();

  /// Ensures the notification permission for the tracking foreground-service
  /// notification (Android 13+). Best-effort — capture still works without it,
  /// only the persistent notification would be suppressed.
  static Future<void> ensureNotifications() async {
    final status = await Permission.notification.status;
    if (status.isGranted || status.isPermanentlyDenied) return;
    await Permission.notification.request();
  }

  /// Acquires background location ("Allow all the time"), showing the Play
  /// prominent disclosure first. Returns true only if the grant is held.
  ///
  /// Preconditions handled here:
  ///   • Foreground location must already be granted — Android 11+ only offers
  ///     "Allow all the time" after when-in-use is held. If it isn't, this
  ///     returns false without prompting (the caller's foreground GPS flow owns
  ///     that grant).
  ///   • If background is already granted, returns true immediately with no UI.
  ///   • If the user declines the disclosure, returns false and does NOT invoke
  ///     the OS dialog.
  static Future<bool> ensure(BuildContext context) async {
    if (await Permission.locationAlways.isGranted) return true;

    final foreground = await Permission.locationWhenInUse.status;
    if (!foreground.isGranted && !foreground.isLimited) return false;

    if (!context.mounted) return false;
    final accepted = await showDisclosure(context);
    if (accepted != true) return false;

    final result = await Permission.locationAlways.request();
    return result.isGranted;
  }

  /// The Play prominent disclosure. States what is collected, that collection
  /// continues in the background, and its purpose — before the OS dialog. Shown
  /// standalone so it is reusable by every locationAlways request site.
  static Future<bool?> showDisclosure(BuildContext context) {
    return showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        icon: Icon(
          Icons.my_location_rounded,
          color: Theme.of(ctx).colorScheme.primary,
          size: 36,
        ),
        title: const Text('Allow background location?'),
        content: const Text(
          'PingForce collects location data to record your route and visit '
          'sites for your employer while you are clocked in.\n\n'
          'This collection continues in the background — while the app is '
          'closed or not in use — and only between your check-in and '
          'check-out. It stops when you clock out.\n\n'
          'You can decline and still use GPS check-in; only background route '
          'tracking will be unavailable.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('No thanks'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Continue'),
          ),
        ],
      ),
    );
  }
}
