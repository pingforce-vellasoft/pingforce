import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/theme.dart';
import 'check_in_state.dart';
import 'widgets/shift_card.dart';
import 'widgets/gps_map_panel.dart';
import 'widgets/check_in_button.dart';
import 'widgets/check_in_success_overlay.dart';
import 'widgets/mock_location_blocker.dart';
import 'widgets/offline_banner.dart';
import 'widgets/attendance_active_session_card.dart';
import 'check_in_notifier.dart';

// ─────────────────────────────────────────────────────────────────────────────
// ATTENDANCE SCREEN  (maps to CHECKIN_FLOW_SPEC.md §4)
// ─────────────────────────────────────────────────────────────────────────────

class AttendanceScreen extends ConsumerStatefulWidget {
  const AttendanceScreen({super.key});

  @override
  ConsumerState<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends ConsumerState<AttendanceScreen>
    with TickerProviderStateMixin {
  late final AnimationController _screenEntryController;
  late final Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();

    // Screen entry animation (CHECKIN_FLOW_SPEC.md §13)
    _screenEntryController = AnimationController(
      vsync: this,
      duration: AppDurations.medium, // 300ms
    );
    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, 0.05),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _screenEntryController,
      curve: AppEasing.emphasized,
    ));

    // Start check-in initialisation
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(checkInNotifierProvider.notifier).initialise();
      _screenEntryController.forward();
    });
  }

  @override
  void dispose() {
    _screenEntryController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(checkInNotifierProvider);

    // Mock location hard block — covers entire screen
    if (state.status == CheckInScreenStatus.mockLocationDetected) {
      return const MockLocationBlocker();
    }

    // When the tenant has not configured a geofence the feature is blocked
    // entirely — no check-in button, only the consult-admin message.
    final showCheckInBar =
        state.status != CheckInScreenStatus.geofenceNotConfigured &&
            state.status != CheckInScreenStatus.gpsPermissionRequired &&
            state.status != CheckInScreenStatus.initializing;

    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      appBar: _buildAppBar(context, state),
      bottomNavigationBar:
          showCheckInBar ? const AttendanceCheckInBar() : null,
      body: Stack(
        children: [
          // ── Main scrollable content ──────────────────────────────────────
          SlideTransition(
            position: _slideAnimation,
            child: FadeTransition(
              opacity: _screenEntryController,
              child: _buildBody(context, state),
            ),
          ),

          // ── Success overlay (floats above everything) ───────────────────
          if (state.showSuccessOverlay && state.checkInResult != null)
            CheckInSuccessOverlay(
              result: state.checkInResult!,
              onDismiss: () =>
                  ref.read(checkInNotifierProvider.notifier).dismissSuccess(),
            ),
        ],
      ),
    );
  }

  // ── AppBar ─────────────────────────────────────────────────────────────────

  PreferredSizeWidget _buildAppBar(BuildContext context, CheckInState state) {
    return AppBar(
      title: const Text('Attendance'),
      leading: IconButton(
        icon: const Icon(Icons.arrow_back_rounded),
        tooltip: 'Back',
        onPressed: () => Navigator.of(context).maybePop(),
      ),
      actions: [
        if (state.status != CheckInScreenStatus.initializing) ...[
          Semantics(
            label: 'Attendance help',
            child: IconButton(
              icon: const Icon(Icons.help_outline_rounded),
              tooltip: 'Help',
              onPressed: () => _showHelpSheet(context),
            ),
          ),
          Semantics(
            label: 'Attendance settings',
            child: IconButton(
              icon: const Icon(Icons.tune_rounded),
              tooltip: 'Settings',
              onPressed: () => _openAttendanceSettings(context),
            ),
          ),
        ],
      ],
    );
  }

  // ── Body ───────────────────────────────────────────────────────────────────

  Widget _buildBody(BuildContext context, CheckInState state) {
    return Column(
      children: [
        // ── Offline banner (CHECKIN_FLOW_SPEC.md S7) ────────────────────
        if (!state.isOnline) const OfflineBanner(),

        // ── Scrollable content ──────────────────────────────────────────
        Expanded(
          child: CustomScrollView(
            physics: const BouncingScrollPhysics(
              parent: AlwaysScrollableScrollPhysics(),
            ),
            slivers: [
              SliverPadding(
                padding: AppSpacing.screenPaddingH.copyWith(
                  top: AppSpacing.space4,
                  bottom: AppSpacing.space20, // Space for button
                ),
                sliver: SliverList.list(
                  children: [
                    // ── Active session card (S6) ───────────────────────
                    if (state.status == CheckInScreenStatus.alreadyCheckedIn &&
                        state.activeSession != null) ...[
                      AttendanceActiveSessionCard(
                        session: state.activeSession!,
                        isCheckingOut: state.isCheckingOut,
                        checkOutError: state.checkOutError,
                        onBreak: () => ref
                            .read(checkInNotifierProvider.notifier)
                            .startBreak(),
                        onCheckOut: () => ref
                            .read(checkInNotifierProvider.notifier)
                            .initiateCheckOut(),
                      ),
                      AppSpacing.sectionGapBox,
                    ],

                    // ── Geofence not configured — hard block ───────────
                    // When the tenant has no check-in zone the whole feature
                    // is unavailable: show only the consult-admin message and
                    // suppress the shift card / GPS map (nothing to act on).
                    if (state.status ==
                        CheckInScreenStatus.geofenceNotConfigured) ...[
                      _GeofenceMessageCard(
                        icon: Icons.wrong_location_rounded,
                        color: Theme.of(context).colorScheme.tertiary,
                        title: 'Check-in unavailable',
                        message:
                            'Your check-in zone (geofence) has not been set '
                            'up yet. Please consult your admin to add a '
                            'geofence before you can use attendance check-in.',
                      ),
                    ] else ...[
                    // ── Shift Card (always visible except alreadyCheckedIn) ─
                    if (state.status != CheckInScreenStatus.alreadyCheckedIn)
                      ShiftCard(shift: state.shift),

                    if (state.status != CheckInScreenStatus.alreadyCheckedIn)
                      AppSpacing.sectionGapBox,

                    if (state.status ==
                        CheckInScreenStatus.outsideGeofence) ...[
                      _GeofenceMessageCard(
                        icon: Icons.location_off_rounded,
                        color: Theme.of(context).colorScheme.error,
                        title: 'You are outside the check-in zone',
                        message: state.nearestGeofenceName != null
                            ? 'You need to be inside "'
                                '${state.nearestGeofenceName}" to check in. '
                                'Move to the specified location and try again.'
                            : 'You need to be inside the specified location to '
                                'check in. Move to the zone and try again.',
                      ),
                      AppSpacing.sectionGapBox,
                    ],

                    // ── GPS Map Panel ──────────────────────────────────
                    GpsMapPanel(
                      status: state.status,
                      location: state.location,
                      geofence: state.geofence,
                      gpsAccuracy: state.gpsAccuracy,
                      geofenceStatus: state.geofenceStatus,
                      isCompact:
                          state.status == CheckInScreenStatus.alreadyCheckedIn,
                    ),

                    AppSpacing.sectionGapBox,

                    // ── Method Selector ────────────────────────────────
                    if (state.showMethodSelector)
                      _buildMethodSelector(context, state),

                    if (state.showMethodSelector) AppSpacing.sectionGapBox,

                    // ── Sync timestamp ─────────────────────────────────
                    _buildSyncInfo(context, state),
                    ], // end else (geofence configured)
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ── Method Selector ────────────────────────────────────────────────────────

  Widget _buildMethodSelector(BuildContext context, CheckInState state) {
    final methods = state.policy?.checkInMethods ?? ['GPS'];
    return SizedBox(
      height: 40,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: methods.length,
        separatorBuilder: (_, _) => AppSpacing.iconGapBox,
        itemBuilder: (context, index) {
          final method = methods[index];
          final isGps = method == 'GPS';
          final isActive = isGps; // GPS is always primary
          return FilterChip(
            label: Text(method),
            selected: isActive,
            avatar: Icon(
              _methodIcon(method),
              size: AppIconSize.sm,
            ),
            onSelected: (_) {
              // TODO: handle method switching
            },
          );
        },
      ),
    );
  }

  IconData _methodIcon(String method) => switch (method) {
        'GPS' => Icons.gps_fixed_rounded,
        'QR' => Icons.qr_code_scanner_rounded,
        'NFC' => Icons.nfc_rounded,
        'MANUAL' => Icons.edit_note_rounded,
        _ => Icons.radio_button_checked_rounded,
      };

  // ── Sync info row ──────────────────────────────────────────────────────────

  Widget _buildSyncInfo(BuildContext context, CheckInState state) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.space4),
      child: Row(
        children: [
          Icon(
            Icons.cloud_done_outlined,
            size: AppIconSize.xs,
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
          AppSpacing.iconGapBox,
          Text(
            'Last synced: Today 09:05 AM', // TODO: from state
            style: AppTypography.labelSmall.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  void _showHelpSheet(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      builder: (ctx) => Padding(
        padding: AppSpacing.screenPaddingAll,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('How to Check In', style: AppTypography.headlineSmall),
            AppSpacing.mediumGapBox,
            Text(
              '1. Allow location access when prompted.\n'
              '2. Wait for GPS to acquire your position.\n'
              '3. Ensure you are within the designated zone.\n'
              '4. Tap "Check In" to record your attendance.',
              style: AppTypography.bodyMedium,
            ),
            AppSpacing.sectionGapBox,
          ],
        ),
      ),
    );
  }

  void _openAttendanceSettings(BuildContext context) {
    // TODO: navigate to attendance settings
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GEOFENCE MESSAGE CARD  — notConfigured / outsideGeofence banners
// ─────────────────────────────────────────────────────────────────────────────

class _GeofenceMessageCard extends StatelessWidget {
  const _GeofenceMessageCard({
    required this.icon,
    required this.color,
    required this.title,
    required this.message,
  });

  final IconData icon;
  final Color color;
  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: AppSpacing.screenPaddingAll,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: AppRadius.lgAll,
        border: Border.all(color: color.withValues(alpha: 0.30)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: AppIconSize.lg),
          AppSpacing.mediumGapBox,
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: AppTypography.titleSmall.copyWith(
                    color: Theme.of(context).colorScheme.onSurface,
                  ),
                ),
                const SizedBox(height: AppSpacing.space1),
                Text(
                  message,
                  style: AppTypography.bodyMedium.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BOTTOM CHECK-IN BUTTON BAR  (fixed at screen bottom)
// ─────────────────────────────────────────────────────────────────────────────

/// This widget is overlaid on the bottom of the screen so it stays fixed
/// regardless of scroll position.
class AttendanceCheckInBar extends ConsumerWidget {
  const AttendanceCheckInBar({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(checkInNotifierProvider);
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
          AppSpacing.screenHorizontal,
          AppSpacing.space2,
          AppSpacing.screenHorizontal,
          AppSpacing.space4,
        ),
        child: CheckInButton(
          mode: state.buttonMode,
          onTap: state.isCheckInBlocked
              ? null
              : () => ref.read(checkInNotifierProvider.notifier).onCheckInTap(context),
        ),
      ),
    );
  }
}
