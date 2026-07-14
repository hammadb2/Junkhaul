// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'schedule.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$CrewAssignment {

 String get id;@JsonKey(name: 'assignment_date') String? get assignmentDate;@JsonKey(name: 'uhaul_location') String? get uhaulLocation; CrewMember? get driver; CrewMember? get secondary;
/// Create a copy of CrewAssignment
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$CrewAssignmentCopyWith<CrewAssignment> get copyWith => _$CrewAssignmentCopyWithImpl<CrewAssignment>(this as CrewAssignment, _$identity);

  /// Serializes this CrewAssignment to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is CrewAssignment&&(identical(other.id, id) || other.id == id)&&(identical(other.assignmentDate, assignmentDate) || other.assignmentDate == assignmentDate)&&(identical(other.uhaulLocation, uhaulLocation) || other.uhaulLocation == uhaulLocation)&&(identical(other.driver, driver) || other.driver == driver)&&(identical(other.secondary, secondary) || other.secondary == secondary));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,assignmentDate,uhaulLocation,driver,secondary);

@override
String toString() {
  return 'CrewAssignment(id: $id, assignmentDate: $assignmentDate, uhaulLocation: $uhaulLocation, driver: $driver, secondary: $secondary)';
}


}

/// @nodoc
abstract mixin class $CrewAssignmentCopyWith<$Res>  {
  factory $CrewAssignmentCopyWith(CrewAssignment value, $Res Function(CrewAssignment) _then) = _$CrewAssignmentCopyWithImpl;
@useResult
$Res call({
 String id,@JsonKey(name: 'assignment_date') String? assignmentDate,@JsonKey(name: 'uhaul_location') String? uhaulLocation, CrewMember? driver, CrewMember? secondary
});


$CrewMemberCopyWith<$Res>? get driver;$CrewMemberCopyWith<$Res>? get secondary;

}
/// @nodoc
class _$CrewAssignmentCopyWithImpl<$Res>
    implements $CrewAssignmentCopyWith<$Res> {
  _$CrewAssignmentCopyWithImpl(this._self, this._then);

  final CrewAssignment _self;
  final $Res Function(CrewAssignment) _then;

/// Create a copy of CrewAssignment
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? assignmentDate = freezed,Object? uhaulLocation = freezed,Object? driver = freezed,Object? secondary = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,assignmentDate: freezed == assignmentDate ? _self.assignmentDate : assignmentDate // ignore: cast_nullable_to_non_nullable
as String?,uhaulLocation: freezed == uhaulLocation ? _self.uhaulLocation : uhaulLocation // ignore: cast_nullable_to_non_nullable
as String?,driver: freezed == driver ? _self.driver : driver // ignore: cast_nullable_to_non_nullable
as CrewMember?,secondary: freezed == secondary ? _self.secondary : secondary // ignore: cast_nullable_to_non_nullable
as CrewMember?,
  ));
}
/// Create a copy of CrewAssignment
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$CrewMemberCopyWith<$Res>? get driver {
    if (_self.driver == null) {
    return null;
  }

  return $CrewMemberCopyWith<$Res>(_self.driver!, (value) {
    return _then(_self.copyWith(driver: value));
  });
}/// Create a copy of CrewAssignment
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$CrewMemberCopyWith<$Res>? get secondary {
    if (_self.secondary == null) {
    return null;
  }

  return $CrewMemberCopyWith<$Res>(_self.secondary!, (value) {
    return _then(_self.copyWith(secondary: value));
  });
}
}


/// Adds pattern-matching-related methods to [CrewAssignment].
extension CrewAssignmentPatterns on CrewAssignment {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _CrewAssignment value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _CrewAssignment() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _CrewAssignment value)  $default,){
final _that = this;
switch (_that) {
case _CrewAssignment():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _CrewAssignment value)?  $default,){
final _that = this;
switch (_that) {
case _CrewAssignment() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id, @JsonKey(name: 'assignment_date')  String? assignmentDate, @JsonKey(name: 'uhaul_location')  String? uhaulLocation,  CrewMember? driver,  CrewMember? secondary)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _CrewAssignment() when $default != null:
return $default(_that.id,_that.assignmentDate,_that.uhaulLocation,_that.driver,_that.secondary);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id, @JsonKey(name: 'assignment_date')  String? assignmentDate, @JsonKey(name: 'uhaul_location')  String? uhaulLocation,  CrewMember? driver,  CrewMember? secondary)  $default,) {final _that = this;
switch (_that) {
case _CrewAssignment():
return $default(_that.id,_that.assignmentDate,_that.uhaulLocation,_that.driver,_that.secondary);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id, @JsonKey(name: 'assignment_date')  String? assignmentDate, @JsonKey(name: 'uhaul_location')  String? uhaulLocation,  CrewMember? driver,  CrewMember? secondary)?  $default,) {final _that = this;
switch (_that) {
case _CrewAssignment() when $default != null:
return $default(_that.id,_that.assignmentDate,_that.uhaulLocation,_that.driver,_that.secondary);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _CrewAssignment implements CrewAssignment {
  const _CrewAssignment({required this.id, @JsonKey(name: 'assignment_date') this.assignmentDate, @JsonKey(name: 'uhaul_location') this.uhaulLocation, this.driver, this.secondary});
  factory _CrewAssignment.fromJson(Map<String, dynamic> json) => _$CrewAssignmentFromJson(json);

@override final  String id;
@override@JsonKey(name: 'assignment_date') final  String? assignmentDate;
@override@JsonKey(name: 'uhaul_location') final  String? uhaulLocation;
@override final  CrewMember? driver;
@override final  CrewMember? secondary;

/// Create a copy of CrewAssignment
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$CrewAssignmentCopyWith<_CrewAssignment> get copyWith => __$CrewAssignmentCopyWithImpl<_CrewAssignment>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$CrewAssignmentToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _CrewAssignment&&(identical(other.id, id) || other.id == id)&&(identical(other.assignmentDate, assignmentDate) || other.assignmentDate == assignmentDate)&&(identical(other.uhaulLocation, uhaulLocation) || other.uhaulLocation == uhaulLocation)&&(identical(other.driver, driver) || other.driver == driver)&&(identical(other.secondary, secondary) || other.secondary == secondary));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,assignmentDate,uhaulLocation,driver,secondary);

@override
String toString() {
  return 'CrewAssignment(id: $id, assignmentDate: $assignmentDate, uhaulLocation: $uhaulLocation, driver: $driver, secondary: $secondary)';
}


}

/// @nodoc
abstract mixin class _$CrewAssignmentCopyWith<$Res> implements $CrewAssignmentCopyWith<$Res> {
  factory _$CrewAssignmentCopyWith(_CrewAssignment value, $Res Function(_CrewAssignment) _then) = __$CrewAssignmentCopyWithImpl;
@override @useResult
$Res call({
 String id,@JsonKey(name: 'assignment_date') String? assignmentDate,@JsonKey(name: 'uhaul_location') String? uhaulLocation, CrewMember? driver, CrewMember? secondary
});


@override $CrewMemberCopyWith<$Res>? get driver;@override $CrewMemberCopyWith<$Res>? get secondary;

}
/// @nodoc
class __$CrewAssignmentCopyWithImpl<$Res>
    implements _$CrewAssignmentCopyWith<$Res> {
  __$CrewAssignmentCopyWithImpl(this._self, this._then);

  final _CrewAssignment _self;
  final $Res Function(_CrewAssignment) _then;

/// Create a copy of CrewAssignment
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? assignmentDate = freezed,Object? uhaulLocation = freezed,Object? driver = freezed,Object? secondary = freezed,}) {
  return _then(_CrewAssignment(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,assignmentDate: freezed == assignmentDate ? _self.assignmentDate : assignmentDate // ignore: cast_nullable_to_non_nullable
as String?,uhaulLocation: freezed == uhaulLocation ? _self.uhaulLocation : uhaulLocation // ignore: cast_nullable_to_non_nullable
as String?,driver: freezed == driver ? _self.driver : driver // ignore: cast_nullable_to_non_nullable
as CrewMember?,secondary: freezed == secondary ? _self.secondary : secondary // ignore: cast_nullable_to_non_nullable
as CrewMember?,
  ));
}

/// Create a copy of CrewAssignment
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$CrewMemberCopyWith<$Res>? get driver {
    if (_self.driver == null) {
    return null;
  }

  return $CrewMemberCopyWith<$Res>(_self.driver!, (value) {
    return _then(_self.copyWith(driver: value));
  });
}/// Create a copy of CrewAssignment
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$CrewMemberCopyWith<$Res>? get secondary {
    if (_self.secondary == null) {
    return null;
  }

  return $CrewMemberCopyWith<$Res>(_self.secondary!, (value) {
    return _then(_self.copyWith(secondary: value));
  });
}
}


/// @nodoc
mixin _$CrewMember {

 String get id; String? get name;@JsonKey(name: 'first_name') String? get firstName;@JsonKey(name: 'last_name') String? get lastName; String? get phone;
/// Create a copy of CrewMember
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$CrewMemberCopyWith<CrewMember> get copyWith => _$CrewMemberCopyWithImpl<CrewMember>(this as CrewMember, _$identity);

  /// Serializes this CrewMember to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is CrewMember&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.firstName, firstName) || other.firstName == firstName)&&(identical(other.lastName, lastName) || other.lastName == lastName)&&(identical(other.phone, phone) || other.phone == phone));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,name,firstName,lastName,phone);

@override
String toString() {
  return 'CrewMember(id: $id, name: $name, firstName: $firstName, lastName: $lastName, phone: $phone)';
}


}

/// @nodoc
abstract mixin class $CrewMemberCopyWith<$Res>  {
  factory $CrewMemberCopyWith(CrewMember value, $Res Function(CrewMember) _then) = _$CrewMemberCopyWithImpl;
@useResult
$Res call({
 String id, String? name,@JsonKey(name: 'first_name') String? firstName,@JsonKey(name: 'last_name') String? lastName, String? phone
});




}
/// @nodoc
class _$CrewMemberCopyWithImpl<$Res>
    implements $CrewMemberCopyWith<$Res> {
  _$CrewMemberCopyWithImpl(this._self, this._then);

  final CrewMember _self;
  final $Res Function(CrewMember) _then;

/// Create a copy of CrewMember
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = freezed,Object? firstName = freezed,Object? lastName = freezed,Object? phone = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: freezed == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String?,firstName: freezed == firstName ? _self.firstName : firstName // ignore: cast_nullable_to_non_nullable
as String?,lastName: freezed == lastName ? _self.lastName : lastName // ignore: cast_nullable_to_non_nullable
as String?,phone: freezed == phone ? _self.phone : phone // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [CrewMember].
extension CrewMemberPatterns on CrewMember {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _CrewMember value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _CrewMember() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _CrewMember value)  $default,){
final _that = this;
switch (_that) {
case _CrewMember():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _CrewMember value)?  $default,){
final _that = this;
switch (_that) {
case _CrewMember() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String? name, @JsonKey(name: 'first_name')  String? firstName, @JsonKey(name: 'last_name')  String? lastName,  String? phone)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _CrewMember() when $default != null:
return $default(_that.id,_that.name,_that.firstName,_that.lastName,_that.phone);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String? name, @JsonKey(name: 'first_name')  String? firstName, @JsonKey(name: 'last_name')  String? lastName,  String? phone)  $default,) {final _that = this;
switch (_that) {
case _CrewMember():
return $default(_that.id,_that.name,_that.firstName,_that.lastName,_that.phone);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String? name, @JsonKey(name: 'first_name')  String? firstName, @JsonKey(name: 'last_name')  String? lastName,  String? phone)?  $default,) {final _that = this;
switch (_that) {
case _CrewMember() when $default != null:
return $default(_that.id,_that.name,_that.firstName,_that.lastName,_that.phone);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _CrewMember implements CrewMember {
  const _CrewMember({required this.id, this.name, @JsonKey(name: 'first_name') this.firstName, @JsonKey(name: 'last_name') this.lastName, this.phone});
  factory _CrewMember.fromJson(Map<String, dynamic> json) => _$CrewMemberFromJson(json);

@override final  String id;
@override final  String? name;
@override@JsonKey(name: 'first_name') final  String? firstName;
@override@JsonKey(name: 'last_name') final  String? lastName;
@override final  String? phone;

/// Create a copy of CrewMember
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$CrewMemberCopyWith<_CrewMember> get copyWith => __$CrewMemberCopyWithImpl<_CrewMember>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$CrewMemberToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _CrewMember&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.firstName, firstName) || other.firstName == firstName)&&(identical(other.lastName, lastName) || other.lastName == lastName)&&(identical(other.phone, phone) || other.phone == phone));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,name,firstName,lastName,phone);

@override
String toString() {
  return 'CrewMember(id: $id, name: $name, firstName: $firstName, lastName: $lastName, phone: $phone)';
}


}

/// @nodoc
abstract mixin class _$CrewMemberCopyWith<$Res> implements $CrewMemberCopyWith<$Res> {
  factory _$CrewMemberCopyWith(_CrewMember value, $Res Function(_CrewMember) _then) = __$CrewMemberCopyWithImpl;
@override @useResult
$Res call({
 String id, String? name,@JsonKey(name: 'first_name') String? firstName,@JsonKey(name: 'last_name') String? lastName, String? phone
});




}
/// @nodoc
class __$CrewMemberCopyWithImpl<$Res>
    implements _$CrewMemberCopyWith<$Res> {
  __$CrewMemberCopyWithImpl(this._self, this._then);

  final _CrewMember _self;
  final $Res Function(_CrewMember) _then;

/// Create a copy of CrewMember
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = freezed,Object? firstName = freezed,Object? lastName = freezed,Object? phone = freezed,}) {
  return _then(_CrewMember(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: freezed == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String?,firstName: freezed == firstName ? _self.firstName : firstName // ignore: cast_nullable_to_non_nullable
as String?,lastName: freezed == lastName ? _self.lastName : lastName // ignore: cast_nullable_to_non_nullable
as String?,phone: freezed == phone ? _self.phone : phone // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$JobClockSession {

 String get id;@JsonKey(name: 'booking_id') String? get bookingId;@JsonKey(name: 'clock_in_at') String? get clockInAt;@JsonKey(name: 'clock_out_at') String? get clockOutAt;@JsonKey(name: 'duration_minutes') int? get durationMinutes;
/// Create a copy of JobClockSession
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$JobClockSessionCopyWith<JobClockSession> get copyWith => _$JobClockSessionCopyWithImpl<JobClockSession>(this as JobClockSession, _$identity);

  /// Serializes this JobClockSession to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is JobClockSession&&(identical(other.id, id) || other.id == id)&&(identical(other.bookingId, bookingId) || other.bookingId == bookingId)&&(identical(other.clockInAt, clockInAt) || other.clockInAt == clockInAt)&&(identical(other.clockOutAt, clockOutAt) || other.clockOutAt == clockOutAt)&&(identical(other.durationMinutes, durationMinutes) || other.durationMinutes == durationMinutes));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,bookingId,clockInAt,clockOutAt,durationMinutes);

@override
String toString() {
  return 'JobClockSession(id: $id, bookingId: $bookingId, clockInAt: $clockInAt, clockOutAt: $clockOutAt, durationMinutes: $durationMinutes)';
}


}

/// @nodoc
abstract mixin class $JobClockSessionCopyWith<$Res>  {
  factory $JobClockSessionCopyWith(JobClockSession value, $Res Function(JobClockSession) _then) = _$JobClockSessionCopyWithImpl;
@useResult
$Res call({
 String id,@JsonKey(name: 'booking_id') String? bookingId,@JsonKey(name: 'clock_in_at') String? clockInAt,@JsonKey(name: 'clock_out_at') String? clockOutAt,@JsonKey(name: 'duration_minutes') int? durationMinutes
});




}
/// @nodoc
class _$JobClockSessionCopyWithImpl<$Res>
    implements $JobClockSessionCopyWith<$Res> {
  _$JobClockSessionCopyWithImpl(this._self, this._then);

  final JobClockSession _self;
  final $Res Function(JobClockSession) _then;

/// Create a copy of JobClockSession
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? bookingId = freezed,Object? clockInAt = freezed,Object? clockOutAt = freezed,Object? durationMinutes = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,bookingId: freezed == bookingId ? _self.bookingId : bookingId // ignore: cast_nullable_to_non_nullable
as String?,clockInAt: freezed == clockInAt ? _self.clockInAt : clockInAt // ignore: cast_nullable_to_non_nullable
as String?,clockOutAt: freezed == clockOutAt ? _self.clockOutAt : clockOutAt // ignore: cast_nullable_to_non_nullable
as String?,durationMinutes: freezed == durationMinutes ? _self.durationMinutes : durationMinutes // ignore: cast_nullable_to_non_nullable
as int?,
  ));
}

}


/// Adds pattern-matching-related methods to [JobClockSession].
extension JobClockSessionPatterns on JobClockSession {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _JobClockSession value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _JobClockSession() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _JobClockSession value)  $default,){
final _that = this;
switch (_that) {
case _JobClockSession():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _JobClockSession value)?  $default,){
final _that = this;
switch (_that) {
case _JobClockSession() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id, @JsonKey(name: 'booking_id')  String? bookingId, @JsonKey(name: 'clock_in_at')  String? clockInAt, @JsonKey(name: 'clock_out_at')  String? clockOutAt, @JsonKey(name: 'duration_minutes')  int? durationMinutes)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _JobClockSession() when $default != null:
return $default(_that.id,_that.bookingId,_that.clockInAt,_that.clockOutAt,_that.durationMinutes);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id, @JsonKey(name: 'booking_id')  String? bookingId, @JsonKey(name: 'clock_in_at')  String? clockInAt, @JsonKey(name: 'clock_out_at')  String? clockOutAt, @JsonKey(name: 'duration_minutes')  int? durationMinutes)  $default,) {final _that = this;
switch (_that) {
case _JobClockSession():
return $default(_that.id,_that.bookingId,_that.clockInAt,_that.clockOutAt,_that.durationMinutes);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id, @JsonKey(name: 'booking_id')  String? bookingId, @JsonKey(name: 'clock_in_at')  String? clockInAt, @JsonKey(name: 'clock_out_at')  String? clockOutAt, @JsonKey(name: 'duration_minutes')  int? durationMinutes)?  $default,) {final _that = this;
switch (_that) {
case _JobClockSession() when $default != null:
return $default(_that.id,_that.bookingId,_that.clockInAt,_that.clockOutAt,_that.durationMinutes);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _JobClockSession implements JobClockSession {
  const _JobClockSession({required this.id, @JsonKey(name: 'booking_id') this.bookingId, @JsonKey(name: 'clock_in_at') this.clockInAt, @JsonKey(name: 'clock_out_at') this.clockOutAt, @JsonKey(name: 'duration_minutes') this.durationMinutes});
  factory _JobClockSession.fromJson(Map<String, dynamic> json) => _$JobClockSessionFromJson(json);

@override final  String id;
@override@JsonKey(name: 'booking_id') final  String? bookingId;
@override@JsonKey(name: 'clock_in_at') final  String? clockInAt;
@override@JsonKey(name: 'clock_out_at') final  String? clockOutAt;
@override@JsonKey(name: 'duration_minutes') final  int? durationMinutes;

/// Create a copy of JobClockSession
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$JobClockSessionCopyWith<_JobClockSession> get copyWith => __$JobClockSessionCopyWithImpl<_JobClockSession>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$JobClockSessionToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _JobClockSession&&(identical(other.id, id) || other.id == id)&&(identical(other.bookingId, bookingId) || other.bookingId == bookingId)&&(identical(other.clockInAt, clockInAt) || other.clockInAt == clockInAt)&&(identical(other.clockOutAt, clockOutAt) || other.clockOutAt == clockOutAt)&&(identical(other.durationMinutes, durationMinutes) || other.durationMinutes == durationMinutes));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,bookingId,clockInAt,clockOutAt,durationMinutes);

@override
String toString() {
  return 'JobClockSession(id: $id, bookingId: $bookingId, clockInAt: $clockInAt, clockOutAt: $clockOutAt, durationMinutes: $durationMinutes)';
}


}

/// @nodoc
abstract mixin class _$JobClockSessionCopyWith<$Res> implements $JobClockSessionCopyWith<$Res> {
  factory _$JobClockSessionCopyWith(_JobClockSession value, $Res Function(_JobClockSession) _then) = __$JobClockSessionCopyWithImpl;
@override @useResult
$Res call({
 String id,@JsonKey(name: 'booking_id') String? bookingId,@JsonKey(name: 'clock_in_at') String? clockInAt,@JsonKey(name: 'clock_out_at') String? clockOutAt,@JsonKey(name: 'duration_minutes') int? durationMinutes
});




}
/// @nodoc
class __$JobClockSessionCopyWithImpl<$Res>
    implements _$JobClockSessionCopyWith<$Res> {
  __$JobClockSessionCopyWithImpl(this._self, this._then);

  final _JobClockSession _self;
  final $Res Function(_JobClockSession) _then;

/// Create a copy of JobClockSession
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? bookingId = freezed,Object? clockInAt = freezed,Object? clockOutAt = freezed,Object? durationMinutes = freezed,}) {
  return _then(_JobClockSession(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,bookingId: freezed == bookingId ? _self.bookingId : bookingId // ignore: cast_nullable_to_non_nullable
as String?,clockInAt: freezed == clockInAt ? _self.clockInAt : clockInAt // ignore: cast_nullable_to_non_nullable
as String?,clockOutAt: freezed == clockOutAt ? _self.clockOutAt : clockOutAt // ignore: cast_nullable_to_non_nullable
as String?,durationMinutes: freezed == durationMinutes ? _self.durationMinutes : durationMinutes // ignore: cast_nullable_to_non_nullable
as int?,
  ));
}


}


/// @nodoc
mixin _$OpenShift {

 String get id;@JsonKey(name: 'clock_in_at') String? get clockInAt;
/// Create a copy of OpenShift
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$OpenShiftCopyWith<OpenShift> get copyWith => _$OpenShiftCopyWithImpl<OpenShift>(this as OpenShift, _$identity);

  /// Serializes this OpenShift to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is OpenShift&&(identical(other.id, id) || other.id == id)&&(identical(other.clockInAt, clockInAt) || other.clockInAt == clockInAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,clockInAt);

@override
String toString() {
  return 'OpenShift(id: $id, clockInAt: $clockInAt)';
}


}

/// @nodoc
abstract mixin class $OpenShiftCopyWith<$Res>  {
  factory $OpenShiftCopyWith(OpenShift value, $Res Function(OpenShift) _then) = _$OpenShiftCopyWithImpl;
@useResult
$Res call({
 String id,@JsonKey(name: 'clock_in_at') String? clockInAt
});




}
/// @nodoc
class _$OpenShiftCopyWithImpl<$Res>
    implements $OpenShiftCopyWith<$Res> {
  _$OpenShiftCopyWithImpl(this._self, this._then);

  final OpenShift _self;
  final $Res Function(OpenShift) _then;

/// Create a copy of OpenShift
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? clockInAt = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,clockInAt: freezed == clockInAt ? _self.clockInAt : clockInAt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [OpenShift].
extension OpenShiftPatterns on OpenShift {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _OpenShift value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _OpenShift() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _OpenShift value)  $default,){
final _that = this;
switch (_that) {
case _OpenShift():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _OpenShift value)?  $default,){
final _that = this;
switch (_that) {
case _OpenShift() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id, @JsonKey(name: 'clock_in_at')  String? clockInAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _OpenShift() when $default != null:
return $default(_that.id,_that.clockInAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id, @JsonKey(name: 'clock_in_at')  String? clockInAt)  $default,) {final _that = this;
switch (_that) {
case _OpenShift():
return $default(_that.id,_that.clockInAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id, @JsonKey(name: 'clock_in_at')  String? clockInAt)?  $default,) {final _that = this;
switch (_that) {
case _OpenShift() when $default != null:
return $default(_that.id,_that.clockInAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _OpenShift implements OpenShift {
  const _OpenShift({required this.id, @JsonKey(name: 'clock_in_at') this.clockInAt});
  factory _OpenShift.fromJson(Map<String, dynamic> json) => _$OpenShiftFromJson(json);

@override final  String id;
@override@JsonKey(name: 'clock_in_at') final  String? clockInAt;

/// Create a copy of OpenShift
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$OpenShiftCopyWith<_OpenShift> get copyWith => __$OpenShiftCopyWithImpl<_OpenShift>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$OpenShiftToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _OpenShift&&(identical(other.id, id) || other.id == id)&&(identical(other.clockInAt, clockInAt) || other.clockInAt == clockInAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,clockInAt);

@override
String toString() {
  return 'OpenShift(id: $id, clockInAt: $clockInAt)';
}


}

/// @nodoc
abstract mixin class _$OpenShiftCopyWith<$Res> implements $OpenShiftCopyWith<$Res> {
  factory _$OpenShiftCopyWith(_OpenShift value, $Res Function(_OpenShift) _then) = __$OpenShiftCopyWithImpl;
@override @useResult
$Res call({
 String id,@JsonKey(name: 'clock_in_at') String? clockInAt
});




}
/// @nodoc
class __$OpenShiftCopyWithImpl<$Res>
    implements _$OpenShiftCopyWith<$Res> {
  __$OpenShiftCopyWithImpl(this._self, this._then);

  final _OpenShift _self;
  final $Res Function(_OpenShift) _then;

/// Create a copy of OpenShift
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? clockInAt = freezed,}) {
  return _then(_OpenShift(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,clockInAt: freezed == clockInAt ? _self.clockInAt : clockInAt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$DailyScheduleResponse {

 CrewAssignment? get assignment; CrewMember? get partner; List<Booking> get bookings;@JsonKey(name: 'open_sessions') List<JobClockSession> get openSessions;@JsonKey(name: 'completed_sessions') List<JobClockSession> get completedSessions;@JsonKey(name: 'open_shift') OpenShift? get openShift;
/// Create a copy of DailyScheduleResponse
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$DailyScheduleResponseCopyWith<DailyScheduleResponse> get copyWith => _$DailyScheduleResponseCopyWithImpl<DailyScheduleResponse>(this as DailyScheduleResponse, _$identity);

  /// Serializes this DailyScheduleResponse to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is DailyScheduleResponse&&(identical(other.assignment, assignment) || other.assignment == assignment)&&(identical(other.partner, partner) || other.partner == partner)&&const DeepCollectionEquality().equals(other.bookings, bookings)&&const DeepCollectionEquality().equals(other.openSessions, openSessions)&&const DeepCollectionEquality().equals(other.completedSessions, completedSessions)&&(identical(other.openShift, openShift) || other.openShift == openShift));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,assignment,partner,const DeepCollectionEquality().hash(bookings),const DeepCollectionEquality().hash(openSessions),const DeepCollectionEquality().hash(completedSessions),openShift);

@override
String toString() {
  return 'DailyScheduleResponse(assignment: $assignment, partner: $partner, bookings: $bookings, openSessions: $openSessions, completedSessions: $completedSessions, openShift: $openShift)';
}


}

/// @nodoc
abstract mixin class $DailyScheduleResponseCopyWith<$Res>  {
  factory $DailyScheduleResponseCopyWith(DailyScheduleResponse value, $Res Function(DailyScheduleResponse) _then) = _$DailyScheduleResponseCopyWithImpl;
@useResult
$Res call({
 CrewAssignment? assignment, CrewMember? partner, List<Booking> bookings,@JsonKey(name: 'open_sessions') List<JobClockSession> openSessions,@JsonKey(name: 'completed_sessions') List<JobClockSession> completedSessions,@JsonKey(name: 'open_shift') OpenShift? openShift
});


$CrewAssignmentCopyWith<$Res>? get assignment;$CrewMemberCopyWith<$Res>? get partner;$OpenShiftCopyWith<$Res>? get openShift;

}
/// @nodoc
class _$DailyScheduleResponseCopyWithImpl<$Res>
    implements $DailyScheduleResponseCopyWith<$Res> {
  _$DailyScheduleResponseCopyWithImpl(this._self, this._then);

  final DailyScheduleResponse _self;
  final $Res Function(DailyScheduleResponse) _then;

/// Create a copy of DailyScheduleResponse
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? assignment = freezed,Object? partner = freezed,Object? bookings = null,Object? openSessions = null,Object? completedSessions = null,Object? openShift = freezed,}) {
  return _then(_self.copyWith(
assignment: freezed == assignment ? _self.assignment : assignment // ignore: cast_nullable_to_non_nullable
as CrewAssignment?,partner: freezed == partner ? _self.partner : partner // ignore: cast_nullable_to_non_nullable
as CrewMember?,bookings: null == bookings ? _self.bookings : bookings // ignore: cast_nullable_to_non_nullable
as List<Booking>,openSessions: null == openSessions ? _self.openSessions : openSessions // ignore: cast_nullable_to_non_nullable
as List<JobClockSession>,completedSessions: null == completedSessions ? _self.completedSessions : completedSessions // ignore: cast_nullable_to_non_nullable
as List<JobClockSession>,openShift: freezed == openShift ? _self.openShift : openShift // ignore: cast_nullable_to_non_nullable
as OpenShift?,
  ));
}
/// Create a copy of DailyScheduleResponse
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$CrewAssignmentCopyWith<$Res>? get assignment {
    if (_self.assignment == null) {
    return null;
  }

  return $CrewAssignmentCopyWith<$Res>(_self.assignment!, (value) {
    return _then(_self.copyWith(assignment: value));
  });
}/// Create a copy of DailyScheduleResponse
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$CrewMemberCopyWith<$Res>? get partner {
    if (_self.partner == null) {
    return null;
  }

  return $CrewMemberCopyWith<$Res>(_self.partner!, (value) {
    return _then(_self.copyWith(partner: value));
  });
}/// Create a copy of DailyScheduleResponse
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$OpenShiftCopyWith<$Res>? get openShift {
    if (_self.openShift == null) {
    return null;
  }

  return $OpenShiftCopyWith<$Res>(_self.openShift!, (value) {
    return _then(_self.copyWith(openShift: value));
  });
}
}


/// Adds pattern-matching-related methods to [DailyScheduleResponse].
extension DailyScheduleResponsePatterns on DailyScheduleResponse {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _DailyScheduleResponse value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _DailyScheduleResponse() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _DailyScheduleResponse value)  $default,){
final _that = this;
switch (_that) {
case _DailyScheduleResponse():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _DailyScheduleResponse value)?  $default,){
final _that = this;
switch (_that) {
case _DailyScheduleResponse() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( CrewAssignment? assignment,  CrewMember? partner,  List<Booking> bookings, @JsonKey(name: 'open_sessions')  List<JobClockSession> openSessions, @JsonKey(name: 'completed_sessions')  List<JobClockSession> completedSessions, @JsonKey(name: 'open_shift')  OpenShift? openShift)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _DailyScheduleResponse() when $default != null:
return $default(_that.assignment,_that.partner,_that.bookings,_that.openSessions,_that.completedSessions,_that.openShift);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( CrewAssignment? assignment,  CrewMember? partner,  List<Booking> bookings, @JsonKey(name: 'open_sessions')  List<JobClockSession> openSessions, @JsonKey(name: 'completed_sessions')  List<JobClockSession> completedSessions, @JsonKey(name: 'open_shift')  OpenShift? openShift)  $default,) {final _that = this;
switch (_that) {
case _DailyScheduleResponse():
return $default(_that.assignment,_that.partner,_that.bookings,_that.openSessions,_that.completedSessions,_that.openShift);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( CrewAssignment? assignment,  CrewMember? partner,  List<Booking> bookings, @JsonKey(name: 'open_sessions')  List<JobClockSession> openSessions, @JsonKey(name: 'completed_sessions')  List<JobClockSession> completedSessions, @JsonKey(name: 'open_shift')  OpenShift? openShift)?  $default,) {final _that = this;
switch (_that) {
case _DailyScheduleResponse() when $default != null:
return $default(_that.assignment,_that.partner,_that.bookings,_that.openSessions,_that.completedSessions,_that.openShift);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _DailyScheduleResponse implements DailyScheduleResponse {
  const _DailyScheduleResponse({this.assignment, this.partner, final  List<Booking> bookings = const <Booking>[], @JsonKey(name: 'open_sessions') final  List<JobClockSession> openSessions = const <JobClockSession>[], @JsonKey(name: 'completed_sessions') final  List<JobClockSession> completedSessions = const <JobClockSession>[], @JsonKey(name: 'open_shift') this.openShift}): _bookings = bookings,_openSessions = openSessions,_completedSessions = completedSessions;
  factory _DailyScheduleResponse.fromJson(Map<String, dynamic> json) => _$DailyScheduleResponseFromJson(json);

@override final  CrewAssignment? assignment;
@override final  CrewMember? partner;
 final  List<Booking> _bookings;
@override@JsonKey() List<Booking> get bookings {
  if (_bookings is EqualUnmodifiableListView) return _bookings;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_bookings);
}

 final  List<JobClockSession> _openSessions;
@override@JsonKey(name: 'open_sessions') List<JobClockSession> get openSessions {
  if (_openSessions is EqualUnmodifiableListView) return _openSessions;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_openSessions);
}

 final  List<JobClockSession> _completedSessions;
@override@JsonKey(name: 'completed_sessions') List<JobClockSession> get completedSessions {
  if (_completedSessions is EqualUnmodifiableListView) return _completedSessions;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_completedSessions);
}

@override@JsonKey(name: 'open_shift') final  OpenShift? openShift;

/// Create a copy of DailyScheduleResponse
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$DailyScheduleResponseCopyWith<_DailyScheduleResponse> get copyWith => __$DailyScheduleResponseCopyWithImpl<_DailyScheduleResponse>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$DailyScheduleResponseToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _DailyScheduleResponse&&(identical(other.assignment, assignment) || other.assignment == assignment)&&(identical(other.partner, partner) || other.partner == partner)&&const DeepCollectionEquality().equals(other._bookings, _bookings)&&const DeepCollectionEquality().equals(other._openSessions, _openSessions)&&const DeepCollectionEquality().equals(other._completedSessions, _completedSessions)&&(identical(other.openShift, openShift) || other.openShift == openShift));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,assignment,partner,const DeepCollectionEquality().hash(_bookings),const DeepCollectionEquality().hash(_openSessions),const DeepCollectionEquality().hash(_completedSessions),openShift);

@override
String toString() {
  return 'DailyScheduleResponse(assignment: $assignment, partner: $partner, bookings: $bookings, openSessions: $openSessions, completedSessions: $completedSessions, openShift: $openShift)';
}


}

/// @nodoc
abstract mixin class _$DailyScheduleResponseCopyWith<$Res> implements $DailyScheduleResponseCopyWith<$Res> {
  factory _$DailyScheduleResponseCopyWith(_DailyScheduleResponse value, $Res Function(_DailyScheduleResponse) _then) = __$DailyScheduleResponseCopyWithImpl;
@override @useResult
$Res call({
 CrewAssignment? assignment, CrewMember? partner, List<Booking> bookings,@JsonKey(name: 'open_sessions') List<JobClockSession> openSessions,@JsonKey(name: 'completed_sessions') List<JobClockSession> completedSessions,@JsonKey(name: 'open_shift') OpenShift? openShift
});


@override $CrewAssignmentCopyWith<$Res>? get assignment;@override $CrewMemberCopyWith<$Res>? get partner;@override $OpenShiftCopyWith<$Res>? get openShift;

}
/// @nodoc
class __$DailyScheduleResponseCopyWithImpl<$Res>
    implements _$DailyScheduleResponseCopyWith<$Res> {
  __$DailyScheduleResponseCopyWithImpl(this._self, this._then);

  final _DailyScheduleResponse _self;
  final $Res Function(_DailyScheduleResponse) _then;

/// Create a copy of DailyScheduleResponse
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? assignment = freezed,Object? partner = freezed,Object? bookings = null,Object? openSessions = null,Object? completedSessions = null,Object? openShift = freezed,}) {
  return _then(_DailyScheduleResponse(
assignment: freezed == assignment ? _self.assignment : assignment // ignore: cast_nullable_to_non_nullable
as CrewAssignment?,partner: freezed == partner ? _self.partner : partner // ignore: cast_nullable_to_non_nullable
as CrewMember?,bookings: null == bookings ? _self._bookings : bookings // ignore: cast_nullable_to_non_nullable
as List<Booking>,openSessions: null == openSessions ? _self._openSessions : openSessions // ignore: cast_nullable_to_non_nullable
as List<JobClockSession>,completedSessions: null == completedSessions ? _self._completedSessions : completedSessions // ignore: cast_nullable_to_non_nullable
as List<JobClockSession>,openShift: freezed == openShift ? _self.openShift : openShift // ignore: cast_nullable_to_non_nullable
as OpenShift?,
  ));
}

/// Create a copy of DailyScheduleResponse
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$CrewAssignmentCopyWith<$Res>? get assignment {
    if (_self.assignment == null) {
    return null;
  }

  return $CrewAssignmentCopyWith<$Res>(_self.assignment!, (value) {
    return _then(_self.copyWith(assignment: value));
  });
}/// Create a copy of DailyScheduleResponse
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$CrewMemberCopyWith<$Res>? get partner {
    if (_self.partner == null) {
    return null;
  }

  return $CrewMemberCopyWith<$Res>(_self.partner!, (value) {
    return _then(_self.copyWith(partner: value));
  });
}/// Create a copy of DailyScheduleResponse
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$OpenShiftCopyWith<$Res>? get openShift {
    if (_self.openShift == null) {
    return null;
  }

  return $OpenShiftCopyWith<$Res>(_self.openShift!, (value) {
    return _then(_self.copyWith(openShift: value));
  });
}
}


/// @nodoc
mixin _$WeekDay {

 String get date; String get dayName; int get dayNum;@JsonKey(name: 'isToday') bool get isToday; CrewAssignment? get assignment; List<Booking> get bookings;
/// Create a copy of WeekDay
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$WeekDayCopyWith<WeekDay> get copyWith => _$WeekDayCopyWithImpl<WeekDay>(this as WeekDay, _$identity);

  /// Serializes this WeekDay to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is WeekDay&&(identical(other.date, date) || other.date == date)&&(identical(other.dayName, dayName) || other.dayName == dayName)&&(identical(other.dayNum, dayNum) || other.dayNum == dayNum)&&(identical(other.isToday, isToday) || other.isToday == isToday)&&(identical(other.assignment, assignment) || other.assignment == assignment)&&const DeepCollectionEquality().equals(other.bookings, bookings));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,date,dayName,dayNum,isToday,assignment,const DeepCollectionEquality().hash(bookings));

@override
String toString() {
  return 'WeekDay(date: $date, dayName: $dayName, dayNum: $dayNum, isToday: $isToday, assignment: $assignment, bookings: $bookings)';
}


}

/// @nodoc
abstract mixin class $WeekDayCopyWith<$Res>  {
  factory $WeekDayCopyWith(WeekDay value, $Res Function(WeekDay) _then) = _$WeekDayCopyWithImpl;
@useResult
$Res call({
 String date, String dayName, int dayNum,@JsonKey(name: 'isToday') bool isToday, CrewAssignment? assignment, List<Booking> bookings
});


$CrewAssignmentCopyWith<$Res>? get assignment;

}
/// @nodoc
class _$WeekDayCopyWithImpl<$Res>
    implements $WeekDayCopyWith<$Res> {
  _$WeekDayCopyWithImpl(this._self, this._then);

  final WeekDay _self;
  final $Res Function(WeekDay) _then;

/// Create a copy of WeekDay
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? date = null,Object? dayName = null,Object? dayNum = null,Object? isToday = null,Object? assignment = freezed,Object? bookings = null,}) {
  return _then(_self.copyWith(
date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,dayName: null == dayName ? _self.dayName : dayName // ignore: cast_nullable_to_non_nullable
as String,dayNum: null == dayNum ? _self.dayNum : dayNum // ignore: cast_nullable_to_non_nullable
as int,isToday: null == isToday ? _self.isToday : isToday // ignore: cast_nullable_to_non_nullable
as bool,assignment: freezed == assignment ? _self.assignment : assignment // ignore: cast_nullable_to_non_nullable
as CrewAssignment?,bookings: null == bookings ? _self.bookings : bookings // ignore: cast_nullable_to_non_nullable
as List<Booking>,
  ));
}
/// Create a copy of WeekDay
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$CrewAssignmentCopyWith<$Res>? get assignment {
    if (_self.assignment == null) {
    return null;
  }

  return $CrewAssignmentCopyWith<$Res>(_self.assignment!, (value) {
    return _then(_self.copyWith(assignment: value));
  });
}
}


/// Adds pattern-matching-related methods to [WeekDay].
extension WeekDayPatterns on WeekDay {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _WeekDay value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _WeekDay() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _WeekDay value)  $default,){
final _that = this;
switch (_that) {
case _WeekDay():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _WeekDay value)?  $default,){
final _that = this;
switch (_that) {
case _WeekDay() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String date,  String dayName,  int dayNum, @JsonKey(name: 'isToday')  bool isToday,  CrewAssignment? assignment,  List<Booking> bookings)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _WeekDay() when $default != null:
return $default(_that.date,_that.dayName,_that.dayNum,_that.isToday,_that.assignment,_that.bookings);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String date,  String dayName,  int dayNum, @JsonKey(name: 'isToday')  bool isToday,  CrewAssignment? assignment,  List<Booking> bookings)  $default,) {final _that = this;
switch (_that) {
case _WeekDay():
return $default(_that.date,_that.dayName,_that.dayNum,_that.isToday,_that.assignment,_that.bookings);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String date,  String dayName,  int dayNum, @JsonKey(name: 'isToday')  bool isToday,  CrewAssignment? assignment,  List<Booking> bookings)?  $default,) {final _that = this;
switch (_that) {
case _WeekDay() when $default != null:
return $default(_that.date,_that.dayName,_that.dayNum,_that.isToday,_that.assignment,_that.bookings);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _WeekDay implements WeekDay {
  const _WeekDay({required this.date, required this.dayName, required this.dayNum, @JsonKey(name: 'isToday') this.isToday = false, this.assignment, final  List<Booking> bookings = const <Booking>[]}): _bookings = bookings;
  factory _WeekDay.fromJson(Map<String, dynamic> json) => _$WeekDayFromJson(json);

@override final  String date;
@override final  String dayName;
@override final  int dayNum;
@override@JsonKey(name: 'isToday') final  bool isToday;
@override final  CrewAssignment? assignment;
 final  List<Booking> _bookings;
@override@JsonKey() List<Booking> get bookings {
  if (_bookings is EqualUnmodifiableListView) return _bookings;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_bookings);
}


/// Create a copy of WeekDay
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$WeekDayCopyWith<_WeekDay> get copyWith => __$WeekDayCopyWithImpl<_WeekDay>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$WeekDayToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _WeekDay&&(identical(other.date, date) || other.date == date)&&(identical(other.dayName, dayName) || other.dayName == dayName)&&(identical(other.dayNum, dayNum) || other.dayNum == dayNum)&&(identical(other.isToday, isToday) || other.isToday == isToday)&&(identical(other.assignment, assignment) || other.assignment == assignment)&&const DeepCollectionEquality().equals(other._bookings, _bookings));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,date,dayName,dayNum,isToday,assignment,const DeepCollectionEquality().hash(_bookings));

@override
String toString() {
  return 'WeekDay(date: $date, dayName: $dayName, dayNum: $dayNum, isToday: $isToday, assignment: $assignment, bookings: $bookings)';
}


}

/// @nodoc
abstract mixin class _$WeekDayCopyWith<$Res> implements $WeekDayCopyWith<$Res> {
  factory _$WeekDayCopyWith(_WeekDay value, $Res Function(_WeekDay) _then) = __$WeekDayCopyWithImpl;
@override @useResult
$Res call({
 String date, String dayName, int dayNum,@JsonKey(name: 'isToday') bool isToday, CrewAssignment? assignment, List<Booking> bookings
});


@override $CrewAssignmentCopyWith<$Res>? get assignment;

}
/// @nodoc
class __$WeekDayCopyWithImpl<$Res>
    implements _$WeekDayCopyWith<$Res> {
  __$WeekDayCopyWithImpl(this._self, this._then);

  final _WeekDay _self;
  final $Res Function(_WeekDay) _then;

/// Create a copy of WeekDay
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? date = null,Object? dayName = null,Object? dayNum = null,Object? isToday = null,Object? assignment = freezed,Object? bookings = null,}) {
  return _then(_WeekDay(
date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,dayName: null == dayName ? _self.dayName : dayName // ignore: cast_nullable_to_non_nullable
as String,dayNum: null == dayNum ? _self.dayNum : dayNum // ignore: cast_nullable_to_non_nullable
as int,isToday: null == isToday ? _self.isToday : isToday // ignore: cast_nullable_to_non_nullable
as bool,assignment: freezed == assignment ? _self.assignment : assignment // ignore: cast_nullable_to_non_nullable
as CrewAssignment?,bookings: null == bookings ? _self._bookings : bookings // ignore: cast_nullable_to_non_nullable
as List<Booking>,
  ));
}

/// Create a copy of WeekDay
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$CrewAssignmentCopyWith<$Res>? get assignment {
    if (_self.assignment == null) {
    return null;
  }

  return $CrewAssignmentCopyWith<$Res>(_self.assignment!, (value) {
    return _then(_self.copyWith(assignment: value));
  });
}
}


/// @nodoc
mixin _$WeeklyScheduleResponse {

 List<WeekDay> get week;@JsonKey(name: 'startDate') String? get startDate;@JsonKey(name: 'endDate') String? get endDate;
/// Create a copy of WeeklyScheduleResponse
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$WeeklyScheduleResponseCopyWith<WeeklyScheduleResponse> get copyWith => _$WeeklyScheduleResponseCopyWithImpl<WeeklyScheduleResponse>(this as WeeklyScheduleResponse, _$identity);

  /// Serializes this WeeklyScheduleResponse to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is WeeklyScheduleResponse&&const DeepCollectionEquality().equals(other.week, week)&&(identical(other.startDate, startDate) || other.startDate == startDate)&&(identical(other.endDate, endDate) || other.endDate == endDate));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,const DeepCollectionEquality().hash(week),startDate,endDate);

@override
String toString() {
  return 'WeeklyScheduleResponse(week: $week, startDate: $startDate, endDate: $endDate)';
}


}

/// @nodoc
abstract mixin class $WeeklyScheduleResponseCopyWith<$Res>  {
  factory $WeeklyScheduleResponseCopyWith(WeeklyScheduleResponse value, $Res Function(WeeklyScheduleResponse) _then) = _$WeeklyScheduleResponseCopyWithImpl;
@useResult
$Res call({
 List<WeekDay> week,@JsonKey(name: 'startDate') String? startDate,@JsonKey(name: 'endDate') String? endDate
});




}
/// @nodoc
class _$WeeklyScheduleResponseCopyWithImpl<$Res>
    implements $WeeklyScheduleResponseCopyWith<$Res> {
  _$WeeklyScheduleResponseCopyWithImpl(this._self, this._then);

  final WeeklyScheduleResponse _self;
  final $Res Function(WeeklyScheduleResponse) _then;

/// Create a copy of WeeklyScheduleResponse
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? week = null,Object? startDate = freezed,Object? endDate = freezed,}) {
  return _then(_self.copyWith(
week: null == week ? _self.week : week // ignore: cast_nullable_to_non_nullable
as List<WeekDay>,startDate: freezed == startDate ? _self.startDate : startDate // ignore: cast_nullable_to_non_nullable
as String?,endDate: freezed == endDate ? _self.endDate : endDate // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [WeeklyScheduleResponse].
extension WeeklyScheduleResponsePatterns on WeeklyScheduleResponse {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _WeeklyScheduleResponse value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _WeeklyScheduleResponse() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _WeeklyScheduleResponse value)  $default,){
final _that = this;
switch (_that) {
case _WeeklyScheduleResponse():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _WeeklyScheduleResponse value)?  $default,){
final _that = this;
switch (_that) {
case _WeeklyScheduleResponse() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( List<WeekDay> week, @JsonKey(name: 'startDate')  String? startDate, @JsonKey(name: 'endDate')  String? endDate)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _WeeklyScheduleResponse() when $default != null:
return $default(_that.week,_that.startDate,_that.endDate);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( List<WeekDay> week, @JsonKey(name: 'startDate')  String? startDate, @JsonKey(name: 'endDate')  String? endDate)  $default,) {final _that = this;
switch (_that) {
case _WeeklyScheduleResponse():
return $default(_that.week,_that.startDate,_that.endDate);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( List<WeekDay> week, @JsonKey(name: 'startDate')  String? startDate, @JsonKey(name: 'endDate')  String? endDate)?  $default,) {final _that = this;
switch (_that) {
case _WeeklyScheduleResponse() when $default != null:
return $default(_that.week,_that.startDate,_that.endDate);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _WeeklyScheduleResponse implements WeeklyScheduleResponse {
  const _WeeklyScheduleResponse({final  List<WeekDay> week = const <WeekDay>[], @JsonKey(name: 'startDate') this.startDate, @JsonKey(name: 'endDate') this.endDate}): _week = week;
  factory _WeeklyScheduleResponse.fromJson(Map<String, dynamic> json) => _$WeeklyScheduleResponseFromJson(json);

 final  List<WeekDay> _week;
@override@JsonKey() List<WeekDay> get week {
  if (_week is EqualUnmodifiableListView) return _week;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_week);
}

@override@JsonKey(name: 'startDate') final  String? startDate;
@override@JsonKey(name: 'endDate') final  String? endDate;

/// Create a copy of WeeklyScheduleResponse
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$WeeklyScheduleResponseCopyWith<_WeeklyScheduleResponse> get copyWith => __$WeeklyScheduleResponseCopyWithImpl<_WeeklyScheduleResponse>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$WeeklyScheduleResponseToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _WeeklyScheduleResponse&&const DeepCollectionEquality().equals(other._week, _week)&&(identical(other.startDate, startDate) || other.startDate == startDate)&&(identical(other.endDate, endDate) || other.endDate == endDate));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,const DeepCollectionEquality().hash(_week),startDate,endDate);

@override
String toString() {
  return 'WeeklyScheduleResponse(week: $week, startDate: $startDate, endDate: $endDate)';
}


}

/// @nodoc
abstract mixin class _$WeeklyScheduleResponseCopyWith<$Res> implements $WeeklyScheduleResponseCopyWith<$Res> {
  factory _$WeeklyScheduleResponseCopyWith(_WeeklyScheduleResponse value, $Res Function(_WeeklyScheduleResponse) _then) = __$WeeklyScheduleResponseCopyWithImpl;
@override @useResult
$Res call({
 List<WeekDay> week,@JsonKey(name: 'startDate') String? startDate,@JsonKey(name: 'endDate') String? endDate
});




}
/// @nodoc
class __$WeeklyScheduleResponseCopyWithImpl<$Res>
    implements _$WeeklyScheduleResponseCopyWith<$Res> {
  __$WeeklyScheduleResponseCopyWithImpl(this._self, this._then);

  final _WeeklyScheduleResponse _self;
  final $Res Function(_WeeklyScheduleResponse) _then;

/// Create a copy of WeeklyScheduleResponse
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? week = null,Object? startDate = freezed,Object? endDate = freezed,}) {
  return _then(_WeeklyScheduleResponse(
week: null == week ? _self._week : week // ignore: cast_nullable_to_non_nullable
as List<WeekDay>,startDate: freezed == startDate ? _self.startDate : startDate // ignore: cast_nullable_to_non_nullable
as String?,endDate: freezed == endDate ? _self.endDate : endDate // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}

// dart format on
