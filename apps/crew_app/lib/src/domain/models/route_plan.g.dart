// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'route_plan.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_CrewRoute _$CrewRouteFromJson(Map<String, dynamic> json) => _CrewRoute(
  routeId: json['route_id'] as String,
  routeVersion: (json['route_version'] as num).toInt(),
  routeStatus: json['route_status'] as String? ?? 'active',
  routeUpdatedAt: json['route_updated_at'] as String?,
  crewAssignmentId: json['crew_assignment_id'] as String?,
  truckId: json['truck_id'] as String?,
  orderedStops:
      (json['ordered_stops'] as List<dynamic>?)
          ?.map((e) => RouteStop.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <RouteStop>[],
  activeStopId: json['active_stop_id'] as String?,
  routeLock: json['route_lock'] as bool? ?? false,
  routeChangeReason: json['route_change_reason'] as String?,
  requiresAcknowledgment: json['requires_acknowledgment'] as bool? ?? false,
  acknowledged: json['acknowledged'] as bool? ?? false,
);

Map<String, dynamic> _$CrewRouteToJson(_CrewRoute instance) =>
    <String, dynamic>{
      'route_id': instance.routeId,
      'route_version': instance.routeVersion,
      'route_status': instance.routeStatus,
      'route_updated_at': instance.routeUpdatedAt,
      'crew_assignment_id': instance.crewAssignmentId,
      'truck_id': instance.truckId,
      'ordered_stops': instance.orderedStops,
      'active_stop_id': instance.activeStopId,
      'route_lock': instance.routeLock,
      'route_change_reason': instance.routeChangeReason,
      'requires_acknowledgment': instance.requiresAcknowledgment,
      'acknowledged': instance.acknowledged,
    };

_RouteStop _$RouteStopFromJson(Map<String, dynamic> json) => _RouteStop(
  stopId: json['stop_id'] as String,
  bookingId: json['booking_id'] as String?,
  stopType: json['stop_type'] as String? ?? 'customer',
  sequence: (json['sequence'] as num).toInt(),
  status: json['status'] as String? ?? 'upcoming',
  latitude: (json['latitude'] as num?)?.toDouble(),
  longitude: (json['longitude'] as num?)?.toDouble(),
  name: json['name'] as String?,
  address: json['address'] as String?,
  arrivalWindowStart: json['arrival_window_start'] as String?,
  arrivalWindowEnd: json['arrival_window_end'] as String?,
  estimatedArrival: json['estimated_arrival'] as String?,
  estimatedDuration: (json['estimated_duration'] as num?)?.toInt(),
  capacityBefore: (json['capacity_before'] as num?)?.toInt(),
  capacityAfter: (json['capacity_after'] as num?)?.toInt(),
  paidPriority: json['paid_priority'] as bool? ?? false,
  destinationType: json['destination_type'] as String?,
  totalPrice: (json['total_price'] as num?)?.toDouble(),
  loadSize: json['load_size'] as String?,
  donationRequestId: json['donation_request_id'] as String?,
);

Map<String, dynamic> _$RouteStopToJson(_RouteStop instance) =>
    <String, dynamic>{
      'stop_id': instance.stopId,
      'booking_id': instance.bookingId,
      'stop_type': instance.stopType,
      'sequence': instance.sequence,
      'status': instance.status,
      'latitude': instance.latitude,
      'longitude': instance.longitude,
      'name': instance.name,
      'address': instance.address,
      'arrival_window_start': instance.arrivalWindowStart,
      'arrival_window_end': instance.arrivalWindowEnd,
      'estimated_arrival': instance.estimatedArrival,
      'estimated_duration': instance.estimatedDuration,
      'capacity_before': instance.capacityBefore,
      'capacity_after': instance.capacityAfter,
      'paid_priority': instance.paidPriority,
      'destination_type': instance.destinationType,
      'total_price': instance.totalPrice,
      'load_size': instance.loadSize,
      'donation_request_id': instance.donationRequestId,
    };

_RouteChange _$RouteChangeFromJson(Map<String, dynamic> json) => _RouteChange(
  type: json['type'] as String,
  stopId: json['stopId'] as String?,
  description: json['description'] as String?,
  oldSequence: (json['oldSequence'] as num?)?.toInt(),
  newSequence: (json['newSequence'] as num?)?.toInt(),
);

Map<String, dynamic> _$RouteChangeToJson(_RouteChange instance) =>
    <String, dynamic>{
      'type': instance.type,
      'stopId': instance.stopId,
      'description': instance.description,
      'oldSequence': instance.oldSequence,
      'newSequence': instance.newSequence,
    };

_RouteConflict _$RouteConflictFromJson(Map<String, dynamic> json) =>
    _RouteConflict(
      currentRouteVersion: (json['current_route_version'] as num).toInt(),
      submittedRouteVersion: (json['submitted_route_version'] as num).toInt(),
      refreshRequired: json['refresh_required'] as bool? ?? true,
      safeRetry: json['safe_retry'] as bool? ?? false,
    );

Map<String, dynamic> _$RouteConflictToJson(_RouteConflict instance) =>
    <String, dynamic>{
      'current_route_version': instance.currentRouteVersion,
      'submitted_route_version': instance.submittedRouteVersion,
      'refresh_required': instance.refreshRequired,
      'safe_retry': instance.safeRetry,
    };
