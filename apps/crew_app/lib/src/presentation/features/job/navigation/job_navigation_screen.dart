import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_navigation_flutter/google_navigation_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../core/app_theme.dart';
import '../../../../core/secrets.dart';
import '../../../../domain/models/job.dart';

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

  /// Destination coordinates from the booking's AddressData.
  double? get _destLat => widget.job.customer.lat;
  double? get _destLng => widget.job.customer.lng;

  @override
  void initState() {
    super.initState();
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
    final hasApiKey = AppSecrets.googleNavigationApiKey.isNotEmpty;
    final hasCoords = _destLat != null && _destLng != null;
    final canUseNativeNav = hasApiKey && hasCoords;

    return Scaffold(
      backgroundColor: const Color(0xFFDCE4E0),
      body: Stack(
        children: [
          // Native navigation view — created once, stays mounted.
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
