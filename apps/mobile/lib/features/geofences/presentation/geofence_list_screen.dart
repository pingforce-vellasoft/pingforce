import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';

import '../../../core/hardware/hardware_service.dart';
import '../../../core/hardware/location_failure.dart';
import '../../../core/theme/theme.dart';
import '../../../core/widgets/app_states.dart';
import '../../../injection_container.dart';
import '../domain/entities/geofence.dart';
import 'geofence_assignment_notifier.dart';
import 'geofence_notifier.dart';
import 'widgets/geofence_employees_sheet.dart';

/// How the admin supplies the geofence centre.
///
/// [manual] — type coordinates and/or drop the pin by tapping the map.
/// [current] — capture the device's GPS fix while standing at the site.
enum GeofenceCaptureMode { manual, current }

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
      ref.read(geofenceCoverageProvider.notifier).load();
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(geofenceNotifierProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Geofences'),
        actions: [
          IconButton(
            icon: const Icon(Icons.tune_rounded),
            tooltip: 'Assignment policy',
            onPressed: () => _openPolicySheet(context),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openAddSheet(context),
        icon: const Icon(Icons.add_location_alt_rounded),
        label: const Text('Add geofence'),
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await ref.read(geofenceNotifierProvider.notifier).refresh();
          await ref.read(geofenceCoverageProvider.notifier).load();
        },
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
      // One extra leading item for the coverage banner.
      itemCount: state.items.length + 1,
      separatorBuilder: (_, i) => const SizedBox(height: AppSpacing.space3),
      itemBuilder: (_, i) {
        if (i == 0) return _buildCoverageBanner(context);
        final g = state.items[i - 1];
        return _GeofenceTile(
          geofence: g,
          assignedCount:
              ref.watch(geofenceCoverageProvider).coverage.countFor(g.id),
          onDelete: () => _confirmDelete(context, g),
          onManageEmployees: () => _openEmployeesSheet(context, g),
        );
      },
    );
  }

  /// Employees with no geofence cannot punch at all — the most consequential
  /// state on this screen, so it leads the list rather than hiding in a tile.
  Widget _buildCoverageBanner(BuildContext context) {
    final coverageState = ref.watch(geofenceCoverageProvider);
    final cov = coverageState.coverage;
    final scheme = Theme.of(context).colorScheme;

    if (coverageState.isLoading) return const SizedBox.shrink();

    final IconData icon;
    final Color bg;
    final Color fg;
    final String message;

    if (!cov.tenantHasEmployees) {
      icon = Icons.person_off_rounded;
      bg = scheme.secondaryContainer;
      fg = scheme.onSecondaryContainer;
      message = 'No employees exist yet. Geofences do nothing until employees '
          'are created in the admin portal and assigned here.';
    } else if (cov.unassignedEmployees > 0) {
      icon = Icons.warning_amber_rounded;
      bg = scheme.errorContainer;
      fg = scheme.onErrorContainer;
      message = '${cov.unassignedEmployees} of ${cov.totalEmployees} '
          '${cov.unassignedEmployees == 1 ? 'employee is' : 'employees are'} '
          'not assigned to any geofence and cannot punch attendance.';
    } else {
      icon = Icons.check_circle_rounded;
      bg = scheme.primaryContainer;
      fg = scheme.onPrimaryContainer;
      message = 'All ${cov.totalEmployees} active employees are assigned to a '
          'geofence.';
    }

    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.space1),
      padding: const EdgeInsets.all(AppSpacing.space3),
      decoration: BoxDecoration(color: bg, borderRadius: AppRadius.lgAll),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: fg),
          const SizedBox(width: AppSpacing.space2),
          Expanded(
            child: Text(
              message,
              style: AppTypography.bodySmall.copyWith(color: fg),
            ),
          ),
        ],
      ),
    );
  }

  void _openEmployeesSheet(BuildContext context, Geofence g) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => GeofenceEmployeesSheet(geofence: g),
    );
  }

  Future<void> _confirmDelete(BuildContext context, Geofence g) async {
    // Deleting releases everyone assigned here; anyone left without another
    // geofence can no longer punch. Say so before it happens, not after.
    final staffed =
        ref.read(geofenceCoverageProvider).coverage.countFor(g.id);
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete geofence?'),
        content: Text(
          '"${g.name}" will be removed. Check-ins will no longer validate '
          'against this zone.'
          '${staffed > 0 ? '\n\n$staffed ${staffed == 1 ? 'employee is' : 'employees are'} assigned here. '
              'Their assignments will be removed, and anyone left without another '
              'geofence will be unable to punch attendance.' : ''}',
        ),
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
      // Counts and the unassigned warning both shift after a delete.
      ref.read(geofenceCoverageProvider.notifier).load();
    }
  }

  /// One-vs-many geofences per employee. Turning it off leaves existing
  /// multi-assignments in place — it governs what may be newly assigned.
  Future<void> _openPolicySheet(BuildContext context) async {
    await showModalBottomSheet<void>(
      context: context,
      useSafeArea: true,
      showDragHandle: true,
      builder: (_) => Consumer(
        builder: (ctx, sheetRef, _) {
          final state = sheetRef.watch(geofenceCoverageProvider);
          return Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.space5,
              0,
              AppSpacing.space5,
              AppSpacing.space6,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Assignment policy',
                  style: Theme.of(ctx).textTheme.titleMedium,
                ),
                const SizedBox(height: AppSpacing.space3),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  value: state.allowMultiple,
                  onChanged: state.isPolicySaving
                      ? null
                      : (v) async {
                          final err = await sheetRef
                              .read(geofenceCoverageProvider.notifier)
                              .setAllowMultiple(v);
                          if (!ctx.mounted) return;
                          if (err != null) AppSnackBar.showError(ctx, err);
                        },
                  title: const Text('Allow multiple geofences per employee'),
                  subtitle: Text(
                    state.allowMultiple
                        ? 'Employees can be assigned to several sites.'
                        : 'Each employee belongs to exactly one geofence.',
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
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
  const _GeofenceTile({
    required this.geofence,
    required this.onDelete,
    required this.assignedCount,
    required this.onManageEmployees,
  });

  final Geofence geofence;
  final VoidCallback onDelete;

  /// Employees allowed to punch here. Zero means the zone is inert.
  final int assignedCount;
  final VoidCallback onManageEmployees;

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
                const SizedBox(height: AppSpacing.space2),
                // Staffing is the difference between a live zone and an inert
                // one, so it sits on the tile rather than behind a tap.
                InkWell(
                  onTap: onManageEmployees,
                  borderRadius: AppRadius.smAll,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 3,
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          assignedCount == 0
                              ? Icons.person_off_rounded
                              : Icons.groups_rounded,
                          size: 15,
                          color: assignedCount == 0
                              ? scheme.error
                              : scheme.primary,
                        ),
                        const SizedBox(width: 5),
                        Text(
                          assignedCount == 0
                              ? 'No employees — nobody can punch here'
                              : '$assignedCount '
                                  '${assignedCount == 1 ? 'employee' : 'employees'}',
                          style: AppTypography.bodySmall.copyWith(
                            color: assignedCount == 0
                                ? scheme.error
                                : scheme.primary,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.group_add_rounded),
            tooltip: 'Manage employees',
            onPressed: onManageEmployees,
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
  final _mapController = MapController();

  GeofenceCaptureMode _mode = GeofenceCaptureMode.manual;
  bool _locating = false;
  String? _locationError;
  LocationFailureKind? _locationFailureKind;
  double? _accuracyMeters;

  /// Centre currently staged for save; null until typed, tapped or captured.
  LatLng? _center;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _latCtrl.dispose();
    _lngCtrl.dispose();
    _radiusCtrl.dispose();
    _mapController.dispose();
    super.dispose();
  }

  // ── Capture mode ───────────────────────────────────────────────────────────

  void _setMode(GeofenceCaptureMode mode) {
    setState(() {
      _mode = mode;
      _locationError = null;
      _locationFailureKind = null;
      if (mode == GeofenceCaptureMode.manual) _accuracyMeters = null;
    });
  }

  Future<void> _useCurrentLocation() async {
    setState(() {
      _locating = true;
      _locationError = null;
      _locationFailureKind = null;
    });
    try {
      // HardwareService prompts for permission, then verifies the OS location
      // toggle, and falls back to the last known fix on timeout.
      final position = await sl<HardwareService>().getCurrentLocation();
      if (!mounted) return;
      setState(() {
        _locating = false;
        _accuracyMeters = position.accuracy;
      });
      _applyCenter(LatLng(position.latitude, position.longitude), zoom: 17);
    } on LocationFailure catch (failure) {
      if (!mounted) return;
      setState(() {
        _locating = false;
        _accuracyMeters = null;
        _locationError = failure.message;
        _locationFailureKind = failure.kind;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _locating = false;
        _accuracyMeters = null;
        _locationError = 'Could not read the current location.';
        _locationFailureKind = LocationFailureKind.unavailable;
      });
    }
  }

  /// Label for the recovery button shown beneath a failure, or null when the
  /// only sensible action is to retry the capture itself.
  String? get _recoveryLabel => switch (_locationFailureKind) {
        LocationFailureKind.serviceDisabled => 'Turn on location',
        LocationFailureKind.permissionDeniedForever => 'Open app settings',
        _ => null,
      };

  /// Sends the user to the right OS screen, then re-attempts the capture on
  /// return — the toggle and the permission switch both live outside the app.
  Future<void> _runRecovery() async {
    final hardware = sl<HardwareService>();
    if (_locationFailureKind == LocationFailureKind.serviceDisabled) {
      await hardware.openLocationSettings();
    } else {
      await hardware.openAppSettings();
    }
    if (!mounted) return;
    await _useCurrentLocation();
  }

  // ── Centre plumbing ────────────────────────────────────────────────────────

  /// Single source of truth: keeps the text fields, the pin and [_center]
  /// in step whichever input moved.
  void _applyCenter(LatLng point, {double? zoom}) {
    setState(() {
      _center = point;
      _latCtrl.text = point.latitude.toStringAsFixed(6);
      _lngCtrl.text = point.longitude.toStringAsFixed(6);
    });
    _mapController.move(point, zoom ?? _currentZoom);
  }

  double get _currentZoom {
    try {
      return _mapController.camera.zoom;
    } catch (_) {
      // Camera is unavailable until the map has laid out at least once.
      return 15;
    }
  }

  void _onCoordinatesTyped() {
    if (_mode != GeofenceCaptureMode.manual) return;
    final lat = double.tryParse(_latCtrl.text);
    final lng = double.tryParse(_lngCtrl.text);
    if (lat == null || lng == null) return;
    if (lat.abs() > 90 || lng.abs() > 180) return;
    final point = LatLng(lat, lng);
    setState(() => _center = point);
    _mapController.move(point, _currentZoom);
  }

  void _onMapTap(LatLng point) {
    if (_mode != GeofenceCaptureMode.manual) return;
    _applyCenter(point);
  }

  @override
  Widget build(BuildContext context) {
    final isSaving = ref.watch(geofenceNotifierProvider).isSaving;
    final mq = MediaQuery.of(context);
    // Keyboard inset + system navigation-bar inset, so the save button never
    // sits underneath the Android gesture/nav bar.
    final insets = mq.viewInsets.bottom + mq.viewPadding.bottom;

    final isManual = _mode == GeofenceCaptureMode.manual;

    return Padding(
      padding: EdgeInsets.fromLTRB(
        AppSpacing.screenHorizontal,
        AppSpacing.space2,
        AppSpacing.screenHorizontal,
        AppSpacing.space4 + insets,
      ),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('New geofence', style: AppTypography.titleMedium),
            const SizedBox(height: AppSpacing.space4),
            SegmentedButton<GeofenceCaptureMode>(
              segments: const [
                ButtonSegment(
                  value: GeofenceCaptureMode.manual,
                  icon: Icon(Icons.edit_location_alt_rounded),
                  label: Text('Manual'),
                ),
                ButtonSegment(
                  value: GeofenceCaptureMode.current,
                  icon: Icon(Icons.my_location_rounded),
                  label: Text('My location'),
                ),
              ],
              selected: {_mode},
              onSelectionChanged: (s) => _setMode(s.first),
            ),
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
            if (!isManual) ...[
              const SizedBox(height: AppSpacing.space3),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: OutlinedButton.icon(
                  onPressed: _locating ? null : _useCurrentLocation,
                  icon: _locating
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.gps_fixed_rounded),
                  label: Text(
                    _locating ? 'Locating…' : 'Capture current position',
                  ),
                ),
              ),
              if (_locationError != null) ...[
                const SizedBox(height: AppSpacing.space2),
                _CaptureNote(
                  icon: _locationFailureKind ==
                          LocationFailureKind.serviceDisabled
                      ? Icons.location_disabled_rounded
                      : Icons.error_outline_rounded,
                  message: _locationError!,
                  color: Theme.of(context).colorScheme.error,
                ),
                if (_recoveryLabel != null) ...[
                  const SizedBox(height: AppSpacing.space2),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: TextButton.icon(
                      onPressed: _locating ? null : _runRecovery,
                      icon: const Icon(Icons.settings_rounded, size: 18),
                      label: Text(_recoveryLabel!),
                    ),
                  ),
                ],
              ],
              if (_accuracyMeters != null) ...[
                const SizedBox(height: AppSpacing.space2),
                _CaptureNote(
                  icon: Icons.check_circle_rounded,
                  message: 'Captured — accuracy '
                      '±${_accuracyMeters!.toStringAsFixed(0)}m',
                  color: PingForceColors.gpsExcellent,
                ),
              ],
            ],
            const SizedBox(height: AppSpacing.space3),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _latCtrl,
                    readOnly: !isManual,
                    onChanged: (_) => _onCoordinatesTyped(),
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
                    readOnly: !isManual,
                    onChanged: (_) => _onCoordinatesTyped(),
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
            _buildPickerMap(context, isManual),
            const SizedBox(height: AppSpacing.space3),
            TextFormField(
              controller: _radiusCtrl,
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              onChanged: (_) => setState(() {}), // redraw the radius circle
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
      ),
    );
  }

  // ── Map picker ─────────────────────────────────────────────────────────────

  Widget _buildPickerMap(BuildContext context, bool isManual) {
    final scheme = Theme.of(context).colorScheme;
    final center = _center;
    final radius = double.tryParse(_radiusCtrl.text) ?? 0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ClipRRect(
          borderRadius: AppRadius.lgAll,
          child: SizedBox(
            height: 200,
            child: FlutterMap(
              mapController: _mapController,
              options: MapOptions(
                initialCenter: center ?? const LatLng(13.6288, 79.4192),
                initialZoom: center != null ? 16 : 4,
                onTap: (_, point) => _onMapTap(point),
                interactionOptions: const InteractionOptions(
                  flags: InteractiveFlag.pinchZoom |
                      InteractiveFlag.drag |
                      InteractiveFlag.doubleTapZoom,
                ),
              ),
              children: [
                TileLayer(
                  urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                  userAgentPackageName: 'com.vellasoft.pingforce',
                ),
                if (center != null && radius > 0)
                  CircleLayer(
                    circles: [
                      CircleMarker(
                        point: center,
                        radius: radius,
                        useRadiusInMeter: true,
                        borderStrokeWidth: 2,
                        borderColor: scheme.primary,
                        color: scheme.primary.withValues(alpha: 0.15),
                      ),
                    ],
                  ),
                if (center != null)
                  MarkerLayer(
                    markers: [
                      Marker(
                        point: center,
                        width: 36,
                        height: 36,
                        alignment: Alignment.topCenter,
                        child: Icon(
                          Icons.location_on_rounded,
                          size: 36,
                          color: scheme.primary,
                        ),
                      ),
                    ],
                  ),
              ],
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.space2),
        Row(
          children: [
            Icon(
              isManual ? Icons.touch_app_rounded : Icons.my_location_rounded,
              size: AppIconSize.xs,
              color: scheme.onSurfaceVariant,
            ),
            const SizedBox(width: 6),
            Expanded(
              child: Text(
                isManual
                    ? 'Tap the map to set the boundary centre'
                    : 'Pin follows your captured device position',
                style: AppTypography.bodySmall
                    .copyWith(color: scheme.onSurfaceVariant),
              ),
            ),
          ],
        ),
      ],
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
    if (_mode == GeofenceCaptureMode.current && _center == null) {
      AppSnackBar.showError(
        context,
        'Capture the current position before saving',
      );
      return;
    }

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
// CAPTURE NOTE — inline success/error line under the GPS capture button
// ─────────────────────────────────────────────────────────────────────────────

class _CaptureNote extends StatelessWidget {
  const _CaptureNote({
    required this.icon,
    required this.message,
    required this.color,
  });

  final IconData icon;
  final String message;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: AppIconSize.xs, color: color),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            message,
            style: AppTypography.bodySmall.copyWith(color: color),
          ),
        ),
      ],
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
