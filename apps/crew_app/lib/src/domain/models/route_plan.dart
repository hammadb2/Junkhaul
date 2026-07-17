import 'package:freezed_annotation/freezed_annotation.dart';

part 'route_plan.freezed.dart';
part 'route_plan.g.dart';

/// Canonical route plan returned by /api/employee/route-plan.
@freezed
abstract class CrewRoute with _$CrewRoute {
  const factory CrewRoute({
    @JsonKey(name: 'route_id') required String routeId,
    @JsonKey(name: 'route_version') required int routeVersion,
    @JsonKey(name: 'route_status') @Default('active') String routeStatus,
    @JsonKey(name: 'route_updated_at') String? routeUpdatedAt,
    @JsonKey(name: 'crew_assignment_id') String? crewAssignmentId,
    @JsonKey(name: 'truck_id') String? truckId,
    @JsonKey(name: 'ordered_stops') @Default(<RouteStop>[]) List<RouteStop> orderedStops,
    @JsonKey(name: 'active_stop_id') String? activeStopId,
    @JsonKey(name: 'route_lock') @Default(false) bool routeLock,
    @JsonKey(name: 'route_change_reason') String? routeChangeReason,
    @JsonKey(name: 'requires_acknowledgment') @Default(false) bool requiresAcknowledgment,
    @JsonKey(name: 'acknowledged') @Default(false) bool acknowledged,
  }) = _CrewRoute;

  factory CrewRoute.fromJson(Map<String, dynamic> json) => _$CrewRouteFromJson(json);
}

/// A single ordered stop in a route.
@freezed
abstract class RouteStop with _$RouteStop {
  const factory RouteStop({
    @JsonKey(name: 'stop_id') required String stopId,
    @JsonKey(name: 'booking_id') String? bookingId,
    @JsonKey(name: 'stop_type') @Default('customer') String stopType,
    @JsonKey(name: 'sequence') required int sequence,
    @JsonKey(name: 'status') @Default('upcoming') String status,
    double? latitude,
    double? longitude,
    String? name,
    String? address,
    @JsonKey(name: 'arrival_window_start') String? arrivalWindowStart,
    @JsonKey(name: 'arrival_window_end') String? arrivalWindowEnd,
    @JsonKey(name: 'estimated_arrival') String? estimatedArrival,
    @JsonKey(name: 'estimated_duration') int? estimatedDuration,
    @JsonKey(name: 'capacity_before') int? capacityBefore,
    @JsonKey(name: 'capacity_after') int? capacityAfter,
    @JsonKey(name: 'paid_priority') @Default(false) bool paidPriority,
    @JsonKey(name: 'destination_type') String? destinationType,
    @JsonKey(name: 'total_price') double? totalPrice,
    @JsonKey(name: 'load_size') String? loadSize,
    @JsonKey(name: 'donation_request_id') String? donationRequestId,
  }) = _RouteStop;

  factory RouteStop.fromJson(Map<String, dynamic> json) => _$RouteStopFromJson(json);
}

/// Describes what changed between two route versions.
@freezed
abstract class RouteChangeSummary with _$RouteChangeSummary {
  const factory RouteChangeSummary({
    @Default(<RouteChange>[]) List<RouteChange> changes,
    @JsonKey(name: 'destination_changed') @Default(false) bool destinationChanged,
    @JsonKey(name: 'active_job_removed') @Default(false) bool activeJobRemoved,
    @JsonKey(name: 'new_version') required int newVersion,
    @JsonKey(name: 'old_version') required int oldVersion,
  }) = _RouteChangeSummary;
}

/// A single change in a route update.
@freezed
abstract class RouteChange with _$RouteChange {
  const factory RouteChange({
    required String type, // job_added, job_removed, job_moved, window_changed, destination_changed, truck_changed, donation_inserted
    String? stopId,
    String? description,
    int? oldSequence,
    int? newSequence,
  }) = _RouteChange;

  factory RouteChange.fromJson(Map<String, dynamic> json) => _$RouteChangeFromJson(json);
}

/// Conflict state for stale writes.
@freezed
abstract class RouteConflict with _$RouteConflict {
  const factory RouteConflict({
    @JsonKey(name: 'current_route_version') required int currentRouteVersion,
    @JsonKey(name: 'submitted_route_version') int? submittedRouteVersion,
    @JsonKey(name: 'refresh_required') @Default(true) bool refreshRequired,
    @JsonKey(name: 'safe_retry') @Default(false) bool safeRetry,
    @JsonKey(name: 'action_type') String? actionType,
    String? message,
  }) = _RouteConflict;

  factory RouteConflict.fromJson(Map<String, dynamic> json) => _$RouteConflictFromJson(json);
}
