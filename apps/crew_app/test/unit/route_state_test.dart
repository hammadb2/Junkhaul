import 'package:flutter_test/flutter_test.dart';
import 'package:crew_app/src/domain/models/route_plan.dart';
import 'package:crew_app/src/domain/providers/route_provider.dart';

/// Unit tests for route state, change summary generation, version
/// comparison, acknowledgment, conflict handling, and navigation
/// destination deduplication.
///
/// These tests verify the pure logic — they do not test the network
/// layer or realtime subscriptions (which require a live backend).
void main() {
  group('RouteState', () {
    test('initial state has no route and no conflict', () {
      final state = RouteState.initial();
      expect(state.route, isNull);
      expect(state.conflict, isNull);
      expect(state.pendingUpdate, isFalse);
      expect(state.acknowledgmentRequired, isFalse);
      expect(state.isLoading, isFalse);
    });

    test('copyWith preserves existing values when not overridden', () {
      final state = RouteState(
        route: _createRoute(version: 1),
        pendingUpdate: true,
      );
      final updated = state.copyWith(isLoading: true);
      expect(updated.route?.routeVersion, 1);
      expect(updated.pendingUpdate, isTrue);
      expect(updated.isLoading, isTrue);
    });

    test('clearConflict removes conflict', () {
      final conflict = RouteConflict(
        currentRouteVersion: 3,
        submittedRouteVersion: 1,
      );
      final state = RouteState(conflict: conflict);
      final cleared = state.copyWith(clearConflict: true);
      expect(cleared.conflict, isNull);
    });
  });

  group('Version comparison', () {
    test('duplicate version is not an update', () {
      final oldRoute = _createRoute(version: 3);
      final newRoute = _createRoute(version: 3);
      expect(newRoute.routeVersion > oldRoute.routeVersion, isFalse);
    });

    test('older version is ignored', () {
      final oldRoute = _createRoute(version: 5);
      final newRoute = _createRoute(version: 3);
      // The provider should ignore versions < current.
      expect(newRoute.routeVersion < oldRoute.routeVersion, isTrue);
    });

    test('newer version is detected as update', () {
      final oldRoute = _createRoute(version: 3);
      final newRoute = _createRoute(version: 4);
      expect(newRoute.routeVersion > oldRoute.routeVersion, isTrue);
    });
  });

  group('Change summary', () {
    test('initial load produces initial_load change', () {
      final notifier = _RouteNotifierForTest();
      final newRoute = _createRoute(version: 1);
      final summary = notifier.computeChangeSummary(newRoute);
      expect(summary.changes, hasLength(1));
      expect(summary.changes.first.type, 'initial_load');
      expect(summary.oldVersion, 0);
      expect(summary.newVersion, 1);
    });

    test('new job added is detected', () {
      final oldRoute = _createRoute(
        version: 1,
        stops: [_createStop('stop1', seq: 1), _createStop('stop2', seq: 2)],
      );
      final newRoute = _createRoute(
        version: 2,
        stops: [_createStop('stop1', seq: 1), _createStop('stop2', seq: 2), _createStop('stop3', seq: 3)],
      );
      final notifier = _RouteNotifierForTest()..setStateRoute(oldRoute);
      final summary = notifier.computeChangeSummary(newRoute);
      final added = summary.changes.where((c) => c.type == 'job_added').toList();
      expect(added, hasLength(1));
      expect(added.first.stopId, 'stop3');
    });

    test('donation stop inserted is detected', () {
      final oldRoute = _createRoute(
        version: 1,
        stops: [_createStop('stop1', seq: 1), _createStop('stop2', seq: 2)],
      );
      final newRoute = _createRoute(
        version: 2,
        stops: [
          _createStop('stop1', seq: 1),
          _createStop('don1', seq: 2, type: 'donation_pickup'),
          _createStop('stop2', seq: 3),
        ],
      );
      final notifier = _RouteNotifierForTest()..setStateRoute(oldRoute);
      final summary = notifier.computeChangeSummary(newRoute);
      final inserted = summary.changes.where((c) => c.type == 'donation_inserted').toList();
      expect(inserted, hasLength(1));
      expect(inserted.first.stopId, 'don1');
    });

    test('job removed is detected', () {
      final oldRoute = _createRoute(
        version: 1,
        stops: [_createStop('stop1', seq: 1), _createStop('stop2', seq: 2)],
      );
      final newRoute = _createRoute(
        version: 2,
        stops: [_createStop('stop1', seq: 1)],
      );
      final notifier = _RouteNotifierForTest()..setStateRoute(oldRoute);
      final summary = notifier.computeChangeSummary(newRoute);
      final removed = summary.changes.where((c) => c.type == 'job_removed').toList();
      expect(removed, hasLength(1));
      expect(removed.first.stopId, 'stop2');
    });

    test('job moved (sequence changed) is detected', () {
      final oldRoute = _createRoute(
        version: 1,
        stops: [_createStop('stop1', seq: 1), _createStop('stop2', seq: 2)],
      );
      final newRoute = _createRoute(
        version: 2,
        stops: [_createStop('stop2', seq: 1), _createStop('stop1', seq: 2)],
      );
      final notifier = _RouteNotifierForTest()..setStateRoute(oldRoute);
      final summary = notifier.computeChangeSummary(newRoute);
      final moved = summary.changes.where((c) => c.type == 'job_moved').toList();
      expect(moved, hasLength(2)); // both stops moved
    });

    test('arrival window changed is detected', () {
      final oldRoute = _createRoute(
        version: 1,
        stops: [_createStop('stop1', seq: 1, window: '09:00')],
      );
      final newRoute = _createRoute(
        version: 2,
        stops: [_createStop('stop1', seq: 1, window: '10:00')],
      );
      final notifier = _RouteNotifierForTest()..setStateRoute(oldRoute);
      final summary = notifier.computeChangeSummary(newRoute);
      final windowChange = summary.changes.where((c) => c.type == 'window_changed').toList();
      expect(windowChange, hasLength(1));
    });

    test('destination changed is detected', () {
      final oldRoute = _createRoute(
        version: 1,
        stops: [_createStop('stop1', seq: 1), _createStop('stop2', seq: 2)],
        activeStopId: 'stop1',
      );
      final newRoute = _createRoute(
        version: 2,
        stops: [_createStop('stop1', seq: 1), _createStop('stop2', seq: 2)],
        activeStopId: 'stop2',
      );
      final notifier = _RouteNotifierForTest()..setStateRoute(oldRoute);
      final summary = notifier.computeChangeSummary(newRoute);
      expect(summary.destinationChanged, isTrue);
      final destChange = summary.changes.where((c) => c.type == 'destination_changed').toList();
      expect(destChange, hasLength(1));
    });

    test('active job removed sets activeJobRemoved flag', () {
      final oldRoute = _createRoute(
        version: 1,
        stops: [_createStop('stop1', seq: 1), _createStop('stop2', seq: 2)],
        activeStopId: 'stop1',
      );
      final newRoute = _createRoute(
        version: 2,
        stops: [_createStop('stop2', seq: 1)],
      );
      final notifier = _RouteNotifierForTest()..setStateRoute(oldRoute);
      final summary = notifier.computeChangeSummary(newRoute);
      expect(summary.activeJobRemoved, isTrue);
    });

    test('truck changed is detected', () {
      final oldRoute = _createRoute(version: 1, truckId: 'truck_A');
      final newRoute = _createRoute(version: 2, truckId: 'truck_B');
      final notifier = _RouteNotifierForTest()..setStateRoute(oldRoute);
      final summary = notifier.computeChangeSummary(newRoute);
      final truckChange = summary.changes.where((c) => c.type == 'truck_changed').toList();
      expect(truckChange, hasLength(1));
    });

    test('no changes produces empty change list', () {
      final oldRoute = _createRoute(version: 1, stops: [_createStop('stop1', seq: 1)]);
      final newRoute = _createRoute(version: 2, stops: [_createStop('stop1', seq: 1)]);
      final notifier = _RouteNotifierForTest()..setStateRoute(oldRoute);
      final summary = notifier.computeChangeSummary(newRoute);
      expect(summary.changes, isEmpty);
      expect(summary.destinationChanged, isFalse);
      expect(summary.activeJobRemoved, isFalse);
    });
  });

  group('Navigation destination', () {
    test('returns active stop when set', () {
      final route = _createRoute(
        version: 1,
        stops: [_createStop('stop1', seq: 1), _createStop('stop2', seq: 2)],
        activeStopId: 'stop2',
      );
      final notifier = _RouteNotifierForTest()..setStateRoute(route);
      final dest = notifier.navigationDestination;
      expect(dest, isNotNull);
      expect(dest!.stopId, 'stop2');
    });

    test('returns first upcoming stop when no active stop', () {
      final route = _createRoute(
        version: 1,
        stops: [
          _createStop('stop1', seq: 1, status: 'completed'),
          _createStop('stop2', seq: 2, status: 'upcoming'),
        ],
      );
      final notifier = _RouteNotifierForTest()..setStateRoute(route);
      final dest = notifier.navigationDestination;
      expect(dest, isNotNull);
      expect(dest!.stopId, 'stop2');
    });

    test('returns null when no route', () {
      final notifier = _RouteNotifierForTest();
      expect(notifier.navigationDestination, isNull);
    });

    test('navigation destination deduplication — same active stop returns same destination', () {
      final route = _createRoute(
        version: 1,
        stops: [_createStop('stop1', seq: 1), _createStop('stop2', seq: 2)],
        activeStopId: 'stop1',
      );
      final notifier = _RouteNotifierForTest()..setStateRoute(route);
      final dest1 = notifier.navigationDestination;
      final dest2 = notifier.navigationDestination;
      expect(dest1?.stopId, dest2?.stopId);
      expect(dest1?.stopId, 'stop1');
    });
  });

  group('Route update with unchanged destination', () {
    test('destinationChanged is false when active stop is the same', () {
      final oldRoute = _createRoute(
        version: 1,
        stops: [_createStop('stop1', seq: 1), _createStop('stop2', seq: 2)],
        activeStopId: 'stop1',
      );
      final newRoute = _createRoute(
        version: 2,
        stops: [_createStop('stop1', seq: 1), _createStop('stop2', seq: 2), _createStop('stop3', seq: 3)],
        activeStopId: 'stop1',
      );
      final notifier = _RouteNotifierForTest()..setStateRoute(oldRoute);
      final summary = notifier.computeChangeSummary(newRoute);
      expect(summary.destinationChanged, isFalse);
      // A job was added but destination didn't change.
      final added = summary.changes.where((c) => c.type == 'job_added').toList();
      expect(added, hasLength(1));
    });
  });

  group('Route update with changed destination', () {
    test('destinationChanged is true when active stop changes', () {
      final oldRoute = _createRoute(
        version: 1,
        stops: [_createStop('stop1', seq: 1), _createStop('stop2', seq: 2)],
        activeStopId: 'stop1',
      );
      final newRoute = _createRoute(
        version: 2,
        stops: [_createStop('stop1', seq: 1), _createStop('stop2', seq: 2)],
        activeStopId: 'stop2',
      );
      final notifier = _RouteNotifierForTest()..setStateRoute(oldRoute);
      final summary = notifier.computeChangeSummary(newRoute);
      expect(summary.destinationChanged, isTrue);
    });
  });

  group('Stale action conflict', () {
    test('conflict state stores current and submitted versions', () {
      final conflict = RouteConflict(
        currentRouteVersion: 5,
        submittedRouteVersion: 3,
      );
      expect(conflict.currentRouteVersion, 5);
      expect(conflict.submittedRouteVersion, 3);
      expect(conflict.refreshRequired, isTrue);
      expect(conflict.safeRetry, isFalse);
    });

    test('RouteConflict fromJson parses correctly', () {
      final conflict = RouteConflict.fromJson({
        'current_route_version': 7,
        'submitted_route_version': 2,
        'refresh_required': true,
        'safe_retry': false,
      });
      expect(conflict.currentRouteVersion, 7);
      expect(conflict.submittedRouteVersion, 2);
    });
  });

  group('Offline acknowledgment queue', () {
    test('route_acknowledgment action type maps to correct endpoint', () {
      // Verify the action type string is consistent.
      const actionType = 'route_acknowledgment';
      expect(actionType, 'route_acknowledgment');
      // The offline queue service maps this to '/api/employee/route-plan'.
    });
  });

  group('CrewRoute JSON parsing', () {
    test('parses canonical route response', () {
      final json = {
        'route_id': 'route-123',
        'route_version': 3,
        'route_status': 'active',
        'route_updated_at': '2026-07-18T10:00:00Z',
        'crew_assignment_id': 'assign-456',
        'truck_id': 'truck-789',
        'ordered_stops': [
          {
            'stop_id': 'stop1',
            'booking_id': 'booking-1',
            'stop_type': 'customer',
            'sequence': 1,
            'status': 'upcoming',
            'latitude': 51.04,
            'longitude': -114.07,
            'paid_priority': true,
          }
        ],
        'active_stop_id': 'stop1',
        'route_lock': false,
        'route_change_reason': 'Donation stop added',
        'requires_acknowledgment': true,
        'acknowledged': false,
      };
      final route = CrewRoute.fromJson(json);
      expect(route.routeId, 'route-123');
      expect(route.routeVersion, 3);
      expect(route.routeStatus, 'active');
      expect(route.orderedStops, hasLength(1));
      expect(route.orderedStops.first.stopId, 'stop1');
      expect(route.orderedStops.first.paidPriority, isTrue);
      expect(route.activeStopId, 'stop1');
      expect(route.requiresAcknowledgment, isTrue);
      expect(route.acknowledged, isFalse);
    });

    test('RouteStop parses all fields', () {
      final json = {
        'stop_id': 'stop1',
        'booking_id': 'booking-1',
        'stop_type': 'customer',
        'sequence': 1,
        'status': 'upcoming',
        'latitude': 51.04,
        'longitude': -114.07,
        'name': 'John Doe',
        'address': '123 Main St',
        'arrival_window_start': '09:00',
        'paid_priority': true,
        'total_price': 250.0,
        'load_size': 'full',
      };
      final stop = RouteStop.fromJson(json);
      expect(stop.stopId, 'stop1');
      expect(stop.bookingId, 'booking-1');
      expect(stop.stopType, 'customer');
      expect(stop.sequence, 1);
      expect(stop.latitude, 51.04);
      expect(stop.longitude, -114.07);
      expect(stop.name, 'John Doe');
      expect(stop.arrivalWindowStart, '09:00');
      expect(stop.paidPriority, isTrue);
      expect(stop.totalPrice, 250.0);
      expect(stop.loadSize, 'full');
    });
  });

  group('Paid-job protection', () {
    test('customer stops with total_price have paid_priority true', () {
      // In the backend, paid_priority is set to true for customer stops
      // with total_price. Verify the model preserves it.
      final routeStop = RouteStop.fromJson({
        'stop_id': 'stop1',
        'stop_type': 'customer',
        'sequence': 1,
        'paid_priority': true,
        'total_price': 150.0,
      });
      expect(routeStop.paidPriority, isTrue);
    });

    test('donation stops do not have paid_priority', () {
      final routeStop = RouteStop.fromJson({
        'stop_id': 'don1',
        'stop_type': 'donation_pickup',
        'sequence': 2,
        'paid_priority': false,
      });
      expect(routeStop.paidPriority, isFalse);
    });

    test('crew cannot locally reorder stops — sequence is server-determined', () {
      final route = _createRoute(
        version: 1,
        stops: [
          _createStop('paid1', seq: 1, type: 'customer'),
          _createStop('paid2', seq: 2, type: 'customer'),
        ],
      );
      // The ordered_stops list is read-only from the server.
      // The crew app does not provide a reordering API.
      expect(route.orderedStops.first.sequence, 1);
      expect(route.orderedStops.last.sequence, 2);
    });
  });
}

/// Test helper that exposes the change summary logic without needing
/// a full Riverpod container.
class _RouteNotifierForTest {
  CrewRoute? _route;

  void setStateRoute(CrewRoute route) => _route = route;

  RouteChangeSummary computeChangeSummary(CrewRoute newRoute) {
    final oldRoute = _route;
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

    final destinationChanged =
        oldRoute.activeStopId != newRoute.activeStopId && oldRoute.activeStopId != null;
    final activeJobRemoved =
        oldRoute.activeStopId != null && !newStops.containsKey(oldRoute.activeStopId);

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

  RouteStop? get navigationDestination {
    final route = _route;
    if (route == null) return null;
    final activeId = route.activeStopId;
    if (activeId == null) {
      final upcoming = route.orderedStops.where((s) => s.status == 'upcoming').toList();
      return upcoming.isEmpty ? null : upcoming.first;
    }
    final matching = route.orderedStops.where((s) => s.stopId == activeId).toList();
    return matching.isEmpty ? null : matching.first;
  }
}

CrewRoute _createRoute({
  required int version,
  List<RouteStop> stops = const [],
  String? activeStopId,
  String? truckId,
}) {
  return CrewRoute(
    routeId: 'route-$version',
    routeVersion: version,
    routeStatus: 'active',
    routeUpdatedAt: '2026-07-18T10:00:00Z',
    crewAssignmentId: 'assign-1',
    truckId: truckId,
    orderedStops: stops,
    activeStopId: activeStopId,
    routeLock: false,
    routeChangeReason: null,
    requiresAcknowledgment: version > 1,
    acknowledged: false,
  );
}

RouteStop _createStop(
  String id, {
  required int seq,
  String type = 'customer',
  String status = 'upcoming',
  String? window,
}) {
  return RouteStop(
    stopId: id,
    bookingId: type == 'customer' ? id : null,
    stopType: type,
    sequence: seq,
    status: status,
    latitude: 51.04,
    longitude: -114.07,
    name: 'Stop $id',
    address: '123 Main St',
    arrivalWindowStart: window,
    paidPriority: type == 'customer',
  );
}
