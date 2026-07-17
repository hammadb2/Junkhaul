import 'dart:async';
import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../data/api/employee_api.dart';
import '../../data/supabase/supabase_realtime_service.dart';
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
  });

  final CrewRoute? route;
  final DateTime? lastSyncedAt;
  final bool pendingUpdate;
  final bool acknowledgmentRequired;
  final RouteConflict? conflict;
  final bool isLoading;
  final String? error;

  RouteState copyWith({
    CrewRoute? route,
    DateTime? lastSyncedAt,
    bool? pendingUpdate,
    bool? acknowledgmentRequired,
    RouteConflict? conflict,
    bool? isLoading,
    String? error,
    bool clearConflict = false,
  }) {
    return RouteState(
      route: route ?? this.route,
      lastSyncedAt: lastSyncedAt ?? this.lastSyncedAt,
      pendingUpdate: pendingUpdate ?? this.pendingUpdate,
      acknowledgmentRequired: acknowledgmentRequired ?? this.acknowledgmentRequired,
      conflict: clearConflict ? null : (conflict ?? this.conflict),
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }

  static RouteState initial() => RouteState();
}

/// Provider that manages the crew route state, realtime updates,
/// acknowledgment, and persistence.
class RouteNotifier extends Notifier<RouteState> {
  StreamSubscription<RealtimePayload>? _realtimeSub;
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

  /// Start listening for realtime route_plans changes.
  void startRealtimeWatch(String crewAssignmentId) {
    _realtimeSub?.cancel();
    final realtime = ref.read(supabaseRealtimeProvider);
    _realtimeSub = realtime
        .watchTable(
          table: 'route_plans',
          filterColumn: 'crew_assignment_id',
          filterValue: crewAssignmentId,
        )
        .listen((payload) {
          // On any route_plans change, re-fetch the authoritative route.
          fetchRoute();
        });
  }

  /// Stop realtime listening.
  void stopRealtimeWatch() {
    _realtimeSub?.cancel();
    _realtimeSub = null;
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
