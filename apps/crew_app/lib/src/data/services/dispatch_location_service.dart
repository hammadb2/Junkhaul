import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';

import '../api/employee_api.dart';
import '../offline/connectivity_provider.dart';

/// Dispatch telemetry state.
enum DispatchTrackingState { idle, tracking, paused, error }

/// Sends sampled GPS updates to POST /api/employee/location for dispatch.
///
/// This is SEPARATE from the local navigation location:
/// - Local navigation location is used directly by Google Navigation SDK
///   and is never throttled through the backend.
/// - Dispatch telemetry is sampled at intervals and sent to the backend
///   so dispatch/admin can see the truck on the web map.
///
/// Sampling intervals:
/// - Moving and en route: every 3-5 seconds
/// - Stationary at a job: every 15-30 seconds
/// - Active shift in background: platform-appropriate interval
/// - Shift ended: stop immediately
class DispatchLocationService extends Notifier<DispatchTrackingState> {
  StreamSubscription<Position>? _sub;
  Timer? _stationaryTimer;
  Position? _lastSentPosition;
  DateTime? _lastSentAt;
  bool _isStationary = false;

  @override
  DispatchTrackingState build() {
    ref.onDispose(() => stop());
    return DispatchTrackingState.idle;
  }

  /// Start dispatch tracking. Only call during an active shift.
  Future<void> start() async {
    if (state == DispatchTrackingState.tracking) return;

    state = DispatchTrackingState.tracking;

    // Listen to the GPS stream at a 3-second interval for dispatch.
    // The service itself decides whether to actually send based on
    // movement and stationary detection.
    _sub = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.medium,
        distanceFilter: 5,
      ),
    ).listen(
      _onPositionUpdate,
      onError: (e) {
        state = DispatchTrackingState.error;
      },
    );

    // Stationary check: if we haven't moved >10m in 15s, switch to
    // the slower stationary interval.
    _stationaryTimer = Timer.periodic(const Duration(seconds: 15), (_) {
      _checkStationary();
    });
  }

  /// Stop dispatch tracking immediately. Call on clock-out, logout, or
  /// terminated session.
  void stop() {
    _sub?.cancel();
    _sub = null;
    _stationaryTimer?.cancel();
    _stationaryTimer = null;
    _lastSentPosition = null;
    _lastSentAt = null;
    _isStationary = false;
    state = DispatchTrackingState.idle;
  }

  void _onPositionUpdate(Position position) {
    final last = _lastSentPosition;
    final now = DateTime.now();

    // Calculate distance from last sent position.
    double distanceMeters = 0;
    if (last != null) {
      distanceMeters = Geolocator.distanceBetween(
        last.latitude,
        last.longitude,
        position.latitude,
        position.longitude,
      );
    }

    // Determine if we should send this update.
    bool shouldSend = false;

    if (last == null) {
      // Always send the first position.
      shouldSend = true;
    } else if (distanceMeters > 10) {
      // Moving — send if at least 3 seconds since last send.
      shouldSend = now.difference(_lastSentAt!).inSeconds >= 3;
      _isStationary = false;
    } else {
      // Stationary — send if at least 15 seconds since last send.
      shouldSend = now.difference(_lastSentAt!).inSeconds >= 15;
      _isStationary = true;
    }

    if (shouldSend) {
      _sendLocation(position);
      _lastSentPosition = position;
      _lastSentAt = now;
    }
  }

  void _checkStationary() {
    // The stationary timer is a backup — the main logic in _onPositionUpdate
    // already handles the transition between moving and stationary intervals.
    // This timer exists to ensure we send at least one update every 30s
    // even if the GPS stream is quiet.
    if (_lastSentAt != null &&
        DateTime.now().difference(_lastSentAt!).inSeconds >= 30 &&
        state == DispatchTrackingState.tracking) {
      // Force a position request and send.
      Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.medium,
          timeLimit: Duration(seconds: 5),
        ),
      ).then((pos) {
        _sendLocation(pos);
        _lastSentPosition = pos;
        _lastSentAt = DateTime.now();
      }).catchError((_) {});
    }
  }

  Future<void> _sendLocation(Position position) async {
    // Don't send if offline — the next position update will retry.
    final connectivityAsync = ref.read(isOnlineProvider);
    final isOnline = connectivityAsync.maybeWhen(
      data: (online) => online,
      orElse: () => false,
    );
    if (!isOnline) return;

    try {
      final api = ref.read(employeeApiProvider).maybeWhen(
        data: (api) => api,
        orElse: () => null,
      );
      if (api == null) return;

      await api.updateLocation(
        lat: position.latitude,
        lng: position.longitude,
        heading: position.heading,
        speed: position.speed,
      );
    } catch (_) {
      // Silently ignore — dispatch telemetry is best-effort.
      // Don't block navigation or show errors to the crew.
    }
  }
}

final dispatchLocationProvider =
    NotifierProvider<DispatchLocationService, DispatchTrackingState>(
  DispatchLocationService.new,
);
