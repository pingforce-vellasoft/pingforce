import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:go_router/go_router.dart';

import '../../../core/auth/auth_session.dart';
import '../../../injection_container.dart';
import '../data/profile_remote_data_source.dart';
import 'profile_models.dart';
import 'profile_notifier.dart';

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE SCREEN — real user profile (GET /auth/me) + account entry points.
// ─────────────────────────────────────────────────────────────────────────────

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(profileNotifierProvider.notifier).load();
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(profileNotifierProvider);
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: RefreshIndicator(
        onRefresh: () => ref.read(profileNotifierProvider.notifier).load(),
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: EdgeInsets.fromLTRB(
            0,
            16,
            0,
            16 + MediaQuery.of(context).viewPadding.bottom,
          ),
          children: [
            if (state.isLoading)
              const Padding(
                padding: EdgeInsets.only(top: 80),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (state.errorMessage != null)
              _ErrorBlock(
                message: state.errorMessage!,
                onRetry: () => ref.read(profileNotifierProvider.notifier).load(),
              )
            else if (state.profile != null) ...[
              _ProfileHeader(profile: state.profile!),
              const SizedBox(height: 24),

              _SectionLabel('Account'),
              _NavTile(
                icon: Icons.devices_rounded,
                title: 'Active Sessions',
                subtitle: 'Devices currently signed in',
                onTap: () => context.push('/profile/sessions'),
              ),
              _NavTile(
                icon: Icons.history_rounded,
                title: 'Login History',
                subtitle: 'Recent sign-in activity',
                onTap: () => context.push('/profile/login-history'),
              ),
              _NavTile(
                icon: Icons.event_available_rounded,
                title: 'Attendance History',
                subtitle: 'Your past attendance sessions',
                onTap: () => context.push('/attendance/history'),
              ),

              const SizedBox(height: 16),
              _SectionLabel('Security'),
              _NavTile(
                icon: Icons.logout_rounded,
                title: 'Sign out everywhere',
                subtitle: 'Revoke all other sessions',
                iconColor: cs.error,
                onTap: _confirmLogoutAll,
              ),

              const SizedBox(height: 24),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: FilledButton.icon(
                  style: FilledButton.styleFrom(
                    backgroundColor: cs.errorContainer,
                    foregroundColor: cs.onErrorContainer,
                    minimumSize: const Size.fromHeight(48),
                  ),
                  onPressed: _logout,
                  icon: const Icon(Icons.logout_rounded),
                  label: const Text('Sign Out'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Future<void> _confirmLogoutAll() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Sign out everywhere?'),
        content: const Text(
          'This revokes every active session and signs you out on all devices.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Sign out all'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await sl<ProfileRemoteDataSource>().logoutAll();
    } catch (_) {
      // Best-effort; local sign-out proceeds regardless.
    }
    await _finishSignOut();
  }

  Future<void> _logout() async {
    try {
      await sl<ProfileRemoteDataSource>().logout();
    } catch (_) {
      // Best-effort; clear the local session regardless of network result.
    }
    await _finishSignOut();
  }

  Future<void> _finishSignOut() async {
    await AuthSession.instance.signOut(sl<FlutterSecureStorage>());
    if (mounted) context.go('/auth/login');
  }
}

// ── Header ───────────────────────────────────────────────────────────────────

class _ProfileHeader extends StatelessWidget {
  const _ProfileHeader({required this.profile});
  final ProfileInfo profile;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Column(
      children: [
        CircleAvatar(
          radius: 40,
          backgroundColor: cs.primaryContainer,
          foregroundImage: (profile.avatar != null && profile.avatar!.isNotEmpty)
              ? NetworkImage(profile.avatar!)
              : null,
          child: Text(
            profile.initials,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  color: cs.onPrimaryContainer,
                  fontWeight: FontWeight.w700,
                ),
          ),
        ),
        const SizedBox(height: 12),
        Text(
          profile.displayName,
          style: Theme.of(context)
              .textTheme
              .titleLarge
              ?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 4),
        Text(
          profile.email,
          style: Theme.of(context)
              .textTheme
              .bodyMedium
              ?.copyWith(color: cs.onSurfaceVariant),
        ),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
          decoration: BoxDecoration(
            color: cs.secondaryContainer,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            profile.roleLabel,
            style: Theme.of(context).textTheme.labelMedium?.copyWith(
                  color: cs.onSecondaryContainer,
                  fontWeight: FontWeight.w600,
                ),
          ),
        ),
      ],
    );
  }
}

// ── Reusable bits ─────────────────────────────────────────────────────────────

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      child: Text(
        text.toUpperCase(),
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
              letterSpacing: 0.6,
              fontWeight: FontWeight.w600,
            ),
      ),
    );
  }
}

class _NavTile extends StatelessWidget {
  const _NavTile({
    required this.icon,
    required this.title,
    required this.onTap,
    this.subtitle,
    this.iconColor,
  });

  final IconData icon;
  final String title;
  final String? subtitle;
  final VoidCallback onTap;
  final Color? iconColor;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return ListTile(
      leading: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: (iconColor ?? cs.primary).withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(icon, size: 20, color: iconColor ?? cs.primary),
      ),
      title: Text(title),
      subtitle: subtitle != null ? Text(subtitle!) : null,
      trailing: const Icon(Icons.chevron_right_rounded),
      onTap: onTap,
    );
  }
}

class _ErrorBlock extends StatelessWidget {
  const _ErrorBlock({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 80, 24, 0),
      child: Column(
        children: [
          Icon(
            Icons.cloud_off_rounded,
            size: 48,
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
          const SizedBox(height: 16),
          Text(message, textAlign: TextAlign.center),
          const SizedBox(height: 16),
          OutlinedButton(onPressed: onRetry, child: const Text('Retry')),
        ],
      ),
    );
  }
}
