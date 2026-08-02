import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/auth/auth_session.dart';
import '../../../injection_container.dart';
import '../domain/repositories/auth_repository.dart';
import 'auth_notifier.dart';

/// Forced password-change screen shown to accounts provisioned with an
/// admin-chosen temporary password (e.g. the tenant admin from the welcome
/// email). The router gates the rest of the app behind this until the change
/// succeeds. On success the server revokes the session, so the user is routed
/// back to login for a fresh sign-in.
class ForceChangePasswordScreen extends ConsumerStatefulWidget {
  const ForceChangePasswordScreen({super.key});

  @override
  ConsumerState<ForceChangePasswordScreen> createState() =>
      _ForceChangePasswordScreenState();
}

class _ForceChangePasswordScreenState
    extends ConsumerState<ForceChangePasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _currentCtrl = TextEditingController();
  final _newCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();

  bool _obscureCurrent = true;
  bool _obscureNew = true;
  bool _isLoading = false;
  String? _error;

  @override
  void dispose() {
    _currentCtrl.dispose();
    _newCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _error = null;
    });

    final result = await sl<AuthRepository>().changePassword(
      _currentCtrl.text,
      _newCtrl.text,
    );

    if (!mounted) return;

    result.fold(
      (failure) {
        setState(() {
          _isLoading = false;
          _error = failure.message;
        });
      },
      (_) {
        // Local token already cleared by the repo; clear session flags and
        // send the user back to a clean login.
        AuthSession.instance.mustChangePassword = false;
        AuthSession.instance.isAuthenticated = false;
        // The login notifier is keep-alive, so it still holds
        // isAuthenticated: true from the sign-in that landed here, which would
        // make the next sign-in a true => true no-op. Clear just that flag —
        // invalidating the provider would also wipe the workspace code the user
        // typed, which the login screen's text controllers would keep showing.
        ref.read(loginProvider.notifier).clearAuthenticatedFlag();
        context.go('/auth/login');
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Set a new password')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Icon(Icons.lock_reset,
                    size: 56, color: theme.colorScheme.primary),
                const SizedBox(height: 16),
                Text(
                  'Your temporary password must be changed before you continue.',
                  style: theme.textTheme.bodyMedium,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                TextFormField(
                  controller: _currentCtrl,
                  obscureText: _obscureCurrent,
                  decoration: InputDecoration(
                    labelText: 'Current (temporary) password',
                    prefixIcon: const Icon(Icons.lock_outline),
                    suffixIcon: IconButton(
                      icon: Icon(_obscureCurrent
                          ? Icons.visibility_off
                          : Icons.visibility),
                      onPressed: () => setState(
                          () => _obscureCurrent = !_obscureCurrent),
                    ),
                  ),
                  validator: (v) =>
                      (v == null || v.isEmpty) ? 'Required' : null,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _newCtrl,
                  obscureText: _obscureNew,
                  decoration: InputDecoration(
                    labelText: 'New password',
                    prefixIcon: const Icon(Icons.lock_open),
                    suffixIcon: IconButton(
                      icon: Icon(_obscureNew
                          ? Icons.visibility_off
                          : Icons.visibility),
                      onPressed: () =>
                          setState(() => _obscureNew = !_obscureNew),
                    ),
                  ),
                  validator: (v) {
                    if (v == null || v.length < 8) {
                      return 'At least 8 characters';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _confirmCtrl,
                  obscureText: _obscureNew,
                  decoration: const InputDecoration(
                    labelText: 'Confirm new password',
                    prefixIcon: Icon(Icons.lock_open),
                  ),
                  validator: (v) =>
                      v != _newCtrl.text ? 'Passwords do not match' : null,
                ),
                if (_error != null) ...[
                  const SizedBox(height: 16),
                  Text(
                    _error!,
                    style: TextStyle(color: theme.colorScheme.error),
                    textAlign: TextAlign.center,
                  ),
                ],
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: _isLoading ? null : _submit,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    child: _isLoading
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child:
                                CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('Change password'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
