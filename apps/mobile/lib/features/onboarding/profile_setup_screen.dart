import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/auth/auth_session.dart';
import '../../core/navigation/app_shell.dart';
import '../../injection_container.dart';
import '../auth/domain/usecases/onboard_employee_command.dart';
import '../auth/domain/usecases/onboard_tenant_command.dart';

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE SETUP  (first-login onboarding — mobile counterpart of the admin
// portal's /onboarding page)
// ─────────────────────────────────────────────────────────────────────────────
//
// Reached only via RouteGuard when the signed-in account has no profile yet
// (`isOnboarded == false`). Two shapes, decided by role:
//
//   Tenant owner (ADMIN*) → step 1 profile + company, step 2 white-label
//                           branding (theme colour + logo), then
//                           POST /auth/onboarding/tenant
//   Everyone else         → single profile step, then
//                           POST /auth/onboarding/employee
//
// The branding step is optional and skippable; the profile step is not.

class ProfileSetupScreen extends ConsumerStatefulWidget {
  const ProfileSetupScreen({super.key});

  @override
  ConsumerState<ProfileSetupScreen> createState() => _ProfileSetupScreenState();
}

class _ProfileSetupScreenState extends ConsumerState<ProfileSetupScreen> {
  final _profileFormKey = GlobalKey<FormState>();

  final _firstNameCtrl = TextEditingController();
  final _lastNameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();

  // Tenant-owner only
  final _companyCtrl = TextEditingController();
  final _industryCtrl = TextEditingController();
  final _legalNameCtrl = TextEditingController();
  final _addressCtrl = TextEditingController();
  final _cityCtrl = TextEditingController();
  final _stateCtrl = TextEditingController();

  /// Whether the branding (step 2) page is showing. Tenant owners only.
  bool _onBrandingStep = false;

  Color? _themeColor;
  String? _logoBase64;
  String? _logoName;

  bool _isLoading = false;
  String? _error;

  bool get _isTenantOwner => AuthSession.instance.isTenantOwner;

  @override
  void dispose() {
    _firstNameCtrl.dispose();
    _lastNameCtrl.dispose();
    _phoneCtrl.dispose();
    _companyCtrl.dispose();
    _industryCtrl.dispose();
    _legalNameCtrl.dispose();
    _addressCtrl.dispose();
    _cityCtrl.dispose();
    _stateCtrl.dispose();
    super.dispose();
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  void _continueFromProfile() {
    if (!_profileFormKey.currentState!.validate()) return;
    if (_isTenantOwner) {
      setState(() {
        _onBrandingStep = true;
        _error = null;
      });
    } else {
      _submit();
    }
  }

  Future<void> _pickLogo() async {
    try {
      final picked = await ImagePicker().pickImage(
        source: ImageSource.gallery,
        // Logos render at avatar/app-bar sizes; capping keeps the base64 body
        // small enough for a JSON POST.
        maxWidth: 512,
        maxHeight: 512,
        imageQuality: 90,
      );
      if (picked == null) return;
      final bytes = await picked.readAsBytes();
      if (!mounted) return;
      setState(() {
        _logoBase64 = 'data:image/png;base64,${base64Encode(bytes)}';
        _logoName = picked.name;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = 'Could not read that image. Try another file.');
    }
  }

  Future<void> _pickThemeColor() async {
    final chosen = await showDialog<Color>(
      context: context,
      builder: (ctx) => SimpleDialog(
        title: const Text('Theme colour'),
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
            child: Wrap(
              spacing: 12,
              runSpacing: 12,
              children: _brandSwatches
                  .map(
                    (c) => InkWell(
                      onTap: () => Navigator.pop(ctx, c),
                      customBorder: const CircleBorder(),
                      child: CircleAvatar(backgroundColor: c, radius: 20),
                    ),
                  )
                  .toList(),
            ),
          ),
        ],
      ),
    );
    if (chosen != null && mounted) setState(() => _themeColor = chosen);
  }

  Future<void> _submit() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    final result = _isTenantOwner
        ? await sl<OnboardTenantCommand>()(
            OnboardTenantParams(
              firstName: _firstNameCtrl.text.trim(),
              lastName: _lastNameCtrl.text.trim(),
              phone: _phoneCtrl.text.trim(),
              companyName: _companyCtrl.text.trim(),
              industry: _industryCtrl.text.trim(),
              legalName: _legalNameCtrl.text.trim(),
              address: _addressCtrl.text.trim(),
              city: _cityCtrl.text.trim(),
              state: _stateCtrl.text.trim(),
              themeColor: _hexOf(_themeColor),
              logoBase64: _logoBase64,
            ),
          )
        : await sl<OnboardEmployeeCommand>()(
            OnboardEmployeeParams(
              firstName: _firstNameCtrl.text.trim(),
              lastName: _lastNameCtrl.text.trim(),
              phone: _phoneCtrl.text.trim(),
              tenantCode: await _storedTenantCode(),
            ),
          );

    if (!mounted) return;

    result.fold(
      (failure) => setState(() {
        _isLoading = false;
        _error = failure.message;
      }),
      (_) {
        // The repository already flipped the cached user; mirror it on the
        // in-memory session so RouteGuard lets /home through.
        AuthSession.instance.isOnboarded = true;
        ref.read(appShellProvider.notifier).syncRoleFromSession();
        context.go('/home');
      },
    );
  }

  Future<String> _storedTenantCode() async {
    try {
      final code = await sl<FlutterSecureStorage>().read(key: 'tenant_code');
      return code ?? '';
    } catch (_) {
      return '';
    }
  }

  static String? _hexOf(Color? color) {
    if (color == null) return null;
    // toARGB32() keeps the value in the 0xAARRGGBB form the API expects as
    // #RRGGBB, without the deprecated per-channel double getters.
    final rgb = color.toARGB32() & 0x00FFFFFF;
    return '#${rgb.toRadixString(16).padLeft(6, '0')}';
  }

  // ── Build ──────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final totalSteps = _isTenantOwner ? 2 : 1;
    final currentStep = _onBrandingStep ? 2 : 1;

    return PopScope(
      // Setup is mandatory — back must not escape it, only step back within it.
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) return;
        if (_onBrandingStep) setState(() => _onBrandingStep = false);
      },
      child: Scaffold(
        appBar: AppBar(
          automaticallyImplyLeading: false,
          title: Text(_onBrandingStep ? 'Branding' : 'Complete your profile'),
          leading: _onBrandingStep
              ? IconButton(
                  icon: const Icon(Icons.arrow_back),
                  onPressed: _isLoading
                      ? null
                      : () => setState(() => _onBrandingStep = false),
                )
              : null,
          bottom: PreferredSize(
            preferredSize: const Size.fromHeight(4),
            child: LinearProgressIndicator(value: currentStep / totalSteps),
          ),
        ),
        body: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: _onBrandingStep
                ? _buildBrandingStep(theme)
                : _buildProfileStep(theme),
          ),
        ),
      ),
    );
  }

  Widget _buildProfileStep(ThemeData theme) {
    return Form(
      key: _profileFormKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Icon(Icons.account_circle_outlined,
              size: 56, color: theme.colorScheme.primary),
          const SizedBox(height: 16),
          Text(
            _isTenantOwner
                ? 'A few details to finish setting up your workspace.'
                : 'Tell us who you are before you get started.',
            style: theme.textTheme.bodyMedium,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          TextFormField(
            controller: _firstNameCtrl,
            textCapitalization: TextCapitalization.words,
            decoration: const InputDecoration(
              labelText: 'First name',
              prefixIcon: Icon(Icons.person_outline),
            ),
            validator: _required,
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _lastNameCtrl,
            textCapitalization: TextCapitalization.words,
            decoration: const InputDecoration(
              labelText: 'Last name',
              prefixIcon: Icon(Icons.person_outline),
            ),
            validator: _required,
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _phoneCtrl,
            keyboardType: TextInputType.phone,
            inputFormatters: [
              FilteringTextInputFormatter.allow(RegExp(r'[0-9+\- ]')),
            ],
            decoration: const InputDecoration(
              labelText: 'Mobile phone',
              prefixIcon: Icon(Icons.phone_outlined),
            ),
            validator: (v) {
              if (v == null || v.trim().isEmpty) return 'Required';
              final digits = v.replaceAll(RegExp(r'\D'), '');
              return digits.length < 7 ? 'Enter a valid phone number' : null;
            },
          ),
          if (_isTenantOwner) ...[
            const SizedBox(height: 24),
            Align(
              alignment: Alignment.centerLeft,
              child: Text('Company', style: theme.textTheme.titleSmall),
            ),
            const SizedBox(height: 8),
            TextFormField(
              controller: _companyCtrl,
              textCapitalization: TextCapitalization.words,
              decoration: const InputDecoration(
                labelText: 'Company name',
                prefixIcon: Icon(Icons.business_outlined),
              ),
              validator: _required,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _industryCtrl,
              textCapitalization: TextCapitalization.words,
              decoration: const InputDecoration(
                labelText: 'Industry (optional)',
                prefixIcon: Icon(Icons.category_outlined),
              ),
            ),
          ],
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
            onPressed: _isLoading ? null : _continueFromProfile,
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: _isLoading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Text(_isTenantOwner ? 'Next' : 'Finish setup'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBrandingStep(ThemeData theme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Icon(Icons.palette_outlined,
            size: 56, color: theme.colorScheme.primary),
        const SizedBox(height: 16),
        Text(
          'Make the app yours. You can change any of this later in Settings.',
          style: theme.textTheme.bodyMedium,
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 24),

        // ── Logo ───────────────────────────────────────────────────────────
        ListTile(
          contentPadding: EdgeInsets.zero,
          leading: CircleAvatar(
            backgroundColor: theme.colorScheme.surfaceContainerHighest,
            child: const Icon(Icons.image_outlined),
          ),
          title: const Text('Company logo'),
          subtitle: Text(_logoName ?? 'Optional — PNG or JPG'),
          trailing: TextButton(
            onPressed: _isLoading ? null : _pickLogo,
            child: Text(_logoBase64 == null ? 'Upload' : 'Change'),
          ),
        ),
        const Divider(),

        // ── Theme colour ───────────────────────────────────────────────────
        ListTile(
          contentPadding: EdgeInsets.zero,
          leading: CircleAvatar(
            backgroundColor:
                _themeColor ?? theme.colorScheme.surfaceContainerHighest,
            child: _themeColor == null
                ? const Icon(Icons.color_lens_outlined)
                : null,
          ),
          title: const Text('Theme colour'),
          subtitle: Text(_hexOf(_themeColor) ?? 'Optional — use the default'),
          trailing: TextButton(
            onPressed: _isLoading ? null : _pickThemeColor,
            child: Text(_themeColor == null ? 'Choose' : 'Change'),
          ),
        ),
        const Divider(),
        const SizedBox(height: 8),

        // ── Company details ────────────────────────────────────────────────
        TextFormField(
          controller: _legalNameCtrl,
          textCapitalization: TextCapitalization.words,
          decoration: const InputDecoration(
            labelText: 'Legal company name (optional)',
          ),
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _addressCtrl,
          textCapitalization: TextCapitalization.words,
          decoration: const InputDecoration(labelText: 'Address (optional)'),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: TextFormField(
                controller: _cityCtrl,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(labelText: 'City'),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: TextFormField(
                controller: _stateCtrl,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(labelText: 'State'),
              ),
            ),
          ],
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
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Finish setup'),
          ),
        ),
        TextButton(
          onPressed: _isLoading ? null : _submit,
          child: const Text('Skip branding for now'),
        ),
      ],
    );
  }

  static String? _required(String? v) =>
      (v == null || v.trim().isEmpty) ? 'Required' : null;
}

/// Starter palette for the white-label theme colour. Deliberately small — the
/// full picker lives in the admin portal.
const _brandSwatches = <Color>[
  Color(0xFF6750A4),
  Color(0xFF00639B),
  Color(0xFF2E7D32),
  Color(0xFFB3261E),
  Color(0xFFE65100),
  Color(0xFF00695C),
  Color(0xFF37474F),
  Color(0xFF4A148C),
];
