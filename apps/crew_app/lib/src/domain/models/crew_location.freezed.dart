// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'crew_location.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$CrewLocation {

 double get lat; double get lng; double? get heading; double? get speed;@JsonKey(name: 'updated_at') String? get updatedAt;@JsonKey(name: 'crew_first_names') String? get crewFirstNames; bool get enRoute;
/// Create a copy of CrewLocation
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$CrewLocationCopyWith<CrewLocation> get copyWith => _$CrewLocationCopyWithImpl<CrewLocation>(this as CrewLocation, _$identity);

  /// Serializes this CrewLocation to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is CrewLocation&&(identical(other.lat, lat) || other.lat == lat)&&(identical(other.lng, lng) || other.lng == lng)&&(identical(other.heading, heading) || other.heading == heading)&&(identical(other.speed, speed) || other.speed == speed)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt)&&(identical(other.crewFirstNames, crewFirstNames) || other.crewFirstNames == crewFirstNames)&&(identical(other.enRoute, enRoute) || other.enRoute == enRoute));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,lat,lng,heading,speed,updatedAt,crewFirstNames,enRoute);

@override
String toString() {
  return 'CrewLocation(lat: $lat, lng: $lng, heading: $heading, speed: $speed, updatedAt: $updatedAt, crewFirstNames: $crewFirstNames, enRoute: $enRoute)';
}


}

/// @nodoc
abstract mixin class $CrewLocationCopyWith<$Res>  {
  factory $CrewLocationCopyWith(CrewLocation value, $Res Function(CrewLocation) _then) = _$CrewLocationCopyWithImpl;
@useResult
$Res call({
 double lat, double lng, double? heading, double? speed,@JsonKey(name: 'updated_at') String? updatedAt,@JsonKey(name: 'crew_first_names') String? crewFirstNames, bool enRoute
});




}
/// @nodoc
class _$CrewLocationCopyWithImpl<$Res>
    implements $CrewLocationCopyWith<$Res> {
  _$CrewLocationCopyWithImpl(this._self, this._then);

  final CrewLocation _self;
  final $Res Function(CrewLocation) _then;

/// Create a copy of CrewLocation
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? lat = null,Object? lng = null,Object? heading = freezed,Object? speed = freezed,Object? updatedAt = freezed,Object? crewFirstNames = freezed,Object? enRoute = null,}) {
  return _then(_self.copyWith(
lat: null == lat ? _self.lat : lat // ignore: cast_nullable_to_non_nullable
as double,lng: null == lng ? _self.lng : lng // ignore: cast_nullable_to_non_nullable
as double,heading: freezed == heading ? _self.heading : heading // ignore: cast_nullable_to_non_nullable
as double?,speed: freezed == speed ? _self.speed : speed // ignore: cast_nullable_to_non_nullable
as double?,updatedAt: freezed == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as String?,crewFirstNames: freezed == crewFirstNames ? _self.crewFirstNames : crewFirstNames // ignore: cast_nullable_to_non_nullable
as String?,enRoute: null == enRoute ? _self.enRoute : enRoute // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

}


/// Adds pattern-matching-related methods to [CrewLocation].
extension CrewLocationPatterns on CrewLocation {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _CrewLocation value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _CrewLocation() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _CrewLocation value)  $default,){
final _that = this;
switch (_that) {
case _CrewLocation():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _CrewLocation value)?  $default,){
final _that = this;
switch (_that) {
case _CrewLocation() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( double lat,  double lng,  double? heading,  double? speed, @JsonKey(name: 'updated_at')  String? updatedAt, @JsonKey(name: 'crew_first_names')  String? crewFirstNames,  bool enRoute)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _CrewLocation() when $default != null:
return $default(_that.lat,_that.lng,_that.heading,_that.speed,_that.updatedAt,_that.crewFirstNames,_that.enRoute);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( double lat,  double lng,  double? heading,  double? speed, @JsonKey(name: 'updated_at')  String? updatedAt, @JsonKey(name: 'crew_first_names')  String? crewFirstNames,  bool enRoute)  $default,) {final _that = this;
switch (_that) {
case _CrewLocation():
return $default(_that.lat,_that.lng,_that.heading,_that.speed,_that.updatedAt,_that.crewFirstNames,_that.enRoute);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( double lat,  double lng,  double? heading,  double? speed, @JsonKey(name: 'updated_at')  String? updatedAt, @JsonKey(name: 'crew_first_names')  String? crewFirstNames,  bool enRoute)?  $default,) {final _that = this;
switch (_that) {
case _CrewLocation() when $default != null:
return $default(_that.lat,_that.lng,_that.heading,_that.speed,_that.updatedAt,_that.crewFirstNames,_that.enRoute);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _CrewLocation implements CrewLocation {
  const _CrewLocation({required this.lat, required this.lng, this.heading, this.speed, @JsonKey(name: 'updated_at') this.updatedAt, @JsonKey(name: 'crew_first_names') this.crewFirstNames, this.enRoute = false});
  factory _CrewLocation.fromJson(Map<String, dynamic> json) => _$CrewLocationFromJson(json);

@override final  double lat;
@override final  double lng;
@override final  double? heading;
@override final  double? speed;
@override@JsonKey(name: 'updated_at') final  String? updatedAt;
@override@JsonKey(name: 'crew_first_names') final  String? crewFirstNames;
@override@JsonKey() final  bool enRoute;

/// Create a copy of CrewLocation
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$CrewLocationCopyWith<_CrewLocation> get copyWith => __$CrewLocationCopyWithImpl<_CrewLocation>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$CrewLocationToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _CrewLocation&&(identical(other.lat, lat) || other.lat == lat)&&(identical(other.lng, lng) || other.lng == lng)&&(identical(other.heading, heading) || other.heading == heading)&&(identical(other.speed, speed) || other.speed == speed)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt)&&(identical(other.crewFirstNames, crewFirstNames) || other.crewFirstNames == crewFirstNames)&&(identical(other.enRoute, enRoute) || other.enRoute == enRoute));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,lat,lng,heading,speed,updatedAt,crewFirstNames,enRoute);

@override
String toString() {
  return 'CrewLocation(lat: $lat, lng: $lng, heading: $heading, speed: $speed, updatedAt: $updatedAt, crewFirstNames: $crewFirstNames, enRoute: $enRoute)';
}


}

/// @nodoc
abstract mixin class _$CrewLocationCopyWith<$Res> implements $CrewLocationCopyWith<$Res> {
  factory _$CrewLocationCopyWith(_CrewLocation value, $Res Function(_CrewLocation) _then) = __$CrewLocationCopyWithImpl;
@override @useResult
$Res call({
 double lat, double lng, double? heading, double? speed,@JsonKey(name: 'updated_at') String? updatedAt,@JsonKey(name: 'crew_first_names') String? crewFirstNames, bool enRoute
});




}
/// @nodoc
class __$CrewLocationCopyWithImpl<$Res>
    implements _$CrewLocationCopyWith<$Res> {
  __$CrewLocationCopyWithImpl(this._self, this._then);

  final _CrewLocation _self;
  final $Res Function(_CrewLocation) _then;

/// Create a copy of CrewLocation
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? lat = null,Object? lng = null,Object? heading = freezed,Object? speed = freezed,Object? updatedAt = freezed,Object? crewFirstNames = freezed,Object? enRoute = null,}) {
  return _then(_CrewLocation(
lat: null == lat ? _self.lat : lat // ignore: cast_nullable_to_non_nullable
as double,lng: null == lng ? _self.lng : lng // ignore: cast_nullable_to_non_nullable
as double,heading: freezed == heading ? _self.heading : heading // ignore: cast_nullable_to_non_nullable
as double?,speed: freezed == speed ? _self.speed : speed // ignore: cast_nullable_to_non_nullable
as double?,updatedAt: freezed == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as String?,crewFirstNames: freezed == crewFirstNames ? _self.crewFirstNames : crewFirstNames // ignore: cast_nullable_to_non_nullable
as String?,enRoute: null == enRoute ? _self.enRoute : enRoute // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}


}

// dart format on
