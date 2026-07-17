// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'route_plan.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$CrewRoute {

@JsonKey(name: 'route_id') String get routeId;@JsonKey(name: 'route_version') int get routeVersion;@JsonKey(name: 'route_status') String get routeStatus;@JsonKey(name: 'route_updated_at') String? get routeUpdatedAt;@JsonKey(name: 'crew_assignment_id') String? get crewAssignmentId;@JsonKey(name: 'truck_id') String? get truckId;@JsonKey(name: 'ordered_stops') List<RouteStop> get orderedStops;@JsonKey(name: 'active_stop_id') String? get activeStopId;@JsonKey(name: 'route_lock') bool get routeLock;@JsonKey(name: 'route_change_reason') String? get routeChangeReason;@JsonKey(name: 'requires_acknowledgment') bool get requiresAcknowledgment;@JsonKey(name: 'acknowledged') bool get acknowledged;
/// Create a copy of CrewRoute
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$CrewRouteCopyWith<CrewRoute> get copyWith => _$CrewRouteCopyWithImpl<CrewRoute>(this as CrewRoute, _$identity);

  /// Serializes this CrewRoute to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is CrewRoute&&(identical(other.routeId, routeId) || other.routeId == routeId)&&(identical(other.routeVersion, routeVersion) || other.routeVersion == routeVersion)&&(identical(other.routeStatus, routeStatus) || other.routeStatus == routeStatus)&&(identical(other.routeUpdatedAt, routeUpdatedAt) || other.routeUpdatedAt == routeUpdatedAt)&&(identical(other.crewAssignmentId, crewAssignmentId) || other.crewAssignmentId == crewAssignmentId)&&(identical(other.truckId, truckId) || other.truckId == truckId)&&const DeepCollectionEquality().equals(other.orderedStops, orderedStops)&&(identical(other.activeStopId, activeStopId) || other.activeStopId == activeStopId)&&(identical(other.routeLock, routeLock) || other.routeLock == routeLock)&&(identical(other.routeChangeReason, routeChangeReason) || other.routeChangeReason == routeChangeReason)&&(identical(other.requiresAcknowledgment, requiresAcknowledgment) || other.requiresAcknowledgment == requiresAcknowledgment)&&(identical(other.acknowledged, acknowledged) || other.acknowledged == acknowledged));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,routeId,routeVersion,routeStatus,routeUpdatedAt,crewAssignmentId,truckId,const DeepCollectionEquality().hash(orderedStops),activeStopId,routeLock,routeChangeReason,requiresAcknowledgment,acknowledged);

@override
String toString() {
  return 'CrewRoute(routeId: $routeId, routeVersion: $routeVersion, routeStatus: $routeStatus, routeUpdatedAt: $routeUpdatedAt, crewAssignmentId: $crewAssignmentId, truckId: $truckId, orderedStops: $orderedStops, activeStopId: $activeStopId, routeLock: $routeLock, routeChangeReason: $routeChangeReason, requiresAcknowledgment: $requiresAcknowledgment, acknowledged: $acknowledged)';
}


}

/// @nodoc
abstract mixin class $CrewRouteCopyWith<$Res>  {
  factory $CrewRouteCopyWith(CrewRoute value, $Res Function(CrewRoute) _then) = _$CrewRouteCopyWithImpl;
@useResult
$Res call({
@JsonKey(name: 'route_id') String routeId,@JsonKey(name: 'route_version') int routeVersion,@JsonKey(name: 'route_status') String routeStatus,@JsonKey(name: 'route_updated_at') String? routeUpdatedAt,@JsonKey(name: 'crew_assignment_id') String? crewAssignmentId,@JsonKey(name: 'truck_id') String? truckId,@JsonKey(name: 'ordered_stops') List<RouteStop> orderedStops,@JsonKey(name: 'active_stop_id') String? activeStopId,@JsonKey(name: 'route_lock') bool routeLock,@JsonKey(name: 'route_change_reason') String? routeChangeReason,@JsonKey(name: 'requires_acknowledgment') bool requiresAcknowledgment,@JsonKey(name: 'acknowledged') bool acknowledged
});




}
/// @nodoc
class _$CrewRouteCopyWithImpl<$Res>
    implements $CrewRouteCopyWith<$Res> {
  _$CrewRouteCopyWithImpl(this._self, this._then);

  final CrewRoute _self;
  final $Res Function(CrewRoute) _then;

/// Create a copy of CrewRoute
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? routeId = null,Object? routeVersion = null,Object? routeStatus = null,Object? routeUpdatedAt = freezed,Object? crewAssignmentId = freezed,Object? truckId = freezed,Object? orderedStops = null,Object? activeStopId = freezed,Object? routeLock = null,Object? routeChangeReason = freezed,Object? requiresAcknowledgment = null,Object? acknowledged = null,}) {
  return _then(_self.copyWith(
routeId: null == routeId ? _self.routeId : routeId // ignore: cast_nullable_to_non_nullable
as String,routeVersion: null == routeVersion ? _self.routeVersion : routeVersion // ignore: cast_nullable_to_non_nullable
as int,routeStatus: null == routeStatus ? _self.routeStatus : routeStatus // ignore: cast_nullable_to_non_nullable
as String,routeUpdatedAt: freezed == routeUpdatedAt ? _self.routeUpdatedAt : routeUpdatedAt // ignore: cast_nullable_to_non_nullable
as String?,crewAssignmentId: freezed == crewAssignmentId ? _self.crewAssignmentId : crewAssignmentId // ignore: cast_nullable_to_non_nullable
as String?,truckId: freezed == truckId ? _self.truckId : truckId // ignore: cast_nullable_to_non_nullable
as String?,orderedStops: null == orderedStops ? _self.orderedStops : orderedStops // ignore: cast_nullable_to_non_nullable
as List<RouteStop>,activeStopId: freezed == activeStopId ? _self.activeStopId : activeStopId // ignore: cast_nullable_to_non_nullable
as String?,routeLock: null == routeLock ? _self.routeLock : routeLock // ignore: cast_nullable_to_non_nullable
as bool,routeChangeReason: freezed == routeChangeReason ? _self.routeChangeReason : routeChangeReason // ignore: cast_nullable_to_non_nullable
as String?,requiresAcknowledgment: null == requiresAcknowledgment ? _self.requiresAcknowledgment : requiresAcknowledgment // ignore: cast_nullable_to_non_nullable
as bool,acknowledged: null == acknowledged ? _self.acknowledged : acknowledged // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

}


/// Adds pattern-matching-related methods to [CrewRoute].
extension CrewRoutePatterns on CrewRoute {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _CrewRoute value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _CrewRoute() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _CrewRoute value)  $default,){
final _that = this;
switch (_that) {
case _CrewRoute():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _CrewRoute value)?  $default,){
final _that = this;
switch (_that) {
case _CrewRoute() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(name: 'route_id')  String routeId, @JsonKey(name: 'route_version')  int routeVersion, @JsonKey(name: 'route_status')  String routeStatus, @JsonKey(name: 'route_updated_at')  String? routeUpdatedAt, @JsonKey(name: 'crew_assignment_id')  String? crewAssignmentId, @JsonKey(name: 'truck_id')  String? truckId, @JsonKey(name: 'ordered_stops')  List<RouteStop> orderedStops, @JsonKey(name: 'active_stop_id')  String? activeStopId, @JsonKey(name: 'route_lock')  bool routeLock, @JsonKey(name: 'route_change_reason')  String? routeChangeReason, @JsonKey(name: 'requires_acknowledgment')  bool requiresAcknowledgment, @JsonKey(name: 'acknowledged')  bool acknowledged)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _CrewRoute() when $default != null:
return $default(_that.routeId,_that.routeVersion,_that.routeStatus,_that.routeUpdatedAt,_that.crewAssignmentId,_that.truckId,_that.orderedStops,_that.activeStopId,_that.routeLock,_that.routeChangeReason,_that.requiresAcknowledgment,_that.acknowledged);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(name: 'route_id')  String routeId, @JsonKey(name: 'route_version')  int routeVersion, @JsonKey(name: 'route_status')  String routeStatus, @JsonKey(name: 'route_updated_at')  String? routeUpdatedAt, @JsonKey(name: 'crew_assignment_id')  String? crewAssignmentId, @JsonKey(name: 'truck_id')  String? truckId, @JsonKey(name: 'ordered_stops')  List<RouteStop> orderedStops, @JsonKey(name: 'active_stop_id')  String? activeStopId, @JsonKey(name: 'route_lock')  bool routeLock, @JsonKey(name: 'route_change_reason')  String? routeChangeReason, @JsonKey(name: 'requires_acknowledgment')  bool requiresAcknowledgment, @JsonKey(name: 'acknowledged')  bool acknowledged)  $default,) {final _that = this;
switch (_that) {
case _CrewRoute():
return $default(_that.routeId,_that.routeVersion,_that.routeStatus,_that.routeUpdatedAt,_that.crewAssignmentId,_that.truckId,_that.orderedStops,_that.activeStopId,_that.routeLock,_that.routeChangeReason,_that.requiresAcknowledgment,_that.acknowledged);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(name: 'route_id')  String routeId, @JsonKey(name: 'route_version')  int routeVersion, @JsonKey(name: 'route_status')  String routeStatus, @JsonKey(name: 'route_updated_at')  String? routeUpdatedAt, @JsonKey(name: 'crew_assignment_id')  String? crewAssignmentId, @JsonKey(name: 'truck_id')  String? truckId, @JsonKey(name: 'ordered_stops')  List<RouteStop> orderedStops, @JsonKey(name: 'active_stop_id')  String? activeStopId, @JsonKey(name: 'route_lock')  bool routeLock, @JsonKey(name: 'route_change_reason')  String? routeChangeReason, @JsonKey(name: 'requires_acknowledgment')  bool requiresAcknowledgment, @JsonKey(name: 'acknowledged')  bool acknowledged)?  $default,) {final _that = this;
switch (_that) {
case _CrewRoute() when $default != null:
return $default(_that.routeId,_that.routeVersion,_that.routeStatus,_that.routeUpdatedAt,_that.crewAssignmentId,_that.truckId,_that.orderedStops,_that.activeStopId,_that.routeLock,_that.routeChangeReason,_that.requiresAcknowledgment,_that.acknowledged);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _CrewRoute implements CrewRoute {
  const _CrewRoute({@JsonKey(name: 'route_id') required this.routeId, @JsonKey(name: 'route_version') required this.routeVersion, @JsonKey(name: 'route_status') this.routeStatus = 'active', @JsonKey(name: 'route_updated_at') this.routeUpdatedAt, @JsonKey(name: 'crew_assignment_id') this.crewAssignmentId, @JsonKey(name: 'truck_id') this.truckId, @JsonKey(name: 'ordered_stops') final  List<RouteStop> orderedStops = const <RouteStop>[], @JsonKey(name: 'active_stop_id') this.activeStopId, @JsonKey(name: 'route_lock') this.routeLock = false, @JsonKey(name: 'route_change_reason') this.routeChangeReason, @JsonKey(name: 'requires_acknowledgment') this.requiresAcknowledgment = false, @JsonKey(name: 'acknowledged') this.acknowledged = false}): _orderedStops = orderedStops;
  factory _CrewRoute.fromJson(Map<String, dynamic> json) => _$CrewRouteFromJson(json);

@override@JsonKey(name: 'route_id') final  String routeId;
@override@JsonKey(name: 'route_version') final  int routeVersion;
@override@JsonKey(name: 'route_status') final  String routeStatus;
@override@JsonKey(name: 'route_updated_at') final  String? routeUpdatedAt;
@override@JsonKey(name: 'crew_assignment_id') final  String? crewAssignmentId;
@override@JsonKey(name: 'truck_id') final  String? truckId;
 final  List<RouteStop> _orderedStops;
@override@JsonKey(name: 'ordered_stops') List<RouteStop> get orderedStops {
  if (_orderedStops is EqualUnmodifiableListView) return _orderedStops;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_orderedStops);
}

@override@JsonKey(name: 'active_stop_id') final  String? activeStopId;
@override@JsonKey(name: 'route_lock') final  bool routeLock;
@override@JsonKey(name: 'route_change_reason') final  String? routeChangeReason;
@override@JsonKey(name: 'requires_acknowledgment') final  bool requiresAcknowledgment;
@override@JsonKey(name: 'acknowledged') final  bool acknowledged;

/// Create a copy of CrewRoute
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$CrewRouteCopyWith<_CrewRoute> get copyWith => __$CrewRouteCopyWithImpl<_CrewRoute>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$CrewRouteToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _CrewRoute&&(identical(other.routeId, routeId) || other.routeId == routeId)&&(identical(other.routeVersion, routeVersion) || other.routeVersion == routeVersion)&&(identical(other.routeStatus, routeStatus) || other.routeStatus == routeStatus)&&(identical(other.routeUpdatedAt, routeUpdatedAt) || other.routeUpdatedAt == routeUpdatedAt)&&(identical(other.crewAssignmentId, crewAssignmentId) || other.crewAssignmentId == crewAssignmentId)&&(identical(other.truckId, truckId) || other.truckId == truckId)&&const DeepCollectionEquality().equals(other._orderedStops, _orderedStops)&&(identical(other.activeStopId, activeStopId) || other.activeStopId == activeStopId)&&(identical(other.routeLock, routeLock) || other.routeLock == routeLock)&&(identical(other.routeChangeReason, routeChangeReason) || other.routeChangeReason == routeChangeReason)&&(identical(other.requiresAcknowledgment, requiresAcknowledgment) || other.requiresAcknowledgment == requiresAcknowledgment)&&(identical(other.acknowledged, acknowledged) || other.acknowledged == acknowledged));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,routeId,routeVersion,routeStatus,routeUpdatedAt,crewAssignmentId,truckId,const DeepCollectionEquality().hash(_orderedStops),activeStopId,routeLock,routeChangeReason,requiresAcknowledgment,acknowledged);

@override
String toString() {
  return 'CrewRoute(routeId: $routeId, routeVersion: $routeVersion, routeStatus: $routeStatus, routeUpdatedAt: $routeUpdatedAt, crewAssignmentId: $crewAssignmentId, truckId: $truckId, orderedStops: $orderedStops, activeStopId: $activeStopId, routeLock: $routeLock, routeChangeReason: $routeChangeReason, requiresAcknowledgment: $requiresAcknowledgment, acknowledged: $acknowledged)';
}


}

/// @nodoc
abstract mixin class _$CrewRouteCopyWith<$Res> implements $CrewRouteCopyWith<$Res> {
  factory _$CrewRouteCopyWith(_CrewRoute value, $Res Function(_CrewRoute) _then) = __$CrewRouteCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(name: 'route_id') String routeId,@JsonKey(name: 'route_version') int routeVersion,@JsonKey(name: 'route_status') String routeStatus,@JsonKey(name: 'route_updated_at') String? routeUpdatedAt,@JsonKey(name: 'crew_assignment_id') String? crewAssignmentId,@JsonKey(name: 'truck_id') String? truckId,@JsonKey(name: 'ordered_stops') List<RouteStop> orderedStops,@JsonKey(name: 'active_stop_id') String? activeStopId,@JsonKey(name: 'route_lock') bool routeLock,@JsonKey(name: 'route_change_reason') String? routeChangeReason,@JsonKey(name: 'requires_acknowledgment') bool requiresAcknowledgment,@JsonKey(name: 'acknowledged') bool acknowledged
});




}
/// @nodoc
class __$CrewRouteCopyWithImpl<$Res>
    implements _$CrewRouteCopyWith<$Res> {
  __$CrewRouteCopyWithImpl(this._self, this._then);

  final _CrewRoute _self;
  final $Res Function(_CrewRoute) _then;

/// Create a copy of CrewRoute
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? routeId = null,Object? routeVersion = null,Object? routeStatus = null,Object? routeUpdatedAt = freezed,Object? crewAssignmentId = freezed,Object? truckId = freezed,Object? orderedStops = null,Object? activeStopId = freezed,Object? routeLock = null,Object? routeChangeReason = freezed,Object? requiresAcknowledgment = null,Object? acknowledged = null,}) {
  return _then(_CrewRoute(
routeId: null == routeId ? _self.routeId : routeId // ignore: cast_nullable_to_non_nullable
as String,routeVersion: null == routeVersion ? _self.routeVersion : routeVersion // ignore: cast_nullable_to_non_nullable
as int,routeStatus: null == routeStatus ? _self.routeStatus : routeStatus // ignore: cast_nullable_to_non_nullable
as String,routeUpdatedAt: freezed == routeUpdatedAt ? _self.routeUpdatedAt : routeUpdatedAt // ignore: cast_nullable_to_non_nullable
as String?,crewAssignmentId: freezed == crewAssignmentId ? _self.crewAssignmentId : crewAssignmentId // ignore: cast_nullable_to_non_nullable
as String?,truckId: freezed == truckId ? _self.truckId : truckId // ignore: cast_nullable_to_non_nullable
as String?,orderedStops: null == orderedStops ? _self._orderedStops : orderedStops // ignore: cast_nullable_to_non_nullable
as List<RouteStop>,activeStopId: freezed == activeStopId ? _self.activeStopId : activeStopId // ignore: cast_nullable_to_non_nullable
as String?,routeLock: null == routeLock ? _self.routeLock : routeLock // ignore: cast_nullable_to_non_nullable
as bool,routeChangeReason: freezed == routeChangeReason ? _self.routeChangeReason : routeChangeReason // ignore: cast_nullable_to_non_nullable
as String?,requiresAcknowledgment: null == requiresAcknowledgment ? _self.requiresAcknowledgment : requiresAcknowledgment // ignore: cast_nullable_to_non_nullable
as bool,acknowledged: null == acknowledged ? _self.acknowledged : acknowledged // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}


}


/// @nodoc
mixin _$RouteStop {

@JsonKey(name: 'stop_id') String get stopId;@JsonKey(name: 'booking_id') String? get bookingId;@JsonKey(name: 'stop_type') String get stopType;@JsonKey(name: 'sequence') int get sequence;@JsonKey(name: 'status') String get status; double? get latitude; double? get longitude; String? get name; String? get address;@JsonKey(name: 'arrival_window_start') String? get arrivalWindowStart;@JsonKey(name: 'arrival_window_end') String? get arrivalWindowEnd;@JsonKey(name: 'estimated_arrival') String? get estimatedArrival;@JsonKey(name: 'estimated_duration') int? get estimatedDuration;@JsonKey(name: 'capacity_before') int? get capacityBefore;@JsonKey(name: 'capacity_after') int? get capacityAfter;@JsonKey(name: 'paid_priority') bool get paidPriority;@JsonKey(name: 'destination_type') String? get destinationType;@JsonKey(name: 'total_price') double? get totalPrice;@JsonKey(name: 'load_size') String? get loadSize;@JsonKey(name: 'donation_request_id') String? get donationRequestId;
/// Create a copy of RouteStop
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$RouteStopCopyWith<RouteStop> get copyWith => _$RouteStopCopyWithImpl<RouteStop>(this as RouteStop, _$identity);

  /// Serializes this RouteStop to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is RouteStop&&(identical(other.stopId, stopId) || other.stopId == stopId)&&(identical(other.bookingId, bookingId) || other.bookingId == bookingId)&&(identical(other.stopType, stopType) || other.stopType == stopType)&&(identical(other.sequence, sequence) || other.sequence == sequence)&&(identical(other.status, status) || other.status == status)&&(identical(other.latitude, latitude) || other.latitude == latitude)&&(identical(other.longitude, longitude) || other.longitude == longitude)&&(identical(other.name, name) || other.name == name)&&(identical(other.address, address) || other.address == address)&&(identical(other.arrivalWindowStart, arrivalWindowStart) || other.arrivalWindowStart == arrivalWindowStart)&&(identical(other.arrivalWindowEnd, arrivalWindowEnd) || other.arrivalWindowEnd == arrivalWindowEnd)&&(identical(other.estimatedArrival, estimatedArrival) || other.estimatedArrival == estimatedArrival)&&(identical(other.estimatedDuration, estimatedDuration) || other.estimatedDuration == estimatedDuration)&&(identical(other.capacityBefore, capacityBefore) || other.capacityBefore == capacityBefore)&&(identical(other.capacityAfter, capacityAfter) || other.capacityAfter == capacityAfter)&&(identical(other.paidPriority, paidPriority) || other.paidPriority == paidPriority)&&(identical(other.destinationType, destinationType) || other.destinationType == destinationType)&&(identical(other.totalPrice, totalPrice) || other.totalPrice == totalPrice)&&(identical(other.loadSize, loadSize) || other.loadSize == loadSize)&&(identical(other.donationRequestId, donationRequestId) || other.donationRequestId == donationRequestId));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hashAll([runtimeType,stopId,bookingId,stopType,sequence,status,latitude,longitude,name,address,arrivalWindowStart,arrivalWindowEnd,estimatedArrival,estimatedDuration,capacityBefore,capacityAfter,paidPriority,destinationType,totalPrice,loadSize,donationRequestId]);

@override
String toString() {
  return 'RouteStop(stopId: $stopId, bookingId: $bookingId, stopType: $stopType, sequence: $sequence, status: $status, latitude: $latitude, longitude: $longitude, name: $name, address: $address, arrivalWindowStart: $arrivalWindowStart, arrivalWindowEnd: $arrivalWindowEnd, estimatedArrival: $estimatedArrival, estimatedDuration: $estimatedDuration, capacityBefore: $capacityBefore, capacityAfter: $capacityAfter, paidPriority: $paidPriority, destinationType: $destinationType, totalPrice: $totalPrice, loadSize: $loadSize, donationRequestId: $donationRequestId)';
}


}

/// @nodoc
abstract mixin class $RouteStopCopyWith<$Res>  {
  factory $RouteStopCopyWith(RouteStop value, $Res Function(RouteStop) _then) = _$RouteStopCopyWithImpl;
@useResult
$Res call({
@JsonKey(name: 'stop_id') String stopId,@JsonKey(name: 'booking_id') String? bookingId,@JsonKey(name: 'stop_type') String stopType,@JsonKey(name: 'sequence') int sequence,@JsonKey(name: 'status') String status, double? latitude, double? longitude, String? name, String? address,@JsonKey(name: 'arrival_window_start') String? arrivalWindowStart,@JsonKey(name: 'arrival_window_end') String? arrivalWindowEnd,@JsonKey(name: 'estimated_arrival') String? estimatedArrival,@JsonKey(name: 'estimated_duration') int? estimatedDuration,@JsonKey(name: 'capacity_before') int? capacityBefore,@JsonKey(name: 'capacity_after') int? capacityAfter,@JsonKey(name: 'paid_priority') bool paidPriority,@JsonKey(name: 'destination_type') String? destinationType,@JsonKey(name: 'total_price') double? totalPrice,@JsonKey(name: 'load_size') String? loadSize,@JsonKey(name: 'donation_request_id') String? donationRequestId
});




}
/// @nodoc
class _$RouteStopCopyWithImpl<$Res>
    implements $RouteStopCopyWith<$Res> {
  _$RouteStopCopyWithImpl(this._self, this._then);

  final RouteStop _self;
  final $Res Function(RouteStop) _then;

/// Create a copy of RouteStop
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? stopId = null,Object? bookingId = freezed,Object? stopType = null,Object? sequence = null,Object? status = null,Object? latitude = freezed,Object? longitude = freezed,Object? name = freezed,Object? address = freezed,Object? arrivalWindowStart = freezed,Object? arrivalWindowEnd = freezed,Object? estimatedArrival = freezed,Object? estimatedDuration = freezed,Object? capacityBefore = freezed,Object? capacityAfter = freezed,Object? paidPriority = null,Object? destinationType = freezed,Object? totalPrice = freezed,Object? loadSize = freezed,Object? donationRequestId = freezed,}) {
  return _then(_self.copyWith(
stopId: null == stopId ? _self.stopId : stopId // ignore: cast_nullable_to_non_nullable
as String,bookingId: freezed == bookingId ? _self.bookingId : bookingId // ignore: cast_nullable_to_non_nullable
as String?,stopType: null == stopType ? _self.stopType : stopType // ignore: cast_nullable_to_non_nullable
as String,sequence: null == sequence ? _self.sequence : sequence // ignore: cast_nullable_to_non_nullable
as int,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,latitude: freezed == latitude ? _self.latitude : latitude // ignore: cast_nullable_to_non_nullable
as double?,longitude: freezed == longitude ? _self.longitude : longitude // ignore: cast_nullable_to_non_nullable
as double?,name: freezed == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String?,address: freezed == address ? _self.address : address // ignore: cast_nullable_to_non_nullable
as String?,arrivalWindowStart: freezed == arrivalWindowStart ? _self.arrivalWindowStart : arrivalWindowStart // ignore: cast_nullable_to_non_nullable
as String?,arrivalWindowEnd: freezed == arrivalWindowEnd ? _self.arrivalWindowEnd : arrivalWindowEnd // ignore: cast_nullable_to_non_nullable
as String?,estimatedArrival: freezed == estimatedArrival ? _self.estimatedArrival : estimatedArrival // ignore: cast_nullable_to_non_nullable
as String?,estimatedDuration: freezed == estimatedDuration ? _self.estimatedDuration : estimatedDuration // ignore: cast_nullable_to_non_nullable
as int?,capacityBefore: freezed == capacityBefore ? _self.capacityBefore : capacityBefore // ignore: cast_nullable_to_non_nullable
as int?,capacityAfter: freezed == capacityAfter ? _self.capacityAfter : capacityAfter // ignore: cast_nullable_to_non_nullable
as int?,paidPriority: null == paidPriority ? _self.paidPriority : paidPriority // ignore: cast_nullable_to_non_nullable
as bool,destinationType: freezed == destinationType ? _self.destinationType : destinationType // ignore: cast_nullable_to_non_nullable
as String?,totalPrice: freezed == totalPrice ? _self.totalPrice : totalPrice // ignore: cast_nullable_to_non_nullable
as double?,loadSize: freezed == loadSize ? _self.loadSize : loadSize // ignore: cast_nullable_to_non_nullable
as String?,donationRequestId: freezed == donationRequestId ? _self.donationRequestId : donationRequestId // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [RouteStop].
extension RouteStopPatterns on RouteStop {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _RouteStop value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _RouteStop() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _RouteStop value)  $default,){
final _that = this;
switch (_that) {
case _RouteStop():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _RouteStop value)?  $default,){
final _that = this;
switch (_that) {
case _RouteStop() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(name: 'stop_id')  String stopId, @JsonKey(name: 'booking_id')  String? bookingId, @JsonKey(name: 'stop_type')  String stopType, @JsonKey(name: 'sequence')  int sequence, @JsonKey(name: 'status')  String status,  double? latitude,  double? longitude,  String? name,  String? address, @JsonKey(name: 'arrival_window_start')  String? arrivalWindowStart, @JsonKey(name: 'arrival_window_end')  String? arrivalWindowEnd, @JsonKey(name: 'estimated_arrival')  String? estimatedArrival, @JsonKey(name: 'estimated_duration')  int? estimatedDuration, @JsonKey(name: 'capacity_before')  int? capacityBefore, @JsonKey(name: 'capacity_after')  int? capacityAfter, @JsonKey(name: 'paid_priority')  bool paidPriority, @JsonKey(name: 'destination_type')  String? destinationType, @JsonKey(name: 'total_price')  double? totalPrice, @JsonKey(name: 'load_size')  String? loadSize, @JsonKey(name: 'donation_request_id')  String? donationRequestId)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _RouteStop() when $default != null:
return $default(_that.stopId,_that.bookingId,_that.stopType,_that.sequence,_that.status,_that.latitude,_that.longitude,_that.name,_that.address,_that.arrivalWindowStart,_that.arrivalWindowEnd,_that.estimatedArrival,_that.estimatedDuration,_that.capacityBefore,_that.capacityAfter,_that.paidPriority,_that.destinationType,_that.totalPrice,_that.loadSize,_that.donationRequestId);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(name: 'stop_id')  String stopId, @JsonKey(name: 'booking_id')  String? bookingId, @JsonKey(name: 'stop_type')  String stopType, @JsonKey(name: 'sequence')  int sequence, @JsonKey(name: 'status')  String status,  double? latitude,  double? longitude,  String? name,  String? address, @JsonKey(name: 'arrival_window_start')  String? arrivalWindowStart, @JsonKey(name: 'arrival_window_end')  String? arrivalWindowEnd, @JsonKey(name: 'estimated_arrival')  String? estimatedArrival, @JsonKey(name: 'estimated_duration')  int? estimatedDuration, @JsonKey(name: 'capacity_before')  int? capacityBefore, @JsonKey(name: 'capacity_after')  int? capacityAfter, @JsonKey(name: 'paid_priority')  bool paidPriority, @JsonKey(name: 'destination_type')  String? destinationType, @JsonKey(name: 'total_price')  double? totalPrice, @JsonKey(name: 'load_size')  String? loadSize, @JsonKey(name: 'donation_request_id')  String? donationRequestId)  $default,) {final _that = this;
switch (_that) {
case _RouteStop():
return $default(_that.stopId,_that.bookingId,_that.stopType,_that.sequence,_that.status,_that.latitude,_that.longitude,_that.name,_that.address,_that.arrivalWindowStart,_that.arrivalWindowEnd,_that.estimatedArrival,_that.estimatedDuration,_that.capacityBefore,_that.capacityAfter,_that.paidPriority,_that.destinationType,_that.totalPrice,_that.loadSize,_that.donationRequestId);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(name: 'stop_id')  String stopId, @JsonKey(name: 'booking_id')  String? bookingId, @JsonKey(name: 'stop_type')  String stopType, @JsonKey(name: 'sequence')  int sequence, @JsonKey(name: 'status')  String status,  double? latitude,  double? longitude,  String? name,  String? address, @JsonKey(name: 'arrival_window_start')  String? arrivalWindowStart, @JsonKey(name: 'arrival_window_end')  String? arrivalWindowEnd, @JsonKey(name: 'estimated_arrival')  String? estimatedArrival, @JsonKey(name: 'estimated_duration')  int? estimatedDuration, @JsonKey(name: 'capacity_before')  int? capacityBefore, @JsonKey(name: 'capacity_after')  int? capacityAfter, @JsonKey(name: 'paid_priority')  bool paidPriority, @JsonKey(name: 'destination_type')  String? destinationType, @JsonKey(name: 'total_price')  double? totalPrice, @JsonKey(name: 'load_size')  String? loadSize, @JsonKey(name: 'donation_request_id')  String? donationRequestId)?  $default,) {final _that = this;
switch (_that) {
case _RouteStop() when $default != null:
return $default(_that.stopId,_that.bookingId,_that.stopType,_that.sequence,_that.status,_that.latitude,_that.longitude,_that.name,_that.address,_that.arrivalWindowStart,_that.arrivalWindowEnd,_that.estimatedArrival,_that.estimatedDuration,_that.capacityBefore,_that.capacityAfter,_that.paidPriority,_that.destinationType,_that.totalPrice,_that.loadSize,_that.donationRequestId);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _RouteStop implements RouteStop {
  const _RouteStop({@JsonKey(name: 'stop_id') required this.stopId, @JsonKey(name: 'booking_id') this.bookingId, @JsonKey(name: 'stop_type') this.stopType = 'customer', @JsonKey(name: 'sequence') required this.sequence, @JsonKey(name: 'status') this.status = 'upcoming', this.latitude, this.longitude, this.name, this.address, @JsonKey(name: 'arrival_window_start') this.arrivalWindowStart, @JsonKey(name: 'arrival_window_end') this.arrivalWindowEnd, @JsonKey(name: 'estimated_arrival') this.estimatedArrival, @JsonKey(name: 'estimated_duration') this.estimatedDuration, @JsonKey(name: 'capacity_before') this.capacityBefore, @JsonKey(name: 'capacity_after') this.capacityAfter, @JsonKey(name: 'paid_priority') this.paidPriority = false, @JsonKey(name: 'destination_type') this.destinationType, @JsonKey(name: 'total_price') this.totalPrice, @JsonKey(name: 'load_size') this.loadSize, @JsonKey(name: 'donation_request_id') this.donationRequestId});
  factory _RouteStop.fromJson(Map<String, dynamic> json) => _$RouteStopFromJson(json);

@override@JsonKey(name: 'stop_id') final  String stopId;
@override@JsonKey(name: 'booking_id') final  String? bookingId;
@override@JsonKey(name: 'stop_type') final  String stopType;
@override@JsonKey(name: 'sequence') final  int sequence;
@override@JsonKey(name: 'status') final  String status;
@override final  double? latitude;
@override final  double? longitude;
@override final  String? name;
@override final  String? address;
@override@JsonKey(name: 'arrival_window_start') final  String? arrivalWindowStart;
@override@JsonKey(name: 'arrival_window_end') final  String? arrivalWindowEnd;
@override@JsonKey(name: 'estimated_arrival') final  String? estimatedArrival;
@override@JsonKey(name: 'estimated_duration') final  int? estimatedDuration;
@override@JsonKey(name: 'capacity_before') final  int? capacityBefore;
@override@JsonKey(name: 'capacity_after') final  int? capacityAfter;
@override@JsonKey(name: 'paid_priority') final  bool paidPriority;
@override@JsonKey(name: 'destination_type') final  String? destinationType;
@override@JsonKey(name: 'total_price') final  double? totalPrice;
@override@JsonKey(name: 'load_size') final  String? loadSize;
@override@JsonKey(name: 'donation_request_id') final  String? donationRequestId;

/// Create a copy of RouteStop
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$RouteStopCopyWith<_RouteStop> get copyWith => __$RouteStopCopyWithImpl<_RouteStop>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$RouteStopToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _RouteStop&&(identical(other.stopId, stopId) || other.stopId == stopId)&&(identical(other.bookingId, bookingId) || other.bookingId == bookingId)&&(identical(other.stopType, stopType) || other.stopType == stopType)&&(identical(other.sequence, sequence) || other.sequence == sequence)&&(identical(other.status, status) || other.status == status)&&(identical(other.latitude, latitude) || other.latitude == latitude)&&(identical(other.longitude, longitude) || other.longitude == longitude)&&(identical(other.name, name) || other.name == name)&&(identical(other.address, address) || other.address == address)&&(identical(other.arrivalWindowStart, arrivalWindowStart) || other.arrivalWindowStart == arrivalWindowStart)&&(identical(other.arrivalWindowEnd, arrivalWindowEnd) || other.arrivalWindowEnd == arrivalWindowEnd)&&(identical(other.estimatedArrival, estimatedArrival) || other.estimatedArrival == estimatedArrival)&&(identical(other.estimatedDuration, estimatedDuration) || other.estimatedDuration == estimatedDuration)&&(identical(other.capacityBefore, capacityBefore) || other.capacityBefore == capacityBefore)&&(identical(other.capacityAfter, capacityAfter) || other.capacityAfter == capacityAfter)&&(identical(other.paidPriority, paidPriority) || other.paidPriority == paidPriority)&&(identical(other.destinationType, destinationType) || other.destinationType == destinationType)&&(identical(other.totalPrice, totalPrice) || other.totalPrice == totalPrice)&&(identical(other.loadSize, loadSize) || other.loadSize == loadSize)&&(identical(other.donationRequestId, donationRequestId) || other.donationRequestId == donationRequestId));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hashAll([runtimeType,stopId,bookingId,stopType,sequence,status,latitude,longitude,name,address,arrivalWindowStart,arrivalWindowEnd,estimatedArrival,estimatedDuration,capacityBefore,capacityAfter,paidPriority,destinationType,totalPrice,loadSize,donationRequestId]);

@override
String toString() {
  return 'RouteStop(stopId: $stopId, bookingId: $bookingId, stopType: $stopType, sequence: $sequence, status: $status, latitude: $latitude, longitude: $longitude, name: $name, address: $address, arrivalWindowStart: $arrivalWindowStart, arrivalWindowEnd: $arrivalWindowEnd, estimatedArrival: $estimatedArrival, estimatedDuration: $estimatedDuration, capacityBefore: $capacityBefore, capacityAfter: $capacityAfter, paidPriority: $paidPriority, destinationType: $destinationType, totalPrice: $totalPrice, loadSize: $loadSize, donationRequestId: $donationRequestId)';
}


}

/// @nodoc
abstract mixin class _$RouteStopCopyWith<$Res> implements $RouteStopCopyWith<$Res> {
  factory _$RouteStopCopyWith(_RouteStop value, $Res Function(_RouteStop) _then) = __$RouteStopCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(name: 'stop_id') String stopId,@JsonKey(name: 'booking_id') String? bookingId,@JsonKey(name: 'stop_type') String stopType,@JsonKey(name: 'sequence') int sequence,@JsonKey(name: 'status') String status, double? latitude, double? longitude, String? name, String? address,@JsonKey(name: 'arrival_window_start') String? arrivalWindowStart,@JsonKey(name: 'arrival_window_end') String? arrivalWindowEnd,@JsonKey(name: 'estimated_arrival') String? estimatedArrival,@JsonKey(name: 'estimated_duration') int? estimatedDuration,@JsonKey(name: 'capacity_before') int? capacityBefore,@JsonKey(name: 'capacity_after') int? capacityAfter,@JsonKey(name: 'paid_priority') bool paidPriority,@JsonKey(name: 'destination_type') String? destinationType,@JsonKey(name: 'total_price') double? totalPrice,@JsonKey(name: 'load_size') String? loadSize,@JsonKey(name: 'donation_request_id') String? donationRequestId
});




}
/// @nodoc
class __$RouteStopCopyWithImpl<$Res>
    implements _$RouteStopCopyWith<$Res> {
  __$RouteStopCopyWithImpl(this._self, this._then);

  final _RouteStop _self;
  final $Res Function(_RouteStop) _then;

/// Create a copy of RouteStop
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? stopId = null,Object? bookingId = freezed,Object? stopType = null,Object? sequence = null,Object? status = null,Object? latitude = freezed,Object? longitude = freezed,Object? name = freezed,Object? address = freezed,Object? arrivalWindowStart = freezed,Object? arrivalWindowEnd = freezed,Object? estimatedArrival = freezed,Object? estimatedDuration = freezed,Object? capacityBefore = freezed,Object? capacityAfter = freezed,Object? paidPriority = null,Object? destinationType = freezed,Object? totalPrice = freezed,Object? loadSize = freezed,Object? donationRequestId = freezed,}) {
  return _then(_RouteStop(
stopId: null == stopId ? _self.stopId : stopId // ignore: cast_nullable_to_non_nullable
as String,bookingId: freezed == bookingId ? _self.bookingId : bookingId // ignore: cast_nullable_to_non_nullable
as String?,stopType: null == stopType ? _self.stopType : stopType // ignore: cast_nullable_to_non_nullable
as String,sequence: null == sequence ? _self.sequence : sequence // ignore: cast_nullable_to_non_nullable
as int,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,latitude: freezed == latitude ? _self.latitude : latitude // ignore: cast_nullable_to_non_nullable
as double?,longitude: freezed == longitude ? _self.longitude : longitude // ignore: cast_nullable_to_non_nullable
as double?,name: freezed == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String?,address: freezed == address ? _self.address : address // ignore: cast_nullable_to_non_nullable
as String?,arrivalWindowStart: freezed == arrivalWindowStart ? _self.arrivalWindowStart : arrivalWindowStart // ignore: cast_nullable_to_non_nullable
as String?,arrivalWindowEnd: freezed == arrivalWindowEnd ? _self.arrivalWindowEnd : arrivalWindowEnd // ignore: cast_nullable_to_non_nullable
as String?,estimatedArrival: freezed == estimatedArrival ? _self.estimatedArrival : estimatedArrival // ignore: cast_nullable_to_non_nullable
as String?,estimatedDuration: freezed == estimatedDuration ? _self.estimatedDuration : estimatedDuration // ignore: cast_nullable_to_non_nullable
as int?,capacityBefore: freezed == capacityBefore ? _self.capacityBefore : capacityBefore // ignore: cast_nullable_to_non_nullable
as int?,capacityAfter: freezed == capacityAfter ? _self.capacityAfter : capacityAfter // ignore: cast_nullable_to_non_nullable
as int?,paidPriority: null == paidPriority ? _self.paidPriority : paidPriority // ignore: cast_nullable_to_non_nullable
as bool,destinationType: freezed == destinationType ? _self.destinationType : destinationType // ignore: cast_nullable_to_non_nullable
as String?,totalPrice: freezed == totalPrice ? _self.totalPrice : totalPrice // ignore: cast_nullable_to_non_nullable
as double?,loadSize: freezed == loadSize ? _self.loadSize : loadSize // ignore: cast_nullable_to_non_nullable
as String?,donationRequestId: freezed == donationRequestId ? _self.donationRequestId : donationRequestId // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}

/// @nodoc
mixin _$RouteChangeSummary {

 List<RouteChange> get changes;@JsonKey(name: 'destination_changed') bool get destinationChanged;@JsonKey(name: 'active_job_removed') bool get activeJobRemoved;@JsonKey(name: 'new_version') int get newVersion;@JsonKey(name: 'old_version') int get oldVersion;
/// Create a copy of RouteChangeSummary
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$RouteChangeSummaryCopyWith<RouteChangeSummary> get copyWith => _$RouteChangeSummaryCopyWithImpl<RouteChangeSummary>(this as RouteChangeSummary, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is RouteChangeSummary&&const DeepCollectionEquality().equals(other.changes, changes)&&(identical(other.destinationChanged, destinationChanged) || other.destinationChanged == destinationChanged)&&(identical(other.activeJobRemoved, activeJobRemoved) || other.activeJobRemoved == activeJobRemoved)&&(identical(other.newVersion, newVersion) || other.newVersion == newVersion)&&(identical(other.oldVersion, oldVersion) || other.oldVersion == oldVersion));
}


@override
int get hashCode => Object.hash(runtimeType,const DeepCollectionEquality().hash(changes),destinationChanged,activeJobRemoved,newVersion,oldVersion);

@override
String toString() {
  return 'RouteChangeSummary(changes: $changes, destinationChanged: $destinationChanged, activeJobRemoved: $activeJobRemoved, newVersion: $newVersion, oldVersion: $oldVersion)';
}


}

/// @nodoc
abstract mixin class $RouteChangeSummaryCopyWith<$Res>  {
  factory $RouteChangeSummaryCopyWith(RouteChangeSummary value, $Res Function(RouteChangeSummary) _then) = _$RouteChangeSummaryCopyWithImpl;
@useResult
$Res call({
 List<RouteChange> changes,@JsonKey(name: 'destination_changed') bool destinationChanged,@JsonKey(name: 'active_job_removed') bool activeJobRemoved,@JsonKey(name: 'new_version') int newVersion,@JsonKey(name: 'old_version') int oldVersion
});




}
/// @nodoc
class _$RouteChangeSummaryCopyWithImpl<$Res>
    implements $RouteChangeSummaryCopyWith<$Res> {
  _$RouteChangeSummaryCopyWithImpl(this._self, this._then);

  final RouteChangeSummary _self;
  final $Res Function(RouteChangeSummary) _then;

/// Create a copy of RouteChangeSummary
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? changes = null,Object? destinationChanged = null,Object? activeJobRemoved = null,Object? newVersion = null,Object? oldVersion = null,}) {
  return _then(_self.copyWith(
changes: null == changes ? _self.changes : changes // ignore: cast_nullable_to_non_nullable
as List<RouteChange>,destinationChanged: null == destinationChanged ? _self.destinationChanged : destinationChanged // ignore: cast_nullable_to_non_nullable
as bool,activeJobRemoved: null == activeJobRemoved ? _self.activeJobRemoved : activeJobRemoved // ignore: cast_nullable_to_non_nullable
as bool,newVersion: null == newVersion ? _self.newVersion : newVersion // ignore: cast_nullable_to_non_nullable
as int,oldVersion: null == oldVersion ? _self.oldVersion : oldVersion // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [RouteChangeSummary].
extension RouteChangeSummaryPatterns on RouteChangeSummary {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _RouteChangeSummary value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _RouteChangeSummary() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _RouteChangeSummary value)  $default,){
final _that = this;
switch (_that) {
case _RouteChangeSummary():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _RouteChangeSummary value)?  $default,){
final _that = this;
switch (_that) {
case _RouteChangeSummary() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( List<RouteChange> changes, @JsonKey(name: 'destination_changed')  bool destinationChanged, @JsonKey(name: 'active_job_removed')  bool activeJobRemoved, @JsonKey(name: 'new_version')  int newVersion, @JsonKey(name: 'old_version')  int oldVersion)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _RouteChangeSummary() when $default != null:
return $default(_that.changes,_that.destinationChanged,_that.activeJobRemoved,_that.newVersion,_that.oldVersion);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( List<RouteChange> changes, @JsonKey(name: 'destination_changed')  bool destinationChanged, @JsonKey(name: 'active_job_removed')  bool activeJobRemoved, @JsonKey(name: 'new_version')  int newVersion, @JsonKey(name: 'old_version')  int oldVersion)  $default,) {final _that = this;
switch (_that) {
case _RouteChangeSummary():
return $default(_that.changes,_that.destinationChanged,_that.activeJobRemoved,_that.newVersion,_that.oldVersion);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( List<RouteChange> changes, @JsonKey(name: 'destination_changed')  bool destinationChanged, @JsonKey(name: 'active_job_removed')  bool activeJobRemoved, @JsonKey(name: 'new_version')  int newVersion, @JsonKey(name: 'old_version')  int oldVersion)?  $default,) {final _that = this;
switch (_that) {
case _RouteChangeSummary() when $default != null:
return $default(_that.changes,_that.destinationChanged,_that.activeJobRemoved,_that.newVersion,_that.oldVersion);case _:
  return null;

}
}

}

/// @nodoc


class _RouteChangeSummary implements RouteChangeSummary {
  const _RouteChangeSummary({final  List<RouteChange> changes = const <RouteChange>[], @JsonKey(name: 'destination_changed') this.destinationChanged = false, @JsonKey(name: 'active_job_removed') this.activeJobRemoved = false, @JsonKey(name: 'new_version') required this.newVersion, @JsonKey(name: 'old_version') required this.oldVersion}): _changes = changes;
  

 final  List<RouteChange> _changes;
@override@JsonKey() List<RouteChange> get changes {
  if (_changes is EqualUnmodifiableListView) return _changes;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_changes);
}

@override@JsonKey(name: 'destination_changed') final  bool destinationChanged;
@override@JsonKey(name: 'active_job_removed') final  bool activeJobRemoved;
@override@JsonKey(name: 'new_version') final  int newVersion;
@override@JsonKey(name: 'old_version') final  int oldVersion;

/// Create a copy of RouteChangeSummary
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$RouteChangeSummaryCopyWith<_RouteChangeSummary> get copyWith => __$RouteChangeSummaryCopyWithImpl<_RouteChangeSummary>(this, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _RouteChangeSummary&&const DeepCollectionEquality().equals(other._changes, _changes)&&(identical(other.destinationChanged, destinationChanged) || other.destinationChanged == destinationChanged)&&(identical(other.activeJobRemoved, activeJobRemoved) || other.activeJobRemoved == activeJobRemoved)&&(identical(other.newVersion, newVersion) || other.newVersion == newVersion)&&(identical(other.oldVersion, oldVersion) || other.oldVersion == oldVersion));
}


@override
int get hashCode => Object.hash(runtimeType,const DeepCollectionEquality().hash(_changes),destinationChanged,activeJobRemoved,newVersion,oldVersion);

@override
String toString() {
  return 'RouteChangeSummary(changes: $changes, destinationChanged: $destinationChanged, activeJobRemoved: $activeJobRemoved, newVersion: $newVersion, oldVersion: $oldVersion)';
}


}

/// @nodoc
abstract mixin class _$RouteChangeSummaryCopyWith<$Res> implements $RouteChangeSummaryCopyWith<$Res> {
  factory _$RouteChangeSummaryCopyWith(_RouteChangeSummary value, $Res Function(_RouteChangeSummary) _then) = __$RouteChangeSummaryCopyWithImpl;
@override @useResult
$Res call({
 List<RouteChange> changes,@JsonKey(name: 'destination_changed') bool destinationChanged,@JsonKey(name: 'active_job_removed') bool activeJobRemoved,@JsonKey(name: 'new_version') int newVersion,@JsonKey(name: 'old_version') int oldVersion
});




}
/// @nodoc
class __$RouteChangeSummaryCopyWithImpl<$Res>
    implements _$RouteChangeSummaryCopyWith<$Res> {
  __$RouteChangeSummaryCopyWithImpl(this._self, this._then);

  final _RouteChangeSummary _self;
  final $Res Function(_RouteChangeSummary) _then;

/// Create a copy of RouteChangeSummary
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? changes = null,Object? destinationChanged = null,Object? activeJobRemoved = null,Object? newVersion = null,Object? oldVersion = null,}) {
  return _then(_RouteChangeSummary(
changes: null == changes ? _self._changes : changes // ignore: cast_nullable_to_non_nullable
as List<RouteChange>,destinationChanged: null == destinationChanged ? _self.destinationChanged : destinationChanged // ignore: cast_nullable_to_non_nullable
as bool,activeJobRemoved: null == activeJobRemoved ? _self.activeJobRemoved : activeJobRemoved // ignore: cast_nullable_to_non_nullable
as bool,newVersion: null == newVersion ? _self.newVersion : newVersion // ignore: cast_nullable_to_non_nullable
as int,oldVersion: null == oldVersion ? _self.oldVersion : oldVersion // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}


/// @nodoc
mixin _$RouteChange {

 String get type;// job_added, job_removed, job_moved, window_changed, destination_changed, truck_changed, donation_inserted
 String? get stopId; String? get description; int? get oldSequence; int? get newSequence;
/// Create a copy of RouteChange
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$RouteChangeCopyWith<RouteChange> get copyWith => _$RouteChangeCopyWithImpl<RouteChange>(this as RouteChange, _$identity);

  /// Serializes this RouteChange to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is RouteChange&&(identical(other.type, type) || other.type == type)&&(identical(other.stopId, stopId) || other.stopId == stopId)&&(identical(other.description, description) || other.description == description)&&(identical(other.oldSequence, oldSequence) || other.oldSequence == oldSequence)&&(identical(other.newSequence, newSequence) || other.newSequence == newSequence));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,type,stopId,description,oldSequence,newSequence);

@override
String toString() {
  return 'RouteChange(type: $type, stopId: $stopId, description: $description, oldSequence: $oldSequence, newSequence: $newSequence)';
}


}

/// @nodoc
abstract mixin class $RouteChangeCopyWith<$Res>  {
  factory $RouteChangeCopyWith(RouteChange value, $Res Function(RouteChange) _then) = _$RouteChangeCopyWithImpl;
@useResult
$Res call({
 String type, String? stopId, String? description, int? oldSequence, int? newSequence
});




}
/// @nodoc
class _$RouteChangeCopyWithImpl<$Res>
    implements $RouteChangeCopyWith<$Res> {
  _$RouteChangeCopyWithImpl(this._self, this._then);

  final RouteChange _self;
  final $Res Function(RouteChange) _then;

/// Create a copy of RouteChange
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? type = null,Object? stopId = freezed,Object? description = freezed,Object? oldSequence = freezed,Object? newSequence = freezed,}) {
  return _then(_self.copyWith(
type: null == type ? _self.type : type // ignore: cast_nullable_to_non_nullable
as String,stopId: freezed == stopId ? _self.stopId : stopId // ignore: cast_nullable_to_non_nullable
as String?,description: freezed == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String?,oldSequence: freezed == oldSequence ? _self.oldSequence : oldSequence // ignore: cast_nullable_to_non_nullable
as int?,newSequence: freezed == newSequence ? _self.newSequence : newSequence // ignore: cast_nullable_to_non_nullable
as int?,
  ));
}

}


/// Adds pattern-matching-related methods to [RouteChange].
extension RouteChangePatterns on RouteChange {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _RouteChange value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _RouteChange() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _RouteChange value)  $default,){
final _that = this;
switch (_that) {
case _RouteChange():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _RouteChange value)?  $default,){
final _that = this;
switch (_that) {
case _RouteChange() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String type,  String? stopId,  String? description,  int? oldSequence,  int? newSequence)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _RouteChange() when $default != null:
return $default(_that.type,_that.stopId,_that.description,_that.oldSequence,_that.newSequence);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String type,  String? stopId,  String? description,  int? oldSequence,  int? newSequence)  $default,) {final _that = this;
switch (_that) {
case _RouteChange():
return $default(_that.type,_that.stopId,_that.description,_that.oldSequence,_that.newSequence);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String type,  String? stopId,  String? description,  int? oldSequence,  int? newSequence)?  $default,) {final _that = this;
switch (_that) {
case _RouteChange() when $default != null:
return $default(_that.type,_that.stopId,_that.description,_that.oldSequence,_that.newSequence);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _RouteChange implements RouteChange {
  const _RouteChange({required this.type, this.stopId, this.description, this.oldSequence, this.newSequence});
  factory _RouteChange.fromJson(Map<String, dynamic> json) => _$RouteChangeFromJson(json);

@override final  String type;
// job_added, job_removed, job_moved, window_changed, destination_changed, truck_changed, donation_inserted
@override final  String? stopId;
@override final  String? description;
@override final  int? oldSequence;
@override final  int? newSequence;

/// Create a copy of RouteChange
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$RouteChangeCopyWith<_RouteChange> get copyWith => __$RouteChangeCopyWithImpl<_RouteChange>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$RouteChangeToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _RouteChange&&(identical(other.type, type) || other.type == type)&&(identical(other.stopId, stopId) || other.stopId == stopId)&&(identical(other.description, description) || other.description == description)&&(identical(other.oldSequence, oldSequence) || other.oldSequence == oldSequence)&&(identical(other.newSequence, newSequence) || other.newSequence == newSequence));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,type,stopId,description,oldSequence,newSequence);

@override
String toString() {
  return 'RouteChange(type: $type, stopId: $stopId, description: $description, oldSequence: $oldSequence, newSequence: $newSequence)';
}


}

/// @nodoc
abstract mixin class _$RouteChangeCopyWith<$Res> implements $RouteChangeCopyWith<$Res> {
  factory _$RouteChangeCopyWith(_RouteChange value, $Res Function(_RouteChange) _then) = __$RouteChangeCopyWithImpl;
@override @useResult
$Res call({
 String type, String? stopId, String? description, int? oldSequence, int? newSequence
});




}
/// @nodoc
class __$RouteChangeCopyWithImpl<$Res>
    implements _$RouteChangeCopyWith<$Res> {
  __$RouteChangeCopyWithImpl(this._self, this._then);

  final _RouteChange _self;
  final $Res Function(_RouteChange) _then;

/// Create a copy of RouteChange
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? type = null,Object? stopId = freezed,Object? description = freezed,Object? oldSequence = freezed,Object? newSequence = freezed,}) {
  return _then(_RouteChange(
type: null == type ? _self.type : type // ignore: cast_nullable_to_non_nullable
as String,stopId: freezed == stopId ? _self.stopId : stopId // ignore: cast_nullable_to_non_nullable
as String?,description: freezed == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String?,oldSequence: freezed == oldSequence ? _self.oldSequence : oldSequence // ignore: cast_nullable_to_non_nullable
as int?,newSequence: freezed == newSequence ? _self.newSequence : newSequence // ignore: cast_nullable_to_non_nullable
as int?,
  ));
}


}


/// @nodoc
mixin _$RouteConflict {

@JsonKey(name: 'current_route_version') int get currentRouteVersion;@JsonKey(name: 'submitted_route_version') int? get submittedRouteVersion;@JsonKey(name: 'refresh_required') bool get refreshRequired;@JsonKey(name: 'safe_retry') bool get safeRetry;@JsonKey(name: 'action_type') String? get actionType; String? get message;
/// Create a copy of RouteConflict
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$RouteConflictCopyWith<RouteConflict> get copyWith => _$RouteConflictCopyWithImpl<RouteConflict>(this as RouteConflict, _$identity);

  /// Serializes this RouteConflict to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is RouteConflict&&(identical(other.currentRouteVersion, currentRouteVersion) || other.currentRouteVersion == currentRouteVersion)&&(identical(other.submittedRouteVersion, submittedRouteVersion) || other.submittedRouteVersion == submittedRouteVersion)&&(identical(other.refreshRequired, refreshRequired) || other.refreshRequired == refreshRequired)&&(identical(other.safeRetry, safeRetry) || other.safeRetry == safeRetry)&&(identical(other.actionType, actionType) || other.actionType == actionType)&&(identical(other.message, message) || other.message == message));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,currentRouteVersion,submittedRouteVersion,refreshRequired,safeRetry,actionType,message);

@override
String toString() {
  return 'RouteConflict(currentRouteVersion: $currentRouteVersion, submittedRouteVersion: $submittedRouteVersion, refreshRequired: $refreshRequired, safeRetry: $safeRetry, actionType: $actionType, message: $message)';
}


}

/// @nodoc
abstract mixin class $RouteConflictCopyWith<$Res>  {
  factory $RouteConflictCopyWith(RouteConflict value, $Res Function(RouteConflict) _then) = _$RouteConflictCopyWithImpl;
@useResult
$Res call({
@JsonKey(name: 'current_route_version') int currentRouteVersion,@JsonKey(name: 'submitted_route_version') int? submittedRouteVersion,@JsonKey(name: 'refresh_required') bool refreshRequired,@JsonKey(name: 'safe_retry') bool safeRetry,@JsonKey(name: 'action_type') String? actionType, String? message
});




}
/// @nodoc
class _$RouteConflictCopyWithImpl<$Res>
    implements $RouteConflictCopyWith<$Res> {
  _$RouteConflictCopyWithImpl(this._self, this._then);

  final RouteConflict _self;
  final $Res Function(RouteConflict) _then;

/// Create a copy of RouteConflict
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? currentRouteVersion = null,Object? submittedRouteVersion = freezed,Object? refreshRequired = null,Object? safeRetry = null,Object? actionType = freezed,Object? message = freezed,}) {
  return _then(_self.copyWith(
currentRouteVersion: null == currentRouteVersion ? _self.currentRouteVersion : currentRouteVersion // ignore: cast_nullable_to_non_nullable
as int,submittedRouteVersion: freezed == submittedRouteVersion ? _self.submittedRouteVersion : submittedRouteVersion // ignore: cast_nullable_to_non_nullable
as int?,refreshRequired: null == refreshRequired ? _self.refreshRequired : refreshRequired // ignore: cast_nullable_to_non_nullable
as bool,safeRetry: null == safeRetry ? _self.safeRetry : safeRetry // ignore: cast_nullable_to_non_nullable
as bool,actionType: freezed == actionType ? _self.actionType : actionType // ignore: cast_nullable_to_non_nullable
as String?,message: freezed == message ? _self.message : message // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [RouteConflict].
extension RouteConflictPatterns on RouteConflict {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _RouteConflict value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _RouteConflict() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _RouteConflict value)  $default,){
final _that = this;
switch (_that) {
case _RouteConflict():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _RouteConflict value)?  $default,){
final _that = this;
switch (_that) {
case _RouteConflict() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(name: 'current_route_version')  int currentRouteVersion, @JsonKey(name: 'submitted_route_version')  int? submittedRouteVersion, @JsonKey(name: 'refresh_required')  bool refreshRequired, @JsonKey(name: 'safe_retry')  bool safeRetry, @JsonKey(name: 'action_type')  String? actionType,  String? message)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _RouteConflict() when $default != null:
return $default(_that.currentRouteVersion,_that.submittedRouteVersion,_that.refreshRequired,_that.safeRetry,_that.actionType,_that.message);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(name: 'current_route_version')  int currentRouteVersion, @JsonKey(name: 'submitted_route_version')  int? submittedRouteVersion, @JsonKey(name: 'refresh_required')  bool refreshRequired, @JsonKey(name: 'safe_retry')  bool safeRetry, @JsonKey(name: 'action_type')  String? actionType,  String? message)  $default,) {final _that = this;
switch (_that) {
case _RouteConflict():
return $default(_that.currentRouteVersion,_that.submittedRouteVersion,_that.refreshRequired,_that.safeRetry,_that.actionType,_that.message);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(name: 'current_route_version')  int currentRouteVersion, @JsonKey(name: 'submitted_route_version')  int? submittedRouteVersion, @JsonKey(name: 'refresh_required')  bool refreshRequired, @JsonKey(name: 'safe_retry')  bool safeRetry, @JsonKey(name: 'action_type')  String? actionType,  String? message)?  $default,) {final _that = this;
switch (_that) {
case _RouteConflict() when $default != null:
return $default(_that.currentRouteVersion,_that.submittedRouteVersion,_that.refreshRequired,_that.safeRetry,_that.actionType,_that.message);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _RouteConflict implements RouteConflict {
  const _RouteConflict({@JsonKey(name: 'current_route_version') required this.currentRouteVersion, @JsonKey(name: 'submitted_route_version') this.submittedRouteVersion, @JsonKey(name: 'refresh_required') this.refreshRequired = true, @JsonKey(name: 'safe_retry') this.safeRetry = false, @JsonKey(name: 'action_type') this.actionType, this.message});
  factory _RouteConflict.fromJson(Map<String, dynamic> json) => _$RouteConflictFromJson(json);

@override@JsonKey(name: 'current_route_version') final  int currentRouteVersion;
@override@JsonKey(name: 'submitted_route_version') final  int? submittedRouteVersion;
@override@JsonKey(name: 'refresh_required') final  bool refreshRequired;
@override@JsonKey(name: 'safe_retry') final  bool safeRetry;
@override@JsonKey(name: 'action_type') final  String? actionType;
@override final  String? message;

/// Create a copy of RouteConflict
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$RouteConflictCopyWith<_RouteConflict> get copyWith => __$RouteConflictCopyWithImpl<_RouteConflict>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$RouteConflictToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _RouteConflict&&(identical(other.currentRouteVersion, currentRouteVersion) || other.currentRouteVersion == currentRouteVersion)&&(identical(other.submittedRouteVersion, submittedRouteVersion) || other.submittedRouteVersion == submittedRouteVersion)&&(identical(other.refreshRequired, refreshRequired) || other.refreshRequired == refreshRequired)&&(identical(other.safeRetry, safeRetry) || other.safeRetry == safeRetry)&&(identical(other.actionType, actionType) || other.actionType == actionType)&&(identical(other.message, message) || other.message == message));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,currentRouteVersion,submittedRouteVersion,refreshRequired,safeRetry,actionType,message);

@override
String toString() {
  return 'RouteConflict(currentRouteVersion: $currentRouteVersion, submittedRouteVersion: $submittedRouteVersion, refreshRequired: $refreshRequired, safeRetry: $safeRetry, actionType: $actionType, message: $message)';
}


}

/// @nodoc
abstract mixin class _$RouteConflictCopyWith<$Res> implements $RouteConflictCopyWith<$Res> {
  factory _$RouteConflictCopyWith(_RouteConflict value, $Res Function(_RouteConflict) _then) = __$RouteConflictCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(name: 'current_route_version') int currentRouteVersion,@JsonKey(name: 'submitted_route_version') int? submittedRouteVersion,@JsonKey(name: 'refresh_required') bool refreshRequired,@JsonKey(name: 'safe_retry') bool safeRetry,@JsonKey(name: 'action_type') String? actionType, String? message
});




}
/// @nodoc
class __$RouteConflictCopyWithImpl<$Res>
    implements _$RouteConflictCopyWith<$Res> {
  __$RouteConflictCopyWithImpl(this._self, this._then);

  final _RouteConflict _self;
  final $Res Function(_RouteConflict) _then;

/// Create a copy of RouteConflict
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? currentRouteVersion = null,Object? submittedRouteVersion = freezed,Object? refreshRequired = null,Object? safeRetry = null,Object? actionType = freezed,Object? message = freezed,}) {
  return _then(_RouteConflict(
currentRouteVersion: null == currentRouteVersion ? _self.currentRouteVersion : currentRouteVersion // ignore: cast_nullable_to_non_nullable
as int,submittedRouteVersion: freezed == submittedRouteVersion ? _self.submittedRouteVersion : submittedRouteVersion // ignore: cast_nullable_to_non_nullable
as int?,refreshRequired: null == refreshRequired ? _self.refreshRequired : refreshRequired // ignore: cast_nullable_to_non_nullable
as bool,safeRetry: null == safeRetry ? _self.safeRetry : safeRetry // ignore: cast_nullable_to_non_nullable
as bool,actionType: freezed == actionType ? _self.actionType : actionType // ignore: cast_nullable_to_non_nullable
as String?,message: freezed == message ? _self.message : message // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}

// dart format on
