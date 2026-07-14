// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'landfill.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$Landfill {

 String get id; String? get name; String? get address; double? get lat; double? get lng;@JsonKey(name: 'open_time') String? get openTime;@JsonKey(name: 'close_time') String? get closeTime;@JsonKey(name: 'summer_only_sunday') bool? get summerOnlySunday;
/// Create a copy of Landfill
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$LandfillCopyWith<Landfill> get copyWith => _$LandfillCopyWithImpl<Landfill>(this as Landfill, _$identity);

  /// Serializes this Landfill to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Landfill&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.address, address) || other.address == address)&&(identical(other.lat, lat) || other.lat == lat)&&(identical(other.lng, lng) || other.lng == lng)&&(identical(other.openTime, openTime) || other.openTime == openTime)&&(identical(other.closeTime, closeTime) || other.closeTime == closeTime)&&(identical(other.summerOnlySunday, summerOnlySunday) || other.summerOnlySunday == summerOnlySunday));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,name,address,lat,lng,openTime,closeTime,summerOnlySunday);

@override
String toString() {
  return 'Landfill(id: $id, name: $name, address: $address, lat: $lat, lng: $lng, openTime: $openTime, closeTime: $closeTime, summerOnlySunday: $summerOnlySunday)';
}


}

/// @nodoc
abstract mixin class $LandfillCopyWith<$Res>  {
  factory $LandfillCopyWith(Landfill value, $Res Function(Landfill) _then) = _$LandfillCopyWithImpl;
@useResult
$Res call({
 String id, String? name, String? address, double? lat, double? lng,@JsonKey(name: 'open_time') String? openTime,@JsonKey(name: 'close_time') String? closeTime,@JsonKey(name: 'summer_only_sunday') bool? summerOnlySunday
});




}
/// @nodoc
class _$LandfillCopyWithImpl<$Res>
    implements $LandfillCopyWith<$Res> {
  _$LandfillCopyWithImpl(this._self, this._then);

  final Landfill _self;
  final $Res Function(Landfill) _then;

/// Create a copy of Landfill
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = freezed,Object? address = freezed,Object? lat = freezed,Object? lng = freezed,Object? openTime = freezed,Object? closeTime = freezed,Object? summerOnlySunday = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: freezed == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String?,address: freezed == address ? _self.address : address // ignore: cast_nullable_to_non_nullable
as String?,lat: freezed == lat ? _self.lat : lat // ignore: cast_nullable_to_non_nullable
as double?,lng: freezed == lng ? _self.lng : lng // ignore: cast_nullable_to_non_nullable
as double?,openTime: freezed == openTime ? _self.openTime : openTime // ignore: cast_nullable_to_non_nullable
as String?,closeTime: freezed == closeTime ? _self.closeTime : closeTime // ignore: cast_nullable_to_non_nullable
as String?,summerOnlySunday: freezed == summerOnlySunday ? _self.summerOnlySunday : summerOnlySunday // ignore: cast_nullable_to_non_nullable
as bool?,
  ));
}

}


/// Adds pattern-matching-related methods to [Landfill].
extension LandfillPatterns on Landfill {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _Landfill value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _Landfill() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _Landfill value)  $default,){
final _that = this;
switch (_that) {
case _Landfill():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _Landfill value)?  $default,){
final _that = this;
switch (_that) {
case _Landfill() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String? name,  String? address,  double? lat,  double? lng, @JsonKey(name: 'open_time')  String? openTime, @JsonKey(name: 'close_time')  String? closeTime, @JsonKey(name: 'summer_only_sunday')  bool? summerOnlySunday)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Landfill() when $default != null:
return $default(_that.id,_that.name,_that.address,_that.lat,_that.lng,_that.openTime,_that.closeTime,_that.summerOnlySunday);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String? name,  String? address,  double? lat,  double? lng, @JsonKey(name: 'open_time')  String? openTime, @JsonKey(name: 'close_time')  String? closeTime, @JsonKey(name: 'summer_only_sunday')  bool? summerOnlySunday)  $default,) {final _that = this;
switch (_that) {
case _Landfill():
return $default(_that.id,_that.name,_that.address,_that.lat,_that.lng,_that.openTime,_that.closeTime,_that.summerOnlySunday);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String? name,  String? address,  double? lat,  double? lng, @JsonKey(name: 'open_time')  String? openTime, @JsonKey(name: 'close_time')  String? closeTime, @JsonKey(name: 'summer_only_sunday')  bool? summerOnlySunday)?  $default,) {final _that = this;
switch (_that) {
case _Landfill() when $default != null:
return $default(_that.id,_that.name,_that.address,_that.lat,_that.lng,_that.openTime,_that.closeTime,_that.summerOnlySunday);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Landfill implements Landfill {
  const _Landfill({required this.id, this.name, this.address, this.lat, this.lng, @JsonKey(name: 'open_time') this.openTime, @JsonKey(name: 'close_time') this.closeTime, @JsonKey(name: 'summer_only_sunday') this.summerOnlySunday});
  factory _Landfill.fromJson(Map<String, dynamic> json) => _$LandfillFromJson(json);

@override final  String id;
@override final  String? name;
@override final  String? address;
@override final  double? lat;
@override final  double? lng;
@override@JsonKey(name: 'open_time') final  String? openTime;
@override@JsonKey(name: 'close_time') final  String? closeTime;
@override@JsonKey(name: 'summer_only_sunday') final  bool? summerOnlySunday;

/// Create a copy of Landfill
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$LandfillCopyWith<_Landfill> get copyWith => __$LandfillCopyWithImpl<_Landfill>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$LandfillToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _Landfill&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.address, address) || other.address == address)&&(identical(other.lat, lat) || other.lat == lat)&&(identical(other.lng, lng) || other.lng == lng)&&(identical(other.openTime, openTime) || other.openTime == openTime)&&(identical(other.closeTime, closeTime) || other.closeTime == closeTime)&&(identical(other.summerOnlySunday, summerOnlySunday) || other.summerOnlySunday == summerOnlySunday));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,name,address,lat,lng,openTime,closeTime,summerOnlySunday);

@override
String toString() {
  return 'Landfill(id: $id, name: $name, address: $address, lat: $lat, lng: $lng, openTime: $openTime, closeTime: $closeTime, summerOnlySunday: $summerOnlySunday)';
}


}

/// @nodoc
abstract mixin class _$LandfillCopyWith<$Res> implements $LandfillCopyWith<$Res> {
  factory _$LandfillCopyWith(_Landfill value, $Res Function(_Landfill) _then) = __$LandfillCopyWithImpl;
@override @useResult
$Res call({
 String id, String? name, String? address, double? lat, double? lng,@JsonKey(name: 'open_time') String? openTime,@JsonKey(name: 'close_time') String? closeTime,@JsonKey(name: 'summer_only_sunday') bool? summerOnlySunday
});




}
/// @nodoc
class __$LandfillCopyWithImpl<$Res>
    implements _$LandfillCopyWith<$Res> {
  __$LandfillCopyWithImpl(this._self, this._then);

  final _Landfill _self;
  final $Res Function(_Landfill) _then;

/// Create a copy of Landfill
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = freezed,Object? address = freezed,Object? lat = freezed,Object? lng = freezed,Object? openTime = freezed,Object? closeTime = freezed,Object? summerOnlySunday = freezed,}) {
  return _then(_Landfill(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: freezed == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String?,address: freezed == address ? _self.address : address // ignore: cast_nullable_to_non_nullable
as String?,lat: freezed == lat ? _self.lat : lat // ignore: cast_nullable_to_non_nullable
as double?,lng: freezed == lng ? _self.lng : lng // ignore: cast_nullable_to_non_nullable
as double?,openTime: freezed == openTime ? _self.openTime : openTime // ignore: cast_nullable_to_non_nullable
as String?,closeTime: freezed == closeTime ? _self.closeTime : closeTime // ignore: cast_nullable_to_non_nullable
as String?,summerOnlySunday: freezed == summerOnlySunday ? _self.summerOnlySunday : summerOnlySunday // ignore: cast_nullable_to_non_nullable
as bool?,
  ));
}


}


/// @nodoc
mixin _$LandfillResponse {

 Landfill? get recommended; List<Landfill> get all; List<String> get warnings;@JsonKey(name: 'day_of_week') String? get dayOfWeek;@JsonKey(name: 'is_sunday') bool get isSunday;
/// Create a copy of LandfillResponse
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$LandfillResponseCopyWith<LandfillResponse> get copyWith => _$LandfillResponseCopyWithImpl<LandfillResponse>(this as LandfillResponse, _$identity);

  /// Serializes this LandfillResponse to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is LandfillResponse&&(identical(other.recommended, recommended) || other.recommended == recommended)&&const DeepCollectionEquality().equals(other.all, all)&&const DeepCollectionEquality().equals(other.warnings, warnings)&&(identical(other.dayOfWeek, dayOfWeek) || other.dayOfWeek == dayOfWeek)&&(identical(other.isSunday, isSunday) || other.isSunday == isSunday));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,recommended,const DeepCollectionEquality().hash(all),const DeepCollectionEquality().hash(warnings),dayOfWeek,isSunday);

@override
String toString() {
  return 'LandfillResponse(recommended: $recommended, all: $all, warnings: $warnings, dayOfWeek: $dayOfWeek, isSunday: $isSunday)';
}


}

/// @nodoc
abstract mixin class $LandfillResponseCopyWith<$Res>  {
  factory $LandfillResponseCopyWith(LandfillResponse value, $Res Function(LandfillResponse) _then) = _$LandfillResponseCopyWithImpl;
@useResult
$Res call({
 Landfill? recommended, List<Landfill> all, List<String> warnings,@JsonKey(name: 'day_of_week') String? dayOfWeek,@JsonKey(name: 'is_sunday') bool isSunday
});


$LandfillCopyWith<$Res>? get recommended;

}
/// @nodoc
class _$LandfillResponseCopyWithImpl<$Res>
    implements $LandfillResponseCopyWith<$Res> {
  _$LandfillResponseCopyWithImpl(this._self, this._then);

  final LandfillResponse _self;
  final $Res Function(LandfillResponse) _then;

/// Create a copy of LandfillResponse
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? recommended = freezed,Object? all = null,Object? warnings = null,Object? dayOfWeek = freezed,Object? isSunday = null,}) {
  return _then(_self.copyWith(
recommended: freezed == recommended ? _self.recommended : recommended // ignore: cast_nullable_to_non_nullable
as Landfill?,all: null == all ? _self.all : all // ignore: cast_nullable_to_non_nullable
as List<Landfill>,warnings: null == warnings ? _self.warnings : warnings // ignore: cast_nullable_to_non_nullable
as List<String>,dayOfWeek: freezed == dayOfWeek ? _self.dayOfWeek : dayOfWeek // ignore: cast_nullable_to_non_nullable
as String?,isSunday: null == isSunday ? _self.isSunday : isSunday // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}
/// Create a copy of LandfillResponse
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$LandfillCopyWith<$Res>? get recommended {
    if (_self.recommended == null) {
    return null;
  }

  return $LandfillCopyWith<$Res>(_self.recommended!, (value) {
    return _then(_self.copyWith(recommended: value));
  });
}
}


/// Adds pattern-matching-related methods to [LandfillResponse].
extension LandfillResponsePatterns on LandfillResponse {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _LandfillResponse value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _LandfillResponse() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _LandfillResponse value)  $default,){
final _that = this;
switch (_that) {
case _LandfillResponse():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _LandfillResponse value)?  $default,){
final _that = this;
switch (_that) {
case _LandfillResponse() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( Landfill? recommended,  List<Landfill> all,  List<String> warnings, @JsonKey(name: 'day_of_week')  String? dayOfWeek, @JsonKey(name: 'is_sunday')  bool isSunday)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _LandfillResponse() when $default != null:
return $default(_that.recommended,_that.all,_that.warnings,_that.dayOfWeek,_that.isSunday);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( Landfill? recommended,  List<Landfill> all,  List<String> warnings, @JsonKey(name: 'day_of_week')  String? dayOfWeek, @JsonKey(name: 'is_sunday')  bool isSunday)  $default,) {final _that = this;
switch (_that) {
case _LandfillResponse():
return $default(_that.recommended,_that.all,_that.warnings,_that.dayOfWeek,_that.isSunday);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( Landfill? recommended,  List<Landfill> all,  List<String> warnings, @JsonKey(name: 'day_of_week')  String? dayOfWeek, @JsonKey(name: 'is_sunday')  bool isSunday)?  $default,) {final _that = this;
switch (_that) {
case _LandfillResponse() when $default != null:
return $default(_that.recommended,_that.all,_that.warnings,_that.dayOfWeek,_that.isSunday);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _LandfillResponse implements LandfillResponse {
  const _LandfillResponse({this.recommended, final  List<Landfill> all = const <Landfill>[], final  List<String> warnings = const <String>[], @JsonKey(name: 'day_of_week') this.dayOfWeek, @JsonKey(name: 'is_sunday') this.isSunday = false}): _all = all,_warnings = warnings;
  factory _LandfillResponse.fromJson(Map<String, dynamic> json) => _$LandfillResponseFromJson(json);

@override final  Landfill? recommended;
 final  List<Landfill> _all;
@override@JsonKey() List<Landfill> get all {
  if (_all is EqualUnmodifiableListView) return _all;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_all);
}

 final  List<String> _warnings;
@override@JsonKey() List<String> get warnings {
  if (_warnings is EqualUnmodifiableListView) return _warnings;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_warnings);
}

@override@JsonKey(name: 'day_of_week') final  String? dayOfWeek;
@override@JsonKey(name: 'is_sunday') final  bool isSunday;

/// Create a copy of LandfillResponse
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$LandfillResponseCopyWith<_LandfillResponse> get copyWith => __$LandfillResponseCopyWithImpl<_LandfillResponse>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$LandfillResponseToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _LandfillResponse&&(identical(other.recommended, recommended) || other.recommended == recommended)&&const DeepCollectionEquality().equals(other._all, _all)&&const DeepCollectionEquality().equals(other._warnings, _warnings)&&(identical(other.dayOfWeek, dayOfWeek) || other.dayOfWeek == dayOfWeek)&&(identical(other.isSunday, isSunday) || other.isSunday == isSunday));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,recommended,const DeepCollectionEquality().hash(_all),const DeepCollectionEquality().hash(_warnings),dayOfWeek,isSunday);

@override
String toString() {
  return 'LandfillResponse(recommended: $recommended, all: $all, warnings: $warnings, dayOfWeek: $dayOfWeek, isSunday: $isSunday)';
}


}

/// @nodoc
abstract mixin class _$LandfillResponseCopyWith<$Res> implements $LandfillResponseCopyWith<$Res> {
  factory _$LandfillResponseCopyWith(_LandfillResponse value, $Res Function(_LandfillResponse) _then) = __$LandfillResponseCopyWithImpl;
@override @useResult
$Res call({
 Landfill? recommended, List<Landfill> all, List<String> warnings,@JsonKey(name: 'day_of_week') String? dayOfWeek,@JsonKey(name: 'is_sunday') bool isSunday
});


@override $LandfillCopyWith<$Res>? get recommended;

}
/// @nodoc
class __$LandfillResponseCopyWithImpl<$Res>
    implements _$LandfillResponseCopyWith<$Res> {
  __$LandfillResponseCopyWithImpl(this._self, this._then);

  final _LandfillResponse _self;
  final $Res Function(_LandfillResponse) _then;

/// Create a copy of LandfillResponse
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? recommended = freezed,Object? all = null,Object? warnings = null,Object? dayOfWeek = freezed,Object? isSunday = null,}) {
  return _then(_LandfillResponse(
recommended: freezed == recommended ? _self.recommended : recommended // ignore: cast_nullable_to_non_nullable
as Landfill?,all: null == all ? _self._all : all // ignore: cast_nullable_to_non_nullable
as List<Landfill>,warnings: null == warnings ? _self._warnings : warnings // ignore: cast_nullable_to_non_nullable
as List<String>,dayOfWeek: freezed == dayOfWeek ? _self.dayOfWeek : dayOfWeek // ignore: cast_nullable_to_non_nullable
as String?,isSunday: null == isSunday ? _self.isSunday : isSunday // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

/// Create a copy of LandfillResponse
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$LandfillCopyWith<$Res>? get recommended {
    if (_self.recommended == null) {
    return null;
  }

  return $LandfillCopyWith<$Res>(_self.recommended!, (value) {
    return _then(_self.copyWith(recommended: value));
  });
}
}

// dart format on
