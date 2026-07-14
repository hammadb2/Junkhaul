// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'storage_facility.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$StorageFacility {

 String get id; String? get name; String? get address; double? get lat; double? get lng;@JsonKey(name: 'access_code') String? get accessCode;@JsonKey(name: 'capacity_sqft') double? get capacitySqft;@JsonKey(name: 'current_usage_pct') double? get currentUsagePct;
/// Create a copy of StorageFacility
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$StorageFacilityCopyWith<StorageFacility> get copyWith => _$StorageFacilityCopyWithImpl<StorageFacility>(this as StorageFacility, _$identity);

  /// Serializes this StorageFacility to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is StorageFacility&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.address, address) || other.address == address)&&(identical(other.lat, lat) || other.lat == lat)&&(identical(other.lng, lng) || other.lng == lng)&&(identical(other.accessCode, accessCode) || other.accessCode == accessCode)&&(identical(other.capacitySqft, capacitySqft) || other.capacitySqft == capacitySqft)&&(identical(other.currentUsagePct, currentUsagePct) || other.currentUsagePct == currentUsagePct));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,name,address,lat,lng,accessCode,capacitySqft,currentUsagePct);

@override
String toString() {
  return 'StorageFacility(id: $id, name: $name, address: $address, lat: $lat, lng: $lng, accessCode: $accessCode, capacitySqft: $capacitySqft, currentUsagePct: $currentUsagePct)';
}


}

/// @nodoc
abstract mixin class $StorageFacilityCopyWith<$Res>  {
  factory $StorageFacilityCopyWith(StorageFacility value, $Res Function(StorageFacility) _then) = _$StorageFacilityCopyWithImpl;
@useResult
$Res call({
 String id, String? name, String? address, double? lat, double? lng,@JsonKey(name: 'access_code') String? accessCode,@JsonKey(name: 'capacity_sqft') double? capacitySqft,@JsonKey(name: 'current_usage_pct') double? currentUsagePct
});




}
/// @nodoc
class _$StorageFacilityCopyWithImpl<$Res>
    implements $StorageFacilityCopyWith<$Res> {
  _$StorageFacilityCopyWithImpl(this._self, this._then);

  final StorageFacility _self;
  final $Res Function(StorageFacility) _then;

/// Create a copy of StorageFacility
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = freezed,Object? address = freezed,Object? lat = freezed,Object? lng = freezed,Object? accessCode = freezed,Object? capacitySqft = freezed,Object? currentUsagePct = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: freezed == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String?,address: freezed == address ? _self.address : address // ignore: cast_nullable_to_non_nullable
as String?,lat: freezed == lat ? _self.lat : lat // ignore: cast_nullable_to_non_nullable
as double?,lng: freezed == lng ? _self.lng : lng // ignore: cast_nullable_to_non_nullable
as double?,accessCode: freezed == accessCode ? _self.accessCode : accessCode // ignore: cast_nullable_to_non_nullable
as String?,capacitySqft: freezed == capacitySqft ? _self.capacitySqft : capacitySqft // ignore: cast_nullable_to_non_nullable
as double?,currentUsagePct: freezed == currentUsagePct ? _self.currentUsagePct : currentUsagePct // ignore: cast_nullable_to_non_nullable
as double?,
  ));
}

}


/// Adds pattern-matching-related methods to [StorageFacility].
extension StorageFacilityPatterns on StorageFacility {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _StorageFacility value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _StorageFacility() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _StorageFacility value)  $default,){
final _that = this;
switch (_that) {
case _StorageFacility():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _StorageFacility value)?  $default,){
final _that = this;
switch (_that) {
case _StorageFacility() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String? name,  String? address,  double? lat,  double? lng, @JsonKey(name: 'access_code')  String? accessCode, @JsonKey(name: 'capacity_sqft')  double? capacitySqft, @JsonKey(name: 'current_usage_pct')  double? currentUsagePct)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _StorageFacility() when $default != null:
return $default(_that.id,_that.name,_that.address,_that.lat,_that.lng,_that.accessCode,_that.capacitySqft,_that.currentUsagePct);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String? name,  String? address,  double? lat,  double? lng, @JsonKey(name: 'access_code')  String? accessCode, @JsonKey(name: 'capacity_sqft')  double? capacitySqft, @JsonKey(name: 'current_usage_pct')  double? currentUsagePct)  $default,) {final _that = this;
switch (_that) {
case _StorageFacility():
return $default(_that.id,_that.name,_that.address,_that.lat,_that.lng,_that.accessCode,_that.capacitySqft,_that.currentUsagePct);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String? name,  String? address,  double? lat,  double? lng, @JsonKey(name: 'access_code')  String? accessCode, @JsonKey(name: 'capacity_sqft')  double? capacitySqft, @JsonKey(name: 'current_usage_pct')  double? currentUsagePct)?  $default,) {final _that = this;
switch (_that) {
case _StorageFacility() when $default != null:
return $default(_that.id,_that.name,_that.address,_that.lat,_that.lng,_that.accessCode,_that.capacitySqft,_that.currentUsagePct);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _StorageFacility implements StorageFacility {
  const _StorageFacility({required this.id, this.name, this.address, this.lat, this.lng, @JsonKey(name: 'access_code') this.accessCode, @JsonKey(name: 'capacity_sqft') this.capacitySqft, @JsonKey(name: 'current_usage_pct') this.currentUsagePct});
  factory _StorageFacility.fromJson(Map<String, dynamic> json) => _$StorageFacilityFromJson(json);

@override final  String id;
@override final  String? name;
@override final  String? address;
@override final  double? lat;
@override final  double? lng;
@override@JsonKey(name: 'access_code') final  String? accessCode;
@override@JsonKey(name: 'capacity_sqft') final  double? capacitySqft;
@override@JsonKey(name: 'current_usage_pct') final  double? currentUsagePct;

/// Create a copy of StorageFacility
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$StorageFacilityCopyWith<_StorageFacility> get copyWith => __$StorageFacilityCopyWithImpl<_StorageFacility>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$StorageFacilityToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _StorageFacility&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.address, address) || other.address == address)&&(identical(other.lat, lat) || other.lat == lat)&&(identical(other.lng, lng) || other.lng == lng)&&(identical(other.accessCode, accessCode) || other.accessCode == accessCode)&&(identical(other.capacitySqft, capacitySqft) || other.capacitySqft == capacitySqft)&&(identical(other.currentUsagePct, currentUsagePct) || other.currentUsagePct == currentUsagePct));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,name,address,lat,lng,accessCode,capacitySqft,currentUsagePct);

@override
String toString() {
  return 'StorageFacility(id: $id, name: $name, address: $address, lat: $lat, lng: $lng, accessCode: $accessCode, capacitySqft: $capacitySqft, currentUsagePct: $currentUsagePct)';
}


}

/// @nodoc
abstract mixin class _$StorageFacilityCopyWith<$Res> implements $StorageFacilityCopyWith<$Res> {
  factory _$StorageFacilityCopyWith(_StorageFacility value, $Res Function(_StorageFacility) _then) = __$StorageFacilityCopyWithImpl;
@override @useResult
$Res call({
 String id, String? name, String? address, double? lat, double? lng,@JsonKey(name: 'access_code') String? accessCode,@JsonKey(name: 'capacity_sqft') double? capacitySqft,@JsonKey(name: 'current_usage_pct') double? currentUsagePct
});




}
/// @nodoc
class __$StorageFacilityCopyWithImpl<$Res>
    implements _$StorageFacilityCopyWith<$Res> {
  __$StorageFacilityCopyWithImpl(this._self, this._then);

  final _StorageFacility _self;
  final $Res Function(_StorageFacility) _then;

/// Create a copy of StorageFacility
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = freezed,Object? address = freezed,Object? lat = freezed,Object? lng = freezed,Object? accessCode = freezed,Object? capacitySqft = freezed,Object? currentUsagePct = freezed,}) {
  return _then(_StorageFacility(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: freezed == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String?,address: freezed == address ? _self.address : address // ignore: cast_nullable_to_non_nullable
as String?,lat: freezed == lat ? _self.lat : lat // ignore: cast_nullable_to_non_nullable
as double?,lng: freezed == lng ? _self.lng : lng // ignore: cast_nullable_to_non_nullable
as double?,accessCode: freezed == accessCode ? _self.accessCode : accessCode // ignore: cast_nullable_to_non_nullable
as String?,capacitySqft: freezed == capacitySqft ? _self.capacitySqft : capacitySqft // ignore: cast_nullable_to_non_nullable
as double?,currentUsagePct: freezed == currentUsagePct ? _self.currentUsagePct : currentUsagePct // ignore: cast_nullable_to_non_nullable
as double?,
  ));
}


}


/// @nodoc
mixin _$StorageFacilitiesResponse {

 List<StorageFacility> get facilities;
/// Create a copy of StorageFacilitiesResponse
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$StorageFacilitiesResponseCopyWith<StorageFacilitiesResponse> get copyWith => _$StorageFacilitiesResponseCopyWithImpl<StorageFacilitiesResponse>(this as StorageFacilitiesResponse, _$identity);

  /// Serializes this StorageFacilitiesResponse to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is StorageFacilitiesResponse&&const DeepCollectionEquality().equals(other.facilities, facilities));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,const DeepCollectionEquality().hash(facilities));

@override
String toString() {
  return 'StorageFacilitiesResponse(facilities: $facilities)';
}


}

/// @nodoc
abstract mixin class $StorageFacilitiesResponseCopyWith<$Res>  {
  factory $StorageFacilitiesResponseCopyWith(StorageFacilitiesResponse value, $Res Function(StorageFacilitiesResponse) _then) = _$StorageFacilitiesResponseCopyWithImpl;
@useResult
$Res call({
 List<StorageFacility> facilities
});




}
/// @nodoc
class _$StorageFacilitiesResponseCopyWithImpl<$Res>
    implements $StorageFacilitiesResponseCopyWith<$Res> {
  _$StorageFacilitiesResponseCopyWithImpl(this._self, this._then);

  final StorageFacilitiesResponse _self;
  final $Res Function(StorageFacilitiesResponse) _then;

/// Create a copy of StorageFacilitiesResponse
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? facilities = null,}) {
  return _then(_self.copyWith(
facilities: null == facilities ? _self.facilities : facilities // ignore: cast_nullable_to_non_nullable
as List<StorageFacility>,
  ));
}

}


/// Adds pattern-matching-related methods to [StorageFacilitiesResponse].
extension StorageFacilitiesResponsePatterns on StorageFacilitiesResponse {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _StorageFacilitiesResponse value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _StorageFacilitiesResponse() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _StorageFacilitiesResponse value)  $default,){
final _that = this;
switch (_that) {
case _StorageFacilitiesResponse():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _StorageFacilitiesResponse value)?  $default,){
final _that = this;
switch (_that) {
case _StorageFacilitiesResponse() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( List<StorageFacility> facilities)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _StorageFacilitiesResponse() when $default != null:
return $default(_that.facilities);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( List<StorageFacility> facilities)  $default,) {final _that = this;
switch (_that) {
case _StorageFacilitiesResponse():
return $default(_that.facilities);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( List<StorageFacility> facilities)?  $default,) {final _that = this;
switch (_that) {
case _StorageFacilitiesResponse() when $default != null:
return $default(_that.facilities);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _StorageFacilitiesResponse implements StorageFacilitiesResponse {
  const _StorageFacilitiesResponse({final  List<StorageFacility> facilities = const <StorageFacility>[]}): _facilities = facilities;
  factory _StorageFacilitiesResponse.fromJson(Map<String, dynamic> json) => _$StorageFacilitiesResponseFromJson(json);

 final  List<StorageFacility> _facilities;
@override@JsonKey() List<StorageFacility> get facilities {
  if (_facilities is EqualUnmodifiableListView) return _facilities;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_facilities);
}


/// Create a copy of StorageFacilitiesResponse
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$StorageFacilitiesResponseCopyWith<_StorageFacilitiesResponse> get copyWith => __$StorageFacilitiesResponseCopyWithImpl<_StorageFacilitiesResponse>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$StorageFacilitiesResponseToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _StorageFacilitiesResponse&&const DeepCollectionEquality().equals(other._facilities, _facilities));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,const DeepCollectionEquality().hash(_facilities));

@override
String toString() {
  return 'StorageFacilitiesResponse(facilities: $facilities)';
}


}

/// @nodoc
abstract mixin class _$StorageFacilitiesResponseCopyWith<$Res> implements $StorageFacilitiesResponseCopyWith<$Res> {
  factory _$StorageFacilitiesResponseCopyWith(_StorageFacilitiesResponse value, $Res Function(_StorageFacilitiesResponse) _then) = __$StorageFacilitiesResponseCopyWithImpl;
@override @useResult
$Res call({
 List<StorageFacility> facilities
});




}
/// @nodoc
class __$StorageFacilitiesResponseCopyWithImpl<$Res>
    implements _$StorageFacilitiesResponseCopyWith<$Res> {
  __$StorageFacilitiesResponseCopyWithImpl(this._self, this._then);

  final _StorageFacilitiesResponse _self;
  final $Res Function(_StorageFacilitiesResponse) _then;

/// Create a copy of StorageFacilitiesResponse
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? facilities = null,}) {
  return _then(_StorageFacilitiesResponse(
facilities: null == facilities ? _self._facilities : facilities // ignore: cast_nullable_to_non_nullable
as List<StorageFacility>,
  ));
}


}

// dart format on
