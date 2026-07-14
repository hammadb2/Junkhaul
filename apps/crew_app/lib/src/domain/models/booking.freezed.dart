// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'booking.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$Booking {

 String get id; String? get name; String? get phone; String? get address;@JsonKey(name: 'address_data') AddressData? get addressData;@JsonKey(name: 'job_date') String? get jobDate;@JsonKey(name: 'time_slot') String? get timeSlot;@JsonKey(name: 'window_label') String? get windowLabel;@JsonKey(name: 'window_start') String? get windowStart;@JsonKey(name: 'window_end') String? get windowEnd;@JsonKey(name: 'total_price') double? get totalPrice; String get status;@JsonKey(name: 'load_size') String? get loadSize; String? get notes;@JsonKey(name: 'itemized_items') List<ItemizedItem> get itemizedItems; String? get quadrant;@JsonKey(name: 'payment_method') String? get paymentMethod;@JsonKey(name: 'payment_status') String? get paymentStatus;@JsonKey(name: 'crew_status') String? get crewStatus;@JsonKey(name: 'crew_assignment_id') String? get crewAssignmentId;@JsonKey(name: 'balance_due') double? get balanceDue;@JsonKey(name: 'truck_fullness') String? get truckFullness;
/// Create a copy of Booking
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$BookingCopyWith<Booking> get copyWith => _$BookingCopyWithImpl<Booking>(this as Booking, _$identity);

  /// Serializes this Booking to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Booking&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.phone, phone) || other.phone == phone)&&(identical(other.address, address) || other.address == address)&&(identical(other.addressData, addressData) || other.addressData == addressData)&&(identical(other.jobDate, jobDate) || other.jobDate == jobDate)&&(identical(other.timeSlot, timeSlot) || other.timeSlot == timeSlot)&&(identical(other.windowLabel, windowLabel) || other.windowLabel == windowLabel)&&(identical(other.windowStart, windowStart) || other.windowStart == windowStart)&&(identical(other.windowEnd, windowEnd) || other.windowEnd == windowEnd)&&(identical(other.totalPrice, totalPrice) || other.totalPrice == totalPrice)&&(identical(other.status, status) || other.status == status)&&(identical(other.loadSize, loadSize) || other.loadSize == loadSize)&&(identical(other.notes, notes) || other.notes == notes)&&const DeepCollectionEquality().equals(other.itemizedItems, itemizedItems)&&(identical(other.quadrant, quadrant) || other.quadrant == quadrant)&&(identical(other.paymentMethod, paymentMethod) || other.paymentMethod == paymentMethod)&&(identical(other.paymentStatus, paymentStatus) || other.paymentStatus == paymentStatus)&&(identical(other.crewStatus, crewStatus) || other.crewStatus == crewStatus)&&(identical(other.crewAssignmentId, crewAssignmentId) || other.crewAssignmentId == crewAssignmentId)&&(identical(other.balanceDue, balanceDue) || other.balanceDue == balanceDue)&&(identical(other.truckFullness, truckFullness) || other.truckFullness == truckFullness));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hashAll([runtimeType,id,name,phone,address,addressData,jobDate,timeSlot,windowLabel,windowStart,windowEnd,totalPrice,status,loadSize,notes,const DeepCollectionEquality().hash(itemizedItems),quadrant,paymentMethod,paymentStatus,crewStatus,crewAssignmentId,balanceDue,truckFullness]);

@override
String toString() {
  return 'Booking(id: $id, name: $name, phone: $phone, address: $address, addressData: $addressData, jobDate: $jobDate, timeSlot: $timeSlot, windowLabel: $windowLabel, windowStart: $windowStart, windowEnd: $windowEnd, totalPrice: $totalPrice, status: $status, loadSize: $loadSize, notes: $notes, itemizedItems: $itemizedItems, quadrant: $quadrant, paymentMethod: $paymentMethod, paymentStatus: $paymentStatus, crewStatus: $crewStatus, crewAssignmentId: $crewAssignmentId, balanceDue: $balanceDue, truckFullness: $truckFullness)';
}


}

/// @nodoc
abstract mixin class $BookingCopyWith<$Res>  {
  factory $BookingCopyWith(Booking value, $Res Function(Booking) _then) = _$BookingCopyWithImpl;
@useResult
$Res call({
 String id, String? name, String? phone, String? address,@JsonKey(name: 'address_data') AddressData? addressData,@JsonKey(name: 'job_date') String? jobDate,@JsonKey(name: 'time_slot') String? timeSlot,@JsonKey(name: 'window_label') String? windowLabel,@JsonKey(name: 'window_start') String? windowStart,@JsonKey(name: 'window_end') String? windowEnd,@JsonKey(name: 'total_price') double? totalPrice, String status,@JsonKey(name: 'load_size') String? loadSize, String? notes,@JsonKey(name: 'itemized_items') List<ItemizedItem> itemizedItems, String? quadrant,@JsonKey(name: 'payment_method') String? paymentMethod,@JsonKey(name: 'payment_status') String? paymentStatus,@JsonKey(name: 'crew_status') String? crewStatus,@JsonKey(name: 'crew_assignment_id') String? crewAssignmentId,@JsonKey(name: 'balance_due') double? balanceDue,@JsonKey(name: 'truck_fullness') String? truckFullness
});


$AddressDataCopyWith<$Res>? get addressData;

}
/// @nodoc
class _$BookingCopyWithImpl<$Res>
    implements $BookingCopyWith<$Res> {
  _$BookingCopyWithImpl(this._self, this._then);

  final Booking _self;
  final $Res Function(Booking) _then;

/// Create a copy of Booking
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = freezed,Object? phone = freezed,Object? address = freezed,Object? addressData = freezed,Object? jobDate = freezed,Object? timeSlot = freezed,Object? windowLabel = freezed,Object? windowStart = freezed,Object? windowEnd = freezed,Object? totalPrice = freezed,Object? status = null,Object? loadSize = freezed,Object? notes = freezed,Object? itemizedItems = null,Object? quadrant = freezed,Object? paymentMethod = freezed,Object? paymentStatus = freezed,Object? crewStatus = freezed,Object? crewAssignmentId = freezed,Object? balanceDue = freezed,Object? truckFullness = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: freezed == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String?,phone: freezed == phone ? _self.phone : phone // ignore: cast_nullable_to_non_nullable
as String?,address: freezed == address ? _self.address : address // ignore: cast_nullable_to_non_nullable
as String?,addressData: freezed == addressData ? _self.addressData : addressData // ignore: cast_nullable_to_non_nullable
as AddressData?,jobDate: freezed == jobDate ? _self.jobDate : jobDate // ignore: cast_nullable_to_non_nullable
as String?,timeSlot: freezed == timeSlot ? _self.timeSlot : timeSlot // ignore: cast_nullable_to_non_nullable
as String?,windowLabel: freezed == windowLabel ? _self.windowLabel : windowLabel // ignore: cast_nullable_to_non_nullable
as String?,windowStart: freezed == windowStart ? _self.windowStart : windowStart // ignore: cast_nullable_to_non_nullable
as String?,windowEnd: freezed == windowEnd ? _self.windowEnd : windowEnd // ignore: cast_nullable_to_non_nullable
as String?,totalPrice: freezed == totalPrice ? _self.totalPrice : totalPrice // ignore: cast_nullable_to_non_nullable
as double?,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,loadSize: freezed == loadSize ? _self.loadSize : loadSize // ignore: cast_nullable_to_non_nullable
as String?,notes: freezed == notes ? _self.notes : notes // ignore: cast_nullable_to_non_nullable
as String?,itemizedItems: null == itemizedItems ? _self.itemizedItems : itemizedItems // ignore: cast_nullable_to_non_nullable
as List<ItemizedItem>,quadrant: freezed == quadrant ? _self.quadrant : quadrant // ignore: cast_nullable_to_non_nullable
as String?,paymentMethod: freezed == paymentMethod ? _self.paymentMethod : paymentMethod // ignore: cast_nullable_to_non_nullable
as String?,paymentStatus: freezed == paymentStatus ? _self.paymentStatus : paymentStatus // ignore: cast_nullable_to_non_nullable
as String?,crewStatus: freezed == crewStatus ? _self.crewStatus : crewStatus // ignore: cast_nullable_to_non_nullable
as String?,crewAssignmentId: freezed == crewAssignmentId ? _self.crewAssignmentId : crewAssignmentId // ignore: cast_nullable_to_non_nullable
as String?,balanceDue: freezed == balanceDue ? _self.balanceDue : balanceDue // ignore: cast_nullable_to_non_nullable
as double?,truckFullness: freezed == truckFullness ? _self.truckFullness : truckFullness // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}
/// Create a copy of Booking
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$AddressDataCopyWith<$Res>? get addressData {
    if (_self.addressData == null) {
    return null;
  }

  return $AddressDataCopyWith<$Res>(_self.addressData!, (value) {
    return _then(_self.copyWith(addressData: value));
  });
}
}


/// Adds pattern-matching-related methods to [Booking].
extension BookingPatterns on Booking {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _Booking value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _Booking() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _Booking value)  $default,){
final _that = this;
switch (_that) {
case _Booking():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _Booking value)?  $default,){
final _that = this;
switch (_that) {
case _Booking() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String? name,  String? phone,  String? address, @JsonKey(name: 'address_data')  AddressData? addressData, @JsonKey(name: 'job_date')  String? jobDate, @JsonKey(name: 'time_slot')  String? timeSlot, @JsonKey(name: 'window_label')  String? windowLabel, @JsonKey(name: 'window_start')  String? windowStart, @JsonKey(name: 'window_end')  String? windowEnd, @JsonKey(name: 'total_price')  double? totalPrice,  String status, @JsonKey(name: 'load_size')  String? loadSize,  String? notes, @JsonKey(name: 'itemized_items')  List<ItemizedItem> itemizedItems,  String? quadrant, @JsonKey(name: 'payment_method')  String? paymentMethod, @JsonKey(name: 'payment_status')  String? paymentStatus, @JsonKey(name: 'crew_status')  String? crewStatus, @JsonKey(name: 'crew_assignment_id')  String? crewAssignmentId, @JsonKey(name: 'balance_due')  double? balanceDue, @JsonKey(name: 'truck_fullness')  String? truckFullness)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Booking() when $default != null:
return $default(_that.id,_that.name,_that.phone,_that.address,_that.addressData,_that.jobDate,_that.timeSlot,_that.windowLabel,_that.windowStart,_that.windowEnd,_that.totalPrice,_that.status,_that.loadSize,_that.notes,_that.itemizedItems,_that.quadrant,_that.paymentMethod,_that.paymentStatus,_that.crewStatus,_that.crewAssignmentId,_that.balanceDue,_that.truckFullness);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String? name,  String? phone,  String? address, @JsonKey(name: 'address_data')  AddressData? addressData, @JsonKey(name: 'job_date')  String? jobDate, @JsonKey(name: 'time_slot')  String? timeSlot, @JsonKey(name: 'window_label')  String? windowLabel, @JsonKey(name: 'window_start')  String? windowStart, @JsonKey(name: 'window_end')  String? windowEnd, @JsonKey(name: 'total_price')  double? totalPrice,  String status, @JsonKey(name: 'load_size')  String? loadSize,  String? notes, @JsonKey(name: 'itemized_items')  List<ItemizedItem> itemizedItems,  String? quadrant, @JsonKey(name: 'payment_method')  String? paymentMethod, @JsonKey(name: 'payment_status')  String? paymentStatus, @JsonKey(name: 'crew_status')  String? crewStatus, @JsonKey(name: 'crew_assignment_id')  String? crewAssignmentId, @JsonKey(name: 'balance_due')  double? balanceDue, @JsonKey(name: 'truck_fullness')  String? truckFullness)  $default,) {final _that = this;
switch (_that) {
case _Booking():
return $default(_that.id,_that.name,_that.phone,_that.address,_that.addressData,_that.jobDate,_that.timeSlot,_that.windowLabel,_that.windowStart,_that.windowEnd,_that.totalPrice,_that.status,_that.loadSize,_that.notes,_that.itemizedItems,_that.quadrant,_that.paymentMethod,_that.paymentStatus,_that.crewStatus,_that.crewAssignmentId,_that.balanceDue,_that.truckFullness);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String? name,  String? phone,  String? address, @JsonKey(name: 'address_data')  AddressData? addressData, @JsonKey(name: 'job_date')  String? jobDate, @JsonKey(name: 'time_slot')  String? timeSlot, @JsonKey(name: 'window_label')  String? windowLabel, @JsonKey(name: 'window_start')  String? windowStart, @JsonKey(name: 'window_end')  String? windowEnd, @JsonKey(name: 'total_price')  double? totalPrice,  String status, @JsonKey(name: 'load_size')  String? loadSize,  String? notes, @JsonKey(name: 'itemized_items')  List<ItemizedItem> itemizedItems,  String? quadrant, @JsonKey(name: 'payment_method')  String? paymentMethod, @JsonKey(name: 'payment_status')  String? paymentStatus, @JsonKey(name: 'crew_status')  String? crewStatus, @JsonKey(name: 'crew_assignment_id')  String? crewAssignmentId, @JsonKey(name: 'balance_due')  double? balanceDue, @JsonKey(name: 'truck_fullness')  String? truckFullness)?  $default,) {final _that = this;
switch (_that) {
case _Booking() when $default != null:
return $default(_that.id,_that.name,_that.phone,_that.address,_that.addressData,_that.jobDate,_that.timeSlot,_that.windowLabel,_that.windowStart,_that.windowEnd,_that.totalPrice,_that.status,_that.loadSize,_that.notes,_that.itemizedItems,_that.quadrant,_that.paymentMethod,_that.paymentStatus,_that.crewStatus,_that.crewAssignmentId,_that.balanceDue,_that.truckFullness);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Booking implements Booking {
  const _Booking({required this.id, this.name, this.phone, this.address, @JsonKey(name: 'address_data') this.addressData, @JsonKey(name: 'job_date') this.jobDate, @JsonKey(name: 'time_slot') this.timeSlot, @JsonKey(name: 'window_label') this.windowLabel, @JsonKey(name: 'window_start') this.windowStart, @JsonKey(name: 'window_end') this.windowEnd, @JsonKey(name: 'total_price') this.totalPrice, this.status = 'confirmed', @JsonKey(name: 'load_size') this.loadSize, this.notes, @JsonKey(name: 'itemized_items') final  List<ItemizedItem> itemizedItems = const <ItemizedItem>[], this.quadrant, @JsonKey(name: 'payment_method') this.paymentMethod, @JsonKey(name: 'payment_status') this.paymentStatus, @JsonKey(name: 'crew_status') this.crewStatus, @JsonKey(name: 'crew_assignment_id') this.crewAssignmentId, @JsonKey(name: 'balance_due') this.balanceDue, @JsonKey(name: 'truck_fullness') this.truckFullness}): _itemizedItems = itemizedItems;
  factory _Booking.fromJson(Map<String, dynamic> json) => _$BookingFromJson(json);

@override final  String id;
@override final  String? name;
@override final  String? phone;
@override final  String? address;
@override@JsonKey(name: 'address_data') final  AddressData? addressData;
@override@JsonKey(name: 'job_date') final  String? jobDate;
@override@JsonKey(name: 'time_slot') final  String? timeSlot;
@override@JsonKey(name: 'window_label') final  String? windowLabel;
@override@JsonKey(name: 'window_start') final  String? windowStart;
@override@JsonKey(name: 'window_end') final  String? windowEnd;
@override@JsonKey(name: 'total_price') final  double? totalPrice;
@override@JsonKey() final  String status;
@override@JsonKey(name: 'load_size') final  String? loadSize;
@override final  String? notes;
 final  List<ItemizedItem> _itemizedItems;
@override@JsonKey(name: 'itemized_items') List<ItemizedItem> get itemizedItems {
  if (_itemizedItems is EqualUnmodifiableListView) return _itemizedItems;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_itemizedItems);
}

@override final  String? quadrant;
@override@JsonKey(name: 'payment_method') final  String? paymentMethod;
@override@JsonKey(name: 'payment_status') final  String? paymentStatus;
@override@JsonKey(name: 'crew_status') final  String? crewStatus;
@override@JsonKey(name: 'crew_assignment_id') final  String? crewAssignmentId;
@override@JsonKey(name: 'balance_due') final  double? balanceDue;
@override@JsonKey(name: 'truck_fullness') final  String? truckFullness;

/// Create a copy of Booking
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$BookingCopyWith<_Booking> get copyWith => __$BookingCopyWithImpl<_Booking>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$BookingToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _Booking&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.phone, phone) || other.phone == phone)&&(identical(other.address, address) || other.address == address)&&(identical(other.addressData, addressData) || other.addressData == addressData)&&(identical(other.jobDate, jobDate) || other.jobDate == jobDate)&&(identical(other.timeSlot, timeSlot) || other.timeSlot == timeSlot)&&(identical(other.windowLabel, windowLabel) || other.windowLabel == windowLabel)&&(identical(other.windowStart, windowStart) || other.windowStart == windowStart)&&(identical(other.windowEnd, windowEnd) || other.windowEnd == windowEnd)&&(identical(other.totalPrice, totalPrice) || other.totalPrice == totalPrice)&&(identical(other.status, status) || other.status == status)&&(identical(other.loadSize, loadSize) || other.loadSize == loadSize)&&(identical(other.notes, notes) || other.notes == notes)&&const DeepCollectionEquality().equals(other._itemizedItems, _itemizedItems)&&(identical(other.quadrant, quadrant) || other.quadrant == quadrant)&&(identical(other.paymentMethod, paymentMethod) || other.paymentMethod == paymentMethod)&&(identical(other.paymentStatus, paymentStatus) || other.paymentStatus == paymentStatus)&&(identical(other.crewStatus, crewStatus) || other.crewStatus == crewStatus)&&(identical(other.crewAssignmentId, crewAssignmentId) || other.crewAssignmentId == crewAssignmentId)&&(identical(other.balanceDue, balanceDue) || other.balanceDue == balanceDue)&&(identical(other.truckFullness, truckFullness) || other.truckFullness == truckFullness));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hashAll([runtimeType,id,name,phone,address,addressData,jobDate,timeSlot,windowLabel,windowStart,windowEnd,totalPrice,status,loadSize,notes,const DeepCollectionEquality().hash(_itemizedItems),quadrant,paymentMethod,paymentStatus,crewStatus,crewAssignmentId,balanceDue,truckFullness]);

@override
String toString() {
  return 'Booking(id: $id, name: $name, phone: $phone, address: $address, addressData: $addressData, jobDate: $jobDate, timeSlot: $timeSlot, windowLabel: $windowLabel, windowStart: $windowStart, windowEnd: $windowEnd, totalPrice: $totalPrice, status: $status, loadSize: $loadSize, notes: $notes, itemizedItems: $itemizedItems, quadrant: $quadrant, paymentMethod: $paymentMethod, paymentStatus: $paymentStatus, crewStatus: $crewStatus, crewAssignmentId: $crewAssignmentId, balanceDue: $balanceDue, truckFullness: $truckFullness)';
}


}

/// @nodoc
abstract mixin class _$BookingCopyWith<$Res> implements $BookingCopyWith<$Res> {
  factory _$BookingCopyWith(_Booking value, $Res Function(_Booking) _then) = __$BookingCopyWithImpl;
@override @useResult
$Res call({
 String id, String? name, String? phone, String? address,@JsonKey(name: 'address_data') AddressData? addressData,@JsonKey(name: 'job_date') String? jobDate,@JsonKey(name: 'time_slot') String? timeSlot,@JsonKey(name: 'window_label') String? windowLabel,@JsonKey(name: 'window_start') String? windowStart,@JsonKey(name: 'window_end') String? windowEnd,@JsonKey(name: 'total_price') double? totalPrice, String status,@JsonKey(name: 'load_size') String? loadSize, String? notes,@JsonKey(name: 'itemized_items') List<ItemizedItem> itemizedItems, String? quadrant,@JsonKey(name: 'payment_method') String? paymentMethod,@JsonKey(name: 'payment_status') String? paymentStatus,@JsonKey(name: 'crew_status') String? crewStatus,@JsonKey(name: 'crew_assignment_id') String? crewAssignmentId,@JsonKey(name: 'balance_due') double? balanceDue,@JsonKey(name: 'truck_fullness') String? truckFullness
});


@override $AddressDataCopyWith<$Res>? get addressData;

}
/// @nodoc
class __$BookingCopyWithImpl<$Res>
    implements _$BookingCopyWith<$Res> {
  __$BookingCopyWithImpl(this._self, this._then);

  final _Booking _self;
  final $Res Function(_Booking) _then;

/// Create a copy of Booking
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = freezed,Object? phone = freezed,Object? address = freezed,Object? addressData = freezed,Object? jobDate = freezed,Object? timeSlot = freezed,Object? windowLabel = freezed,Object? windowStart = freezed,Object? windowEnd = freezed,Object? totalPrice = freezed,Object? status = null,Object? loadSize = freezed,Object? notes = freezed,Object? itemizedItems = null,Object? quadrant = freezed,Object? paymentMethod = freezed,Object? paymentStatus = freezed,Object? crewStatus = freezed,Object? crewAssignmentId = freezed,Object? balanceDue = freezed,Object? truckFullness = freezed,}) {
  return _then(_Booking(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: freezed == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String?,phone: freezed == phone ? _self.phone : phone // ignore: cast_nullable_to_non_nullable
as String?,address: freezed == address ? _self.address : address // ignore: cast_nullable_to_non_nullable
as String?,addressData: freezed == addressData ? _self.addressData : addressData // ignore: cast_nullable_to_non_nullable
as AddressData?,jobDate: freezed == jobDate ? _self.jobDate : jobDate // ignore: cast_nullable_to_non_nullable
as String?,timeSlot: freezed == timeSlot ? _self.timeSlot : timeSlot // ignore: cast_nullable_to_non_nullable
as String?,windowLabel: freezed == windowLabel ? _self.windowLabel : windowLabel // ignore: cast_nullable_to_non_nullable
as String?,windowStart: freezed == windowStart ? _self.windowStart : windowStart // ignore: cast_nullable_to_non_nullable
as String?,windowEnd: freezed == windowEnd ? _self.windowEnd : windowEnd // ignore: cast_nullable_to_non_nullable
as String?,totalPrice: freezed == totalPrice ? _self.totalPrice : totalPrice // ignore: cast_nullable_to_non_nullable
as double?,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,loadSize: freezed == loadSize ? _self.loadSize : loadSize // ignore: cast_nullable_to_non_nullable
as String?,notes: freezed == notes ? _self.notes : notes // ignore: cast_nullable_to_non_nullable
as String?,itemizedItems: null == itemizedItems ? _self._itemizedItems : itemizedItems // ignore: cast_nullable_to_non_nullable
as List<ItemizedItem>,quadrant: freezed == quadrant ? _self.quadrant : quadrant // ignore: cast_nullable_to_non_nullable
as String?,paymentMethod: freezed == paymentMethod ? _self.paymentMethod : paymentMethod // ignore: cast_nullable_to_non_nullable
as String?,paymentStatus: freezed == paymentStatus ? _self.paymentStatus : paymentStatus // ignore: cast_nullable_to_non_nullable
as String?,crewStatus: freezed == crewStatus ? _self.crewStatus : crewStatus // ignore: cast_nullable_to_non_nullable
as String?,crewAssignmentId: freezed == crewAssignmentId ? _self.crewAssignmentId : crewAssignmentId // ignore: cast_nullable_to_non_nullable
as String?,balanceDue: freezed == balanceDue ? _self.balanceDue : balanceDue // ignore: cast_nullable_to_non_nullable
as double?,truckFullness: freezed == truckFullness ? _self.truckFullness : truckFullness // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

/// Create a copy of Booking
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$AddressDataCopyWith<$Res>? get addressData {
    if (_self.addressData == null) {
    return null;
  }

  return $AddressDataCopyWith<$Res>(_self.addressData!, (value) {
    return _then(_self.copyWith(addressData: value));
  });
}
}


/// @nodoc
mixin _$AddressData {

 double? get lat; double? get lng; String? get placeName; String? get fullAddress;
/// Create a copy of AddressData
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$AddressDataCopyWith<AddressData> get copyWith => _$AddressDataCopyWithImpl<AddressData>(this as AddressData, _$identity);

  /// Serializes this AddressData to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is AddressData&&(identical(other.lat, lat) || other.lat == lat)&&(identical(other.lng, lng) || other.lng == lng)&&(identical(other.placeName, placeName) || other.placeName == placeName)&&(identical(other.fullAddress, fullAddress) || other.fullAddress == fullAddress));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,lat,lng,placeName,fullAddress);

@override
String toString() {
  return 'AddressData(lat: $lat, lng: $lng, placeName: $placeName, fullAddress: $fullAddress)';
}


}

/// @nodoc
abstract mixin class $AddressDataCopyWith<$Res>  {
  factory $AddressDataCopyWith(AddressData value, $Res Function(AddressData) _then) = _$AddressDataCopyWithImpl;
@useResult
$Res call({
 double? lat, double? lng, String? placeName, String? fullAddress
});




}
/// @nodoc
class _$AddressDataCopyWithImpl<$Res>
    implements $AddressDataCopyWith<$Res> {
  _$AddressDataCopyWithImpl(this._self, this._then);

  final AddressData _self;
  final $Res Function(AddressData) _then;

/// Create a copy of AddressData
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? lat = freezed,Object? lng = freezed,Object? placeName = freezed,Object? fullAddress = freezed,}) {
  return _then(_self.copyWith(
lat: freezed == lat ? _self.lat : lat // ignore: cast_nullable_to_non_nullable
as double?,lng: freezed == lng ? _self.lng : lng // ignore: cast_nullable_to_non_nullable
as double?,placeName: freezed == placeName ? _self.placeName : placeName // ignore: cast_nullable_to_non_nullable
as String?,fullAddress: freezed == fullAddress ? _self.fullAddress : fullAddress // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [AddressData].
extension AddressDataPatterns on AddressData {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _AddressData value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _AddressData() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _AddressData value)  $default,){
final _that = this;
switch (_that) {
case _AddressData():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _AddressData value)?  $default,){
final _that = this;
switch (_that) {
case _AddressData() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( double? lat,  double? lng,  String? placeName,  String? fullAddress)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _AddressData() when $default != null:
return $default(_that.lat,_that.lng,_that.placeName,_that.fullAddress);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( double? lat,  double? lng,  String? placeName,  String? fullAddress)  $default,) {final _that = this;
switch (_that) {
case _AddressData():
return $default(_that.lat,_that.lng,_that.placeName,_that.fullAddress);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( double? lat,  double? lng,  String? placeName,  String? fullAddress)?  $default,) {final _that = this;
switch (_that) {
case _AddressData() when $default != null:
return $default(_that.lat,_that.lng,_that.placeName,_that.fullAddress);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _AddressData implements AddressData {
  const _AddressData({this.lat, this.lng, this.placeName, this.fullAddress});
  factory _AddressData.fromJson(Map<String, dynamic> json) => _$AddressDataFromJson(json);

@override final  double? lat;
@override final  double? lng;
@override final  String? placeName;
@override final  String? fullAddress;

/// Create a copy of AddressData
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$AddressDataCopyWith<_AddressData> get copyWith => __$AddressDataCopyWithImpl<_AddressData>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$AddressDataToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _AddressData&&(identical(other.lat, lat) || other.lat == lat)&&(identical(other.lng, lng) || other.lng == lng)&&(identical(other.placeName, placeName) || other.placeName == placeName)&&(identical(other.fullAddress, fullAddress) || other.fullAddress == fullAddress));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,lat,lng,placeName,fullAddress);

@override
String toString() {
  return 'AddressData(lat: $lat, lng: $lng, placeName: $placeName, fullAddress: $fullAddress)';
}


}

/// @nodoc
abstract mixin class _$AddressDataCopyWith<$Res> implements $AddressDataCopyWith<$Res> {
  factory _$AddressDataCopyWith(_AddressData value, $Res Function(_AddressData) _then) = __$AddressDataCopyWithImpl;
@override @useResult
$Res call({
 double? lat, double? lng, String? placeName, String? fullAddress
});




}
/// @nodoc
class __$AddressDataCopyWithImpl<$Res>
    implements _$AddressDataCopyWith<$Res> {
  __$AddressDataCopyWithImpl(this._self, this._then);

  final _AddressData _self;
  final $Res Function(_AddressData) _then;

/// Create a copy of AddressData
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? lat = freezed,Object? lng = freezed,Object? placeName = freezed,Object? fullAddress = freezed,}) {
  return _then(_AddressData(
lat: freezed == lat ? _self.lat : lat // ignore: cast_nullable_to_non_nullable
as double?,lng: freezed == lng ? _self.lng : lng // ignore: cast_nullable_to_non_nullable
as double?,placeName: freezed == placeName ? _self.placeName : placeName // ignore: cast_nullable_to_non_nullable
as String?,fullAddress: freezed == fullAddress ? _self.fullAddress : fullAddress // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$ItemizedItem {

 String? get name; String? get description; int? get quantity; double? get price; String? get condition;@JsonKey(name: 'condition_note') String? get conditionNote;
/// Create a copy of ItemizedItem
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ItemizedItemCopyWith<ItemizedItem> get copyWith => _$ItemizedItemCopyWithImpl<ItemizedItem>(this as ItemizedItem, _$identity);

  /// Serializes this ItemizedItem to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ItemizedItem&&(identical(other.name, name) || other.name == name)&&(identical(other.description, description) || other.description == description)&&(identical(other.quantity, quantity) || other.quantity == quantity)&&(identical(other.price, price) || other.price == price)&&(identical(other.condition, condition) || other.condition == condition)&&(identical(other.conditionNote, conditionNote) || other.conditionNote == conditionNote));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,name,description,quantity,price,condition,conditionNote);

@override
String toString() {
  return 'ItemizedItem(name: $name, description: $description, quantity: $quantity, price: $price, condition: $condition, conditionNote: $conditionNote)';
}


}

/// @nodoc
abstract mixin class $ItemizedItemCopyWith<$Res>  {
  factory $ItemizedItemCopyWith(ItemizedItem value, $Res Function(ItemizedItem) _then) = _$ItemizedItemCopyWithImpl;
@useResult
$Res call({
 String? name, String? description, int? quantity, double? price, String? condition,@JsonKey(name: 'condition_note') String? conditionNote
});




}
/// @nodoc
class _$ItemizedItemCopyWithImpl<$Res>
    implements $ItemizedItemCopyWith<$Res> {
  _$ItemizedItemCopyWithImpl(this._self, this._then);

  final ItemizedItem _self;
  final $Res Function(ItemizedItem) _then;

/// Create a copy of ItemizedItem
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? name = freezed,Object? description = freezed,Object? quantity = freezed,Object? price = freezed,Object? condition = freezed,Object? conditionNote = freezed,}) {
  return _then(_self.copyWith(
name: freezed == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String?,description: freezed == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String?,quantity: freezed == quantity ? _self.quantity : quantity // ignore: cast_nullable_to_non_nullable
as int?,price: freezed == price ? _self.price : price // ignore: cast_nullable_to_non_nullable
as double?,condition: freezed == condition ? _self.condition : condition // ignore: cast_nullable_to_non_nullable
as String?,conditionNote: freezed == conditionNote ? _self.conditionNote : conditionNote // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [ItemizedItem].
extension ItemizedItemPatterns on ItemizedItem {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ItemizedItem value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ItemizedItem() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ItemizedItem value)  $default,){
final _that = this;
switch (_that) {
case _ItemizedItem():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ItemizedItem value)?  $default,){
final _that = this;
switch (_that) {
case _ItemizedItem() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String? name,  String? description,  int? quantity,  double? price,  String? condition, @JsonKey(name: 'condition_note')  String? conditionNote)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ItemizedItem() when $default != null:
return $default(_that.name,_that.description,_that.quantity,_that.price,_that.condition,_that.conditionNote);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String? name,  String? description,  int? quantity,  double? price,  String? condition, @JsonKey(name: 'condition_note')  String? conditionNote)  $default,) {final _that = this;
switch (_that) {
case _ItemizedItem():
return $default(_that.name,_that.description,_that.quantity,_that.price,_that.condition,_that.conditionNote);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String? name,  String? description,  int? quantity,  double? price,  String? condition, @JsonKey(name: 'condition_note')  String? conditionNote)?  $default,) {final _that = this;
switch (_that) {
case _ItemizedItem() when $default != null:
return $default(_that.name,_that.description,_that.quantity,_that.price,_that.condition,_that.conditionNote);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ItemizedItem implements ItemizedItem {
  const _ItemizedItem({this.name, this.description, this.quantity, this.price, this.condition, @JsonKey(name: 'condition_note') this.conditionNote});
  factory _ItemizedItem.fromJson(Map<String, dynamic> json) => _$ItemizedItemFromJson(json);

@override final  String? name;
@override final  String? description;
@override final  int? quantity;
@override final  double? price;
@override final  String? condition;
@override@JsonKey(name: 'condition_note') final  String? conditionNote;

/// Create a copy of ItemizedItem
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ItemizedItemCopyWith<_ItemizedItem> get copyWith => __$ItemizedItemCopyWithImpl<_ItemizedItem>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ItemizedItemToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ItemizedItem&&(identical(other.name, name) || other.name == name)&&(identical(other.description, description) || other.description == description)&&(identical(other.quantity, quantity) || other.quantity == quantity)&&(identical(other.price, price) || other.price == price)&&(identical(other.condition, condition) || other.condition == condition)&&(identical(other.conditionNote, conditionNote) || other.conditionNote == conditionNote));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,name,description,quantity,price,condition,conditionNote);

@override
String toString() {
  return 'ItemizedItem(name: $name, description: $description, quantity: $quantity, price: $price, condition: $condition, conditionNote: $conditionNote)';
}


}

/// @nodoc
abstract mixin class _$ItemizedItemCopyWith<$Res> implements $ItemizedItemCopyWith<$Res> {
  factory _$ItemizedItemCopyWith(_ItemizedItem value, $Res Function(_ItemizedItem) _then) = __$ItemizedItemCopyWithImpl;
@override @useResult
$Res call({
 String? name, String? description, int? quantity, double? price, String? condition,@JsonKey(name: 'condition_note') String? conditionNote
});




}
/// @nodoc
class __$ItemizedItemCopyWithImpl<$Res>
    implements _$ItemizedItemCopyWith<$Res> {
  __$ItemizedItemCopyWithImpl(this._self, this._then);

  final _ItemizedItem _self;
  final $Res Function(_ItemizedItem) _then;

/// Create a copy of ItemizedItem
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? name = freezed,Object? description = freezed,Object? quantity = freezed,Object? price = freezed,Object? condition = freezed,Object? conditionNote = freezed,}) {
  return _then(_ItemizedItem(
name: freezed == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String?,description: freezed == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String?,quantity: freezed == quantity ? _self.quantity : quantity // ignore: cast_nullable_to_non_nullable
as int?,price: freezed == price ? _self.price : price // ignore: cast_nullable_to_non_nullable
as double?,condition: freezed == condition ? _self.condition : condition // ignore: cast_nullable_to_non_nullable
as String?,conditionNote: freezed == conditionNote ? _self.conditionNote : conditionNote // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}

// dart format on
