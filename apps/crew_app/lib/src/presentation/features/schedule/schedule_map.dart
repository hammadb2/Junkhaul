import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../../../core/app_theme.dart';
import '../../../core/secrets.dart';
import '../../../domain/models/booking.dart';
import '../../../domain/providers/location_provider.dart';

/// Live Google Maps view showing the crew's truck position and numbered job
/// pins for the day's route.
///
/// Renders a GoogleMap with:
/// - Crew's current position (truck marker)
/// - Today's job markers (numbered in route order)
/// - Selected job highlight
/// - Recenter control
/// - Permission-denied / loading / GPS-unavailable states
class ScheduleMap extends ConsumerStatefulWidget {
  const ScheduleMap({
    super.key,
    this.bookings = const [],
    this.selectedBookingId,
    this.onJobTap,
  });

  /// Today's bookings to show as markers.
  final List<Booking> bookings;

  /// ID of the currently selected booking (highlighted marker).
  final String? selectedBookingId;

  /// Called when the user taps a job marker.
  final ValueChanged<Booking>? onJobTap;

  @override
  ConsumerState<ScheduleMap> createState() => _ScheduleMapState();
}

class _ScheduleMapState extends ConsumerState<ScheduleMap> {
  GoogleMapController? _mapController;
  Set<Marker> _markers = {};
  bool _mapReady = false;

  @override
  void initState() {
    super.initState();
    // Start GPS when the map mounts.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(locationProvider.notifier).start();
    });
  }

  @override
  void didUpdateWidget(ScheduleMap oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.bookings != widget.bookings ||
        oldWidget.selectedBookingId != widget.selectedBookingId) {
      _updateMarkers();
    }
  }

  @override
  void dispose() {
    _mapController?.dispose();
    super.dispose();
  }

  void _onMapCreated(GoogleMapController controller) {
    _mapController = controller;
    _mapReady = true;
    _updateMarkers();
    _fitToMarkers();
  }

  void _updateMarkers() {
    final markers = <Marker>{};
    final truckPos = ref.read(locationProvider).position;

    // Truck marker at current GPS position.
    if (truckPos != null) {
      markers.add(
        Marker(
          markerId: const MarkerId('truck'),
          position: LatLng(truckPos.latitude, truckPos.longitude),
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueBlue),
          infoWindow: const InfoWindow(title: 'Your truck'),
          zIndex: 1,
        ),
      );
    }

    // Job markers numbered in route order.
    for (var i = 0; i < widget.bookings.length; i++) {
      final b = widget.bookings[i];
      final coords = b.addressData;
      if (coords?.lat == null || coords?.lng == null) continue;

      final isSelected = b.id == widget.selectedBookingId;
      markers.add(
        Marker(
          markerId: MarkerId('job_${b.id}'),
          position: LatLng(coords!.lat!, coords.lng!),
          icon: BitmapDescriptor.defaultMarkerWithHue(
            isSelected ? BitmapDescriptor.hueGreen : BitmapDescriptor.hueOrange,
          ),
          infoWindow: InfoWindow(
            title: '${i + 1}. ${b.name ?? 'Job'}',
            snippet: b.address ?? '',
          ),
          onTap: () => widget.onJobTap?.call(b),
          zIndex: isSelected ? 2 : 0,
        ),
      );
    }

    setState(() => _markers = markers);
  }

  void _fitToMarkers() {
    if (!_mapReady || _mapController == null) return;
    final positions = <LatLng>[];
    final truckPos = ref.read(locationProvider).position;
    if (truckPos != null) {
      positions.add(LatLng(truckPos.latitude, truckPos.longitude));
    }
    for (final b in widget.bookings) {
      final c = b.addressData;
      if (c?.lat != null && c?.lng != null) {
        positions.add(LatLng(c!.lat!, c!.lng!));
      }
    }
    if (positions.isEmpty) return;
    if (positions.length == 1) {
      _mapController!.animateCamera(
        CameraUpdate.newLatLngZoom(positions.first, 14),
      );
      return;
    }
    final bounds = _boundsFromPositions(positions);
    _mapController!.animateCamera(CameraUpdate.newLatLngBounds(bounds, 60));
  }

  LatLngBounds _boundsFromPositions(List<LatLng> positions) {
    final southwest = LatLng(
      positions.map((p) => p.latitude).reduce((a, b) => a < b ? a : b),
      positions.map((p) => p.longitude).reduce((a, b) => a < b ? a : b),
    );
    final northeast = LatLng(
      positions.map((p) => p.latitude).reduce((a, b) => a > b ? a : b),
      positions.map((p) => p.longitude).reduce((a, b) => a > b ? a : b),
    );
    return LatLngBounds(southwest: southwest, northeast: northeast);
  }

  void _recenter() {
    final truckPos = ref.read(locationProvider).position;
    if (truckPos != null && _mapController != null) {
      _mapController!.animateCamera(
        CameraUpdate.newLatLngZoom(
          LatLng(truckPos.latitude, truckPos.longitude),
          14,
        ),
      );
    } else {
      _fitToMarkers();
    }
  }

  @override
  Widget build(BuildContext context) {
    final gps = ref.watch(locationProvider);

    // No API key — show configuration error.
    if (AppSecrets.googleMapsApiKey.isEmpty) {
      return _MapStateView(
        icon: Icons.key_off_outlined,
        message: 'Google Maps API key not configured',
        subtext: 'Set GOOGLE_MAPS_API_KEY via --dart-define or secrets.dart',
      );
    }

    // GPS denied or disabled.
    if (gps.state == GpsState.denied || gps.state == GpsState.disabled) {
      return _MapStateView(
        icon: gps.state == GpsState.disabled
            ? Icons.location_disabled
            : Icons.location_off,
        message: gps.state == GpsState.disabled
            ? 'Location services disabled'
            : 'Location permission denied',
        subtext: gps.error,
      );
    }

    return Stack(
      children: [
        GoogleMap(
          initialCameraPosition: const CameraPosition(
            target: LatLng(51.0447, -114.0719), // Calgary, AB
            zoom: 11,
          ),
          onMapCreated: _onMapCreated,
          markers: _markers,
          myLocationButtonEnabled: false,
          myLocationEnabled: gps.state == GpsState.ready,
          compassEnabled: true,
          trafficEnabled: false,
          mapToolbarEnabled: false,
          zoomControlsEnabled: false,
          onCameraIdle: () {
            // Refresh markers after camera settles to keep zIndex correct.
          },
        ),
        // Recenter button.
        Positioned(
          right: 16,
          bottom: 16,
          child: Material(
            color: Colors.white,
            shape: const CircleBorder(),
            elevation: 3,
            child: InkWell(
              customBorder: const CircleBorder(),
              onTap: _recenter,
              child: const Padding(
                padding: EdgeInsets.all(12),
                child: Icon(
                  Icons.my_location,
                  size: 22,
                  color: AppColors.accent,
                ),
              ),
            ),
          ),
        ),
        // Loading overlay while GPS is acquiring position.
        if (gps.state == GpsState.loading)
          Positioned.fill(
            child: Container(
              color: Colors.black.withValues(alpha: 0.1),
              child: const Center(
                child: CircularProgressIndicator(color: AppColors.accent),
              ),
            ),
          ),
      ],
    );
  }
}

/// Simple centered state view for error / permission / config states.
class _MapStateView extends StatelessWidget {
  const _MapStateView({
    required this.icon,
    required this.message,
    this.subtext,
  });

  final IconData icon;
  final String message;
  final String? subtext;

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
              Icon(icon, size: 40, color: const Color(0xFFB7C2BC)),
              const SizedBox(height: 12),
              Text(
                message,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF6B7B73),
                ),
                textAlign: TextAlign.center,
              ),
              if (subtext != null) ...[
                const SizedBox(height: 4),
                Text(
                  subtext!,
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFF9AA8A1),
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
