import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show rootBundle;
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
  Uint8List? _truckMarkerImage;

  // Default center: Calgary downtown
  static final _calgaryCenter = mapbox.Point(
    coordinates: mapbox.Position(-114.0719, 51.0447),
  );

  @override
  void initState() {
    super.initState();
    _loadTruckMarker();
  }

  Future<void> _loadTruckMarker() async {
    try {
      final byteData = await rootBundle.load('assets/images/truck_marker_medium.png');
      _truckMarkerImage = byteData.buffer.asUint8List();
      if (mounted && _isMapReady) _addMarkers();
    } catch (e) {
      // Marker image not available — will use default markers
      debugPrint('Failed to load truck marker: $e');
    }
  }

  @override
  void didUpdateWidget(ScheduleMap oldWidget) {
    super.didUpdateWidget(oldWidget);
    if ((oldWidget.bookings != widget.bookings ||
         oldWidget.truckPosition != widget.truckPosition) &&
        _isMapReady) {
      _addMarkers();
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
      _addMarkers();
    });

    // Fit camera to show all markers
    _fitAllBookings();
  }

  Future<void> _addMarkers() async {
    final manager = _pointAnnotationManager;
    if (manager == null) return;

    // Clear existing annotations
    await manager.deleteAll();

    final bookingsWithCoords = widget.bookings.where((b) {
      final addr = b.addressData;
      return addr?.lat != null && addr?.lng != null;
    }).toList();

    // Add truck marker if we have a position
    if (widget.truckPosition != null && _truckMarkerImage != null) {
      await manager.create(mapbox.PointAnnotationOptions(
        geometry: mapbox.Point(
          coordinates: mapbox.Position(widget.truckPosition!.lng, widget.truckPosition!.lat),
        ),
        image: _truckMarkerImage,
        iconSize: 1.0,
        iconAnchor: mapbox.IconAnchor.CENTER,
      ));
    }

    if (bookingsWithCoords.isEmpty) return;

    // Add job markers with numbered circles
    final options = bookingsWithCoords.asMap().entries.map((entry) {
      final i = entry.key;
      final b = entry.value;
      return mapbox.PointAnnotationOptions(
        geometry: mapbox.Point(
          coordinates: mapbox.Position(b.addressData!.lng!, b.addressData!.lat!),
        ),
        iconSize: 1.5,
        textField: '${i + 1}',
        textOffset: [0.0, 0.0],
        textSize: 14.0,
        textColor: 0xFFFFFFFF,
        textAnchor: mapbox.TextAnchor.CENTER,
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

    if (bookingsWithCoords.isEmpty && widget.truckPosition == null) return;

    final points = <mapbox.Point>[];

    for (final b in bookingsWithCoords) {
      points.add(mapbox.Point(
        coordinates: mapbox.Position(b.addressData!.lng!, b.addressData!.lat!),
      ));
    }

    // Add truck position to bounds if available
    if (widget.truckPosition != null) {
      points.add(mapbox.Point(
        coordinates: mapbox.Position(widget.truckPosition!.lng, widget.truckPosition!.lat),
      ));
    }

    if (points.isEmpty) return;

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

}
