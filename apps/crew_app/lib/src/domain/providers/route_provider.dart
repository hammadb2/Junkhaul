import 'dart:async';
import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../data/api/employee_api.dart';
import '../models/route_plan.dart';

/// Route state held by the provider.
class RouteState {
  RouteState({
    this.route,
    this.lastSyncedAt,
    this.pendingUpdate = false,
    this.acknowledgmentRequired = false,
    this.conflict,
    this.isLoading = false,
    this.error,
    this.isWatchingRealtime = false,
    this.crewAssignmentId,
  });

  final CrewRoute? route;
  final DateTime? lastSyncedAt;
  final bool pendingUpdate;
  final bool acknowledgmentRequired;
  final RouteConflict? conflict;
  final bool isLoading;
  final String? error;
  final bool isWatchingRealtime;
  final String? crewAssignmentId;

  RouteState copyWith({
    CrewRoute? route,
    DateTime? lastSyncedAt,
    bool? pendingUpdate,
    bool? acknowledgmentRequired,
    RouteConflict? conflict,
    bool? isLoading,
    String? error,
    bool clearConflict = false,
    bool? isWatchingRealtime,
    String? crewAssignmentId,
  }) {
    return RouteState(
      route: route ?? this.route,
      lastSyncedAt: lastSyncedAt ?? this.lastSyncedAt,
      pendingUpdate: pendingUpdate ?? this.pendingUpdate,
      acknowledgmentRequired: acknowledgmentRequired ?? this.acknowledgmentRequired,
      conflict: clearConflict ? null : (conflict ?? this.conflict),
      isLoading: isLoading ?? this.isLoading,
      error: error,
      isWatchingRealtime: isWatchingRealtime ?? this.isWatchingRealtime,
      crewAssignmentId: crewAssignmentId ?? this.crewAssignmentId,
    );
  }

  static RouteState initial() => RouteState();
}

/// Provider that manages the crew route state, SSE route-stream updates,
/// acknowledgment, and persistence.
class RouteNotifier extends Notifier<RouteState> {
  // SSE connection for route-stream updates.
  // Uses the custom jh_employee_session cookie via DioClient — no
  // Supabase anon key or Supabase Auth involved.
  StreamSubscription<List<int>>? _sseByteSub;
  bool _sseConnected = false;
  int _reconnectAttempts = 0;
  Timer? _reconnectTimer;
  bool _intentionallyStopped = false;

  // Reconnect backoff: 1s, 2s, 4s, 8s, 16s, capped at 30s.
  static const _maxReconnectDelay = Duration(seconds: 30);

  static const _storageKey = 'jh_last_acknowledged_route';
  static const _storage = FlutterSecureStorage();

  @override
  RouteState build() {
    _loadPersistedRoute();
    return RouteState.initial();
  }

  /// Fetch the current route from the backend.
  Future<void> fetchRoute() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final api = await ref.read(employeeApiProvider.future);
      final response = await api.getRoutePlan();
      final routeData = response['route'];
      if (routeData == null) {
        state = state.copyWith(isLoading: false, route: null);
        return;
      }
      final route = CrewRoute.fromJson(routeData as Map<String, dynamic>);

      // Compare with local version.
      final localVersion = state.route?.routeVersion;
      if (localVersion != null && route.routeVersion < localVersion) {
        // Ignore older versions.
        return;
      }

      final isUpdate = localVersion != null && route.routeVersion > localVersion;
      final needsAck = route.requiresAcknowledgment && !route.acknowledged;

      state = state.copyWith(
        route: route,
        lastSyncedAt: DateTime.now(),
        pendingUpdate: isUpdate,
        acknowledgmentRequired: needsAck,
        isLoading: false,
        clearConflict: true,
      );

      if (isUpdate && needsAck) {
        _persistRouteVersion(route.routeVersion);
      }
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  /// Start listening for route changes via the backend SSE endpoint.
  ///
  /// This uses /api/employee/route-stream which authenticates with the
  /// custom jh_employee_session cookie. The server resolves the crew
  /// assignment — the client never provides an assignment ID.
  ///
  /// The crewAssignmentId parameter is used only for state tracking,
  /// not for authorization.
  void startRealtimeWatch(String crewAssignmentId) {
    // Cancel any existing connection to avoid duplicate listeners.
    _cancelSse();
    _intentionallyStopped = false;
    _reconnectAttempts = 0;

    state = state.copyWith(
      isWatchingRealtime: true,
      crewAssignmentId: crewAssignmentId,
    );

    // Open the SSE connection asynchronously.
    _connectSse();
  }

  Future<void> _connectSse() async {
    if (_sseConnected) return;
    if (_intentionallyStopped) return;
    _sseConnected = true;

    try {
      final api = await ref.read(employeeApiProvider.future);
      final response = await api.openRouteStream();

      final stream = response.data.stream as Stream<List<int>>;
      _sseByteSub = stream.listen(
        (bytes) {
          final text = utf8.decode(bytes);
          _parseSseEvents(text);
        },
        onError: (error) {
          // Connection lost — schedule reconnect with backoff.
          _sseConnected = false;
          _scheduleReconnect();
        },
        onDone: () {
          // Stream closed by server (timeout/heartbeat failure) or network.
          // Schedule reconnect with backoff unless intentionally stopped.
          _sseConnected = false;
          if (!_intentionallyStopped) {
            _scheduleReconnect();
          }
        },
        cancelOnError: true,
      );
      // Reset reconnect attempts on successful connection.
      _reconnectAttempts = 0;
    } catch (e) {
      _sseConnected = false;
      // SSE connection failed — schedule reconnect with backoff.
      // The schedule screen's WidgetsBindingObserver will also refresh
      // on resume, and pull-to-refresh is always available.
      if (!_intentionallyStopped) {
        _scheduleReconnect();
      }
    }
  }

  /// Schedule a reconnect with exponential backoff.
  /// Delay: 1s, 2s, 4s, 8s, 16s, capped at 30s.
  void _scheduleReconnect() {
    _reconnectTimer?.cancel();
    final delay = Duration(
      seconds: (1 << _reconnectAttempts).clamp(1, _maxReconnectDelay.inSeconds),
    );
    _reconnectAttempts = (_reconnectAttempts + 1).clamp(0, 5);

    state = state.copyWith(isWatchingRealtime: false);

    _reconnectTimer = Timer(delay, () {
      if (!_intentionallyStopped && !_sseConnected) {
        _connectSse();
      }
    });
  }

  void _parseSseEvents(String text) {
    // SSE events are separated by double newlines.
    // Each event has "event: <type>" and "data: <json>" lines.
    // Lines starting with ":" are comments (heartbeats) — ignored.
    final events = text.split('\n\n');
    for (final eventBlock in events) {
      if (eventBlock.trim().isEmpty) continue;
      // Skip comment lines (heartbeats).
      if (eventBlock.trimLeft().startsWith(':')) continue;

      String? eventType;
      String? dataLine;

      for (final line in eventBlock.split('\n')) {
        if (line.startsWith('event: ')) {
          eventType = line.substring(7).trim();
        } else if (line.startsWith('data: ')) {
          dataLine = line.substring(6).trim();
        }
      }

      if (eventType == 'route_update' && dataLine != null) {
        // Route changed — fetch the authoritative route.
        fetchRoute();
      } else if (eventType == 'session_terminated') {
        // Server says session is invalid — disconnect permanently.
        _intentionallyStopped = true;
        _cancelSse();
        state = state.copyWith(isWatchingRealtime: false);
      } else if (eventType == 'stream_timeout') {
        // Server closed the stream due to lifetime limit.
        // The onDone handler will schedule a reconnect.
      }
      // 'route_state' and 'no_assignment' events don't require action
      // — the initial fetchRoute() call handles those cases.
    }
  }

  void _cancelSse() {
    _sseByteSub?.cancel();
    _sseByteSub = null;
    _sseConnected = false;
    _reconnectTimer?.cancel();
    _reconnectTimer = null;
  }

  /// Stop SSE route-stream listening.
  void stopRealtimeWatch() {
    _intentionallyStopped = true;
    _cancelSse();
    state = state.copyWith(isWatchingRealtime: false);
  }

  /// Acknowledge the current route version.
  Future<bool> acknowledgeRoute({String? deviceId}) async {
    final route = state.route;
    if (route == null) return false;

    try {
      final api = await ref.read(employeeApiProvider.future);
      await api.acknowledgeRoute(
        routeId: route.routeId,
        routeVersion: route.routeVersion,
        deviceId: deviceId,
      );
      state = state.copyWith(
        acknowledgmentRequired: false,
        pendingUpdate: false,
        route: route.copyWith(acknowledged: true),
      );
      _persistRouteVersion(route.routeVersion);
      return true;
    } catch (e) {
      state = state.copyWith(error: e.toString());
      return false;
    }
  }

  /// Set a conflict state (from a 409 response).
  void setConflict(RouteConflict conflict) {
    state = state.copyWith(conflict: conflict);
  }

  /// Generate a change summary between the current route and a new route.
  RouteChangeSummary computeChangeSummary(CrewRoute newRoute) {
    final oldRoute = state.route;
    if (oldRoute == null) {
      return RouteChangeSummary(
        newVersion: newRoute.routeVersion,
        oldVersion: 0,
        changes: [
          const RouteChange(type: 'initial_load', description: 'Initial route loaded'),
        ],
      );
    }

    final changes = <RouteChange>[];
    final oldStops = {for (var s in oldRoute.orderedStops) s.stopId: s};
    final newStops = {for (var s in newRoute.orderedStops) s.stopId: s};

    // Detect added stops.
    for (final newStop in newRoute.orderedStops) {
      if (!oldStops.containsKey(newStop.stopId)) {
        if (newStop.stopType == 'donation_pickup') {
          changes.add(RouteChange(
            type: 'donation_inserted',
            stopId: newStop.stopId,
            description: 'Donation stop inserted after stop ${newStop.sequence - 1}',
            newSequence: newStop.sequence,
          ));
        } else {
          changes.add(RouteChange(
            type: 'job_added',
            stopId: newStop.stopId,
            description: 'New job added: ${newStop.name ?? newStop.stopId}',
            newSequence: newStop.sequence,
          ));
        }
      }
    }

    // Detect removed stops.
    for (final oldStop in oldRoute.orderedStops) {
      if (!newStops.containsKey(oldStop.stopId)) {
        changes.add(RouteChange(
          type: 'job_removed',
          stopId: oldStop.stopId,
          description: 'Job removed: ${oldStop.name ?? oldStop.stopId}',
          oldSequence: oldStop.sequence,
        ));
      }
    }

    // Detect moved stops (sequence changed).
    for (final newStop in newRoute.orderedStops) {
      final oldStop = oldStops[newStop.stopId];
      if (oldStop != null && oldStop.sequence != newStop.sequence) {
        changes.add(RouteChange(
          type: 'job_moved',
          stopId: newStop.stopId,
          description:
              '${newStop.name ?? newStop.stopId} moved from position ${oldStop.sequence} to ${newStop.sequence}',
          oldSequence: oldStop.sequence,
          newSequence: newStop.sequence,
        ));
      }
    }

    // Detect arrival window changes.
    for (final newStop in newRoute.orderedStops) {
      final oldStop = oldStops[newStop.stopId];
      if (oldStop != null && oldStop.arrivalWindowStart != newStop.arrivalWindowStart) {
        changes.add(RouteChange(
          type: 'window_changed',
          stopId: newStop.stopId,
          description: 'Arrival window changed for ${newStop.name ?? newStop.stopId}',
        ));
      }
    }

    // Detect destination change (active stop changed).
    final destinationChanged =
        oldRoute.activeStopId != newRoute.activeStopId && oldRoute.activeStopId != null;

    // Detect if active job was removed.
    final activeJobRemoved =
        oldRoute.activeStopId != null && !newStops.containsKey(oldRoute.activeStopId);

    // Detect truck change.
    if (oldRoute.truckId != newRoute.truckId) {
      changes.add(RouteChange(
        type: 'truck_changed',
        description:
            'Truck changed from ${oldRoute.truckId ?? 'none'} to ${newRoute.truckId ?? 'none'}',
      ));
    }

    if (destinationChanged) {
      changes.add(const RouteChange(
        type: 'destination_changed',
        description: 'Next destination changed',
      ));
    }

    return RouteChangeSummary(
      changes: changes,
      destinationChanged: destinationChanged,
      activeJobRemoved: activeJobRemoved,
      newVersion: newRoute.routeVersion,
      oldVersion: oldRoute.routeVersion,
    );
  }

  /// Handle a 409 conflict response from a stale write.
  void handleConflict(RouteConflict conflict) {
    state = state.copyWith(conflict: conflict, pendingUpdate: true);
  }

  /// Clear conflict state after user resolves it.
  void clearConflict() {
    state = state.copyWith(clearConflict: true);
  }

  /// Get the current navigation destination (active stop with coordinates).
  RouteStop? get navigationDestination {
    final route = state.route;
    if (route == null) return null;
    final activeId = route.activeStopId;
    if (activeId == null) {
      // Find the first upcoming stop.
      final upcoming = route.orderedStops.where((s) => s.status == 'upcoming').toList();
      return upcoming.isEmpty ? null : upcoming.first;
    }
    final matching = route.orderedStops.where((s) => s.stopId == activeId).toList();
    return matching.isEmpty ? null : matching.first;
  }

  /// Load the last acknowledged route version from secure storage.
  Future<void> _loadPersistedRoute() async {
    try {
      final json = await _storage.read(key: _storageKey);
      if (json != null) {
        // Version persisted for stale-write detection.
        // The full route is fetched from the backend on app launch.
      }
    } catch (_) {
      // Ignore — non-critical.
    }
  }

  /// Persist the acknowledged route version.
  Future<void> _persistRouteVersion(int version) async {
    try {
      await _storage.write(
        key: _storageKey,
        value: jsonEncode({
          'route_version': version,
          'acknowledged_at': DateTime.now().toIso8601String(),
        }),
      );
    } catch (_) {
      // Ignore — non-critical.
    }
  }
}

/// Provider for the route state.
final routeProvider = NotifierProvider<RouteNotifier, RouteState>(() {
  return RouteNotifier();
});
