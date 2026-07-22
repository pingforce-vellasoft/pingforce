import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../../../../../core/theme/theme.dart';
import '../check_in_state.dart';

// ─────────────────────────────────────────────────────────────────────────────
// GPS MAP PANEL  (CHECKIN_FLOW_SPEC.md §5.2 & §5.3)
// ─────────────────────────────────────────────────────────────────────────────

class GpsMapPanel extends StatefulWidget {
  const GpsMapPanel({
    super.key,
    required this.status,
    required this.gpsAccuracy,
    required this.geofenceStatus,
    this.location,
    this.geofence,
    this.isCompact = false,
  });

  final CheckInScreenStatus status;
  final GpsAccuracyLevel gpsAccuracy;
  final GeofenceStatus geofenceStatus;
  final GpsLocation? location;
  final GeofenceInfo? geofence;

  /// Compact mode: smaller height when active session card is shown.
  final bool isCompact;

  @override
  State<GpsMapPanel> createState() => _GpsMapPanelState();
}

class _GpsMapPanelState extends State<GpsMapPanel>
    with TickerProviderStateMixin {
  final MapController _mapController = MapController();

  // Pulsing animation for GPS acquiring / outside geofence ring
  late final AnimationController _pulseController;
  late final Animation<double> _pulseAnimation;

  // Geofence color transition animation
  late final AnimationController _geofenceColorController;

  @override
  void initState() {
    super.initState();

    // GPS acquiring pulse (indefinite)
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);

    _pulseAnimation = Tween<double>(begin: 0.3, end: 1.0).animate(
      CurvedAnimation(parent: _pulseController, curve: AppEasing.linear),
    );

    // Geofence color transition (400ms — CHECKIN_FLOW_SPEC.md §13)
    _geofenceColorController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );
    _geofenceColorController.forward();
  }

  @override
  void didUpdateWidget(covariant GpsMapPanel oldWidget) {
    super.didUpdateWidget(oldWidget);

    // Animate geofence color when status changes
    if (oldWidget.geofenceStatus != widget.geofenceStatus) {
      _geofenceColorController.reset();
      _geofenceColorController.forward();
    }

    // Recenter camera when location changes. Layers (marker + circles) are
    // rebuilt from widget props in build(), so no overlay bookkeeping needed.
    if (widget.location != null &&
        oldWidget.location?.latitude != widget.location?.latitude) {
      _animateCameraToLocation();
    }
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _geofenceColorController.dispose();
    _mapController.dispose();
    super.dispose();
  }

  // ── Map overlay builders ───────────────────────────────────────────────────

  List<CircleMarker> _buildCircles() {
    final loc = widget.location;
    final geo = widget.geofence;
    final circles = <CircleMarker>[];

    if (loc != null) {
      // GPS accuracy ring around user (radius in real meters)
      circles.add(
        CircleMarker(
          point: LatLng(loc.latitude, loc.longitude),
          radius: loc.accuracyMeters,
          useRadiusInMeter: true,
          borderStrokeWidth: 1,
          borderColor: _gpsRingColor(widget.gpsAccuracy).withValues(alpha: 0.6),
          color: _gpsRingColor(widget.gpsAccuracy).withValues(alpha: 0.12),
        ),
      );
    }

    // Geofence circle
    if (geo != null && geo.radiusMeters > 0) {
      final isSafe = widget.geofenceStatus == GeofenceStatus.inside;
      circles.add(
        CircleMarker(
          point: geo.center,
          radius: geo.radiusMeters,
          useRadiusInMeter: true,
          borderStrokeWidth: 2,
          borderColor: isSafe
              ? PingForceColors.gpsGeofenceInsideBorder
              : PingForceColors.gpsGeofenceOutsideBorder,
          color: isSafe
              ? PingForceColors.gpsGeofenceInside
              : PingForceColors.gpsGeofenceOutside,
        ),
      );
    }

    return circles;
  }

  List<Marker> _buildMarkers() {
    final loc = widget.location;
    if (loc == null) return const [];
    return [
      Marker(
        point: LatLng(loc.latitude, loc.longitude),
        width: 24,
        height: 24,
        alignment: Alignment.center,
        child: Container(
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: _gpsRingColor(widget.gpsAccuracy),
            border: Border.all(color: Colors.white, width: 2),
            boxShadow: const [
              BoxShadow(color: Color(0x40000000), blurRadius: 4),
            ],
          ),
        ),
      ),
    ];
  }

  void _animateCameraToLocation() {
    final loc = widget.location;
    if (loc == null) return;
    _mapController.move(LatLng(loc.latitude, loc.longitude), 17);
  }

  // ── Build ──────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final double panelHeight = widget.isCompact ? 180 : 240;

    return Semantics(
      label: _semanticLabel,
      child: ClipRRect(
        borderRadius: AppRadius.lgAll,
        child: SizedBox(
          height: panelHeight,
          child: Stack(
            children: [
              // ── Map or skeleton ──────────────────────────────────────
              _buildMapOrSkeleton(context),

              // ── Status overlays ──────────────────────────────────────
              if (widget.status == CheckInScreenStatus.outsideGeofence)
                _buildOutsideFenceBanner(context),

              if (widget.status == CheckInScreenStatus.gpsPoor)
                _buildGpsPoorBanner(context),

              // ── GPS status chip (bottom-left) ────────────────────────
              Positioned(
                bottom: AppSpacing.space2,
                left: AppSpacing.space2,
                child: _buildGpsStatusChip(context),
              ),

              // ── Geofence status chip (bottom-right) ──────────────────
              if (widget.geofenceStatus != GeofenceStatus.notConfigured &&
                  widget.geofenceStatus != GeofenceStatus.unknown)
                Positioned(
                  bottom: AppSpacing.space2,
                  right: AppSpacing.space2,
                  child: _buildGeofenceStatusChip(context),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMapOrSkeleton(BuildContext context) {
    final isLoading = widget.status == CheckInScreenStatus.initializing;

    if (isLoading) {
      return _buildShimmerSkeleton(context);
    }

    final loc = widget.location;
    return FlutterMap(
      mapController: _mapController,
      options: MapOptions(
        initialCenter: loc != null
            ? LatLng(loc.latitude, loc.longitude)
            : const LatLng(0, 0),
        initialZoom: loc != null ? 17 : 14,
        // Match previous UX: no rotation, pan/zoom only.
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
        CircleLayer(circles: _buildCircles()),
        MarkerLayer(markers: _buildMarkers()),
      ],
    );
  }

  Widget _buildShimmerSkeleton(BuildContext context) {
    // Simple shimmer placeholder — replace with shimmer package in real impl
    return Container(
      color: Theme.of(context).colorScheme.surfaceContainerHigh,
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AnimatedBuilder(
              animation: _pulseAnimation,
              builder: (_, _) => Opacity(
                opacity: _pulseAnimation.value,
                child: Icon(
                  Icons.gps_not_fixed_rounded,
                  size: AppIconSize.xl,
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
            ),
            AppSpacing.smallGapBox,
            Text(
              'Acquiring location...',
              style: AppTypography.bodyMedium.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Banner overlays ────────────────────────────────────────────────────────

  Widget _buildOutsideFenceBanner(BuildContext context) {
    return Positioned(
      top: 0,
      left: 0,
      right: 0,
      child: Container(
        color: PingForceColors.statusCriticalContainer.withValues(alpha: 0.92),
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.space4,
          vertical: AppSpacing.space2,
        ),
        child: Row(
          children: [
            const Icon(
              Icons.location_off_rounded,
              size: AppIconSize.sm,
              color: PingForceColors.statusCritical,
            ),
            AppSpacing.iconGapBox,
            Expanded(
              child: Text(
                'You are outside the check-in zone',
                style: AppTypography.labelMedium.copyWith(
                  color: PingForceColors.statusCritical,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildGpsPoorBanner(BuildContext context) {
    return Positioned(
      top: 0,
      left: 0,
      right: 0,
      child: Container(
        color: PingForceColors.statusWarningContainer.withValues(alpha: 0.92),
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.space4,
          vertical: AppSpacing.space2,
        ),
        child: Row(
          children: [
            const Icon(
              Icons.gps_not_fixed_rounded,
              size: AppIconSize.sm,
              color: PingForceColors.statusWarning,
            ),
            AppSpacing.iconGapBox,
            Expanded(
              child: Text(
                'GPS signal weak – move to an open area',
                style: AppTypography.labelMedium.copyWith(
                  color: PingForceColors.statusWarning,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Status chips ───────────────────────────────────────────────────────────

  Widget _buildGpsStatusChip(BuildContext context) {
    final isAcquiring = widget.status == CheckInScreenStatus.gpsAcquiring ||
        widget.status == CheckInScreenStatus.initializing;

    return _MapChip(
      icon: isAcquiring
          ? Icons.gps_not_fixed_rounded
          : Icons.gps_fixed_rounded,
      iconColor: isAcquiring
          ? Theme.of(context).colorScheme.onSurfaceVariant
          : _gpsRingColor(widget.gpsAccuracy),
      label: isAcquiring
          ? 'Acquiring...'
          : '${widget.gpsAccuracy.label} · '
              '${widget.location?.accuracyMeters.toStringAsFixed(0) ?? '--'}m',
      isAnimating: isAcquiring,
      pulseAnimation: _pulseAnimation,
    );
  }

  Widget _buildGeofenceStatusChip(BuildContext context) {
    final isInside = widget.geofenceStatus == GeofenceStatus.inside;
    return _MapChip(
      icon: isInside
          ? Icons.check_circle_rounded
          : Icons.cancel_rounded,
      iconColor: isInside
          ? PingForceColors.gpsGeofenceInsideBorder
          : PingForceColors.gpsGeofenceOutsideBorder,
      label: isInside ? 'Inside Boundary' : 'Outside Boundary',
    );
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  Color _gpsRingColor(GpsAccuracyLevel level) => switch (level) {
        GpsAccuracyLevel.excellent => PingForceColors.gpsExcellent,
        GpsAccuracyLevel.good => PingForceColors.gpsGood,
        GpsAccuracyLevel.fair => PingForceColors.gpsFair,
        GpsAccuracyLevel.poor => PingForceColors.gpsPoor,
        GpsAccuracyLevel.unavailable => PingForceColors.gpsUnavailable,
      };

  String get _semanticLabel => switch (widget.geofenceStatus) {
        GeofenceStatus.inside =>
          'GPS map. You are inside the check-in zone. Accuracy: ${widget.gpsAccuracy.label}',
        GeofenceStatus.outside =>
          'GPS map. You are outside the check-in zone.',
        _ => 'GPS map. Acquiring your location.',
      };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAP CHIP  — small info chip overlaid on the map
// ─────────────────────────────────────────────────────────────────────────────

class _MapChip extends StatelessWidget {
  const _MapChip({
    required this.icon,
    required this.iconColor,
    required this.label,
    this.isAnimating = false,
    this.pulseAnimation,
  });

  final IconData icon;
  final Color iconColor;
  final String label;
  final bool isAnimating;
  final Animation<double>? pulseAnimation;

  @override
  Widget build(BuildContext context) {
    Widget iconWidget = Icon(icon, size: AppIconSize.xs, color: iconColor);

    if (isAnimating && pulseAnimation != null) {
      iconWidget = AnimatedBuilder(
        animation: pulseAnimation!,
        builder: (_, child) =>
            Opacity(opacity: pulseAnimation!.value, child: child),
        child: iconWidget,
      );
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Theme.of(context)
            .colorScheme
            .surfaceContainerLowest
            .withValues(alpha: 0.90),
        borderRadius: AppRadius.pillAll,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          iconWidget,
          const SizedBox(width: 4),
          Text(
            label,
            style: AppTypography.labelSmall.copyWith(
              color: Theme.of(context).colorScheme.onSurface,
            ),
          ),
        ],
      ),
    );
  }
}
