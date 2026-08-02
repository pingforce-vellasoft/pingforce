import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/theme.dart';
import '../domain/entities/employee.dart';
import 'employee_notifier.dart';
import 'widgets/employee_form_sheet.dart';

// ─────────────────────────────────────────────────────────────────────────────
// EMPLOYEE LIST SCREEN
// ─────────────────────────────────────────────────────────────────────────────
//
// Admin-facing employee management, backed by the same `/api/v1/employees` API
// as the web admin portal. Lists employees with search + cursor pagination and
// supports create / edit / delete / invite. Wired to /employees.

class EmployeeListScreen extends ConsumerStatefulWidget {
  const EmployeeListScreen({super.key});

  @override
  ConsumerState<EmployeeListScreen> createState() => _EmployeeListScreenState();
}

class _EmployeeListScreenState extends ConsumerState<EmployeeListScreen> {
  final ScrollController _scrollController = ScrollController();
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(employeeNotifierProvider.notifier).load();
    });
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  /// Page in the next batch as the list nears its end. The notifier ignores the
  /// call while a load is in flight or the last page came back short.
  void _onScroll() {
    if (!_scrollController.hasClients) return;
    final position = _scrollController.position;
    if (position.pixels >= position.maxScrollExtent - 400) {
      ref.read(employeeNotifierProvider.notifier).loadMore();
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(employeeNotifierProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Employees')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openForm(context),
        icon: const Icon(Icons.person_add_rounded),
        label: const Text('Add employee'),
      ),
      body: Column(
        children: [
          _buildSearchField(context),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () =>
                  ref.read(employeeNotifierProvider.notifier).refresh(),
              child: _buildBody(context, state),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchField(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.screenHorizontal,
        AppSpacing.space3,
        AppSpacing.screenHorizontal,
        AppSpacing.space2,
      ),
      child: TextField(
        controller: _searchController,
        textInputAction: TextInputAction.search,
        decoration: InputDecoration(
          hintText: 'Search name, code, email or mobile',
          prefixIcon: const Icon(Icons.search_rounded),
          suffixIcon: _searchController.text.isEmpty
              ? null
              : IconButton(
                  icon: const Icon(Icons.clear_rounded),
                  tooltip: 'Clear',
                  onPressed: () {
                    _searchController.clear();
                    ref.read(employeeNotifierProvider.notifier).setSearch('');
                  },
                ),
          isDense: true,
        ),
        onChanged: (v) =>
            ref.read(employeeNotifierProvider.notifier).setSearch(v),
      ),
    );
  }

  Widget _buildBody(BuildContext context, EmployeeState state) {
    if (state.isLoading && state.items.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (state.errorMessage != null && state.items.isEmpty) {
      return _MessageState(
        icon: Icons.error_outline_rounded,
        title: 'Could not load employees',
        subtitle: state.errorMessage!,
        actionLabel: 'Retry',
        onAction: () => ref.read(employeeNotifierProvider.notifier).refresh(),
      );
    }

    if (state.items.isEmpty) {
      return _MessageState(
        icon: Icons.badge_outlined,
        title: 'No employees yet',
        subtitle: 'Add your first employee to start tracking your workforce.',
        actionLabel: 'Add employee',
        onAction: () => _openForm(context),
      );
    }

    final visible = state.visibleItems;
    if (visible.isEmpty) {
      return _MessageState(
        icon: Icons.search_off_rounded,
        title: 'No matches',
        subtitle: 'No employee matches "${state.search}".',
      );
    }

    return ListView.separated(
      controller: _scrollController,
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.screenHorizontal,
        AppSpacing.space2,
        AppSpacing.screenHorizontal,
        AppSpacing.space20,
      ),
      // One trailing slot for the paging spinner.
      itemCount: visible.length + 1,
      separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.space3),
      itemBuilder: (_, i) {
        if (i == visible.length) {
          if (!state.isLoadingMore) return const SizedBox.shrink();
          return const Padding(
            padding: EdgeInsets.all(AppSpacing.space4),
            child: Center(child: CircularProgressIndicator()),
          );
        }
        final employee = visible[i];
        return _EmployeeTile(
          employee: employee,
          onEdit: () => _openForm(context, existing: employee),
          onInvite: () => _invite(context, employee),
          onDelete: () => _confirmDelete(context, employee),
        );
      },
    );
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  Future<void> _openForm(BuildContext context, {Employee? existing}) async {
    final result = await showEmployeeFormSheet(context, existing: existing);
    if (!context.mounted || result == null) return;

    // A newly provisioned login returns its temporary password exactly once —
    // show it in a dialog the admin must acknowledge, since it is unrecoverable.
    final tempPassword = result.tempPassword;
    if (tempPassword != null && tempPassword.isNotEmpty) {
      await _showTempPasswordDialog(context, result.employee, tempPassword);
    }
  }

  Future<void> _showTempPasswordDialog(
    BuildContext context,
    Employee employee,
    String tempPassword,
  ) {
    return showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => AlertDialog(
        icon: const Icon(Icons.key_rounded),
        title: const Text('Temporary password'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'A login was created for ${employee.fullName}. This password is '
              'shown once and cannot be retrieved later.',
              style: AppTypography.bodyMedium,
            ),
            const SizedBox(height: AppSpacing.space4),
            SelectableText(
              tempPassword,
              style: AppTypography.titleMedium.copyWith(
                fontFamily: 'monospace',
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
        actions: [
          TextButton.icon(
            onPressed: () {
              Clipboard.setData(ClipboardData(text: tempPassword));
              ScaffoldMessenger.of(dialogContext).showSnackBar(
                const SnackBar(content: Text('Password copied')),
              );
            },
            icon: const Icon(Icons.copy_rounded),
            label: const Text('Copy'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('Done'),
          ),
        ],
      ),
    );
  }

  Future<void> _invite(BuildContext context, Employee employee) async {
    final messenger = ScaffoldMessenger.of(context);
    final result =
        await ref.read(employeeNotifierProvider.notifier).invite(employee.id);
    if (!context.mounted) return;

    if (result == null) {
      final message = ref.read(employeeNotifierProvider).errorMessage;
      messenger.showSnackBar(
        SnackBar(content: Text(message ?? 'Failed to send invite')),
      );
      return;
    }
    messenger.showSnackBar(
      SnackBar(
        content: Text(
          result.email.isEmpty
              ? result.message
              : '${result.message} (${result.email})',
        ),
      ),
    );
  }

  Future<void> _confirmDelete(BuildContext context, Employee employee) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Remove employee?'),
        content: Text(
          '${employee.fullName} (${employee.employeeCode}) will be removed from '
          'this workspace. Their historical records are retained.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(dialogContext).colorScheme.error,
            ),
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Remove'),
          ),
        ],
      ),
    );

    if (confirmed != true || !context.mounted) return;

    final messenger = ScaffoldMessenger.of(context);
    final error =
        await ref.read(employeeNotifierProvider.notifier).delete(employee.id);
    if (error != null) {
      messenger.showSnackBar(SnackBar(content: Text(error)));
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EMPLOYEE TILE
// ─────────────────────────────────────────────────────────────────────────────

class _EmployeeTile extends StatelessWidget {
  const _EmployeeTile({
    required this.employee,
    required this.onEdit,
    required this.onInvite,
    required this.onDelete,
  });

  final Employee employee;
  final VoidCallback onEdit;
  final VoidCallback onInvite;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final subtitle = [
      employee.employeeCode,
      if ((employee.primaryEmail ?? '').isNotEmpty) employee.primaryEmail!,
      if ((employee.primaryMobile ?? '').isNotEmpty) employee.primaryMobile!,
    ].join(' · ');

    return Card(
      margin: EdgeInsets.zero,
      child: ListTile(
        onTap: onEdit,
        leading: CircleAvatar(
          backgroundColor: scheme.primaryContainer,
          child: Text(
            employee.initials,
            style: AppTypography.labelLarge
                .copyWith(color: scheme.onPrimaryContainer),
          ),
        ),
        title: Text(
          employee.fullName,
          style: AppTypography.titleSmall,
          overflow: TextOverflow.ellipsis,
        ),
        subtitle: Text(
          subtitle,
          style:
              AppTypography.bodySmall.copyWith(color: scheme.onSurfaceVariant),
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
        trailing: PopupMenuButton<String>(
          onSelected: (value) => switch (value) {
            'edit' => onEdit(),
            'invite' => onInvite(),
            'delete' => onDelete(),
            _ => null,
          },
          itemBuilder: (_) => [
            const PopupMenuItem(
              value: 'edit',
              child: ListTile(
                leading: Icon(Icons.edit_outlined),
                title: Text('Edit'),
                contentPadding: EdgeInsets.zero,
              ),
            ),
            PopupMenuItem(
              value: 'invite',
              child: ListTile(
                leading: const Icon(Icons.mail_outline_rounded),
                title: Text(employee.hasLogin ? 'Resend invite' : 'Invite'),
                contentPadding: EdgeInsets.zero,
              ),
            ),
            PopupMenuItem(
              value: 'delete',
              child: ListTile(
                leading: Icon(Icons.delete_outline_rounded,
                    color: scheme.error),
                title: Text('Remove', style: TextStyle(color: scheme.error)),
                contentPadding: EdgeInsets.zero,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EMPTY / ERROR STATE
// ─────────────────────────────────────────────────────────────────────────────

class _MessageState extends StatelessWidget {
  const _MessageState({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.actionLabel,
    this.onAction,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    // Scrollable so RefreshIndicator still works on an empty list.
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(AppSpacing.space8),
      children: [
        const SizedBox(height: AppSpacing.space12),
        Icon(icon, size: 56, color: scheme.onSurfaceVariant),
        const SizedBox(height: AppSpacing.space4),
        Text(
          title,
          textAlign: TextAlign.center,
          style: AppTypography.titleMedium.copyWith(color: scheme.onSurface),
        ),
        const SizedBox(height: AppSpacing.space2),
        Text(
          subtitle,
          textAlign: TextAlign.center,
          style:
              AppTypography.bodyMedium.copyWith(color: scheme.onSurfaceVariant),
        ),
        if (actionLabel != null && onAction != null) ...[
          const SizedBox(height: AppSpacing.space6),
          Center(
            child: FilledButton(
              onPressed: onAction,
              child: Text(actionLabel!),
            ),
          ),
        ],
      ],
    );
  }
}
