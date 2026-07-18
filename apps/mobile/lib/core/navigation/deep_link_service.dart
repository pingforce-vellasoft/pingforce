import 'dart:async';

import 'package:app_links/app_links.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

// ─────────────────────────────────────────────────────────────────────────────
// DEEP LINK SERVICE
// ─────────────────────────────────────────────────────────────────────────────
//
// Handles the invite deep link that ships in the tenant-provisioning welcome
// email:
//
//   pingforce://invite?workspace=ACME&role=ADMIN_MANAGER
//
// It carries no secret — only the public workspace code (and the role the admin
// will sign in as) — so we simply forward those to the login screen, which
// pre-fills the workspace field and jumps straight to the credentials step.
//
// Two entry paths, both covered:
//   • cold start — app launched *by* the link (getInitialLink)
//   • warm       — link opened while the app is already running (uriLinkStream)

class DeepLinkService {
  DeepLinkService(this._router) : _appLinks = AppLinks();

  final GoRouter _router;
  final AppLinks _appLinks;
  StreamSubscription<Uri>? _sub;

  /// Wire up both the cold-start and warm-stream link handlers. Safe to call
  /// once, after the router exists. Never throws — a bad or absent link must
  /// not block app boot.
  Future<void> init() async {
    try {
      final initial = await _appLinks.getInitialLink();
      if (initial != null) {
        _handle(initial);
      }
    } catch (_) {
      // No launch link, or the platform channel is unavailable — ignore.
    }

    _sub = _appLinks.uriLinkStream.listen(
      _handle,
      onError: (_) {}, // malformed links are non-fatal
    );
  }

  void dispose() {
    _sub?.cancel();
  }

  void _handle(Uri uri) {
    // Only the invite link is actionable today. Match on host so we ignore any
    // other scheme routing the OS might hand us.
    if (uri.scheme != 'pingforce' || uri.host != 'invite') return;

    final workspace = uri.queryParameters['workspace']?.trim();
    if (workspace == null || workspace.isEmpty) return;

    final role = uri.queryParameters['role']?.trim();

    // Forward to login as query params. The login screen reads these on build,
    // pre-fills the workspace field, and advances to the credentials step.
    final qp = <String, String>{'workspace': workspace};
    if (role != null && role.isNotEmpty) qp['role'] = role;

    _router.go(Uri(path: '/auth/login', queryParameters: qp).toString());
  }
}

/// Provider so the app root can create + own the service's lifecycle. It depends
/// on [routerProvider] indirectly (passed in), keeping this file router-agnostic.
final deepLinkServiceProvider =
    Provider.family<DeepLinkService, GoRouter>((ref, router) {
  final service = DeepLinkService(router);
  ref.onDispose(service.dispose);
  return service;
});
