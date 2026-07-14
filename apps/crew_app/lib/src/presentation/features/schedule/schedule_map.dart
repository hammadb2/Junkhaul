import 'package:flutter/material.dart';
import 'package:mapbox_maps_flutter/mapbox_maps_flutter.dart' as mapbox;

import '../../../domain/models/booking.dart';

/// Mapbox map showing the truck's current location and all job markers.
/// Uses the crew_app's daily schedule bookings to place markers.
class ScheduleMap extends StatefulWidget {
  const ScheduleMap({
    super.key,
    required this.bookings,
    this.truckPosition,
    this.onMarkerTap,
  });

  final List<Booking> bookings;
  final TruckPosition? truckPosition;
  final ValueChanged<Booking>? onMarkerTap;

  @override
  State<ScheduleMap> createState() => _ScheduleMapState();
}

/// Simple lat/lng holder for the truck's current position.
class TruckPosition {
  const TruckPosition({required this.lat, required this.lng});
  final double lat;
  final double lng;
}

class _ScheduleMapState extends State<ScheduleMap> {
  mapbox.MapboxMap? _mapboxMap;
  mapbox.PointAnnotationManager? _pointAnnotationManager;
  bool _isMapReady = false;

  // Default center: Calgary downtown
  static final _calgaryCenter = mapbox.Point(
    coordinates: mapbox.Position(-114.0719, 51.0447),
  );

  @override
  void didUpdateWidget(ScheduleMap oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.bookings != widget.bookings && _isMapReady) {
      _addJobMarkers();
    }
  }

  @override
  Widget build(BuildContext context) {
    return mapbox.MapWidget(
      key: const ValueKey('schedule_map'),
      styleUri: 'mapbox://styles/mapbox/streets-v12',
      cameraOptions: mapbox.CameraOptions(
        center: _calgaryCenter,
        zoom: 11.0,
      ),
      onMapCreated: _onMapCreated,
    );
  }

  void _onMapCreated(mapbox.MapboxMap controller) {
    _mapboxMap = controller;
    setState(() => _isMapReady = true);

    // Create the point annotation manager asynchronously
    controller.annotations.createPointAnnotationManager().then((manager) {
      _pointAnnotationManager = manager;
      _addJobMarkers();
    });

    // If we have a truck position, fly to it
    if (widget.truckPosition != null) {
      _flyToTruck();
    } else {
      _fitAllBookings();
    }
  }

  Future<void> _addJobMarkers() async {
    final manager = _pointAnnotationManager;
    if (manager == null) return;

    // Clear existing annotations
    await manager.deleteAll();

    final bookingsWithCoords = widget.bookings.where((b) {
      final addr = b.addressData;
      return addr?.lat != null && addr?.lng != null;
    }).toList();

    if (bookingsWithCoords.isEmpty) return;

    final options = bookingsWithCoords.map((b) {
      return mapbox.PointAnnotationOptions(
        geometry: mapbox.Point(
          coordinates: mapbox.Position(b.addressData!.lng!, b.addressData!.lat!),
        ),
        iconSize: 1.5,
        textField: b.name ?? 'Job',
        textOffset: [0.0, -2.0],
        textSize: 12.0,
        textColor: 0xFF000000,
      );
    }).toList();

    await manager.createMulti(options);

    // Fit camera to show all markers
    _fitAllBookings();
  }

  Future<void> _fitAllBookings() async {
    final map = _mapboxMap;
    if (map == null) return;

    final bookingsWithCoords = widget.bookings.where((b) {
      final addr = b.addressData;
      return addr?.lat != null && addr?.lng != null;
    }).toList();

    if (bookingsWithCoords.isEmpty) return;

    final points = bookingsWithCoords.map((b) {
      return mapbox.Point(
        coordinates: mapbox.Position(b.addressData!.lng!, b.addressData!.lat!),
      );
    }).toList();

    // Add truck position to bounds if available
    if (widget.truckPosition != null) {
      points.add(mapbox.Point(
        coordinates: mapbox.Position(widget.truckPosition!.lng, widget.truckPosition!.lat),
      ));
    }

    final camera = await map.cameraForCoordinates(
      points,
      mapbox.MbxEdgeInsets(top: 80, left: 60, bottom: 250, right: 60),
      null,
      null,
    );

    await map.flyTo(
      camera,
      mapbox.MapAnimationOptions(duration: 800),
    );
  }

  Future<void> _flyToTruck() async {
    final map = _mapboxMap;
    final pos = widget.truckPosition;
    if (map == null || pos == null) return;

    await map.flyTo(
      mapbox.CameraOptions(
        center: mapbox.Point(coordinates: mapbox.Position(pos.lng, pos.lat)),
        zoom: 14.0,
      ),
      mapbox.MapAnimationOptions(duration: 800),
    );
  }
}
