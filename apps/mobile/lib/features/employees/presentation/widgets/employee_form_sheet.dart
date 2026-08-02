import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/theme.dart';
import '../../domain/entities/employee.dart';
import '../employee_notifier.dart';

/// Opens the create/edit employee form.
///
/// Returns the [EmployeeCreateResult] when a NEW employee was created (so the
/// caller can surface a one-time temporary password), and null on cancel or on
/// a successful edit — an edit has no password to reveal.
Future<EmployeeCreateResult?> showEmployeeFormSheet(
  BuildContext context, {
  Employee? existing,
}) {
  return showModalBottomSheet<EmployeeCreateResult>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (_) => _EmployeeFormSheet(existing: existing),
  );
}

class _EmployeeFormSheet extends ConsumerStatefulWidget {
  const _EmployeeFormSheet({this.existing});

  final Employee? existing;

  @override
  ConsumerState<_EmployeeFormSheet> createState() => _EmployeeFormSheetState();
}

class _EmployeeFormSheetState extends ConsumerState<_EmployeeFormSheet> {
  final _formKey = GlobalKey<FormState>();

  late final TextEditingController _code;
  late final TextEditingController _firstName;
  late final TextEditingController _lastName;
  late final TextEditingController _email;
  late final TextEditingController _mobile;

  String? _employmentType;
  DateTime? _joiningDate;

  /// Employment types the web portal offers. Free text on the API, but a fixed
  /// list keeps the data consistent across the two surfaces.
  static const _employmentTypes = <String>[
    'FULL_TIME',
    'PART_TIME',
    'CONTRACT',
    'INTERN',
  ];

  bool get _isEdit => widget.existing != null;

  @override
  void initState() {
    super.initState();
    final e = widget.existing;
    _code = TextEditingController(text: e?.employeeCode ?? '');
    _firstName = TextEditingController(text: e?.firstName ?? '');
    _lastName = TextEditingController(text: e?.lastName ?? '');
    _email = TextEditingController(text: e?.primaryEmail ?? '');
    _mobile = TextEditingController(text: e?.primaryMobile ?? '');
    _employmentType =
        _employmentTypes.contains(e?.employmentType) ? e?.employmentType : null;
    _joiningDate = e?.joiningDate;
  }

  @override
  void dispose() {
    _code.dispose();
    _firstName.dispose();
    _lastName.dispose();
    _email.dispose();
    _mobile.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isSaving = ref.watch(employeeNotifierProvider).isSaving;

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
                _isEdit ? 'Edit employee' : 'Add employee',
                style: AppTypography.titleLarge,
              ),
              const SizedBox(height: AppSpacing.space4),

              TextFormField(
                controller: _code,
                textCapitalization: TextCapitalization.characters,
                decoration: const InputDecoration(
                  labelText: 'Employee code *',
                  hintText: 'EMP001',
                ),
                validator: (v) => (v == null || v.trim().isEmpty)
                    ? 'Employee code is required'
                    : null,
              ),
              const SizedBox(height: AppSpacing.space3),

              TextFormField(
                controller: _firstName,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(labelText: 'First name *'),
                validator: (v) => (v == null || v.trim().isEmpty)
                    ? 'First name is required'
                    : null,
              ),
              const SizedBox(height: AppSpacing.space3),

              TextFormField(
                controller: _lastName,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(labelText: 'Last name *'),
                validator: (v) => (v == null || v.trim().isEmpty)
                    ? 'Last name is required'
                    : null,
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

              DropdownButtonFormField<String>(
                initialValue: _employmentType,
                decoration:
                    const InputDecoration(labelText: 'Employment type'),
                items: [
                  for (final t in _employmentTypes)
                    DropdownMenuItem(value: t, child: Text(_label(t))),
                ],
                onChanged: (v) => setState(() => _employmentType = v),
              ),
              const SizedBox(height: AppSpacing.space3),

              _JoiningDateField(
                value: _joiningDate,
                onPick: (d) => setState(() => _joiningDate = d),
                onClear: () => setState(() => _joiningDate = null),
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

    final notifier = ref.read(employeeNotifierProvider.notifier);
    final navigator = Navigator.of(context);
    final messenger = ScaffoldMessenger.of(context);

    if (_isEdit) {
      final error = await notifier.update(
        widget.existing!.id,
        employeeCode: _code.text,
        firstName: _firstName.text,
        lastName: _lastName.text,
        primaryEmail: _email.text,
        primaryMobile: _mobile.text,
        employmentType: _employmentType,
        joiningDate: _joiningDate,
      );
      if (!mounted) return;
      if (error != null) {
        messenger.showSnackBar(SnackBar(content: Text(error)));
        return;
      }
      navigator.pop();
      messenger.showSnackBar(
        const SnackBar(content: Text('Employee updated')),
      );
      return;
    }

    final created = await notifier.create(
      employeeCode: _code.text,
      firstName: _firstName.text,
      lastName: _lastName.text,
      primaryEmail: _email.text,
      primaryMobile: _mobile.text,
      employmentType: _employmentType,
      joiningDate: _joiningDate,
    );
    if (!mounted) return;
    if (created == null) {
      final message = ref.read(employeeNotifierProvider).errorMessage;
      messenger.showSnackBar(
        SnackBar(content: Text(message ?? 'Failed to create employee')),
      );
      return;
    }
    navigator.pop(created);
    messenger.showSnackBar(const SnackBar(content: Text('Employee created')));
  }
}

/// Read-only date field that opens a picker. Kept separate so the form body
/// stays legible.
class _JoiningDateField extends StatelessWidget {
  const _JoiningDateField({
    required this.value,
    required this.onPick,
    required this.onClear,
  });

  final DateTime? value;
  final ValueChanged<DateTime> onPick;
  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) {
    final label = value == null
        ? 'Not set'
        : '${value!.year}-${value!.month.toString().padLeft(2, '0')}-'
            '${value!.day.toString().padLeft(2, '0')}';

    return InputDecorator(
      decoration: InputDecoration(
        labelText: 'Joining date',
        suffixIcon: value == null
            ? const Icon(Icons.calendar_today_rounded)
            : IconButton(
                icon: const Icon(Icons.clear_rounded),
                tooltip: 'Clear',
                onPressed: onClear,
              ),
      ),
      child: InkWell(
        onTap: () async {
          final now = DateTime.now();
          final picked = await showDatePicker(
            context: context,
            initialDate: value ?? now,
            // Wide enough for long-tenured staff and future-dated joiners.
            firstDate: DateTime(now.year - 50),
            lastDate: DateTime(now.year + 5),
          );
          if (picked != null) onPick(picked);
        },
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: AppSpacing.space1),
          child: Text(label, style: AppTypography.bodyLarge),
        ),
      ),
    );
  }
}
