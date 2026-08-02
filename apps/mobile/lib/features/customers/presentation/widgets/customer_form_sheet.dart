import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/theme.dart';
import '../../domain/entities/customer.dart';
import '../customer_notifier.dart';

/// Opens the create/edit customer form. Returns true when a write succeeded.
Future<bool?> showCustomerFormSheet(
  BuildContext context, {
  Customer? existing,
}) {
  return showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (_) => _CustomerFormSheet(existing: existing),
  );
}

class _CustomerFormSheet extends ConsumerStatefulWidget {
  const _CustomerFormSheet({this.existing});

  final Customer? existing;

  @override
  ConsumerState<_CustomerFormSheet> createState() => _CustomerFormSheetState();
}

class _CustomerFormSheetState extends ConsumerState<_CustomerFormSheet> {
  final _formKey = GlobalKey<FormState>();

  late final TextEditingController _code;
  late final TextEditingController _legalName;
  late final TextEditingController _displayName;
  late final TextEditingController _email;
  late final TextEditingController _mobile;
  late final TextEditingController _industry;

  String? _customerType;
  String? _status;

  /// Free text on the API, but fixed lists keep the two surfaces consistent.
  static const _customerTypes = <String>[
    'INDIVIDUAL',
    'BUSINESS',
    'GOVERNMENT',
    'ENTERPRISE',
  ];
  static const _statuses = <String>['ACTIVE', 'INACTIVE', 'SUSPENDED'];

  bool get _isEdit => widget.existing != null;

  @override
  void initState() {
    super.initState();
    final c = widget.existing;
    _code = TextEditingController(text: c?.customerCode ?? '');
    _legalName = TextEditingController(text: c?.legalName ?? '');
    _displayName = TextEditingController(text: c?.displayName ?? '');
    _email = TextEditingController(text: c?.primaryEmail ?? '');
    _mobile = TextEditingController(text: c?.primaryMobile ?? '');
    _industry = TextEditingController(text: c?.industry ?? '');
    _customerType =
        _customerTypes.contains(c?.customerType) ? c?.customerType : null;
    _status = _statuses.contains(c?.status) ? c?.status : null;
  }

  @override
  void dispose() {
    _code.dispose();
    _legalName.dispose();
    _displayName.dispose();
    _email.dispose();
    _mobile.dispose();
    _industry.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isSaving = ref.watch(customerNotifierProvider).isSaving;

    return Padding(
      // Lift the sheet above the keyboard so the focused field stays visible.
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.space5),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                _isEdit ? 'Edit customer' : 'Add customer',
                style: AppTypography.titleLarge,
              ),
              const SizedBox(height: AppSpacing.space4),

              TextFormField(
                controller: _code,
                textCapitalization: TextCapitalization.characters,
                decoration: const InputDecoration(
                  labelText: 'Customer code *',
                  hintText: 'CUST001',
                ),
                validator: (v) => (v == null || v.trim().isEmpty)
                    ? 'Customer code is required'
                    : null,
              ),
              const SizedBox(height: AppSpacing.space3),

              TextFormField(
                controller: _legalName,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(labelText: 'Legal name *'),
                validator: (v) => (v == null || v.trim().isEmpty)
                    ? 'Legal name is required'
                    : null,
              ),
              const SizedBox(height: AppSpacing.space3),

              TextFormField(
                controller: _displayName,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(labelText: 'Display name'),
              ),
              const SizedBox(height: AppSpacing.space3),

              DropdownButtonFormField<String>(
                initialValue: _customerType,
                decoration: const InputDecoration(labelText: 'Customer type'),
                items: [
                  for (final t in _customerTypes)
                    DropdownMenuItem(value: t, child: Text(_label(t))),
                ],
                onChanged: (v) => setState(() => _customerType = v),
              ),
              const SizedBox(height: AppSpacing.space3),

              TextFormField(
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(labelText: 'Email'),
                // Optional, but the API rejects a malformed address, so catch
                // it here rather than round-tripping a 400.
                validator: (v) {
                  final t = v?.trim() ?? '';
                  if (t.isEmpty) return null;
                  final ok = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(t);
                  return ok ? null : 'Enter a valid email address';
                },
              ),
              const SizedBox(height: AppSpacing.space3),

              TextFormField(
                controller: _mobile,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(labelText: 'Mobile'),
              ),
              const SizedBox(height: AppSpacing.space3),

              TextFormField(
                controller: _industry,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(labelText: 'Industry'),
              ),
              const SizedBox(height: AppSpacing.space3),

              DropdownButtonFormField<String>(
                initialValue: _status,
                decoration: const InputDecoration(labelText: 'Status'),
                items: [
                  for (final s in _statuses)
                    DropdownMenuItem(value: s, child: Text(_label(s))),
                ],
                onChanged: (v) => setState(() => _status = v),
              ),
              const SizedBox(height: AppSpacing.space6),

              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed:
                          isSaving ? null : () => Navigator.of(context).pop(),
                      child: const Text('Cancel'),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.space3),
                  Expanded(
                    child: FilledButton(
                      onPressed: isSaving ? null : _submit,
                      child: isSaving
                          ? const SizedBox(
                              height: 18,
                              width: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : Text(_isEdit ? 'Save' : 'Create'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _label(String raw) => raw
      .split('_')
      .map((w) => w.isEmpty ? w : '${w[0]}${w.substring(1).toLowerCase()}')
      .join(' ');

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;

    final notifier = ref.read(customerNotifierProvider.notifier);
    final navigator = Navigator.of(context);
    final messenger = ScaffoldMessenger.of(context);

    final error = _isEdit
        ? await notifier.update(
            widget.existing!.id,
            customerCode: _code.text,
            legalName: _legalName.text,
            displayName: _displayName.text,
            customerType: _customerType,
            primaryEmail: _email.text,
            primaryMobile: _mobile.text,
            industry: _industry.text,
            status: _status,
          )
        : await notifier.create(
            customerCode: _code.text,
            legalName: _legalName.text,
            displayName: _displayName.text,
            customerType: _customerType,
            primaryEmail: _email.text,
            primaryMobile: _mobile.text,
            industry: _industry.text,
            status: _status,
          );

    if (!mounted) return;
    if (error != null) {
      messenger.showSnackBar(SnackBar(content: Text(error)));
      return;
    }
    navigator.pop(true);
    messenger.showSnackBar(
      SnackBar(content: Text(_isEdit ? 'Customer updated' : 'Customer created')),
    );
  }
}
