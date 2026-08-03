import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/theme.dart';
import '../domain/entities/customer.dart';
import 'customer_notifier.dart';
import 'widgets/customer_form_sheet.dart';

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMER LIST SCREEN
// ─────────────────────────────────────────────────────────────────────────────
//
// Admin-facing customer management, backed by the same `/api/v1/customers` API
// as the web admin portal. Lists customers with search + offset pagination and
// supports create / edit / delete. Wired to /customers.

class CustomerListScreen extends ConsumerStatefulWidget {
  const CustomerListScreen({super.key});

  @override
  ConsumerState<CustomerListScreen> createState() => _CustomerListScreenState();
}

class _CustomerListScreenState extends ConsumerState<CustomerListScreen> {
  final ScrollController _scrollController = ScrollController();
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(customerNotifierProvider.notifier).load();
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
      ref.read(customerNotifierProvider.notifier).loadMore();
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(customerNotifierProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Customers')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => showCustomerFormSheet(context),
        icon: const Icon(Icons.person_add_alt_1_rounded),
        label: const Text('Add customer'),
      ),
      body: Column(
        children: [
          _buildSearchField(context),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () =>
                  ref.read(customerNotifierProvider.notifier).refresh(),
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
                    ref.read(customerNotifierProvider.notifier).setSearch('');
                  },
                ),
          isDense: true,
        ),
        onChanged: (v) =>
            ref.read(customerNotifierProvider.notifier).setSearch(v),
      ),
    );
  }

  Widget _buildBody(BuildContext context, CustomerState state) {
    if (state.isLoading && state.items.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (state.errorMessage != null && state.items.isEmpty) {
      return _MessageState(
        icon: Icons.error_outline_rounded,
        title: 'Could not load customers',
        subtitle: state.errorMessage!,
        actionLabel: 'Retry',
        onAction: () => ref.read(customerNotifierProvider.notifier).refresh(),
      );
    }

    if (state.items.isEmpty) {
      return _MessageState(
        icon: Icons.groups_outlined,
        title: 'No customers yet',
        subtitle: 'Add your first customer to start assigning field work.',
        actionLabel: 'Add customer',
        onAction: () => showCustomerFormSheet(context),
      );
    }

    final visible = state.visibleItems;
    if (visible.isEmpty) {
      return _MessageState(
        icon: Icons.search_off_rounded,
        title: 'No matches',
        subtitle: 'No customer matches "${state.search}".',
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
        final customer = visible[i];
        return _CustomerTile(
          customer: customer,
          onEdit: () => showCustomerFormSheet(context, existing: customer),
          onDelete: () => _confirmDelete(context, customer),
        );
      },
    );
  }

  Future<void> _confirmDelete(BuildContext context, Customer customer) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Remove customer?'),
        content: Text(
          '${customer.name} (${customer.customerCode}) will be removed from '
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
        await ref.read(customerNotifierProvider.notifier).delete(customer.id);
    if (error != null) {
      messenger.showSnackBar(SnackBar(content: Text(error)));
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMER TILE
// ─────────────────────────────────────────────────────────────────────────────

class _CustomerTile extends StatelessWidget {
  const _CustomerTile({
    required this.customer,
    required this.onEdit,
    required this.onDelete,
  });

  final Customer customer;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final subtitle = [
      customer.customerCode,
      if ((customer.primaryEmail ?? '').isNotEmpty) customer.primaryEmail!,
      if ((customer.primaryMobile ?? '').isNotEmpty) customer.primaryMobile!,
    ].join(' · ');

    return Card(
      margin: EdgeInsets.zero,
      child: ListTile(
        onTap: onEdit,
        leading: CircleAvatar(
          backgroundColor: scheme.secondaryContainer,
          child: Text(
            customer.initials,
            style: AppTypography.labelLarge
                .copyWith(color: scheme.onSecondaryContainer),
          ),
        ),
        title: Text(
          customer.name,
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
              value: 'delete',
              child: ListTile(
                leading:
                    Icon(Icons.delete_outline_rounded, color: scheme.error),
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
