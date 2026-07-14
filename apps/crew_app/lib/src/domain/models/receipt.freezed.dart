// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'receipt.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$Receipt {

 String get id;@JsonKey(name: 'assignment_id') String? get assignmentId;@JsonKey(name: 'receipt_type') String? get receiptType; String? get vendor;@JsonKey(name: 'amount_cad') double? get amountCad;@JsonKey(name: 'receipt_photo_url') String? get receiptPhotoUrl; String? get notes;@JsonKey(name: 'created_at') String? get createdAt;
/// Create a copy of Receipt
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ReceiptCopyWith<Receipt> get copyWith => _$ReceiptCopyWithImpl<Receipt>(this as Receipt, _$identity);

  /// Serializes this Receipt to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Receipt&&(identical(other.id, id) || other.id == id)&&(identical(other.assignmentId, assignmentId) || other.assignmentId == assignmentId)&&(identical(other.receiptType, receiptType) || other.receiptType == receiptType)&&(identical(other.vendor, vendor) || other.vendor == vendor)&&(identical(other.amountCad, amountCad) || other.amountCad == amountCad)&&(identical(other.receiptPhotoUrl, receiptPhotoUrl) || other.receiptPhotoUrl == receiptPhotoUrl)&&(identical(other.notes, notes) || other.notes == notes)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,assignmentId,receiptType,vendor,amountCad,receiptPhotoUrl,notes,createdAt);

@override
String toString() {
  return 'Receipt(id: $id, assignmentId: $assignmentId, receiptType: $receiptType, vendor: $vendor, amountCad: $amountCad, receiptPhotoUrl: $receiptPhotoUrl, notes: $notes, createdAt: $createdAt)';
}


}

/// @nodoc
abstract mixin class $ReceiptCopyWith<$Res>  {
  factory $ReceiptCopyWith(Receipt value, $Res Function(Receipt) _then) = _$ReceiptCopyWithImpl;
@useResult
$Res call({
 String id,@JsonKey(name: 'assignment_id') String? assignmentId,@JsonKey(name: 'receipt_type') String? receiptType, String? vendor,@JsonKey(name: 'amount_cad') double? amountCad,@JsonKey(name: 'receipt_photo_url') String? receiptPhotoUrl, String? notes,@JsonKey(name: 'created_at') String? createdAt
});




}
/// @nodoc
class _$ReceiptCopyWithImpl<$Res>
    implements $ReceiptCopyWith<$Res> {
  _$ReceiptCopyWithImpl(this._self, this._then);

  final Receipt _self;
  final $Res Function(Receipt) _then;

/// Create a copy of Receipt
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? assignmentId = freezed,Object? receiptType = freezed,Object? vendor = freezed,Object? amountCad = freezed,Object? receiptPhotoUrl = freezed,Object? notes = freezed,Object? createdAt = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,assignmentId: freezed == assignmentId ? _self.assignmentId : assignmentId // ignore: cast_nullable_to_non_nullable
as String?,receiptType: freezed == receiptType ? _self.receiptType : receiptType // ignore: cast_nullable_to_non_nullable
as String?,vendor: freezed == vendor ? _self.vendor : vendor // ignore: cast_nullable_to_non_nullable
as String?,amountCad: freezed == amountCad ? _self.amountCad : amountCad // ignore: cast_nullable_to_non_nullable
as double?,receiptPhotoUrl: freezed == receiptPhotoUrl ? _self.receiptPhotoUrl : receiptPhotoUrl // ignore: cast_nullable_to_non_nullable
as String?,notes: freezed == notes ? _self.notes : notes // ignore: cast_nullable_to_non_nullable
as String?,createdAt: freezed == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [Receipt].
extension ReceiptPatterns on Receipt {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _Receipt value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _Receipt() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _Receipt value)  $default,){
final _that = this;
switch (_that) {
case _Receipt():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _Receipt value)?  $default,){
final _that = this;
switch (_that) {
case _Receipt() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id, @JsonKey(name: 'assignment_id')  String? assignmentId, @JsonKey(name: 'receipt_type')  String? receiptType,  String? vendor, @JsonKey(name: 'amount_cad')  double? amountCad, @JsonKey(name: 'receipt_photo_url')  String? receiptPhotoUrl,  String? notes, @JsonKey(name: 'created_at')  String? createdAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Receipt() when $default != null:
return $default(_that.id,_that.assignmentId,_that.receiptType,_that.vendor,_that.amountCad,_that.receiptPhotoUrl,_that.notes,_that.createdAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id, @JsonKey(name: 'assignment_id')  String? assignmentId, @JsonKey(name: 'receipt_type')  String? receiptType,  String? vendor, @JsonKey(name: 'amount_cad')  double? amountCad, @JsonKey(name: 'receipt_photo_url')  String? receiptPhotoUrl,  String? notes, @JsonKey(name: 'created_at')  String? createdAt)  $default,) {final _that = this;
switch (_that) {
case _Receipt():
return $default(_that.id,_that.assignmentId,_that.receiptType,_that.vendor,_that.amountCad,_that.receiptPhotoUrl,_that.notes,_that.createdAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id, @JsonKey(name: 'assignment_id')  String? assignmentId, @JsonKey(name: 'receipt_type')  String? receiptType,  String? vendor, @JsonKey(name: 'amount_cad')  double? amountCad, @JsonKey(name: 'receipt_photo_url')  String? receiptPhotoUrl,  String? notes, @JsonKey(name: 'created_at')  String? createdAt)?  $default,) {final _that = this;
switch (_that) {
case _Receipt() when $default != null:
return $default(_that.id,_that.assignmentId,_that.receiptType,_that.vendor,_that.amountCad,_that.receiptPhotoUrl,_that.notes,_that.createdAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Receipt implements Receipt {
  const _Receipt({required this.id, @JsonKey(name: 'assignment_id') this.assignmentId, @JsonKey(name: 'receipt_type') this.receiptType, this.vendor, @JsonKey(name: 'amount_cad') this.amountCad, @JsonKey(name: 'receipt_photo_url') this.receiptPhotoUrl, this.notes, @JsonKey(name: 'created_at') this.createdAt});
  factory _Receipt.fromJson(Map<String, dynamic> json) => _$ReceiptFromJson(json);

@override final  String id;
@override@JsonKey(name: 'assignment_id') final  String? assignmentId;
@override@JsonKey(name: 'receipt_type') final  String? receiptType;
@override final  String? vendor;
@override@JsonKey(name: 'amount_cad') final  double? amountCad;
@override@JsonKey(name: 'receipt_photo_url') final  String? receiptPhotoUrl;
@override final  String? notes;
@override@JsonKey(name: 'created_at') final  String? createdAt;

/// Create a copy of Receipt
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ReceiptCopyWith<_Receipt> get copyWith => __$ReceiptCopyWithImpl<_Receipt>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ReceiptToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _Receipt&&(identical(other.id, id) || other.id == id)&&(identical(other.assignmentId, assignmentId) || other.assignmentId == assignmentId)&&(identical(other.receiptType, receiptType) || other.receiptType == receiptType)&&(identical(other.vendor, vendor) || other.vendor == vendor)&&(identical(other.amountCad, amountCad) || other.amountCad == amountCad)&&(identical(other.receiptPhotoUrl, receiptPhotoUrl) || other.receiptPhotoUrl == receiptPhotoUrl)&&(identical(other.notes, notes) || other.notes == notes)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,assignmentId,receiptType,vendor,amountCad,receiptPhotoUrl,notes,createdAt);

@override
String toString() {
  return 'Receipt(id: $id, assignmentId: $assignmentId, receiptType: $receiptType, vendor: $vendor, amountCad: $amountCad, receiptPhotoUrl: $receiptPhotoUrl, notes: $notes, createdAt: $createdAt)';
}


}

/// @nodoc
abstract mixin class _$ReceiptCopyWith<$Res> implements $ReceiptCopyWith<$Res> {
  factory _$ReceiptCopyWith(_Receipt value, $Res Function(_Receipt) _then) = __$ReceiptCopyWithImpl;
@override @useResult
$Res call({
 String id,@JsonKey(name: 'assignment_id') String? assignmentId,@JsonKey(name: 'receipt_type') String? receiptType, String? vendor,@JsonKey(name: 'amount_cad') double? amountCad,@JsonKey(name: 'receipt_photo_url') String? receiptPhotoUrl, String? notes,@JsonKey(name: 'created_at') String? createdAt
});




}
/// @nodoc
class __$ReceiptCopyWithImpl<$Res>
    implements _$ReceiptCopyWith<$Res> {
  __$ReceiptCopyWithImpl(this._self, this._then);

  final _Receipt _self;
  final $Res Function(_Receipt) _then;

/// Create a copy of Receipt
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? assignmentId = freezed,Object? receiptType = freezed,Object? vendor = freezed,Object? amountCad = freezed,Object? receiptPhotoUrl = freezed,Object? notes = freezed,Object? createdAt = freezed,}) {
  return _then(_Receipt(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,assignmentId: freezed == assignmentId ? _self.assignmentId : assignmentId // ignore: cast_nullable_to_non_nullable
as String?,receiptType: freezed == receiptType ? _self.receiptType : receiptType // ignore: cast_nullable_to_non_nullable
as String?,vendor: freezed == vendor ? _self.vendor : vendor // ignore: cast_nullable_to_non_nullable
as String?,amountCad: freezed == amountCad ? _self.amountCad : amountCad // ignore: cast_nullable_to_non_nullable
as double?,receiptPhotoUrl: freezed == receiptPhotoUrl ? _self.receiptPhotoUrl : receiptPhotoUrl // ignore: cast_nullable_to_non_nullable
as String?,notes: freezed == notes ? _self.notes : notes // ignore: cast_nullable_to_non_nullable
as String?,createdAt: freezed == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$ReceiptsResponse {

 List<Receipt> get receipts;
/// Create a copy of ReceiptsResponse
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ReceiptsResponseCopyWith<ReceiptsResponse> get copyWith => _$ReceiptsResponseCopyWithImpl<ReceiptsResponse>(this as ReceiptsResponse, _$identity);

  /// Serializes this ReceiptsResponse to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ReceiptsResponse&&const DeepCollectionEquality().equals(other.receipts, receipts));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,const DeepCollectionEquality().hash(receipts));

@override
String toString() {
  return 'ReceiptsResponse(receipts: $receipts)';
}


}

/// @nodoc
abstract mixin class $ReceiptsResponseCopyWith<$Res>  {
  factory $ReceiptsResponseCopyWith(ReceiptsResponse value, $Res Function(ReceiptsResponse) _then) = _$ReceiptsResponseCopyWithImpl;
@useResult
$Res call({
 List<Receipt> receipts
});




}
/// @nodoc
class _$ReceiptsResponseCopyWithImpl<$Res>
    implements $ReceiptsResponseCopyWith<$Res> {
  _$ReceiptsResponseCopyWithImpl(this._self, this._then);

  final ReceiptsResponse _self;
  final $Res Function(ReceiptsResponse) _then;

/// Create a copy of ReceiptsResponse
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? receipts = null,}) {
  return _then(_self.copyWith(
receipts: null == receipts ? _self.receipts : receipts // ignore: cast_nullable_to_non_nullable
as List<Receipt>,
  ));
}

}


/// Adds pattern-matching-related methods to [ReceiptsResponse].
extension ReceiptsResponsePatterns on ReceiptsResponse {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ReceiptsResponse value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ReceiptsResponse() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ReceiptsResponse value)  $default,){
final _that = this;
switch (_that) {
case _ReceiptsResponse():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ReceiptsResponse value)?  $default,){
final _that = this;
switch (_that) {
case _ReceiptsResponse() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( List<Receipt> receipts)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ReceiptsResponse() when $default != null:
return $default(_that.receipts);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( List<Receipt> receipts)  $default,) {final _that = this;
switch (_that) {
case _ReceiptsResponse():
return $default(_that.receipts);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( List<Receipt> receipts)?  $default,) {final _that = this;
switch (_that) {
case _ReceiptsResponse() when $default != null:
return $default(_that.receipts);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ReceiptsResponse implements ReceiptsResponse {
  const _ReceiptsResponse({final  List<Receipt> receipts = const <Receipt>[]}): _receipts = receipts;
  factory _ReceiptsResponse.fromJson(Map<String, dynamic> json) => _$ReceiptsResponseFromJson(json);

 final  List<Receipt> _receipts;
@override@JsonKey() List<Receipt> get receipts {
  if (_receipts is EqualUnmodifiableListView) return _receipts;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_receipts);
}


/// Create a copy of ReceiptsResponse
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ReceiptsResponseCopyWith<_ReceiptsResponse> get copyWith => __$ReceiptsResponseCopyWithImpl<_ReceiptsResponse>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ReceiptsResponseToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ReceiptsResponse&&const DeepCollectionEquality().equals(other._receipts, _receipts));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,const DeepCollectionEquality().hash(_receipts));

@override
String toString() {
  return 'ReceiptsResponse(receipts: $receipts)';
}


}

/// @nodoc
abstract mixin class _$ReceiptsResponseCopyWith<$Res> implements $ReceiptsResponseCopyWith<$Res> {
  factory _$ReceiptsResponseCopyWith(_ReceiptsResponse value, $Res Function(_ReceiptsResponse) _then) = __$ReceiptsResponseCopyWithImpl;
@override @useResult
$Res call({
 List<Receipt> receipts
});




}
/// @nodoc
class __$ReceiptsResponseCopyWithImpl<$Res>
    implements _$ReceiptsResponseCopyWith<$Res> {
  __$ReceiptsResponseCopyWithImpl(this._self, this._then);

  final _ReceiptsResponse _self;
  final $Res Function(_ReceiptsResponse) _then;

/// Create a copy of ReceiptsResponse
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? receipts = null,}) {
  return _then(_ReceiptsResponse(
receipts: null == receipts ? _self._receipts : receipts // ignore: cast_nullable_to_non_nullable
as List<Receipt>,
  ));
}


}

// dart format on
