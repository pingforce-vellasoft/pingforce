import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/theme.dart';
import '../domain/entities/employee_device.dart';
import 'device_admin_notifier.dart';

// ─────────────────────────────────────────────────────────────────────────────
// DEVICE ADMIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
//
// Admin-facing device binding administration, backed by the same
// `/api/v1/devices` endpoints as the web portal. Two tabs: bound Devices
// (search + revoke) and Change Requests (approve / reject). Wired to /devices.

class DeviceAdminScreen extends ConsumerStatefulWidget {
  const DeviceAdminScreen({super.key});

  @override
  ConsumerState<DeviceAdminScreen> createState() => _DeviceAdminScreenState();
}

class _DeviceAdminScreenState extends ConsumerState<DeviceAdminScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(deviceAdminNotifierProvider.notifier).loadAll();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(deviceAdminNotifierProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Devices'),
        bottom: TabBar(
          controller: _tabController,
          tabs: [
            const Tab(text: 'Bound devices'),
            Tab(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text('Requests'),
                  if (state.pendingCount > 0) ...[
                    const SizedBox(width: AppSpacing.space2),
                    Badge(label: Text('${state.pendingCount}')),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildDevicesTab(context, state),
          _buildRequestsTab(context, state),
        ],
      ),
    );
  }

  // ── Bound devices tab ──────────────────────────────────────────────────────

  Widget _buildDevicesTab(BuildContext context, DeviceAdminState state) {
    return Column(
      children: [
        Padding(
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
              hintText: 'Search employee or device',
              prefixIcon: const Icon(Icons.search_rounded),
              suffixIcon: _searchController.text.isEmpty
                  ? null
                  : IconButton(
                      icon: const Icon(Icons.clear_rounded),
                      tooltip: 'Clear',
                      onPressed: () {
                        _searchController.clear();
                        ref
                            .read(deviceAdminNotifierProvider.notifier)
                            .setSearch('');
                      },
                    ),
              isDense: true,
            ),
            // Search is server-side; fire on submit rather than per keystroke
            // so typing does not spam the API.
            onSubmitted: (v) =>
                ref.read(deviceAdminNotifierProvider.notifier).setSearch(v),
          ),
        ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: () =>
                ref.read(deviceAdminNotifierProvider.notifier).loadDevices(),
            child: _buildDevicesBody(context, state),
          ),
        ),
      ],
    );
  }

  Widget _buildDevicesBody(BuildContext context, DeviceAdminState state) {
    if (state.isLoadingDevices && state.devices.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }
    if (state.deviceError != null && state.devices.isEmpty) {
      return _MessageState(
        icon: Icons.error_outline_rounded,
        title: 'Could not load devices',
        subtitle: state.deviceError!,
        actionLabel: 'Retry',
        onAction: () =>
            ref.read(deviceAdminNotifierProvider.notifier).loadDevices(),
      );
    }
    if (state.devices.isEmpty) {
      return const _MessageState(
        icon: Icons.smartphone_outlined,
        title: 'No bound devices',
        subtitle: 'Devices appear here once employees bind their handsets.',
      );
    }

    return ListView.separated(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.screenHorizontal,
        AppSpacing.space2,
        AppSpacing.screenHorizontal,
        AppSpacing.space20,
      ),
      itemCount: state.devices.length,
      separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.space3),
      itemBuilder: (_, i) => _DeviceTile(
        device: state.devices[i],
        onRevoke: () => _confirmRevoke(context, state.devices[i]),
      ),
    );
  }

  // ── Change requests tab ────────────────────────────────────────────────────

  Widget _buildRequestsTab(BuildContext context, DeviceAdminState state) {
    return Column(
      children: [
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.screenHorizontal,
            vertical: AppSpacing.space3,
          ),
          child: Row(
            children: [
              for (final status in DeviceChangeStatus.values)
                Padding(
                  padding: const EdgeInsets.only(right: AppSpacing.space2),
                  child: ChoiceChip(
                    label: Text(status.label),
                    selected: state.statusFilter == status,
                    onSelected: (_) => ref
                        .read(deviceAdminNotifierProvider.notifier)
                        .setStatusFilter(status),
                  ),
                ),
            ],
          ),
        ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: () =>
                ref.read(deviceAdminNotifierProvider.notifier).loadRequests(),
            child: _buildRequestsBody(context, state),
          ),
        ),
      ],
    );
  }

  Widget _buildRequestsBody(BuildContext context, DeviceAdminState state) {
    if (state.isLoadingRequests && state.requests.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }
    if (state.requestError != null && state.requests.isEmpty) {
      return _MessageState(
        icon: Icons.error_outline_rounded,
        title: 'Could not load requests',
        subtitle: state.requestError!,
        actionLabel: 'Retry',
        onAction: () =>
            ref.read(deviceAdminNotifierProvider.notifier).loadRequests(),
      );
    }
    if (state.requests.isEmpty) {
      return _MessageState(
        icon: Icons.phonelink_setup_outlined,
        title: 'No ${state.statusFilter.label.toLowerCase()} requests',
        subtitle:
            'Device change requests raised by employees appear here for review.',
      );
    }

    return ListView.separated(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.screenHorizontal,
        AppSpacing.space2,
        AppSpacing.screenHorizontal,
        AppSpacing.space20,
      ),
      itemCount: state.requests.length,
      separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.space3),
      itemBuilder: (_, i) => _RequestTile(
        request: state.requests[i],
        isBusy: state.isBusy,
        onApprove: () => _confirmApprove(context, state.requests[i]),
        onReject: () => _promptReject(context, state.requests[i]),
      ),
    );
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  Future<void> _confirmApprove(
    BuildContext context,
    DeviceChangeRequest request,
  ) async {
    final who = request.employee?.fullName ?? 'This employee';
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Approve device change?'),
        content: Text(
          '$who will be rebound to ${request.newDeviceLabel}. Their current '
          'sessions are signed out and the old handset can no longer be used.'
          '${request.priorRequestCount > 1 ? '\n\nThis employee has raised '
              '${request.priorRequestCount} requests.' : ''}',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Approve'),
          ),
        ],
      ),
    );
    if (confirmed != true || !context.mounted) return;

    final messenger = ScaffoldMessenger.of(context);
    final error =
        await ref.read(deviceAdminNotifierProvider.notifier).approve(request.id);
    messenger.showSnackBar(
      SnackBar(content: Text(error ?? 'Device change approved')),
    );
  }

  Future<void> _promptReject(
    BuildContext context,
    DeviceChangeRequest request,
  ) async {
    final controller = TextEditingController();
    final reason = await showDialog<String>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Reject request'),
        content: TextField(
          controller: controller,
          autofocus: true,
          maxLines: 3,
          decoration: const InputDecoration(
            labelText: 'Reason',
            hintText: 'Tell the employee why this was rejected',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () =>
                Navigator.of(dialogContext).pop(controller.text.trim()),
            child: const Text('Reject'),
          ),
        ],
      ),
    );
    controller.dispose();

    if (reason == null || reason.isEmpty || !context.mounted) return;

    final messenger = ScaffoldMessenger.of(context);
    final error = await ref
        .read(deviceAdminNotifierProvider.notifier)
        .reject(request.id, reason);
    messenger.showSnackBar(
      SnackBar(content: Text(error ?? 'Request rejected')),
    );
  }

  Future<void> _confirmRevoke(
    BuildContext context,
    EmployeeDevice device,
  ) async {
    final controller = TextEditingController();
    final who = device.employee?.fullName ?? 'This employee';
    final reason = await showDialog<String>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Revoke device?'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '$who will be signed out of ${device.displayName} and must bind '
              'a device again before using the app.',
              style: AppTypography.bodyMedium,
            ),
            const SizedBox(height: AppSpacing.space4),
            TextField(
              controller: controller,
              decoration: const InputDecoration(
                labelText: 'Reason (optional)',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(dialogContext).colorScheme.error,
            ),
            // Empty string still means "confirmed, no reason given"; null is
            // the cancel signal.
            onPressed: () =>
                Navigator.of(dialogContext).pop(controller.text.trim()),
            child: const Text('Revoke'),
          ),
        ],
      ),
    );
    controller.dispose();

    if (reason == null || !context.mounted) return;

    final messenger = ScaffoldMessenger.of(context);
    final error = await ref
        .read(deviceAdminNotifierProvider.notifier)
        .revoke(device.id, reason: reason.isEmpty ? null : reason);
    messenger.showSnackBar(
      SnackBar(content: Text(error ?? 'Device revoked')),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TILES
// ─────────────────────────────────────────────────────────────────────────────

class _DeviceTile extends StatelessWidget {
  const _DeviceTile({required this.device, required this.onRevoke});

  final EmployeeDevice device;
  final VoidCallback onRevoke;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final meta = [
      if ((device.platform ?? '').isNotEmpty) device.platform!,
      if ((device.osVersion ?? '').isNotEmpty) 'OS ${device.osVersion}',
      if ((device.appVersion ?? '').isNotEmpty) 'v${device.appVersion}',
    ].join(' · ');

    return Card(
      margin: EdgeInsets.zero,
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor:
              device.isRevoked ? scheme.errorContainer : scheme.primaryContainer,
          child: Icon(
            device.isRevoked
                ? Icons.phonelink_erase_rounded
                : Icons.smartphone_rounded,
            color: device.isRevoked
                ? scheme.onErrorContainer
                : scheme.onPrimaryContainer,
          ),
        ),
        title: Text(
          device.employee?.fullName ?? device.displayName,
          style: AppTypography.titleSmall,
          overflow: TextOverflow.ellipsis,
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              device.displayName,
              style: AppTypography.bodySmall
                  .copyWith(color: scheme.onSurfaceVariant),
              overflow: TextOverflow.ellipsis,
            ),
            if (meta.isNotEmpty)
              Text(
                meta,
                style: AppTypography.bodySmall
                    .copyWith(color: scheme.onSurfaceVariant),
                overflow: TextOverflow.ellipsis,
              ),
            if (device.isRevoked)
              Text(
                'Revoked${(device.revokedReason ?? '').isEmpty ? '' : ' · ${device.revokedReason}'}',
                style: AppTypography.bodySmall.copyWith(color: scheme.error),
                overflow: TextOverflow.ellipsis,
              ),
          ],
        ),
        isThreeLine: true,
        trailing: device.isRevoked
            ? null
            : IconButton(
                icon: Icon(Icons.link_off_rounded, color: scheme.error),
                tooltip: 'Revoke',
                onPressed: onRevoke,
              ),
      ),
    );
  }
}

class _RequestTile extends StatelessWidget {
  const _RequestTile({
    required this.request,
    required this.isBusy,
    required this.onApprove,
    required this.onReject,
  });

  final DeviceChangeRequest request;
  final bool isBusy;
  final VoidCallback onApprove;
  final VoidCallback onReject;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.space4),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    request.employee?.fullName ?? 'Employee',
                    style: AppTypography.titleSmall,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Chip(
                  label: Text(request.status.label),
                  visualDensity: VisualDensity.compact,
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.space2),
            Text(
              'New device: ${request.newDeviceLabel}',
              style: AppTypography.bodySmall
                  .copyWith(color: scheme.onSurfaceVariant),
            ),
            const SizedBox(height: AppSpacing.space1),
            Text(
              'Reason: ${request.reason}',
              style: AppTypography.bodySmall
                  .copyWith(color: scheme.onSurfaceVariant),
            ),
            if ((request.notes ?? '').isNotEmpty) ...[
              const SizedBox(height: AppSpacing.space1),
              Text(
                request.notes!,
                style: AppTypography.bodySmall
                    .copyWith(color: scheme.onSurfaceVariant),
              ),
            ],
            // A repeat pattern is signal worth surfacing before approval.
            if (request.priorRequestCount > 1) ...[
              const SizedBox(height: AppSpacing.space2),
              Row(
                children: [
                  Icon(Icons.info_outline_rounded,
                      size: AppIconSize.sm, color: scheme.tertiary),
                  const SizedBox(width: AppSpacing.space2),
                  Expanded(
                    child: Text(
                      '${request.priorRequestCount} prior requests from this employee',
                      style: AppTypography.bodySmall
                          .copyWith(color: scheme.tertiary),
                    ),
                  ),
                ],
              ),
            ],
            if (request.isPending) ...[
              const SizedBox(height: AppSpacing.space4),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: isBusy ? null : onReject,
                      child: const Text('Reject'),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.space3),
                  Expanded(
                    child: FilledButton(
                      onPressed: isBusy ? null : onApprove,
                      child: const Text('Approve'),
                    ),
                  ),
                ],
              ),
            ],
            if (!request.isPending &&
                (request.rejectionReason ?? '').isNotEmpty) ...[
              const SizedBox(height: AppSpacing.space2),
              Text(
                'Rejected: ${request.rejectionReason}',
                style: AppTypography.bodySmall.copyWith(color: scheme.error),
              ),
            ],
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
            child: FilledButton(onPressed: onAction, child: Text(actionLabel!)),
          ),
        ],
      ],
    );
  }
}
