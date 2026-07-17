import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/route_plan.dart';
import 'route_provider.dart';

/// Centralized route-action context that supplies the authoritative
/// route_id and route_version for any route-sensitive crew action.
///
/// This is the single source of truth for route context at call sites.
/// Widgets use [checkRouteAction] before making a protected API call.
///
/// Behavior:
/// - No current route → block the action, caller shows refresh message
/// - Current route available → supply routeId and routeVersion
/// - Booking not in route → block the action
/// - 409 conflict → update RouteNotifier conflict state, fetch latest
class RouteActionContext {
  RouteActionContext._({
    required this.routeId,
    required this.routeVersion,
    this.bookingId,
    this.isCurrent = true,
  });

  final String routeId;
  final int routeVersion;
  final String? bookingId;
  final bool isCurrent;

  /// Whether this action should be blocked due to missing or stale route.
  bool get shouldBlock => !isCurrent;

  @override
  String toString() =>
      'RouteActionContext(routeId: $routeId, routeVersion: $routeVersion, '
      'bookingId: $bookingId, isCurrent: $isCurrent)';
}

/// Result of a route-protected action attempt.
sealed class RouteActionResult {
  const RouteActionResult();
}

class RouteActionAllowed extends RouteActionResult {
  const RouteActionAllowed(this.context);
  final RouteActionContext context;
}

class RouteActionNoRoute extends RouteActionResult {
  const RouteActionNoRoute();
}

class RouteActionBookingNotInRoute extends RouteActionResult {
  const RouteActionBookingNotInRoute();
}

class RouteActionConflictExists extends RouteActionResult {
  const RouteActionConflictExists(this.conflict);
  final RouteConflict conflict;
}

/// Check whether a route-sensitive action should proceed.
/// Uses WidgetRef (available in ConsumerStatefulWidget/ConsumerWidget).
RouteActionResult checkRouteAction(WidgetRef ref, {String? bookingId}) {
  final routeState = ref.read(routeProvider);
  final route = routeState.route;

  if (route == null) {
    return const RouteActionNoRoute();
  }

  if (routeState.conflict != null) {
    return RouteActionConflictExists(routeState.conflict!);
  }

  if (bookingId != null) {
    final isInRoute = route.orderedStops.any(
      (stop) => stop.bookingId == bookingId,
    );
    if (!isInRoute) {
      return const RouteActionBookingNotInRoute();
    }
  }

  return RouteActionAllowed(RouteActionContext._(
    routeId: route.routeId,
    routeVersion: route.routeVersion,
    bookingId: bookingId,
    isCurrent: true,
  ));
}

/// Check route action using a ProviderContainer (for tests/providers).
RouteActionResult checkRouteActionContainer(
  ProviderContainer container, {
  String? bookingId,
}) {
  final routeState = container.read(routeProvider);
  final route = routeState.route;

  if (route == null) {
    return const RouteActionNoRoute();
  }

  if (routeState.conflict != null) {
    return RouteActionConflictExists(routeState.conflict!);
  }

  if (bookingId != null) {
    final isInRoute = route.orderedStops.any(
      (stop) => stop.bookingId == bookingId,
    );
    if (!isInRoute) {
      return const RouteActionBookingNotInRoute();
    }
  }

  return RouteActionAllowed(RouteActionContext._(
    routeId: route.routeId,
    routeVersion: route.routeVersion,
    bookingId: bookingId,
    isCurrent: true,
  ));
}

/// Handle a 409 conflict response from a protected endpoint.
/// Parses the conflict body and updates RouteNotifier, then fetches
/// the latest route so the crew sees the current version.
RouteConflict handleRouteConflict(WidgetRef ref, Map<String, dynamic> body) {
  final conflict = RouteConflict(
    currentRouteVersion: body['current_route_version'] as int? ?? 0,
    submittedRouteVersion: body['submitted_route_version'] as int?,
    refreshRequired: body['refresh_required'] as bool? ?? true,
    safeRetry: body['safe_retry'] as bool? ?? false,
    actionType: body['action_type'] as String?,
    message: body['error'] as String?,
  );

  ref.read(routeProvider.notifier).setConflict(conflict);
  ref.read(routeProvider.notifier).fetchRoute();

  return conflict;
}

/// Container-based variant of [handleRouteConflict] for use in tests
/// and providers that have a [ProviderContainer] instead of a [WidgetRef].
RouteConflict handleRouteConflictContainer(
  ProviderContainer container,
  Map<String, dynamic> body,
) {
  final conflict = RouteConflict(
    currentRouteVersion: body['current_route_version'] as int? ?? 0,
    submittedRouteVersion: body['submitted_route_version'] as int?,
    refreshRequired: body['refresh_required'] as bool? ?? true,
    safeRetry: body['safe_retry'] as bool? ?? false,
    actionType: body['action_type'] as String?,
    message: body['error'] as String?,
  );

  container.read(routeProvider.notifier).setConflict(conflict);
  container.read(routeProvider.notifier).fetchRoute();

  return conflict;
}

/// Parse a 409/400 route error body into a [RouteConflict], or return null
/// if the error is not a route-version conflict.
/// This is the shared conflict parser used by all protected callers.
RouteConflict? parseRouteConflict(dynamic error) {
  // ApiException carries the parsed response body for 4xx errors.
  if (error is! Exception) return null;

  // Use reflection-free field access via toString + body field.
  // ApiException has a `body` field and `statusCode` field.
  final errorStr = error.toString();

  // Check for ApiException (has body and statusCode).
  final body = _extractApiExceptionBody(error);
  final statusCode = _extractApiExceptionStatusCode(error);

  if (body != null) {
    // 409 = route version conflict, 400 = route version required.
    if (statusCode == 409 || statusCode == 400) {
      if (body.containsKey('current_route_version') ||
          body.containsKey('refresh_required') ||
          body.containsKey('safe_retry') ||
          errorStr.contains('route_version') ||
          errorStr.contains('Route version')) {
        return RouteConflict(
          currentRouteVersion: body['current_route_version'] as int? ?? 0,
          submittedRouteVersion: body['submitted_route_version'] as int?,
          refreshRequired: body['refresh_required'] as bool? ?? true,
          safeRetry: body['safe_retry'] as bool? ?? false,
          actionType: body['action_type'] as String?,
          message: body['error'] as String?,
        );
      }
    }
  }

  return null;
}

/// Extract the body Map from an ApiException instance.
/// Uses dynamic field access since ApiException is in a different library.
Map<String, dynamic>? _extractApiExceptionBody(dynamic error) {
  try {
    // ignore: avoid_dynamic_calls
    final body = (error as dynamic).body;
    if (body is Map<String, dynamic>) return body;
    if (body is Map) return body.cast<String, dynamic>();
  } catch (_) {}
  return null;
}

/// Extract the statusCode from an ApiException instance.
int? _extractApiExceptionStatusCode(dynamic error) {
  try {
    // ignore: avoid_dynamic_calls
    final status = (error as dynamic).statusCode;
    if (status is int) return status;
  } catch (_) {}
  return null;
}
