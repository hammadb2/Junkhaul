import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';

/// GPS state for the schedule map and navigation.
enum GpsState { initial, loading, ready, denied, disabled, unavailable }

class GpsStatus {
  const GpsStatus({this.state = GpsState.initial, this.position, this.error});

  final GpsState state;
  final Position? position;
  final String? error;

  GpsStatus copyWith({GpsState? state, Position? position, String? error}) {
    return GpsStatus(
      state: state ?? this.state,
      position: position ?? this.position,
      error: error,
    );
  }

  static const initial = GpsStatus(state: GpsState.initial);
}

/// Streams the crew member's GPS position for the schedule map.
///
/// Uses geolocator's getPositionStream with medium accuracy and a 5-second
/// interval. The stream is lazily started on first listen and cancelled on
/// dispose. This is for local map display only — backend dispatch telemetry
/// is handled separately by DispatchLocationService.
class LocationNotifier extends Notifier<GpsStatus> {
  StreamSubscription<Position>? _sub;

  @override
  GpsStatus build() {
    ref.onDispose(() {
      _sub?.cancel();
      _sub = null;
    });
    return GpsStatus.initial;
  }

  /// Start listening to GPS updates. Call when the schedule screen mounts.
  Future<void> start() async {
    if (state.state == GpsState.loading || state.state == GpsState.ready)
      return;

    state = const GpsStatus(state: GpsState.loading);

    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      state = const GpsStatus(
        state: GpsState.disabled,
        error: 'Location services disabled',
      );
      return;
    }

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.unableToDetermine) {
      state = const GpsStatus(
        state: GpsState.denied,
        error: 'Location permission denied',
      );
      return;
    }
    if (permission == LocationPermission.deniedForever) {
      state = const GpsStatus(
        state: GpsState.denied,
        error: 'Location permission permanently denied',
      );
      return;
    }

    // Get an initial fix quickly.
    try {
      final initial = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.medium,
          timeLimit: Duration(seconds: 10),
        ),
      );
      state = GpsStatus(state: GpsState.ready, position: initial);
    } catch (e) {
      // Continue to stream even if the one-shot fails.
    }

    _sub =
        Geolocator.getPositionStream(
          locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.medium,
            distanceFilter: 10,
          ),
        ).listen(
          (pos) => state = GpsStatus(state: GpsState.ready, position: pos),
          onError: (e) => state = GpsStatus(
            state: GpsState.unavailable,
            error: e.toString(),
          ),
        );
  }

  /// Stop the GPS stream. Call when the schedule screen is disposed.
  void stop() {
    _sub?.cancel();
    _sub = null;
    state = GpsStatus.initial;
  }
}

final locationProvider = NotifierProvider<LocationNotifier, GpsStatus>(
  LocationNotifier.new,
);
