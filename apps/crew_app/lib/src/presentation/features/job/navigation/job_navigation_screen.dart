import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_navigation_flutter/google_navigation_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../core/app_theme.dart';
import '../../../../core/secrets.dart';
import '../../../../domain/models/job.dart';
import '../../../../domain/models/route_plan.dart';
import '../../../../domain/providers/route_provider.dart';
import '../../schedule/route_update_sheet.dart';

enum CrewNavMode { turnByTurn, freeDrive }

/// Embedded Google turn-by-turn navigation using google_navigation_flutter.
///
/// The [GoogleMapsNavigationView] is a platform view that renders the native
/// Navigation SDK. It is created once in initState and kept mounted for the
/// entire navigation session — it is NOT recreated on setState or Riverpod
/// rebuilds. Only Flutter overlays (exit button, mode chips, arrival button)
/// update on rebuild.
///
/// Lifecycle:
/// 1. View created → onViewCreated fires → controller stored
/// 2. initializeNavigationSession() called once
/// 3. setDestinations() called with booking coordinates
/// 4. startGuidance() called
/// 5. setAudioGuidance() enables voice
/// 6. setOnArrivalListener() fires on arrival → onArrive callback
/// 7. setOnReroutingListener() fires on off-route → SDK handles rerouting
/// 8. stopGuidance() + cleanup() on dispose
///
/// Duplicate destination requests are prevented by _guidanceStarted flag.
/// "Open in Google Maps" fallback works when no API key is configured.
class JobNavigationScreen extends ConsumerStatefulWidget {
  const JobNavigationScreen({
    super.key,
    required this.mode,
    required this.onModeChanged,
    required this.job,
    required this.onArrive,
  });

  final CrewNavMode mode;
  final ValueChanged<CrewNavMode> onModeChanged;
  final Job job;
  final VoidCallback onArrive;

  @override
  ConsumerState<JobNavigationScreen> createState() =>
      _JobNavigationScreenState();
}

class _JobNavigationScreenState extends ConsumerState<JobNavigationScreen> {
  bool _navigationInitialized = false;
  bool _guidanceStarted = false;
  bool _arrived = false;
  StreamSubscription<OnArrivalEvent>? _arrivalSub;
  StreamSubscription<void>? _reroutingSub;
  StreamSubscription<void>? _newSessionSub;
  String? _initError;

  /// The stop ID currently being navigated to. Used to detect destination
  /// changes from route updates and prevent duplicate setDestinations calls.
  String? _currentNavStopId;

  /// The destination coordinates currently being navigated to.
  double? _currentNavLat;
  double? _currentNavLng;

  /// Whether a route update changed the destination and we're waiting
  /// for acknowledgment before switching.
  bool _awaitingAckForNewDest = false;

  /// Whether the active job was removed by dispatch.
  bool _activeJobRemoved = false;

  /// Destination coordinates — resolved from the watched route state
  /// in build(), falling back to the booking's customer coordinates.
  /// These are set during build() from the reactive RouteState, not
  /// from ref.read() which could return stale values.
  double? _resolvedDestLat;
  double? _resolvedDestLng;

  /// Resolve destination from the watched route state.
  /// Called once during build() so the values are reactive.
  void _resolveDestinationFromRoute(CrewRoute? route) {
    // If we have a current nav destination from a route update, keep it.
    if (_currentNavLat != null && _currentNavLng != null) {
      _resolvedDestLat = _currentNavLat;
      _resolvedDestLng = _currentNavLng;
      return;
    }

    // Try to resolve from the watched route state.
    if (route != null) {
      final activeId = route.activeStopId;
      RouteStop? dest;
      if (activeId != null) {
        dest = route.orderedStops
            .where((s) => s.stopId == activeId)
            .firstOrNull;
      }
      dest ??= route.orderedStops
          .where((s) => s.status == 'upcoming')
          .firstOrNull;

      if (dest != null && dest.latitude != null && dest.longitude != null) {
        // Verify it matches the current booking where appropriate.
        if (dest.bookingId == widget.job.id ||
            dest.stopId == widget.job.id ||
            _currentNavStopId == dest.stopId) {
          _resolvedDestLat = dest.latitude;
          _resolvedDestLng = dest.longitude;
          _currentNavStopId ??= dest.stopId;
          return;
        }
      }
    }

    // Fall back to booking coordinates.
    _resolvedDestLat = widget.job.customer.lat;
    _resolvedDestLng = widget.job.customer.lng;
  }

  double? get _destLat => _resolvedDestLat ?? widget.job.customer.lat;
  double? get _destLng => _resolvedDestLng ?? widget.job.customer.lng;

  @override
  void initState() {
    super.initState();
    // Destination is resolved in build() from the watched route state.
    // No ref.read() here — that would return a stale value.
  }

  @override
  void dispose() {
    _arrivalSub?.cancel();
    _reroutingSub?.cancel();
    _newSessionSub?.cancel();
    if (_guidanceStarted) {
      GoogleMapsNavigator.stopGuidance().catchError((_) {});
    }
    if (_navigationInitialized) {
      GoogleMapsNavigator.cleanup().catchError((_) {});
    }
    super.dispose();
  }

  /// Called when the native view is created. Initializes the navigation
  /// session, sets destinations, starts guidance, and wires event listeners.
  Future<void> _onViewCreated(GoogleNavigationViewController controller) async {
    if (AppSecrets.googleNavigationApiKey.isEmpty) {
      // No API key — can't initialize. Fallback UI will show.
      return;
    }

    if (_destLat == null || _destLng == null) {
      setState(() => _initError = 'No destination coordinates for this job');
      return;
    }

    try {
      // 1. Initialize the navigation session (one per active session).
      await GoogleMapsNavigator.initializeNavigationSession();
      _navigationInitialized = true;

      // 2. Set up event listeners before starting guidance.
      _arrivalSub = GoogleMapsNavigator.setOnArrivalListener((event) {
        if (!_arrived) {
          _arrived = true;
          if (mounted) widget.onArrive();
        }
      });

      _reroutingSub = GoogleMapsNavigator.setOnReroutingListener(() {
        // SDK handles rerouting automatically. No Flutter action needed.
      });

      _newSessionSub = GoogleMapsNavigator.setOnNewNavigationSessionListener(
        () {
          // Session refreshed after rerouting or resume.
        },
      );

      // 3. Enable voice guidance.
      await GoogleMapsNavigator.setAudioGuidance(
        NavigationAudioGuidanceSettings(
          guidanceType: NavigationAudioGuidanceType.alertsAndGuidance,
          isBluetoothAudioEnabled: true,
          isVibrationEnabled: true,
        ),
      );

      // 4. Set destinations (prevents duplicates via _guidanceStarted flag).
      if (!_guidanceStarted) {
        _guidanceStarted = true;
        final destinations = Destinations(
          waypoints: [
            NavigationWaypoint(
              title: widget.job.customer.name,
              target: LatLng(latitude: _destLat!, longitude: _destLng!),
            ),
          ],
          displayOptions: NavigationDisplayOptions(
            showDestinationMarkers: true,
          ),
          routingOptions: RoutingOptions(
            travelMode: NavigationTravelMode.driving,
            avoidTolls: false,
            avoidHighways: false,
          ),
        );

        final status = await GoogleMapsNavigator.setDestinations(destinations);
        if (status != NavigationRouteStatus.statusOk) {
          setState(() => _initError = 'Route calculation failed: $status');
          _guidanceStarted = false;
          return;
        }

        // 5. Start guidance.
        await GoogleMapsNavigator.startGuidance();
      }
    } on SessionInitializationException catch (e) {
      setState(() => _initError = 'Navigation init failed: $e');
    } catch (e) {
      setState(() => _initError = 'Navigation error: $e');
    }
  }

  Future<void> _openInGoogleMaps() async {
    final address = widget.job.customer.address;
    final encoded = Uri.encodeComponent(address);
    final uri = Uri.parse('google.navigation:q=$encoded&mode=d');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
      return;
    }
    final fallback = Uri.parse(
      'https://www.google.com/maps/dir/?api=1&destination=$encoded&travelmode=driving',
    );
    if (await canLaunchUrl(fallback)) {
      await launchUrl(fallback, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    final routeState = ref.watch(routeProvider);
    final route = routeState.route;

    // Resolve destination from the watched route state (reactive).
    _resolveDestinationFromRoute(route);

    // Check if the active job was removed by dispatch.
    if (route != null && _currentNavStopId != null) {
      final stopExists = route.orderedStops.any(
        (s) => s.stopId == _currentNavStopId,
      );
      if (!stopExists && !_activeJobRemoved) {
        _activeJobRemoved = true;
      }
    }

    // Blocking dispatch-resolution screen when active job is removed.
    if (_activeJobRemoved) {
      return ActiveJobRemovedScreen(
        removedJobName: widget.job.customer.name,
        onContactDispatch: () {
          final uri = Uri.parse('tel:+15875550100');
          launchUrl(uri);
        },
      );
    }

    // Check for destination change from route update.
    if (route != null && _currentNavStopId != null && !_awaitingAckForNewDest) {
      final newDest = route.orderedStops
          .where((s) => s.stopId == route.activeStopId)
          .firstOrNull;
      if (newDest != null &&
          newDest.stopId != _currentNavStopId &&
          route.requiresAcknowledgment &&
          !route.acknowledged) {
        // Destination changed and acknowledgment is required.
        // Do not change navigation before acknowledgment.
        _awaitingAckForNewDest = true;
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) _showDestinationChangedSheet(context, route);
        });
      }
    }

    final hasApiKey = AppSecrets.googleNavigationApiKey.isNotEmpty;
    final hasCoords = _destLat != null && _destLng != null;
    final canUseNativeNav = hasApiKey && hasCoords;

    return Scaffold(
      backgroundColor: const Color(0xFFDCE4E0),
      body: Stack(
        children: [
          // Native navigation view — created once, stays mounted.
          // Route updates with the same destination do NOT recreate this view.
          if (canUseNativeNav)
            GoogleMapsNavigationView(
              onViewCreated: _onViewCreated,
              onRecenterButtonClicked: (_) {},
            ),

          // Placeholder when no API key or no coordinates.
          if (!canUseNativeNav)
            Positioned.fill(
              child: _NavigationPlaceholder(
                destination: widget.job.customer.address,
                reason: !hasApiKey
                    ? 'Navigation SDK not configured'
                    : 'No destination coordinates for this job',
                onOpenGoogleMaps: _openInGoogleMaps,
              ),
            ),

          // Error overlay.
          if (_initError != null)
            Positioned(
              top: 80,
              left: 16,
              right: 16,
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.statusRed,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  _initError!,
                  style: const TextStyle(color: Colors.white, fontSize: 13),
                ),
              ),
            ),

          // Flutter overlays — update without recreating the nav view.
          SafeArea(
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                  child: Row(
                    children: [
                      _CircleButton(
                        icon: Icons.close_rounded,
                        onTap: () => Navigator.of(context).maybePop(),
                      ),
                      const Spacer(),
                      _ModeChip(
                        label: 'Turn-by-turn',
                        selected: widget.mode == CrewNavMode.turnByTurn,
                        onTap: () =>
                            widget.onModeChanged(CrewNavMode.turnByTurn),
                      ),
                      const SizedBox(width: 8),
                      _ModeChip(
                        label: 'Free drive',
                        selected: widget.mode == CrewNavMode.freeDrive,
                        onTap: () =>
                            widget.onModeChanged(CrewNavMode.freeDrive),
                      ),
                    ],
                  ),
                ),
                const Spacer(),
              ],
            ),
          ),

          // Bottom card with job info and arrival button.
          Align(
            alignment: Alignment.bottomCenter,
            child: SafeArea(
              top: false,
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
                decoration: const BoxDecoration(
                  color: AppColors.bgCard,
                  borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                widget.job.customer.name,
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                widget.job.customer.address,
                                style: const TextStyle(
                                  fontSize: 13,
                                  color: AppColors.textSecondary,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                        if (!canUseNativeNav)
                          TextButton.icon(
                            onPressed: _openInGoogleMaps,
                            icon: const Icon(Icons.open_in_new, size: 16),
                            label: const Text('Google Maps'),
                          ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    SizedBox(
                      width: double.infinity,
                      height: 56,
                      child: ElevatedButton(
                        onPressed: _arrived ? null : widget.onArrive,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.accent,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        child: Text(
                          _arrived ? 'Arrived' : "I've Arrived",
                          style: const TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Show the destination-changed sheet when a route update changes
  /// the active destination. Navigation is NOT changed until acknowledgment.
  void _showDestinationChangedSheet(BuildContext context, CrewRoute route) {
    final newDest = route.orderedStops
        .where((s) => s.stopId == route.activeStopId)
        .firstOrNull;

    final summary = RouteChangeSummary(
      newVersion: route.routeVersion,
      oldVersion: route.routeVersion - 1,
      changes: [
        RouteChange(
          type: 'destination_changed',
          description: newDest != null
              ? 'New destination: ${newDest.stopType} stop #${newDest.sequence}'
              : 'Destination changed',
        ),
        if (route.routeChangeReason != null)
          RouteChange(
            type: 'route_updated',
            description: route.routeChangeReason!,
          ),
      ],
      destinationChanged: true,
      activeJobRemoved: false,
    );

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      isDismissible: false,
      builder: (sheetContext) => RouteUpdateSheet(
        summary: summary,
        route: route,
        onAcknowledge: () async {
          Navigator.of(sheetContext).pop();
          await ref.read(routeProvider.notifier).acknowledgeRoute();
          // After acknowledgment, apply the new destination.
          if (mounted) _applyNewDestination(newDest);
        },
        onContactDispatch: () {
          final uri = Uri.parse('tel:+15875550100');
          launchUrl(uri);
        },
        onReviewRoute: () {
          // Keep the sheet open — just dismiss to see the route.
          Navigator.of(sheetContext).pop();
        },
      ),
    );
  }

  /// Apply a new destination after acknowledgment.
  /// Stops old guidance safely, sets the new destination once, starts
  /// guidance once. Prevents duplicate requests.
  Future<void> _applyNewDestination(RouteStop? newDest) async {
    if (newDest == null ||
        newDest.latitude == null ||
        newDest.longitude == null) {
      return;
    }

    // Stop old guidance safely.
    if (_guidanceStarted) {
      await GoogleMapsNavigator.stopGuidance().catchError((_) {});
      _guidanceStarted = false;
    }

    // Set the new destination once.
    _currentNavStopId = newDest.stopId;
    _currentNavLat = newDest.latitude;
    _currentNavLng = newDest.longitude;
    _awaitingAckForNewDest = false;

    if (_navigationInitialized) {
      try {
        final destinations = Destinations(
          waypoints: [
            NavigationWaypoint(
              title: newDest.stopType,
              target: LatLng(
                latitude: newDest.latitude!,
                longitude: newDest.longitude!,
              ),
            ),
          ],
          displayOptions: NavigationDisplayOptions(
            showDestinationMarkers: true,
          ),
          routingOptions: RoutingOptions(
            travelMode: NavigationTravelMode.driving,
            avoidTolls: false,
            avoidHighways: false,
          ),
        );

        final status = await GoogleMapsNavigator.setDestinations(destinations);
        if (status != NavigationRouteStatus.statusOk) {
          setState(() => _initError = 'Route calculation failed: $status');
          return;
        }

        // Start guidance once.
        if (!_guidanceStarted) {
          _guidanceStarted = true;
          await GoogleMapsNavigator.startGuidance();
        }
      } catch (e) {
        setState(() => _initError = 'Navigation error: $e');
      }
    }
  }
}

/// Placeholder shown when the Google Navigation SDK is not configured or
/// the booking has no coordinates.
class _NavigationPlaceholder extends StatelessWidget {
  const _NavigationPlaceholder({
    required this.destination,
    required this.reason,
    required this.onOpenGoogleMaps,
  });

  final String destination;
  final String reason;
  final VoidCallback onOpenGoogleMaps;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFFDCE4E0),
      child: Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.navigation_rounded,
                size: 48,
                color: Color(0xFFB7C2BC),
              ),
              const SizedBox(height: 12),
              Text(
                reason,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF6B7B73),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Destination: $destination',
                style: const TextStyle(fontSize: 12, color: Color(0xFF9AA8A1)),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: onOpenGoogleMaps,
                icon: const Icon(Icons.map_outlined, size: 18),
                label: const Text('Open in Google Maps'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.accent,
                  foregroundColor: Colors.white,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CircleButton extends StatelessWidget {
  const _CircleButton({required this.icon, required this.onTap});
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      shape: const CircleBorder(),
      elevation: 2,
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: Icon(icon, size: 20, color: AppColors.textPrimary),
        ),
      ),
    );
  }
}

class _ModeChip extends StatelessWidget {
  const _ModeChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? AppColors.accent : Colors.white,
      borderRadius: BorderRadius.circular(999),
      child: InkWell(
        borderRadius: BorderRadius.circular(999),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: selected ? Colors.white : AppColors.textPrimary,
            ),
          ),
        ),
      ),
    );
  }
}
