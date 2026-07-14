// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'incident.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$Incident {

 String get id;@JsonKey(name: 'booking_id') String? get bookingId;@JsonKey(name: 'incident_type') String? get incidentType; String? get severity; String? get description; String? get location;@JsonKey(name: 'photo_urls') List<String> get photoUrls;@JsonKey(name: 'reported_to') String? get reportedTo;@JsonKey(name: 'created_at') String? get createdAt;
/// Create a copy of Incident
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$IncidentCopyWith<Incident> get copyWith => _$IncidentCopyWithImpl<Incident>(this as Incident, _$identity);

  /// Serializes this Incident to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Incident&&(identical(other.id, id) || other.id == id)&&(identical(other.bookingId, bookingId) || other.bookingId == bookingId)&&(identical(other.incidentType, incidentType) || other.incidentType == incidentType)&&(identical(other.severity, severity) || other.severity == severity)&&(identical(other.description, description) || other.description == description)&&(identical(other.location, location) || other.location == location)&&const DeepCollectionEquality().equals(other.photoUrls, photoUrls)&&(identical(other.reportedTo, reportedTo) || other.reportedTo == reportedTo)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,bookingId,incidentType,severity,description,location,const DeepCollectionEquality().hash(photoUrls),reportedTo,createdAt);

@override
String toString() {
  return 'Incident(id: $id, bookingId: $bookingId, incidentType: $incidentType, severity: $severity, description: $description, location: $location, photoUrls: $photoUrls, reportedTo: $reportedTo, createdAt: $createdAt)';
}


}

/// @nodoc
abstract mixin class $IncidentCopyWith<$Res>  {
  factory $IncidentCopyWith(Incident value, $Res Function(Incident) _then) = _$IncidentCopyWithImpl;
@useResult
$Res call({
 String id,@JsonKey(name: 'booking_id') String? bookingId,@JsonKey(name: 'incident_type') String? incidentType, String? severity, String? description, String? location,@JsonKey(name: 'photo_urls') List<String> photoUrls,@JsonKey(name: 'reported_to') String? reportedTo,@JsonKey(name: 'created_at') String? createdAt
});




}
/// @nodoc
class _$IncidentCopyWithImpl<$Res>
    implements $IncidentCopyWith<$Res> {
  _$IncidentCopyWithImpl(this._self, this._then);

  final Incident _self;
  final $Res Function(Incident) _then;

/// Create a copy of Incident
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? bookingId = freezed,Object? incidentType = freezed,Object? severity = freezed,Object? description = freezed,Object? location = freezed,Object? photoUrls = null,Object? reportedTo = freezed,Object? createdAt = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,bookingId: freezed == bookingId ? _self.bookingId : bookingId // ignore: cast_nullable_to_non_nullable
as String?,incidentType: freezed == incidentType ? _self.incidentType : incidentType // ignore: cast_nullable_to_non_nullable
as String?,severity: freezed == severity ? _self.severity : severity // ignore: cast_nullable_to_non_nullable
as String?,description: freezed == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String?,location: freezed == location ? _self.location : location // ignore: cast_nullable_to_non_nullable
as String?,photoUrls: null == photoUrls ? _self.photoUrls : photoUrls // ignore: cast_nullable_to_non_nullable
as List<String>,reportedTo: freezed == reportedTo ? _self.reportedTo : reportedTo // ignore: cast_nullable_to_non_nullable
as String?,createdAt: freezed == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [Incident].
extension IncidentPatterns on Incident {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _Incident value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _Incident() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _Incident value)  $default,){
final _that = this;
switch (_that) {
case _Incident():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _Incident value)?  $default,){
final _that = this;
switch (_that) {
case _Incident() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id, @JsonKey(name: 'booking_id')  String? bookingId, @JsonKey(name: 'incident_type')  String? incidentType,  String? severity,  String? description,  String? location, @JsonKey(name: 'photo_urls')  List<String> photoUrls, @JsonKey(name: 'reported_to')  String? reportedTo, @JsonKey(name: 'created_at')  String? createdAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Incident() when $default != null:
return $default(_that.id,_that.bookingId,_that.incidentType,_that.severity,_that.description,_that.location,_that.photoUrls,_that.reportedTo,_that.createdAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id, @JsonKey(name: 'booking_id')  String? bookingId, @JsonKey(name: 'incident_type')  String? incidentType,  String? severity,  String? description,  String? location, @JsonKey(name: 'photo_urls')  List<String> photoUrls, @JsonKey(name: 'reported_to')  String? reportedTo, @JsonKey(name: 'created_at')  String? createdAt)  $default,) {final _that = this;
switch (_that) {
case _Incident():
return $default(_that.id,_that.bookingId,_that.incidentType,_that.severity,_that.description,_that.location,_that.photoUrls,_that.reportedTo,_that.createdAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id, @JsonKey(name: 'booking_id')  String? bookingId, @JsonKey(name: 'incident_type')  String? incidentType,  String? severity,  String? description,  String? location, @JsonKey(name: 'photo_urls')  List<String> photoUrls, @JsonKey(name: 'reported_to')  String? reportedTo, @JsonKey(name: 'created_at')  String? createdAt)?  $default,) {final _that = this;
switch (_that) {
case _Incident() when $default != null:
return $default(_that.id,_that.bookingId,_that.incidentType,_that.severity,_that.description,_that.location,_that.photoUrls,_that.reportedTo,_that.createdAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Incident implements Incident {
  const _Incident({required this.id, @JsonKey(name: 'booking_id') this.bookingId, @JsonKey(name: 'incident_type') this.incidentType, this.severity, this.description, this.location, @JsonKey(name: 'photo_urls') final  List<String> photoUrls = const <String>[], @JsonKey(name: 'reported_to') this.reportedTo, @JsonKey(name: 'created_at') this.createdAt}): _photoUrls = photoUrls;
  factory _Incident.fromJson(Map<String, dynamic> json) => _$IncidentFromJson(json);

@override final  String id;
@override@JsonKey(name: 'booking_id') final  String? bookingId;
@override@JsonKey(name: 'incident_type') final  String? incidentType;
@override final  String? severity;
@override final  String? description;
@override final  String? location;
 final  List<String> _photoUrls;
@override@JsonKey(name: 'photo_urls') List<String> get photoUrls {
  if (_photoUrls is EqualUnmodifiableListView) return _photoUrls;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_photoUrls);
}

@override@JsonKey(name: 'reported_to') final  String? reportedTo;
@override@JsonKey(name: 'created_at') final  String? createdAt;

/// Create a copy of Incident
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$IncidentCopyWith<_Incident> get copyWith => __$IncidentCopyWithImpl<_Incident>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$IncidentToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _Incident&&(identical(other.id, id) || other.id == id)&&(identical(other.bookingId, bookingId) || other.bookingId == bookingId)&&(identical(other.incidentType, incidentType) || other.incidentType == incidentType)&&(identical(other.severity, severity) || other.severity == severity)&&(identical(other.description, description) || other.description == description)&&(identical(other.location, location) || other.location == location)&&const DeepCollectionEquality().equals(other._photoUrls, _photoUrls)&&(identical(other.reportedTo, reportedTo) || other.reportedTo == reportedTo)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,bookingId,incidentType,severity,description,location,const DeepCollectionEquality().hash(_photoUrls),reportedTo,createdAt);

@override
String toString() {
  return 'Incident(id: $id, bookingId: $bookingId, incidentType: $incidentType, severity: $severity, description: $description, location: $location, photoUrls: $photoUrls, reportedTo: $reportedTo, createdAt: $createdAt)';
}


}

/// @nodoc
abstract mixin class _$IncidentCopyWith<$Res> implements $IncidentCopyWith<$Res> {
  factory _$IncidentCopyWith(_Incident value, $Res Function(_Incident) _then) = __$IncidentCopyWithImpl;
@override @useResult
$Res call({
 String id,@JsonKey(name: 'booking_id') String? bookingId,@JsonKey(name: 'incident_type') String? incidentType, String? severity, String? description, String? location,@JsonKey(name: 'photo_urls') List<String> photoUrls,@JsonKey(name: 'reported_to') String? reportedTo,@JsonKey(name: 'created_at') String? createdAt
});




}
/// @nodoc
class __$IncidentCopyWithImpl<$Res>
    implements _$IncidentCopyWith<$Res> {
  __$IncidentCopyWithImpl(this._self, this._then);

  final _Incident _self;
  final $Res Function(_Incident) _then;

/// Create a copy of Incident
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? bookingId = freezed,Object? incidentType = freezed,Object? severity = freezed,Object? description = freezed,Object? location = freezed,Object? photoUrls = null,Object? reportedTo = freezed,Object? createdAt = freezed,}) {
  return _then(_Incident(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,bookingId: freezed == bookingId ? _self.bookingId : bookingId // ignore: cast_nullable_to_non_nullable
as String?,incidentType: freezed == incidentType ? _self.incidentType : incidentType // ignore: cast_nullable_to_non_nullable
as String?,severity: freezed == severity ? _self.severity : severity // ignore: cast_nullable_to_non_nullable
as String?,description: freezed == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String?,location: freezed == location ? _self.location : location // ignore: cast_nullable_to_non_nullable
as String?,photoUrls: null == photoUrls ? _self._photoUrls : photoUrls // ignore: cast_nullable_to_non_nullable
as List<String>,reportedTo: freezed == reportedTo ? _self.reportedTo : reportedTo // ignore: cast_nullable_to_non_nullable
as String?,createdAt: freezed == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$IncidentsResponse {

 List<Incident> get incidents;
/// Create a copy of IncidentsResponse
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$IncidentsResponseCopyWith<IncidentsResponse> get copyWith => _$IncidentsResponseCopyWithImpl<IncidentsResponse>(this as IncidentsResponse, _$identity);

  /// Serializes this IncidentsResponse to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is IncidentsResponse&&const DeepCollectionEquality().equals(other.incidents, incidents));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,const DeepCollectionEquality().hash(incidents));

@override
String toString() {
  return 'IncidentsResponse(incidents: $incidents)';
}


}

/// @nodoc
abstract mixin class $IncidentsResponseCopyWith<$Res>  {
  factory $IncidentsResponseCopyWith(IncidentsResponse value, $Res Function(IncidentsResponse) _then) = _$IncidentsResponseCopyWithImpl;
@useResult
$Res call({
 List<Incident> incidents
});




}
/// @nodoc
class _$IncidentsResponseCopyWithImpl<$Res>
    implements $IncidentsResponseCopyWith<$Res> {
  _$IncidentsResponseCopyWithImpl(this._self, this._then);

  final IncidentsResponse _self;
  final $Res Function(IncidentsResponse) _then;

/// Create a copy of IncidentsResponse
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? incidents = null,}) {
  return _then(_self.copyWith(
incidents: null == incidents ? _self.incidents : incidents // ignore: cast_nullable_to_non_nullable
as List<Incident>,
  ));
}

}


/// Adds pattern-matching-related methods to [IncidentsResponse].
extension IncidentsResponsePatterns on IncidentsResponse {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _IncidentsResponse value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _IncidentsResponse() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _IncidentsResponse value)  $default,){
final _that = this;
switch (_that) {
case _IncidentsResponse():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _IncidentsResponse value)?  $default,){
final _that = this;
switch (_that) {
case _IncidentsResponse() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( List<Incident> incidents)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _IncidentsResponse() when $default != null:
return $default(_that.incidents);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( List<Incident> incidents)  $default,) {final _that = this;
switch (_that) {
case _IncidentsResponse():
return $default(_that.incidents);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( List<Incident> incidents)?  $default,) {final _that = this;
switch (_that) {
case _IncidentsResponse() when $default != null:
return $default(_that.incidents);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _IncidentsResponse implements IncidentsResponse {
  const _IncidentsResponse({final  List<Incident> incidents = const <Incident>[]}): _incidents = incidents;
  factory _IncidentsResponse.fromJson(Map<String, dynamic> json) => _$IncidentsResponseFromJson(json);

 final  List<Incident> _incidents;
@override@JsonKey() List<Incident> get incidents {
  if (_incidents is EqualUnmodifiableListView) return _incidents;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_incidents);
}


/// Create a copy of IncidentsResponse
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$IncidentsResponseCopyWith<_IncidentsResponse> get copyWith => __$IncidentsResponseCopyWithImpl<_IncidentsResponse>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$IncidentsResponseToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _IncidentsResponse&&const DeepCollectionEquality().equals(other._incidents, _incidents));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,const DeepCollectionEquality().hash(_incidents));

@override
String toString() {
  return 'IncidentsResponse(incidents: $incidents)';
}


}

/// @nodoc
abstract mixin class _$IncidentsResponseCopyWith<$Res> implements $IncidentsResponseCopyWith<$Res> {
  factory _$IncidentsResponseCopyWith(_IncidentsResponse value, $Res Function(_IncidentsResponse) _then) = __$IncidentsResponseCopyWithImpl;
@override @useResult
$Res call({
 List<Incident> incidents
});




}
/// @nodoc
class __$IncidentsResponseCopyWithImpl<$Res>
    implements _$IncidentsResponseCopyWith<$Res> {
  __$IncidentsResponseCopyWithImpl(this._self, this._then);

  final _IncidentsResponse _self;
  final $Res Function(_IncidentsResponse) _then;

/// Create a copy of IncidentsResponse
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? incidents = null,}) {
  return _then(_IncidentsResponse(
incidents: null == incidents ? _self._incidents : incidents // ignore: cast_nullable_to_non_nullable
as List<Incident>,
  ));
}


}

// dart format on
