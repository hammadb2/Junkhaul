// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'shift.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$Shift {

 String get id;@JsonKey(name: 'employee_id') String? get employeeId;@JsonKey(name: 'clock_in_at') String? get clockInAt;@JsonKey(name: 'clock_out_at') String? get clockOutAt;@JsonKey(name: 'clock_in_lat') double? get clockInLat;@JsonKey(name: 'clock_in_lng') double? get clockInLng;@JsonKey(name: 'regular_hours') double? get regularHours;@JsonKey(name: 'overtime_hours') double? get overtimeHours;@JsonKey(name: 'total_hours') double? get totalHours;@JsonKey(name: 'gross_pay') double? get grossPay;
/// Create a copy of Shift
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ShiftCopyWith<Shift> get copyWith => _$ShiftCopyWithImpl<Shift>(this as Shift, _$identity);

  /// Serializes this Shift to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Shift&&(identical(other.id, id) || other.id == id)&&(identical(other.employeeId, employeeId) || other.employeeId == employeeId)&&(identical(other.clockInAt, clockInAt) || other.clockInAt == clockInAt)&&(identical(other.clockOutAt, clockOutAt) || other.clockOutAt == clockOutAt)&&(identical(other.clockInLat, clockInLat) || other.clockInLat == clockInLat)&&(identical(other.clockInLng, clockInLng) || other.clockInLng == clockInLng)&&(identical(other.regularHours, regularHours) || other.regularHours == regularHours)&&(identical(other.overtimeHours, overtimeHours) || other.overtimeHours == overtimeHours)&&(identical(other.totalHours, totalHours) || other.totalHours == totalHours)&&(identical(other.grossPay, grossPay) || other.grossPay == grossPay));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,employeeId,clockInAt,clockOutAt,clockInLat,clockInLng,regularHours,overtimeHours,totalHours,grossPay);

@override
String toString() {
  return 'Shift(id: $id, employeeId: $employeeId, clockInAt: $clockInAt, clockOutAt: $clockOutAt, clockInLat: $clockInLat, clockInLng: $clockInLng, regularHours: $regularHours, overtimeHours: $overtimeHours, totalHours: $totalHours, grossPay: $grossPay)';
}


}

/// @nodoc
abstract mixin class $ShiftCopyWith<$Res>  {
  factory $ShiftCopyWith(Shift value, $Res Function(Shift) _then) = _$ShiftCopyWithImpl;
@useResult
$Res call({
 String id,@JsonKey(name: 'employee_id') String? employeeId,@JsonKey(name: 'clock_in_at') String? clockInAt,@JsonKey(name: 'clock_out_at') String? clockOutAt,@JsonKey(name: 'clock_in_lat') double? clockInLat,@JsonKey(name: 'clock_in_lng') double? clockInLng,@JsonKey(name: 'regular_hours') double? regularHours,@JsonKey(name: 'overtime_hours') double? overtimeHours,@JsonKey(name: 'total_hours') double? totalHours,@JsonKey(name: 'gross_pay') double? grossPay
});




}
/// @nodoc
class _$ShiftCopyWithImpl<$Res>
    implements $ShiftCopyWith<$Res> {
  _$ShiftCopyWithImpl(this._self, this._then);

  final Shift _self;
  final $Res Function(Shift) _then;

/// Create a copy of Shift
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? employeeId = freezed,Object? clockInAt = freezed,Object? clockOutAt = freezed,Object? clockInLat = freezed,Object? clockInLng = freezed,Object? regularHours = freezed,Object? overtimeHours = freezed,Object? totalHours = freezed,Object? grossPay = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,employeeId: freezed == employeeId ? _self.employeeId : employeeId // ignore: cast_nullable_to_non_nullable
as String?,clockInAt: freezed == clockInAt ? _self.clockInAt : clockInAt // ignore: cast_nullable_to_non_nullable
as String?,clockOutAt: freezed == clockOutAt ? _self.clockOutAt : clockOutAt // ignore: cast_nullable_to_non_nullable
as String?,clockInLat: freezed == clockInLat ? _self.clockInLat : clockInLat // ignore: cast_nullable_to_non_nullable
as double?,clockInLng: freezed == clockInLng ? _self.clockInLng : clockInLng // ignore: cast_nullable_to_non_nullable
as double?,regularHours: freezed == regularHours ? _self.regularHours : regularHours // ignore: cast_nullable_to_non_nullable
as double?,overtimeHours: freezed == overtimeHours ? _self.overtimeHours : overtimeHours // ignore: cast_nullable_to_non_nullable
as double?,totalHours: freezed == totalHours ? _self.totalHours : totalHours // ignore: cast_nullable_to_non_nullable
as double?,grossPay: freezed == grossPay ? _self.grossPay : grossPay // ignore: cast_nullable_to_non_nullable
as double?,
  ));
}

}


/// Adds pattern-matching-related methods to [Shift].
extension ShiftPatterns on Shift {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _Shift value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _Shift() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _Shift value)  $default,){
final _that = this;
switch (_that) {
case _Shift():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _Shift value)?  $default,){
final _that = this;
switch (_that) {
case _Shift() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id, @JsonKey(name: 'employee_id')  String? employeeId, @JsonKey(name: 'clock_in_at')  String? clockInAt, @JsonKey(name: 'clock_out_at')  String? clockOutAt, @JsonKey(name: 'clock_in_lat')  double? clockInLat, @JsonKey(name: 'clock_in_lng')  double? clockInLng, @JsonKey(name: 'regular_hours')  double? regularHours, @JsonKey(name: 'overtime_hours')  double? overtimeHours, @JsonKey(name: 'total_hours')  double? totalHours, @JsonKey(name: 'gross_pay')  double? grossPay)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Shift() when $default != null:
return $default(_that.id,_that.employeeId,_that.clockInAt,_that.clockOutAt,_that.clockInLat,_that.clockInLng,_that.regularHours,_that.overtimeHours,_that.totalHours,_that.grossPay);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id, @JsonKey(name: 'employee_id')  String? employeeId, @JsonKey(name: 'clock_in_at')  String? clockInAt, @JsonKey(name: 'clock_out_at')  String? clockOutAt, @JsonKey(name: 'clock_in_lat')  double? clockInLat, @JsonKey(name: 'clock_in_lng')  double? clockInLng, @JsonKey(name: 'regular_hours')  double? regularHours, @JsonKey(name: 'overtime_hours')  double? overtimeHours, @JsonKey(name: 'total_hours')  double? totalHours, @JsonKey(name: 'gross_pay')  double? grossPay)  $default,) {final _that = this;
switch (_that) {
case _Shift():
return $default(_that.id,_that.employeeId,_that.clockInAt,_that.clockOutAt,_that.clockInLat,_that.clockInLng,_that.regularHours,_that.overtimeHours,_that.totalHours,_that.grossPay);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id, @JsonKey(name: 'employee_id')  String? employeeId, @JsonKey(name: 'clock_in_at')  String? clockInAt, @JsonKey(name: 'clock_out_at')  String? clockOutAt, @JsonKey(name: 'clock_in_lat')  double? clockInLat, @JsonKey(name: 'clock_in_lng')  double? clockInLng, @JsonKey(name: 'regular_hours')  double? regularHours, @JsonKey(name: 'overtime_hours')  double? overtimeHours, @JsonKey(name: 'total_hours')  double? totalHours, @JsonKey(name: 'gross_pay')  double? grossPay)?  $default,) {final _that = this;
switch (_that) {
case _Shift() when $default != null:
return $default(_that.id,_that.employeeId,_that.clockInAt,_that.clockOutAt,_that.clockInLat,_that.clockInLng,_that.regularHours,_that.overtimeHours,_that.totalHours,_that.grossPay);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Shift implements Shift {
  const _Shift({required this.id, @JsonKey(name: 'employee_id') this.employeeId, @JsonKey(name: 'clock_in_at') this.clockInAt, @JsonKey(name: 'clock_out_at') this.clockOutAt, @JsonKey(name: 'clock_in_lat') this.clockInLat, @JsonKey(name: 'clock_in_lng') this.clockInLng, @JsonKey(name: 'regular_hours') this.regularHours, @JsonKey(name: 'overtime_hours') this.overtimeHours, @JsonKey(name: 'total_hours') this.totalHours, @JsonKey(name: 'gross_pay') this.grossPay});
  factory _Shift.fromJson(Map<String, dynamic> json) => _$ShiftFromJson(json);

@override final  String id;
@override@JsonKey(name: 'employee_id') final  String? employeeId;
@override@JsonKey(name: 'clock_in_at') final  String? clockInAt;
@override@JsonKey(name: 'clock_out_at') final  String? clockOutAt;
@override@JsonKey(name: 'clock_in_lat') final  double? clockInLat;
@override@JsonKey(name: 'clock_in_lng') final  double? clockInLng;
@override@JsonKey(name: 'regular_hours') final  double? regularHours;
@override@JsonKey(name: 'overtime_hours') final  double? overtimeHours;
@override@JsonKey(name: 'total_hours') final  double? totalHours;
@override@JsonKey(name: 'gross_pay') final  double? grossPay;

/// Create a copy of Shift
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ShiftCopyWith<_Shift> get copyWith => __$ShiftCopyWithImpl<_Shift>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ShiftToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _Shift&&(identical(other.id, id) || other.id == id)&&(identical(other.employeeId, employeeId) || other.employeeId == employeeId)&&(identical(other.clockInAt, clockInAt) || other.clockInAt == clockInAt)&&(identical(other.clockOutAt, clockOutAt) || other.clockOutAt == clockOutAt)&&(identical(other.clockInLat, clockInLat) || other.clockInLat == clockInLat)&&(identical(other.clockInLng, clockInLng) || other.clockInLng == clockInLng)&&(identical(other.regularHours, regularHours) || other.regularHours == regularHours)&&(identical(other.overtimeHours, overtimeHours) || other.overtimeHours == overtimeHours)&&(identical(other.totalHours, totalHours) || other.totalHours == totalHours)&&(identical(other.grossPay, grossPay) || other.grossPay == grossPay));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,employeeId,clockInAt,clockOutAt,clockInLat,clockInLng,regularHours,overtimeHours,totalHours,grossPay);

@override
String toString() {
  return 'Shift(id: $id, employeeId: $employeeId, clockInAt: $clockInAt, clockOutAt: $clockOutAt, clockInLat: $clockInLat, clockInLng: $clockInLng, regularHours: $regularHours, overtimeHours: $overtimeHours, totalHours: $totalHours, grossPay: $grossPay)';
}


}

/// @nodoc
abstract mixin class _$ShiftCopyWith<$Res> implements $ShiftCopyWith<$Res> {
  factory _$ShiftCopyWith(_Shift value, $Res Function(_Shift) _then) = __$ShiftCopyWithImpl;
@override @useResult
$Res call({
 String id,@JsonKey(name: 'employee_id') String? employeeId,@JsonKey(name: 'clock_in_at') String? clockInAt,@JsonKey(name: 'clock_out_at') String? clockOutAt,@JsonKey(name: 'clock_in_lat') double? clockInLat,@JsonKey(name: 'clock_in_lng') double? clockInLng,@JsonKey(name: 'regular_hours') double? regularHours,@JsonKey(name: 'overtime_hours') double? overtimeHours,@JsonKey(name: 'total_hours') double? totalHours,@JsonKey(name: 'gross_pay') double? grossPay
});




}
/// @nodoc
class __$ShiftCopyWithImpl<$Res>
    implements _$ShiftCopyWith<$Res> {
  __$ShiftCopyWithImpl(this._self, this._then);

  final _Shift _self;
  final $Res Function(_Shift) _then;

/// Create a copy of Shift
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? employeeId = freezed,Object? clockInAt = freezed,Object? clockOutAt = freezed,Object? clockInLat = freezed,Object? clockInLng = freezed,Object? regularHours = freezed,Object? overtimeHours = freezed,Object? totalHours = freezed,Object? grossPay = freezed,}) {
  return _then(_Shift(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,employeeId: freezed == employeeId ? _self.employeeId : employeeId // ignore: cast_nullable_to_non_nullable
as String?,clockInAt: freezed == clockInAt ? _self.clockInAt : clockInAt // ignore: cast_nullable_to_non_nullable
as String?,clockOutAt: freezed == clockOutAt ? _self.clockOutAt : clockOutAt // ignore: cast_nullable_to_non_nullable
as String?,clockInLat: freezed == clockInLat ? _self.clockInLat : clockInLat // ignore: cast_nullable_to_non_nullable
as double?,clockInLng: freezed == clockInLng ? _self.clockInLng : clockInLng // ignore: cast_nullable_to_non_nullable
as double?,regularHours: freezed == regularHours ? _self.regularHours : regularHours // ignore: cast_nullable_to_non_nullable
as double?,overtimeHours: freezed == overtimeHours ? _self.overtimeHours : overtimeHours // ignore: cast_nullable_to_non_nullable
as double?,totalHours: freezed == totalHours ? _self.totalHours : totalHours // ignore: cast_nullable_to_non_nullable
as double?,grossPay: freezed == grossPay ? _self.grossPay : grossPay // ignore: cast_nullable_to_non_nullable
as double?,
  ));
}


}


/// @nodoc
mixin _$ShiftPeriod {

@JsonKey(name: 'regular_hours') double? get regularHours;@JsonKey(name: 'overtime_hours') double? get overtimeHours;@JsonKey(name: 'total_hours') double? get totalHours; double? get gross;
/// Create a copy of ShiftPeriod
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ShiftPeriodCopyWith<ShiftPeriod> get copyWith => _$ShiftPeriodCopyWithImpl<ShiftPeriod>(this as ShiftPeriod, _$identity);

  /// Serializes this ShiftPeriod to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ShiftPeriod&&(identical(other.regularHours, regularHours) || other.regularHours == regularHours)&&(identical(other.overtimeHours, overtimeHours) || other.overtimeHours == overtimeHours)&&(identical(other.totalHours, totalHours) || other.totalHours == totalHours)&&(identical(other.gross, gross) || other.gross == gross));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,regularHours,overtimeHours,totalHours,gross);

@override
String toString() {
  return 'ShiftPeriod(regularHours: $regularHours, overtimeHours: $overtimeHours, totalHours: $totalHours, gross: $gross)';
}


}

/// @nodoc
abstract mixin class $ShiftPeriodCopyWith<$Res>  {
  factory $ShiftPeriodCopyWith(ShiftPeriod value, $Res Function(ShiftPeriod) _then) = _$ShiftPeriodCopyWithImpl;
@useResult
$Res call({
@JsonKey(name: 'regular_hours') double? regularHours,@JsonKey(name: 'overtime_hours') double? overtimeHours,@JsonKey(name: 'total_hours') double? totalHours, double? gross
});




}
/// @nodoc
class _$ShiftPeriodCopyWithImpl<$Res>
    implements $ShiftPeriodCopyWith<$Res> {
  _$ShiftPeriodCopyWithImpl(this._self, this._then);

  final ShiftPeriod _self;
  final $Res Function(ShiftPeriod) _then;

/// Create a copy of ShiftPeriod
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? regularHours = freezed,Object? overtimeHours = freezed,Object? totalHours = freezed,Object? gross = freezed,}) {
  return _then(_self.copyWith(
regularHours: freezed == regularHours ? _self.regularHours : regularHours // ignore: cast_nullable_to_non_nullable
as double?,overtimeHours: freezed == overtimeHours ? _self.overtimeHours : overtimeHours // ignore: cast_nullable_to_non_nullable
as double?,totalHours: freezed == totalHours ? _self.totalHours : totalHours // ignore: cast_nullable_to_non_nullable
as double?,gross: freezed == gross ? _self.gross : gross // ignore: cast_nullable_to_non_nullable
as double?,
  ));
}

}


/// Adds pattern-matching-related methods to [ShiftPeriod].
extension ShiftPeriodPatterns on ShiftPeriod {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ShiftPeriod value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ShiftPeriod() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ShiftPeriod value)  $default,){
final _that = this;
switch (_that) {
case _ShiftPeriod():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ShiftPeriod value)?  $default,){
final _that = this;
switch (_that) {
case _ShiftPeriod() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(name: 'regular_hours')  double? regularHours, @JsonKey(name: 'overtime_hours')  double? overtimeHours, @JsonKey(name: 'total_hours')  double? totalHours,  double? gross)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ShiftPeriod() when $default != null:
return $default(_that.regularHours,_that.overtimeHours,_that.totalHours,_that.gross);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(name: 'regular_hours')  double? regularHours, @JsonKey(name: 'overtime_hours')  double? overtimeHours, @JsonKey(name: 'total_hours')  double? totalHours,  double? gross)  $default,) {final _that = this;
switch (_that) {
case _ShiftPeriod():
return $default(_that.regularHours,_that.overtimeHours,_that.totalHours,_that.gross);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(name: 'regular_hours')  double? regularHours, @JsonKey(name: 'overtime_hours')  double? overtimeHours, @JsonKey(name: 'total_hours')  double? totalHours,  double? gross)?  $default,) {final _that = this;
switch (_that) {
case _ShiftPeriod() when $default != null:
return $default(_that.regularHours,_that.overtimeHours,_that.totalHours,_that.gross);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ShiftPeriod implements ShiftPeriod {
  const _ShiftPeriod({@JsonKey(name: 'regular_hours') this.regularHours, @JsonKey(name: 'overtime_hours') this.overtimeHours, @JsonKey(name: 'total_hours') this.totalHours, this.gross});
  factory _ShiftPeriod.fromJson(Map<String, dynamic> json) => _$ShiftPeriodFromJson(json);

@override@JsonKey(name: 'regular_hours') final  double? regularHours;
@override@JsonKey(name: 'overtime_hours') final  double? overtimeHours;
@override@JsonKey(name: 'total_hours') final  double? totalHours;
@override final  double? gross;

/// Create a copy of ShiftPeriod
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ShiftPeriodCopyWith<_ShiftPeriod> get copyWith => __$ShiftPeriodCopyWithImpl<_ShiftPeriod>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ShiftPeriodToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ShiftPeriod&&(identical(other.regularHours, regularHours) || other.regularHours == regularHours)&&(identical(other.overtimeHours, overtimeHours) || other.overtimeHours == overtimeHours)&&(identical(other.totalHours, totalHours) || other.totalHours == totalHours)&&(identical(other.gross, gross) || other.gross == gross));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,regularHours,overtimeHours,totalHours,gross);

@override
String toString() {
  return 'ShiftPeriod(regularHours: $regularHours, overtimeHours: $overtimeHours, totalHours: $totalHours, gross: $gross)';
}


}

/// @nodoc
abstract mixin class _$ShiftPeriodCopyWith<$Res> implements $ShiftPeriodCopyWith<$Res> {
  factory _$ShiftPeriodCopyWith(_ShiftPeriod value, $Res Function(_ShiftPeriod) _then) = __$ShiftPeriodCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(name: 'regular_hours') double? regularHours,@JsonKey(name: 'overtime_hours') double? overtimeHours,@JsonKey(name: 'total_hours') double? totalHours, double? gross
});




}
/// @nodoc
class __$ShiftPeriodCopyWithImpl<$Res>
    implements _$ShiftPeriodCopyWith<$Res> {
  __$ShiftPeriodCopyWithImpl(this._self, this._then);

  final _ShiftPeriod _self;
  final $Res Function(_ShiftPeriod) _then;

/// Create a copy of ShiftPeriod
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? regularHours = freezed,Object? overtimeHours = freezed,Object? totalHours = freezed,Object? gross = freezed,}) {
  return _then(_ShiftPeriod(
regularHours: freezed == regularHours ? _self.regularHours : regularHours // ignore: cast_nullable_to_non_nullable
as double?,overtimeHours: freezed == overtimeHours ? _self.overtimeHours : overtimeHours // ignore: cast_nullable_to_non_nullable
as double?,totalHours: freezed == totalHours ? _self.totalHours : totalHours // ignore: cast_nullable_to_non_nullable
as double?,gross: freezed == gross ? _self.gross : gross // ignore: cast_nullable_to_non_nullable
as double?,
  ));
}


}


/// @nodoc
mixin _$ShiftsResponse {

@JsonKey(name: 'open_shift') Shift? get openShift; List<Shift> get recent; ShiftPeriod? get period;
/// Create a copy of ShiftsResponse
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ShiftsResponseCopyWith<ShiftsResponse> get copyWith => _$ShiftsResponseCopyWithImpl<ShiftsResponse>(this as ShiftsResponse, _$identity);

  /// Serializes this ShiftsResponse to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ShiftsResponse&&(identical(other.openShift, openShift) || other.openShift == openShift)&&const DeepCollectionEquality().equals(other.recent, recent)&&(identical(other.period, period) || other.period == period));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,openShift,const DeepCollectionEquality().hash(recent),period);

@override
String toString() {
  return 'ShiftsResponse(openShift: $openShift, recent: $recent, period: $period)';
}


}

/// @nodoc
abstract mixin class $ShiftsResponseCopyWith<$Res>  {
  factory $ShiftsResponseCopyWith(ShiftsResponse value, $Res Function(ShiftsResponse) _then) = _$ShiftsResponseCopyWithImpl;
@useResult
$Res call({
@JsonKey(name: 'open_shift') Shift? openShift, List<Shift> recent, ShiftPeriod? period
});


$ShiftCopyWith<$Res>? get openShift;$ShiftPeriodCopyWith<$Res>? get period;

}
/// @nodoc
class _$ShiftsResponseCopyWithImpl<$Res>
    implements $ShiftsResponseCopyWith<$Res> {
  _$ShiftsResponseCopyWithImpl(this._self, this._then);

  final ShiftsResponse _self;
  final $Res Function(ShiftsResponse) _then;

/// Create a copy of ShiftsResponse
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? openShift = freezed,Object? recent = null,Object? period = freezed,}) {
  return _then(_self.copyWith(
openShift: freezed == openShift ? _self.openShift : openShift // ignore: cast_nullable_to_non_nullable
as Shift?,recent: null == recent ? _self.recent : recent // ignore: cast_nullable_to_non_nullable
as List<Shift>,period: freezed == period ? _self.period : period // ignore: cast_nullable_to_non_nullable
as ShiftPeriod?,
  ));
}
/// Create a copy of ShiftsResponse
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ShiftCopyWith<$Res>? get openShift {
    if (_self.openShift == null) {
    return null;
  }

  return $ShiftCopyWith<$Res>(_self.openShift!, (value) {
    return _then(_self.copyWith(openShift: value));
  });
}/// Create a copy of ShiftsResponse
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ShiftPeriodCopyWith<$Res>? get period {
    if (_self.period == null) {
    return null;
  }

  return $ShiftPeriodCopyWith<$Res>(_self.period!, (value) {
    return _then(_self.copyWith(period: value));
  });
}
}


/// Adds pattern-matching-related methods to [ShiftsResponse].
extension ShiftsResponsePatterns on ShiftsResponse {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ShiftsResponse value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ShiftsResponse() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ShiftsResponse value)  $default,){
final _that = this;
switch (_that) {
case _ShiftsResponse():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ShiftsResponse value)?  $default,){
final _that = this;
switch (_that) {
case _ShiftsResponse() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(name: 'open_shift')  Shift? openShift,  List<Shift> recent,  ShiftPeriod? period)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ShiftsResponse() when $default != null:
return $default(_that.openShift,_that.recent,_that.period);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(name: 'open_shift')  Shift? openShift,  List<Shift> recent,  ShiftPeriod? period)  $default,) {final _that = this;
switch (_that) {
case _ShiftsResponse():
return $default(_that.openShift,_that.recent,_that.period);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(name: 'open_shift')  Shift? openShift,  List<Shift> recent,  ShiftPeriod? period)?  $default,) {final _that = this;
switch (_that) {
case _ShiftsResponse() when $default != null:
return $default(_that.openShift,_that.recent,_that.period);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ShiftsResponse implements ShiftsResponse {
  const _ShiftsResponse({@JsonKey(name: 'open_shift') this.openShift, final  List<Shift> recent = const <Shift>[], this.period}): _recent = recent;
  factory _ShiftsResponse.fromJson(Map<String, dynamic> json) => _$ShiftsResponseFromJson(json);

@override@JsonKey(name: 'open_shift') final  Shift? openShift;
 final  List<Shift> _recent;
@override@JsonKey() List<Shift> get recent {
  if (_recent is EqualUnmodifiableListView) return _recent;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_recent);
}

@override final  ShiftPeriod? period;

/// Create a copy of ShiftsResponse
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ShiftsResponseCopyWith<_ShiftsResponse> get copyWith => __$ShiftsResponseCopyWithImpl<_ShiftsResponse>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ShiftsResponseToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ShiftsResponse&&(identical(other.openShift, openShift) || other.openShift == openShift)&&const DeepCollectionEquality().equals(other._recent, _recent)&&(identical(other.period, period) || other.period == period));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,openShift,const DeepCollectionEquality().hash(_recent),period);

@override
String toString() {
  return 'ShiftsResponse(openShift: $openShift, recent: $recent, period: $period)';
}


}

/// @nodoc
abstract mixin class _$ShiftsResponseCopyWith<$Res> implements $ShiftsResponseCopyWith<$Res> {
  factory _$ShiftsResponseCopyWith(_ShiftsResponse value, $Res Function(_ShiftsResponse) _then) = __$ShiftsResponseCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(name: 'open_shift') Shift? openShift, List<Shift> recent, ShiftPeriod? period
});


@override $ShiftCopyWith<$Res>? get openShift;@override $ShiftPeriodCopyWith<$Res>? get period;

}
/// @nodoc
class __$ShiftsResponseCopyWithImpl<$Res>
    implements _$ShiftsResponseCopyWith<$Res> {
  __$ShiftsResponseCopyWithImpl(this._self, this._then);

  final _ShiftsResponse _self;
  final $Res Function(_ShiftsResponse) _then;

/// Create a copy of ShiftsResponse
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? openShift = freezed,Object? recent = null,Object? period = freezed,}) {
  return _then(_ShiftsResponse(
openShift: freezed == openShift ? _self.openShift : openShift // ignore: cast_nullable_to_non_nullable
as Shift?,recent: null == recent ? _self._recent : recent // ignore: cast_nullable_to_non_nullable
as List<Shift>,period: freezed == period ? _self.period : period // ignore: cast_nullable_to_non_nullable
as ShiftPeriod?,
  ));
}

/// Create a copy of ShiftsResponse
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ShiftCopyWith<$Res>? get openShift {
    if (_self.openShift == null) {
    return null;
  }

  return $ShiftCopyWith<$Res>(_self.openShift!, (value) {
    return _then(_self.copyWith(openShift: value));
  });
}/// Create a copy of ShiftsResponse
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ShiftPeriodCopyWith<$Res>? get period {
    if (_self.period == null) {
    return null;
  }

  return $ShiftPeriodCopyWith<$Res>(_self.period!, (value) {
    return _then(_self.copyWith(period: value));
  });
}
}

// dart format on
