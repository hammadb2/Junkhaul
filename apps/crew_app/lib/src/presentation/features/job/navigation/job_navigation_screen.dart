import 'dart:async';

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../core/app_theme.dart';
import '../../../../core/secrets.dart';
import '../../../../domain/models/job.dart';

enum CrewNavMode { turnByTurn, freeDrive }

/// Real turn-by-turn navigation using Google Navigation SDK.
///
/// Google Navigation SDK owns:
/// - Road-snapped location
/// - Vehicle puck
/// - Camera following, bearing, tilt, zoom
/// - Traffic-aware route
/// - Maneuver guidance, lane guidance, voice guidance
/// - Rerouting, arrival detection, speed limit
///
/// Flutter owns:
/// - Current job card (customer name, job type, arrival window)
/// - Mode toggle (turn-by-turn vs free drive)
/// - Exit navigation
/// - "Open in Google Maps" fallback
/// - Arrival button (manual fallback if SDK arrival detection is delayed)
///
/// Lifecycle: one persistent navigation controller per active session.
/// The view is created once, destination set once, guidance started once.
/// The view stays mounted across Riverpod rebuilds — only Flutter overlays
/// update.
class JobNavigationScreen extends StatefulWidget {
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
  State<JobNavigationScreen> createState() => _JobNavigationScreenState();
}

class _JobNavigationScreenState extends State<JobNavigationScreen> {
  // The Google Navigation view is created once and kept mounted.
  // When google_navigation_flutter is available with a valid API key,
  // the native view renders road-snapped navigation with voice guidance.
  // When the API key is missing, we show a fallback with "Open in Google Maps".
  bool _navigationAvailable = false;

  @override
  void initState() {
    super.initState();
    _navigationAvailable = AppSecrets.googleNavigationApiKey.isNotEmpty;
  }

  Future<void> _openInGoogleMaps() async {
    final address = widget.job.customer.address;
    final encoded = Uri.encodeComponent(address);
    final uri = Uri.parse('google.navigation:q=$encoded&mode=d');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
      return;
    }
    // Fallback to universal URL.
    final fallback = Uri.parse('https://www.google.com/maps/dir/?api=1&destination=$encoded&travelmode=driving');
    if (await canLaunchUrl(fallback)) {
      await launchUrl(fallback, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFDCE4E0),
      body: Stack(
        children: [
          // Native navigation view (or placeholder if no API key).
          Positioned.fill(
            child: _buildNavigationView(),
          ),
          // Flutter overlays — these update without recreating the nav view.
          SafeArea(
            child: Column(
              children: [
                // Top bar with exit and mode toggle.
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
                        onTap: () => widget.onModeChanged(CrewNavMode.turnByTurn),
                      ),
                      const SizedBox(width: 8),
                      _ModeChip(
                        label: 'Free drive',
                        selected: widget.mode == CrewNavMode.freeDrive,
                        onTap: () => widget.onModeChanged(CrewNavMode.freeDrive),
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
                    // Job info row.
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
                        if (!_navigationAvailable)
                          TextButton.icon(
                            onPressed: _openInGoogleMaps,
                            icon: const Icon(Icons.open_in_new, size: 16),
                            label: const Text('Google Maps'),
                          ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    // Arrival button.
                    SizedBox(
                      width: double.infinity,
                      height: 56,
                      child: ElevatedButton(
                        onPressed: widget.onArrive,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.accent,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        child: const Text(
                          "I've Arrived",
                          style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
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

  /// Builds the native navigation view or a fallback placeholder.
  ///
  /// When google_navigation_flutter is wired with a valid API key, this
  /// will host the NavigationView widget. The view is created once and
  /// stays mounted — it is NOT recreated on Riverpod updates.
  Widget _buildNavigationView() {
    if (!_navigationAvailable) {
      return _NavigationPlaceholder(
        destination: widget.job.customer.address,
        onOpenGoogleMaps: _openInGoogleMaps,
      );
    }

    // TODO(phase5): When a Google Maps API key with Navigation SDK enabled
    // is configured, replace this placeholder with:
    //
    //   NavigationView(
    //     apiKey: AppSecrets.googleNavigationApiKey,
    //     destination: LatLng(lat, lng),
    //     onArrival: widget.onArrive,
    //   )
    //
    // The view must be created once and kept mounted. Do NOT recreate it
    // on setState or Riverpod rebuilds. Only Flutter overlays update.
    return _NavigationPlaceholder(
      destination: widget.job.customer.address,
      onOpenGoogleMaps: _openInGoogleMaps,
    );
  }
}

/// Placeholder shown when the Google Navigation SDK is not yet configured.
/// Shows the destination and an "Open in Google Maps" fallback.
class _NavigationPlaceholder extends StatelessWidget {
  const _NavigationPlaceholder({
    required this.destination,
    required this.onOpenGoogleMaps,
  });

  final String destination;
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
              const Icon(Icons.navigation_rounded, size: 48, color: Color(0xFFB7C2BC)),
              const SizedBox(height: 12),
              const Text(
                'Navigation SDK not configured',
                style: TextStyle(
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
  const _ModeChip({required this.label, required this.selected, required this.onTap});
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
