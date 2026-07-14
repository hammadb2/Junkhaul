// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'truck_check.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$TruckCheck {

 String get id;@JsonKey(name: 'assignment_id') String? get assignmentId;@JsonKey(name: 'check_type') String? get checkType;@JsonKey(name: 'dashboard_photo_url') String? get dashboardPhotoUrl;@JsonKey(name: 'odometer_km') double? get odometerKm;@JsonKey(name: 'fuel_level') String? get fuelLevel;@JsonKey(name: 'fuel_percent') double? get fuelPercent;@JsonKey(name: 'truck_photos') List<String> get truckPhotos;@JsonKey(name: 'damage_notes') String? get damageNotes;@JsonKey(name: 'gas_receipt_url') String? get gasReceiptUrl;@JsonKey(name: 'gas_amount_cad') double? get gasAmountCad;@JsonKey(name: 'gas_station') String? get gasStation;@JsonKey(name: 'created_at') String? get createdAt;
/// Create a copy of TruckCheck
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$TruckCheckCopyWith<TruckCheck> get copyWith => _$TruckCheckCopyWithImpl<TruckCheck>(this as TruckCheck, _$identity);

  /// Serializes this TruckCheck to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is TruckCheck&&(identical(other.id, id) || other.id == id)&&(identical(other.assignmentId, assignmentId) || other.assignmentId == assignmentId)&&(identical(other.checkType, checkType) || other.checkType == checkType)&&(identical(other.dashboardPhotoUrl, dashboardPhotoUrl) || other.dashboardPhotoUrl == dashboardPhotoUrl)&&(identical(other.odometerKm, odometerKm) || other.odometerKm == odometerKm)&&(identical(other.fuelLevel, fuelLevel) || other.fuelLevel == fuelLevel)&&(identical(other.fuelPercent, fuelPercent) || other.fuelPercent == fuelPercent)&&const DeepCollectionEquality().equals(other.truckPhotos, truckPhotos)&&(identical(other.damageNotes, damageNotes) || other.damageNotes == damageNotes)&&(identical(other.gasReceiptUrl, gasReceiptUrl) || other.gasReceiptUrl == gasReceiptUrl)&&(identical(other.gasAmountCad, gasAmountCad) || other.gasAmountCad == gasAmountCad)&&(identical(other.gasStation, gasStation) || other.gasStation == gasStation)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,assignmentId,checkType,dashboardPhotoUrl,odometerKm,fuelLevel,fuelPercent,const DeepCollectionEquality().hash(truckPhotos),damageNotes,gasReceiptUrl,gasAmountCad,gasStation,createdAt);

@override
String toString() {
  return 'TruckCheck(id: $id, assignmentId: $assignmentId, checkType: $checkType, dashboardPhotoUrl: $dashboardPhotoUrl, odometerKm: $odometerKm, fuelLevel: $fuelLevel, fuelPercent: $fuelPercent, truckPhotos: $truckPhotos, damageNotes: $damageNotes, gasReceiptUrl: $gasReceiptUrl, gasAmountCad: $gasAmountCad, gasStation: $gasStation, createdAt: $createdAt)';
}


}

/// @nodoc
abstract mixin class $TruckCheckCopyWith<$Res>  {
  factory $TruckCheckCopyWith(TruckCheck value, $Res Function(TruckCheck) _then) = _$TruckCheckCopyWithImpl;
@useResult
$Res call({
 String id,@JsonKey(name: 'assignment_id') String? assignmentId,@JsonKey(name: 'check_type') String? checkType,@JsonKey(name: 'dashboard_photo_url') String? dashboardPhotoUrl,@JsonKey(name: 'odometer_km') double? odometerKm,@JsonKey(name: 'fuel_level') String? fuelLevel,@JsonKey(name: 'fuel_percent') double? fuelPercent,@JsonKey(name: 'truck_photos') List<String> truckPhotos,@JsonKey(name: 'damage_notes') String? damageNotes,@JsonKey(name: 'gas_receipt_url') String? gasReceiptUrl,@JsonKey(name: 'gas_amount_cad') double? gasAmountCad,@JsonKey(name: 'gas_station') String? gasStation,@JsonKey(name: 'created_at') String? createdAt
});




}
/// @nodoc
class _$TruckCheckCopyWithImpl<$Res>
    implements $TruckCheckCopyWith<$Res> {
  _$TruckCheckCopyWithImpl(this._self, this._then);

  final TruckCheck _self;
  final $Res Function(TruckCheck) _then;

/// Create a copy of TruckCheck
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? assignmentId = freezed,Object? checkType = freezed,Object? dashboardPhotoUrl = freezed,Object? odometerKm = freezed,Object? fuelLevel = freezed,Object? fuelPercent = freezed,Object? truckPhotos = null,Object? damageNotes = freezed,Object? gasReceiptUrl = freezed,Object? gasAmountCad = freezed,Object? gasStation = freezed,Object? createdAt = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,assignmentId: freezed == assignmentId ? _self.assignmentId : assignmentId // ignore: cast_nullable_to_non_nullable
as String?,checkType: freezed == checkType ? _self.checkType : checkType // ignore: cast_nullable_to_non_nullable
as String?,dashboardPhotoUrl: freezed == dashboardPhotoUrl ? _self.dashboardPhotoUrl : dashboardPhotoUrl // ignore: cast_nullable_to_non_nullable
as String?,odometerKm: freezed == odometerKm ? _self.odometerKm : odometerKm // ignore: cast_nullable_to_non_nullable
as double?,fuelLevel: freezed == fuelLevel ? _self.fuelLevel : fuelLevel // ignore: cast_nullable_to_non_nullable
as String?,fuelPercent: freezed == fuelPercent ? _self.fuelPercent : fuelPercent // ignore: cast_nullable_to_non_nullable
as double?,truckPhotos: null == truckPhotos ? _self.truckPhotos : truckPhotos // ignore: cast_nullable_to_non_nullable
as List<String>,damageNotes: freezed == damageNotes ? _self.damageNotes : damageNotes // ignore: cast_nullable_to_non_nullable
as String?,gasReceiptUrl: freezed == gasReceiptUrl ? _self.gasReceiptUrl : gasReceiptUrl // ignore: cast_nullable_to_non_nullable
as String?,gasAmountCad: freezed == gasAmountCad ? _self.gasAmountCad : gasAmountCad // ignore: cast_nullable_to_non_nullable
as double?,gasStation: freezed == gasStation ? _self.gasStation : gasStation // ignore: cast_nullable_to_non_nullable
as String?,createdAt: freezed == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [TruckCheck].
extension TruckCheckPatterns on TruckCheck {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _TruckCheck value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _TruckCheck() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _TruckCheck value)  $default,){
final _that = this;
switch (_that) {
case _TruckCheck():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _TruckCheck value)?  $default,){
final _that = this;
switch (_that) {
case _TruckCheck() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id, @JsonKey(name: 'assignment_id')  String? assignmentId, @JsonKey(name: 'check_type')  String? checkType, @JsonKey(name: 'dashboard_photo_url')  String? dashboardPhotoUrl, @JsonKey(name: 'odometer_km')  double? odometerKm, @JsonKey(name: 'fuel_level')  String? fuelLevel, @JsonKey(name: 'fuel_percent')  double? fuelPercent, @JsonKey(name: 'truck_photos')  List<String> truckPhotos, @JsonKey(name: 'damage_notes')  String? damageNotes, @JsonKey(name: 'gas_receipt_url')  String? gasReceiptUrl, @JsonKey(name: 'gas_amount_cad')  double? gasAmountCad, @JsonKey(name: 'gas_station')  String? gasStation, @JsonKey(name: 'created_at')  String? createdAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _TruckCheck() when $default != null:
return $default(_that.id,_that.assignmentId,_that.checkType,_that.dashboardPhotoUrl,_that.odometerKm,_that.fuelLevel,_that.fuelPercent,_that.truckPhotos,_that.damageNotes,_that.gasReceiptUrl,_that.gasAmountCad,_that.gasStation,_that.createdAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id, @JsonKey(name: 'assignment_id')  String? assignmentId, @JsonKey(name: 'check_type')  String? checkType, @JsonKey(name: 'dashboard_photo_url')  String? dashboardPhotoUrl, @JsonKey(name: 'odometer_km')  double? odometerKm, @JsonKey(name: 'fuel_level')  String? fuelLevel, @JsonKey(name: 'fuel_percent')  double? fuelPercent, @JsonKey(name: 'truck_photos')  List<String> truckPhotos, @JsonKey(name: 'damage_notes')  String? damageNotes, @JsonKey(name: 'gas_receipt_url')  String? gasReceiptUrl, @JsonKey(name: 'gas_amount_cad')  double? gasAmountCad, @JsonKey(name: 'gas_station')  String? gasStation, @JsonKey(name: 'created_at')  String? createdAt)  $default,) {final _that = this;
switch (_that) {
case _TruckCheck():
return $default(_that.id,_that.assignmentId,_that.checkType,_that.dashboardPhotoUrl,_that.odometerKm,_that.fuelLevel,_that.fuelPercent,_that.truckPhotos,_that.damageNotes,_that.gasReceiptUrl,_that.gasAmountCad,_that.gasStation,_that.createdAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id, @JsonKey(name: 'assignment_id')  String? assignmentId, @JsonKey(name: 'check_type')  String? checkType, @JsonKey(name: 'dashboard_photo_url')  String? dashboardPhotoUrl, @JsonKey(name: 'odometer_km')  double? odometerKm, @JsonKey(name: 'fuel_level')  String? fuelLevel, @JsonKey(name: 'fuel_percent')  double? fuelPercent, @JsonKey(name: 'truck_photos')  List<String> truckPhotos, @JsonKey(name: 'damage_notes')  String? damageNotes, @JsonKey(name: 'gas_receipt_url')  String? gasReceiptUrl, @JsonKey(name: 'gas_amount_cad')  double? gasAmountCad, @JsonKey(name: 'gas_station')  String? gasStation, @JsonKey(name: 'created_at')  String? createdAt)?  $default,) {final _that = this;
switch (_that) {
case _TruckCheck() when $default != null:
return $default(_that.id,_that.assignmentId,_that.checkType,_that.dashboardPhotoUrl,_that.odometerKm,_that.fuelLevel,_that.fuelPercent,_that.truckPhotos,_that.damageNotes,_that.gasReceiptUrl,_that.gasAmountCad,_that.gasStation,_that.createdAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _TruckCheck implements TruckCheck {
  const _TruckCheck({required this.id, @JsonKey(name: 'assignment_id') this.assignmentId, @JsonKey(name: 'check_type') this.checkType, @JsonKey(name: 'dashboard_photo_url') this.dashboardPhotoUrl, @JsonKey(name: 'odometer_km') this.odometerKm, @JsonKey(name: 'fuel_level') this.fuelLevel, @JsonKey(name: 'fuel_percent') this.fuelPercent, @JsonKey(name: 'truck_photos') final  List<String> truckPhotos = const <String>[], @JsonKey(name: 'damage_notes') this.damageNotes, @JsonKey(name: 'gas_receipt_url') this.gasReceiptUrl, @JsonKey(name: 'gas_amount_cad') this.gasAmountCad, @JsonKey(name: 'gas_station') this.gasStation, @JsonKey(name: 'created_at') this.createdAt}): _truckPhotos = truckPhotos;
  factory _TruckCheck.fromJson(Map<String, dynamic> json) => _$TruckCheckFromJson(json);

@override final  String id;
@override@JsonKey(name: 'assignment_id') final  String? assignmentId;
@override@JsonKey(name: 'check_type') final  String? checkType;
@override@JsonKey(name: 'dashboard_photo_url') final  String? dashboardPhotoUrl;
@override@JsonKey(name: 'odometer_km') final  double? odometerKm;
@override@JsonKey(name: 'fuel_level') final  String? fuelLevel;
@override@JsonKey(name: 'fuel_percent') final  double? fuelPercent;
 final  List<String> _truckPhotos;
@override@JsonKey(name: 'truck_photos') List<String> get truckPhotos {
  if (_truckPhotos is EqualUnmodifiableListView) return _truckPhotos;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_truckPhotos);
}

@override@JsonKey(name: 'damage_notes') final  String? damageNotes;
@override@JsonKey(name: 'gas_receipt_url') final  String? gasReceiptUrl;
@override@JsonKey(name: 'gas_amount_cad') final  double? gasAmountCad;
@override@JsonKey(name: 'gas_station') final  String? gasStation;
@override@JsonKey(name: 'created_at') final  String? createdAt;

/// Create a copy of TruckCheck
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$TruckCheckCopyWith<_TruckCheck> get copyWith => __$TruckCheckCopyWithImpl<_TruckCheck>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$TruckCheckToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _TruckCheck&&(identical(other.id, id) || other.id == id)&&(identical(other.assignmentId, assignmentId) || other.assignmentId == assignmentId)&&(identical(other.checkType, checkType) || other.checkType == checkType)&&(identical(other.dashboardPhotoUrl, dashboardPhotoUrl) || other.dashboardPhotoUrl == dashboardPhotoUrl)&&(identical(other.odometerKm, odometerKm) || other.odometerKm == odometerKm)&&(identical(other.fuelLevel, fuelLevel) || other.fuelLevel == fuelLevel)&&(identical(other.fuelPercent, fuelPercent) || other.fuelPercent == fuelPercent)&&const DeepCollectionEquality().equals(other._truckPhotos, _truckPhotos)&&(identical(other.damageNotes, damageNotes) || other.damageNotes == damageNotes)&&(identical(other.gasReceiptUrl, gasReceiptUrl) || other.gasReceiptUrl == gasReceiptUrl)&&(identical(other.gasAmountCad, gasAmountCad) || other.gasAmountCad == gasAmountCad)&&(identical(other.gasStation, gasStation) || other.gasStation == gasStation)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,assignmentId,checkType,dashboardPhotoUrl,odometerKm,fuelLevel,fuelPercent,const DeepCollectionEquality().hash(_truckPhotos),damageNotes,gasReceiptUrl,gasAmountCad,gasStation,createdAt);

@override
String toString() {
  return 'TruckCheck(id: $id, assignmentId: $assignmentId, checkType: $checkType, dashboardPhotoUrl: $dashboardPhotoUrl, odometerKm: $odometerKm, fuelLevel: $fuelLevel, fuelPercent: $fuelPercent, truckPhotos: $truckPhotos, damageNotes: $damageNotes, gasReceiptUrl: $gasReceiptUrl, gasAmountCad: $gasAmountCad, gasStation: $gasStation, createdAt: $createdAt)';
}


}

/// @nodoc
abstract mixin class _$TruckCheckCopyWith<$Res> implements $TruckCheckCopyWith<$Res> {
  factory _$TruckCheckCopyWith(_TruckCheck value, $Res Function(_TruckCheck) _then) = __$TruckCheckCopyWithImpl;
@override @useResult
$Res call({
 String id,@JsonKey(name: 'assignment_id') String? assignmentId,@JsonKey(name: 'check_type') String? checkType,@JsonKey(name: 'dashboard_photo_url') String? dashboardPhotoUrl,@JsonKey(name: 'odometer_km') double? odometerKm,@JsonKey(name: 'fuel_level') String? fuelLevel,@JsonKey(name: 'fuel_percent') double? fuelPercent,@JsonKey(name: 'truck_photos') List<String> truckPhotos,@JsonKey(name: 'damage_notes') String? damageNotes,@JsonKey(name: 'gas_receipt_url') String? gasReceiptUrl,@JsonKey(name: 'gas_amount_cad') double? gasAmountCad,@JsonKey(name: 'gas_station') String? gasStation,@JsonKey(name: 'created_at') String? createdAt
});




}
/// @nodoc
class __$TruckCheckCopyWithImpl<$Res>
    implements _$TruckCheckCopyWith<$Res> {
  __$TruckCheckCopyWithImpl(this._self, this._then);

  final _TruckCheck _self;
  final $Res Function(_TruckCheck) _then;

/// Create a copy of TruckCheck
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? assignmentId = freezed,Object? checkType = freezed,Object? dashboardPhotoUrl = freezed,Object? odometerKm = freezed,Object? fuelLevel = freezed,Object? fuelPercent = freezed,Object? truckPhotos = null,Object? damageNotes = freezed,Object? gasReceiptUrl = freezed,Object? gasAmountCad = freezed,Object? gasStation = freezed,Object? createdAt = freezed,}) {
  return _then(_TruckCheck(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,assignmentId: freezed == assignmentId ? _self.assignmentId : assignmentId // ignore: cast_nullable_to_non_nullable
as String?,checkType: freezed == checkType ? _self.checkType : checkType // ignore: cast_nullable_to_non_nullable
as String?,dashboardPhotoUrl: freezed == dashboardPhotoUrl ? _self.dashboardPhotoUrl : dashboardPhotoUrl // ignore: cast_nullable_to_non_nullable
as String?,odometerKm: freezed == odometerKm ? _self.odometerKm : odometerKm // ignore: cast_nullable_to_non_nullable
as double?,fuelLevel: freezed == fuelLevel ? _self.fuelLevel : fuelLevel // ignore: cast_nullable_to_non_nullable
as String?,fuelPercent: freezed == fuelPercent ? _self.fuelPercent : fuelPercent // ignore: cast_nullable_to_non_nullable
as double?,truckPhotos: null == truckPhotos ? _self._truckPhotos : truckPhotos // ignore: cast_nullable_to_non_nullable
as List<String>,damageNotes: freezed == damageNotes ? _self.damageNotes : damageNotes // ignore: cast_nullable_to_non_nullable
as String?,gasReceiptUrl: freezed == gasReceiptUrl ? _self.gasReceiptUrl : gasReceiptUrl // ignore: cast_nullable_to_non_nullable
as String?,gasAmountCad: freezed == gasAmountCad ? _self.gasAmountCad : gasAmountCad // ignore: cast_nullable_to_non_nullable
as double?,gasStation: freezed == gasStation ? _self.gasStation : gasStation // ignore: cast_nullable_to_non_nullable
as String?,createdAt: freezed == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$TruckChecksResponse {

 List<TruckCheck> get checks;
/// Create a copy of TruckChecksResponse
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$TruckChecksResponseCopyWith<TruckChecksResponse> get copyWith => _$TruckChecksResponseCopyWithImpl<TruckChecksResponse>(this as TruckChecksResponse, _$identity);

  /// Serializes this TruckChecksResponse to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is TruckChecksResponse&&const DeepCollectionEquality().equals(other.checks, checks));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,const DeepCollectionEquality().hash(checks));

@override
String toString() {
  return 'TruckChecksResponse(checks: $checks)';
}


}

/// @nodoc
abstract mixin class $TruckChecksResponseCopyWith<$Res>  {
  factory $TruckChecksResponseCopyWith(TruckChecksResponse value, $Res Function(TruckChecksResponse) _then) = _$TruckChecksResponseCopyWithImpl;
@useResult
$Res call({
 List<TruckCheck> checks
});




}
/// @nodoc
class _$TruckChecksResponseCopyWithImpl<$Res>
    implements $TruckChecksResponseCopyWith<$Res> {
  _$TruckChecksResponseCopyWithImpl(this._self, this._then);

  final TruckChecksResponse _self;
  final $Res Function(TruckChecksResponse) _then;

/// Create a copy of TruckChecksResponse
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? checks = null,}) {
  return _then(_self.copyWith(
checks: null == checks ? _self.checks : checks // ignore: cast_nullable_to_non_nullable
as List<TruckCheck>,
  ));
}

}


/// Adds pattern-matching-related methods to [TruckChecksResponse].
extension TruckChecksResponsePatterns on TruckChecksResponse {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _TruckChecksResponse value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _TruckChecksResponse() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _TruckChecksResponse value)  $default,){
final _that = this;
switch (_that) {
case _TruckChecksResponse():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _TruckChecksResponse value)?  $default,){
final _that = this;
switch (_that) {
case _TruckChecksResponse() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( List<TruckCheck> checks)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _TruckChecksResponse() when $default != null:
return $default(_that.checks);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( List<TruckCheck> checks)  $default,) {final _that = this;
switch (_that) {
case _TruckChecksResponse():
return $default(_that.checks);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( List<TruckCheck> checks)?  $default,) {final _that = this;
switch (_that) {
case _TruckChecksResponse() when $default != null:
return $default(_that.checks);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _TruckChecksResponse implements TruckChecksResponse {
  const _TruckChecksResponse({final  List<TruckCheck> checks = const <TruckCheck>[]}): _checks = checks;
  factory _TruckChecksResponse.fromJson(Map<String, dynamic> json) => _$TruckChecksResponseFromJson(json);

 final  List<TruckCheck> _checks;
@override@JsonKey() List<TruckCheck> get checks {
  if (_checks is EqualUnmodifiableListView) return _checks;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_checks);
}


/// Create a copy of TruckChecksResponse
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$TruckChecksResponseCopyWith<_TruckChecksResponse> get copyWith => __$TruckChecksResponseCopyWithImpl<_TruckChecksResponse>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$TruckChecksResponseToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _TruckChecksResponse&&const DeepCollectionEquality().equals(other._checks, _checks));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,const DeepCollectionEquality().hash(_checks));

@override
String toString() {
  return 'TruckChecksResponse(checks: $checks)';
}


}

/// @nodoc
abstract mixin class _$TruckChecksResponseCopyWith<$Res> implements $TruckChecksResponseCopyWith<$Res> {
  factory _$TruckChecksResponseCopyWith(_TruckChecksResponse value, $Res Function(_TruckChecksResponse) _then) = __$TruckChecksResponseCopyWithImpl;
@override @useResult
$Res call({
 List<TruckCheck> checks
});




}
/// @nodoc
class __$TruckChecksResponseCopyWithImpl<$Res>
    implements _$TruckChecksResponseCopyWith<$Res> {
  __$TruckChecksResponseCopyWithImpl(this._self, this._then);

  final _TruckChecksResponse _self;
  final $Res Function(_TruckChecksResponse) _then;

/// Create a copy of TruckChecksResponse
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? checks = null,}) {
  return _then(_TruckChecksResponse(
checks: null == checks ? _self._checks : checks // ignore: cast_nullable_to_non_nullable
as List<TruckCheck>,
  ));
}


}

// dart format on
