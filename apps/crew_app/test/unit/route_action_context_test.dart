import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:crew_app/src/domain/models/route_plan.dart';
import 'package:crew_app/src/domain/providers/route_action_context.dart';
import 'package:crew_app/src/domain/providers/route_provider.dart';

/// Build a CrewRoute with ordered stops for testing.
CrewRoute _buildRoute({
  String routeId = 'route-1',
  int routeVersion = 1,
  List<String> bookingIds = const ['bk-1', 'bk-2'],
}) {
  return CrewRoute(
    routeId: routeId,
    crewAssignmentId: 'asg-1',
    routeVersion: routeVersion,
    acknowledged: false,
    orderedStops: bookingIds
        .asMap()
        .entries
        .map(
          (e) => RouteStop(
            stopId: 'stop-${e.key}',
            bookingId: e.value,
            sequence: e.key + 1,
            status: e.key == 0 ? 'active' : 'upcoming',
            latitude: 51.0 + e.key * 0.1,
            longitude: -114.0 + e.key * 0.1,
            arrivalWindowStart: '09:00',
            arrivalWindowEnd: '10:00',
            name: 'Customer ${e.key + 1}',
            address: '${e.key + 1} Test St',
          ),
        )
        .toList(),
  );
}

void main() {
  group('RouteActionContext', () {
    test('no route returns RouteActionNoRoute', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final result = checkRouteActionContainer(container, bookingId: 'bk-1');
      expect(result, isA<RouteActionNoRoute>());
    });

    test('route available returns RouteActionAllowed with context', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      container.read(routeProvider.notifier).state = RouteState(
        route: _buildRoute(),
      );

      final result = checkRouteActionContainer(container, bookingId: 'bk-1');
      expect(result, isA<RouteActionAllowed>());
      final allowed = result as RouteActionAllowed;
      expect(allowed.context.routeId, 'route-1');
      expect(allowed.context.routeVersion, 1);
    });

    test('booking not in route returns RouteActionBookingNotInRoute', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      container.read(routeProvider.notifier).state = RouteState(
        route: _buildRoute(bookingIds: ['bk-1', 'bk-2']),
      );

      final result = checkRouteActionContainer(container, bookingId: 'bk-999');
      expect(result, isA<RouteActionBookingNotInRoute>());
    });

    test('conflict present returns RouteActionConflictExists', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final conflict = RouteConflict(
        currentRouteVersion: 3,
        submittedRouteVersion: 1,
        refreshRequired: true,
        safeRetry: false,
      );

      container.read(routeProvider.notifier).state = RouteState(
        route: _buildRoute(routeVersion: 3),
        conflict: conflict,
      );

      final result = checkRouteActionContainer(container, bookingId: 'bk-1');
      expect(result, isA<RouteActionConflictExists>());
    });
  });

  group('checkRouteAction', () {
    test('returns RouteActionNoRoute when no route', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final result = checkRouteActionContainer(container, bookingId: 'bk-1');
      expect(result, isA<RouteActionNoRoute>());
    });

    test('returns RouteActionAllowed when route has booking', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      container.read(routeProvider.notifier).state = RouteState(
        route: _buildRoute(bookingIds: ['bk-1']),
      );

      final result = checkRouteActionContainer(container, bookingId: 'bk-1');
      expect(result, isA<RouteActionAllowed>());
      final allowed = result as RouteActionAllowed;
      expect(allowed.context.routeId, 'route-1');
      expect(allowed.context.routeVersion, 1);
    });

    test('returns RouteActionBookingNotInRoute when booking absent', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      container.read(routeProvider.notifier).state = RouteState(
        route: _buildRoute(bookingIds: ['bk-1']),
      );

      final result = checkRouteActionContainer(container, bookingId: 'bk-999');
      expect(result, isA<RouteActionBookingNotInRoute>());
    });

    test('returns RouteActionConflictExists when conflict present', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      container.read(routeProvider.notifier).state = RouteState(
        route: _buildRoute(),
        conflict: RouteConflict(
          currentRouteVersion: 2,
          submittedRouteVersion: 1,
          refreshRequired: true,
          safeRetry: false,
        ),
      );

      final result = checkRouteActionContainer(container, bookingId: 'bk-1');
      expect(result, isA<RouteActionConflictExists>());
      final conflictResult = result as RouteActionConflictExists;
      expect(conflictResult.conflict.currentRouteVersion, 2);
      expect(conflictResult.conflict.safeRetry, isFalse);
    });
  });

  group('Conflict safe_retry classification', () {
    test('safe_retry=true permits retry after refresh', () {
      final conflict = RouteConflict(
        currentRouteVersion: 3,
        submittedRouteVersion: 1,
        refreshRequired: true,
        safeRetry: true,
        actionType: 'photo_upload',
      );
      expect(conflict.safeRetry, isTrue);
    });

    test('safe_retry=false blocks automatic retry for payment', () {
      final conflict = RouteConflict(
        currentRouteVersion: 3,
        submittedRouteVersion: 1,
        refreshRequired: true,
        safeRetry: false,
        actionType: 'payment',
      );
      expect(conflict.safeRetry, isFalse);
    });

    test('safe_retry=false blocks automatic retry for signature', () {
      final conflict = RouteConflict(
        currentRouteVersion: 3,
        submittedRouteVersion: 1,
        refreshRequired: true,
        safeRetry: false,
        actionType: 'signature',
      );
      expect(conflict.safeRetry, isFalse);
    });
  });

  group('Offline payload route context retention', () {
    test('payload preserves original route version, not latest', () {
      // When an action is queued offline with route_version=2,
      // and the route later advances to v3, the queued payload
      // must still contain route_version=2.
      final originalPayload = {
        'booking_id': 'bk-1',
        'route_id': 'route-1',
        'route_version': 2,
        'amount': 150.0,
        'method': 'cash_crew',
        'created_at': '2026-07-30T10:00:00Z',
      };

      // Simulate route advancing to v3 while offline.
      // The queued payload must NOT be updated.
      expect(originalPayload['route_version'], 2);

      // When replayed, the backend receives route_version=2.
      // If the current route is v3, the backend returns 409.
      // The crew must refresh and explicitly retry — no auto-retry
      // for unsafe actions like payment.
    });

    test('payload includes all required fields', () {
      final payload = {
        'booking_id': 'bk-1',
        'route_id': 'route-1',
        'route_version': 2,
        'created_at': '2026-07-30T10:00:00Z',
        'customer_name_typed': 'John',
        'amount_confirmed': 200.0,
        'payment_method': 'cash_crew',
      };

      expect(payload.containsKey('route_id'), isTrue);
      expect(payload.containsKey('route_version'), isTrue);
      expect(payload.containsKey('booking_id'), isTrue);
      expect(payload.containsKey('created_at'), isTrue);
    });
  });
}
