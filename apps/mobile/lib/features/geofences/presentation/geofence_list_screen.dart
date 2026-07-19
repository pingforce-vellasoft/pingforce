import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/theme.dart';
import '../../../core/widgets/app_states.dart';
import '../domain/entities/geofence.dart';
import 'geofence_notifier.dart';

// ─────────────────────────────────────────────────────────────────────────────
// GEOFENCE LIST SCREEN
// ─────────────────────────────────────────────────────────────────────────────
//
// Admin-facing management of attendance geofences, backed by the same
// `attendance/geofence` API as the web admin portal. Lists existing zones and
// supports add (bottom-sheet form) + delete. Wired to /geofences.

class GeofenceListScreen extends ConsumerStatefulWidget {
  const GeofenceListScreen({super.key});

  @override
  ConsumerState<GeofenceListScreen> createState() => _GeofenceListScreenState();
}

class _GeofenceListScreenState extends ConsumerState<GeofenceListScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(geofenceNotifierProvider.notifier).load();
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(geofenceNotifierProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Geofences')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openAddSheet(context),
        icon: const Icon(Icons.add_location_alt_rounded),
        label: const Text('Add geofence'),
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(geofenceNotifierProvider.notifier).refresh(),
        child: _buildBody(context, state),
      ),
    );
  }

  Widget _buildBody(BuildContext context, GeofenceState state) {
    if (state.isLoading && state.items.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (state.errorMessage != null && state.items.isEmpty) {
      return _MessageState(
        icon: Icons.error_outline_rounded,
        title: 'Could not load geofences',
        subtitle: state.errorMessage!,
        actionLabel: 'Retry',
        onAction: () => ref.read(geofenceNotifierProvider.notifier).refresh(),
      );
    }

    if (state.items.isEmpty) {
      return _MessageState(
        icon: Icons.wrong_location_rounded,
        title: 'No geofences configured',
        subtitle:
            'Add your first geofence to enable location-validated attendance.',
        actionLabel: 'Add geofence',
        onAction: () => _openAddSheet(context),
      );
    }

    return ListView.separated(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.screenHorizontal,
        AppSpacing.space4,
        AppSpacing.screenHorizontal,
        AppSpacing.space20,
      ),
      itemCount: state.items.length,
      separatorBuilder: (_, i) => const SizedBox(height: AppSpacing.space3),
      itemBuilder: (_, i) => _GeofenceTile(
        geofence: state.items[i],
        onDelete: () => _confirmDelete(context, state.items[i]),
      ),
    );
  }

  Future<void> _confirmDelete(BuildContext context, Geofence g) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete geofence?'),
        content: Text('"${g.name}" will be removed. Check-ins will no longer '
            'validate against this zone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (ok != true) return;

    final error =
        await ref.read(geofenceNotifierProvider.notifier).delete(g.id);
    if (!context.mounted) return;
    if (error != null) {
      AppSnackBar.showError(context, error);
    } else {
      AppSnackBar.showSuccess(context, 'Geofence deleted');
    }
  }

  void _openAddSheet(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => const _AddGeofenceSheet(),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GEOFENCE TILE
// ─────────────────────────────────────────────────────────────────────────────

class _GeofenceTile extends StatelessWidget {
  const _GeofenceTile({required this.geofence, required this.onDelete});

  final Geofence geofence;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(AppSpacing.space4),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerLow,
        borderRadius: AppRadius.lgAll,
        border: Border.all(color: scheme.outlineVariant),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: scheme.primaryContainer,
              borderRadius: AppRadius.mdAll,
            ),
            child: Icon(Icons.location_on_rounded, color: scheme.primary),
          ),
          const SizedBox(width: AppSpacing.space3),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  geofence.name,
                  style: AppTypography.titleSmall
                      .copyWith(color: scheme.onSurface),
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  '${geofence.latitude.toStringAsFixed(4)}, '
                  '${geofence.longitude.toStringAsFixed(4)}  ·  '
                  '${geofence.radiusMeters}m',
                  style: AppTypography.bodySmall
                      .copyWith(color: scheme.onSurfaceVariant),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.delete_outline_rounded),
            color: scheme.error,
            tooltip: 'Delete',
            onPressed: onDelete,
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ADD GEOFENCE SHEET
// ─────────────────────────────────────────────────────────────────────────────

class _AddGeofenceSheet extends ConsumerStatefulWidget {
  const _AddGeofenceSheet();

  @override
  ConsumerState<_AddGeofenceSheet> createState() => _AddGeofenceSheetState();
}

class _AddGeofenceSheetState extends ConsumerState<_AddGeofenceSheet> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _latCtrl = TextEditingController();
  final _lngCtrl = TextEditingController();
  final _radiusCtrl = TextEditingController(text: '100');

  @override
  void dispose() {
    _nameCtrl.dispose();
    _latCtrl.dispose();
    _lngCtrl.dispose();
    _radiusCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isSaving = ref.watch(geofenceNotifierProvider).isSaving;
    final insets = MediaQuery.of(context).viewInsets.bottom;

    return Padding(
      padding: EdgeInsets.fromLTRB(
        AppSpacing.screenHorizontal,
        AppSpacing.space2,
        AppSpacing.screenHorizontal,
        AppSpacing.space4 + insets,
      ),
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('New geofence', style: AppTypography.titleMedium),
            const SizedBox(height: AppSpacing.space4),
            TextFormField(
              controller: _nameCtrl,
              textCapitalization: TextCapitalization.words,
              decoration: const InputDecoration(
                labelText: 'Location name',
                hintText: 'e.g. Headquarters',
                prefixIcon: Icon(Icons.business_rounded),
              ),
              validator: (v) => (v == null || v.trim().length < 3)
                  ? 'Enter at least 3 characters'
                  : null,
            ),
            const SizedBox(height: AppSpacing.space3),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _latCtrl,
                    keyboardType: const TextInputType.numberWithOptions(
                        decimal: true, signed: true),
                    inputFormatters: [_decimalFormatter],
                    decoration: const InputDecoration(
                      labelText: 'Latitude',
                      hintText: '40.7128',
                    ),
                    validator: (v) => _validateCoord(v, -90, 90, 'latitude'),
                  ),
                ),
                const SizedBox(width: AppSpacing.space3),
                Expanded(
                  child: TextFormField(
                    controller: _lngCtrl,
                    keyboardType: const TextInputType.numberWithOptions(
                        decimal: true, signed: true),
                    inputFormatters: [_decimalFormatter],
                    decoration: const InputDecoration(
                      labelText: 'Longitude',
                      hintText: '-74.0060',
                    ),
                    validator: (v) => _validateCoord(v, -180, 180, 'longitude'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.space3),
            TextFormField(
              controller: _radiusCtrl,
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              decoration: const InputDecoration(
                labelText: 'Radius (meters)',
                hintText: '100',
                prefixIcon: Icon(Icons.radar_rounded),
                helperText: 'Recommended: 50–200 meters',
              ),
              validator: (v) {
                final n = int.tryParse(v ?? '');
                if (n == null || n <= 0) return 'Enter a radius greater than 0';
                return null;
              },
            ),
            const SizedBox(height: AppSpacing.space5),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: FilledButton.icon(
                onPressed: isSaving ? null : _submit,
                icon: isSaving
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.save_rounded),
                label: Text(isSaving ? 'Saving…' : 'Save geofence'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  static final _decimalFormatter =
      FilteringTextInputFormatter.allow(RegExp(r'[0-9.\-]'));

  String? _validateCoord(String? v, double min, double max, String label) {
    final n = double.tryParse(v ?? '');
    if (n == null) return 'Enter a valid $label';
    if (n < min || n > max) return '$label must be between $min and $max';
    return null;
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final error = await ref.read(geofenceNotifierProvider.notifier).create(
          name: _nameCtrl.text.trim(),
          latitude: double.parse(_latCtrl.text),
          longitude: double.parse(_lngCtrl.text),
          radiusMeters: int.parse(_radiusCtrl.text),
        );

    if (!mounted) return;
    if (error != null) {
      AppSnackBar.showError(context, error);
    } else {
      Navigator.pop(context);
      AppSnackBar.showSuccess(context, 'Geofence created');
    }
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
    required this.actionLabel,
    required this.onAction,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final String actionLabel;
  final VoidCallback onAction;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      children: [
        const SizedBox(height: 120),
        Icon(icon, size: 56, color: scheme.onSurfaceVariant),
        const SizedBox(height: AppSpacing.space4),
        Text(
          title,
          textAlign: TextAlign.center,
          style: AppTypography.titleMedium.copyWith(color: scheme.onSurface),
        ),
        const SizedBox(height: AppSpacing.space2),
        Padding(
          padding:
              const EdgeInsets.symmetric(horizontal: AppSpacing.space8),
          child: Text(
            subtitle,
            textAlign: TextAlign.center,
            style: AppTypography.bodySmall
                .copyWith(color: scheme.onSurfaceVariant),
          ),
        ),
        const SizedBox(height: AppSpacing.space5),
        Center(
          child: FilledButton(onPressed: onAction, child: Text(actionLabel)),
        ),
      ],
    );
  }
}
