// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'paystub.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$PayStub {

 String get id;@JsonKey(name: 'pay_run_id') String? get payRunId;@JsonKey(name: 'created_at') String? get createdAt;@JsonKey(name: 'regular_hours') double? get regularHours;@JsonKey(name: 'overtime_hours') double? get overtimeHours;@JsonKey(name: 'total_hours') double? get totalHours;@JsonKey(name: 'regular_pay') double? get regularPay;@JsonKey(name: 'overtime_pay') double? get overtimePay;@JsonKey(name: 'gross_pay') double? get grossPay;@JsonKey(name: 'vacation_pay') double? get vacationPay; double? get cpp;@JsonKey(name: 'cpp2') double? get cpp2; double? get ei;@JsonKey(name: 'fed_tax') double? get fedTax;@JsonKey(name: 'total_deductions') double? get totalDeductions;@JsonKey(name: 'net_pay') double? get netPay;@JsonKey(name: 'ytd_gross') double? get ytdGross;@JsonKey(name: 'ytd_cpp') double? get ytdCpp;@JsonKey(name: 'ytd_cpp2') double? get ytdCpp2;@JsonKey(name: 'ytd_ei') double? get ytdEi;@JsonKey(name: 'ytd_vacation') double? get ytdVacation;@JsonKey(name: 'direct_deposit_status') String? get directDepositStatus;@JsonKey(name: 'direct_deposit_sent_at') String? get directDepositSentAt;
/// Create a copy of PayStub
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$PayStubCopyWith<PayStub> get copyWith => _$PayStubCopyWithImpl<PayStub>(this as PayStub, _$identity);

  /// Serializes this PayStub to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is PayStub&&(identical(other.id, id) || other.id == id)&&(identical(other.payRunId, payRunId) || other.payRunId == payRunId)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.regularHours, regularHours) || other.regularHours == regularHours)&&(identical(other.overtimeHours, overtimeHours) || other.overtimeHours == overtimeHours)&&(identical(other.totalHours, totalHours) || other.totalHours == totalHours)&&(identical(other.regularPay, regularPay) || other.regularPay == regularPay)&&(identical(other.overtimePay, overtimePay) || other.overtimePay == overtimePay)&&(identical(other.grossPay, grossPay) || other.grossPay == grossPay)&&(identical(other.vacationPay, vacationPay) || other.vacationPay == vacationPay)&&(identical(other.cpp, cpp) || other.cpp == cpp)&&(identical(other.cpp2, cpp2) || other.cpp2 == cpp2)&&(identical(other.ei, ei) || other.ei == ei)&&(identical(other.fedTax, fedTax) || other.fedTax == fedTax)&&(identical(other.totalDeductions, totalDeductions) || other.totalDeductions == totalDeductions)&&(identical(other.netPay, netPay) || other.netPay == netPay)&&(identical(other.ytdGross, ytdGross) || other.ytdGross == ytdGross)&&(identical(other.ytdCpp, ytdCpp) || other.ytdCpp == ytdCpp)&&(identical(other.ytdCpp2, ytdCpp2) || other.ytdCpp2 == ytdCpp2)&&(identical(other.ytdEi, ytdEi) || other.ytdEi == ytdEi)&&(identical(other.ytdVacation, ytdVacation) || other.ytdVacation == ytdVacation)&&(identical(other.directDepositStatus, directDepositStatus) || other.directDepositStatus == directDepositStatus)&&(identical(other.directDepositSentAt, directDepositSentAt) || other.directDepositSentAt == directDepositSentAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hashAll([runtimeType,id,payRunId,createdAt,regularHours,overtimeHours,totalHours,regularPay,overtimePay,grossPay,vacationPay,cpp,cpp2,ei,fedTax,totalDeductions,netPay,ytdGross,ytdCpp,ytdCpp2,ytdEi,ytdVacation,directDepositStatus,directDepositSentAt]);

@override
String toString() {
  return 'PayStub(id: $id, payRunId: $payRunId, createdAt: $createdAt, regularHours: $regularHours, overtimeHours: $overtimeHours, totalHours: $totalHours, regularPay: $regularPay, overtimePay: $overtimePay, grossPay: $grossPay, vacationPay: $vacationPay, cpp: $cpp, cpp2: $cpp2, ei: $ei, fedTax: $fedTax, totalDeductions: $totalDeductions, netPay: $netPay, ytdGross: $ytdGross, ytdCpp: $ytdCpp, ytdCpp2: $ytdCpp2, ytdEi: $ytdEi, ytdVacation: $ytdVacation, directDepositStatus: $directDepositStatus, directDepositSentAt: $directDepositSentAt)';
}


}

/// @nodoc
abstract mixin class $PayStubCopyWith<$Res>  {
  factory $PayStubCopyWith(PayStub value, $Res Function(PayStub) _then) = _$PayStubCopyWithImpl;
@useResult
$Res call({
 String id,@JsonKey(name: 'pay_run_id') String? payRunId,@JsonKey(name: 'created_at') String? createdAt,@JsonKey(name: 'regular_hours') double? regularHours,@JsonKey(name: 'overtime_hours') double? overtimeHours,@JsonKey(name: 'total_hours') double? totalHours,@JsonKey(name: 'regular_pay') double? regularPay,@JsonKey(name: 'overtime_pay') double? overtimePay,@JsonKey(name: 'gross_pay') double? grossPay,@JsonKey(name: 'vacation_pay') double? vacationPay, double? cpp,@JsonKey(name: 'cpp2') double? cpp2, double? ei,@JsonKey(name: 'fed_tax') double? fedTax,@JsonKey(name: 'total_deductions') double? totalDeductions,@JsonKey(name: 'net_pay') double? netPay,@JsonKey(name: 'ytd_gross') double? ytdGross,@JsonKey(name: 'ytd_cpp') double? ytdCpp,@JsonKey(name: 'ytd_cpp2') double? ytdCpp2,@JsonKey(name: 'ytd_ei') double? ytdEi,@JsonKey(name: 'ytd_vacation') double? ytdVacation,@JsonKey(name: 'direct_deposit_status') String? directDepositStatus,@JsonKey(name: 'direct_deposit_sent_at') String? directDepositSentAt
});




}
/// @nodoc
class _$PayStubCopyWithImpl<$Res>
    implements $PayStubCopyWith<$Res> {
  _$PayStubCopyWithImpl(this._self, this._then);

  final PayStub _self;
  final $Res Function(PayStub) _then;

/// Create a copy of PayStub
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? payRunId = freezed,Object? createdAt = freezed,Object? regularHours = freezed,Object? overtimeHours = freezed,Object? totalHours = freezed,Object? regularPay = freezed,Object? overtimePay = freezed,Object? grossPay = freezed,Object? vacationPay = freezed,Object? cpp = freezed,Object? cpp2 = freezed,Object? ei = freezed,Object? fedTax = freezed,Object? totalDeductions = freezed,Object? netPay = freezed,Object? ytdGross = freezed,Object? ytdCpp = freezed,Object? ytdCpp2 = freezed,Object? ytdEi = freezed,Object? ytdVacation = freezed,Object? directDepositStatus = freezed,Object? directDepositSentAt = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,payRunId: freezed == payRunId ? _self.payRunId : payRunId // ignore: cast_nullable_to_non_nullable
as String?,createdAt: freezed == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as String?,regularHours: freezed == regularHours ? _self.regularHours : regularHours // ignore: cast_nullable_to_non_nullable
as double?,overtimeHours: freezed == overtimeHours ? _self.overtimeHours : overtimeHours // ignore: cast_nullable_to_non_nullable
as double?,totalHours: freezed == totalHours ? _self.totalHours : totalHours // ignore: cast_nullable_to_non_nullable
as double?,regularPay: freezed == regularPay ? _self.regularPay : regularPay // ignore: cast_nullable_to_non_nullable
as double?,overtimePay: freezed == overtimePay ? _self.overtimePay : overtimePay // ignore: cast_nullable_to_non_nullable
as double?,grossPay: freezed == grossPay ? _self.grossPay : grossPay // ignore: cast_nullable_to_non_nullable
as double?,vacationPay: freezed == vacationPay ? _self.vacationPay : vacationPay // ignore: cast_nullable_to_non_nullable
as double?,cpp: freezed == cpp ? _self.cpp : cpp // ignore: cast_nullable_to_non_nullable
as double?,cpp2: freezed == cpp2 ? _self.cpp2 : cpp2 // ignore: cast_nullable_to_non_nullable
as double?,ei: freezed == ei ? _self.ei : ei // ignore: cast_nullable_to_non_nullable
as double?,fedTax: freezed == fedTax ? _self.fedTax : fedTax // ignore: cast_nullable_to_non_nullable
as double?,totalDeductions: freezed == totalDeductions ? _self.totalDeductions : totalDeductions // ignore: cast_nullable_to_non_nullable
as double?,netPay: freezed == netPay ? _self.netPay : netPay // ignore: cast_nullable_to_non_nullable
as double?,ytdGross: freezed == ytdGross ? _self.ytdGross : ytdGross // ignore: cast_nullable_to_non_nullable
as double?,ytdCpp: freezed == ytdCpp ? _self.ytdCpp : ytdCpp // ignore: cast_nullable_to_non_nullable
as double?,ytdCpp2: freezed == ytdCpp2 ? _self.ytdCpp2 : ytdCpp2 // ignore: cast_nullable_to_non_nullable
as double?,ytdEi: freezed == ytdEi ? _self.ytdEi : ytdEi // ignore: cast_nullable_to_non_nullable
as double?,ytdVacation: freezed == ytdVacation ? _self.ytdVacation : ytdVacation // ignore: cast_nullable_to_non_nullable
as double?,directDepositStatus: freezed == directDepositStatus ? _self.directDepositStatus : directDepositStatus // ignore: cast_nullable_to_non_nullable
as String?,directDepositSentAt: freezed == directDepositSentAt ? _self.directDepositSentAt : directDepositSentAt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [PayStub].
extension PayStubPatterns on PayStub {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _PayStub value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _PayStub() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _PayStub value)  $default,){
final _that = this;
switch (_that) {
case _PayStub():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _PayStub value)?  $default,){
final _that = this;
switch (_that) {
case _PayStub() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id, @JsonKey(name: 'pay_run_id')  String? payRunId, @JsonKey(name: 'created_at')  String? createdAt, @JsonKey(name: 'regular_hours')  double? regularHours, @JsonKey(name: 'overtime_hours')  double? overtimeHours, @JsonKey(name: 'total_hours')  double? totalHours, @JsonKey(name: 'regular_pay')  double? regularPay, @JsonKey(name: 'overtime_pay')  double? overtimePay, @JsonKey(name: 'gross_pay')  double? grossPay, @JsonKey(name: 'vacation_pay')  double? vacationPay,  double? cpp, @JsonKey(name: 'cpp2')  double? cpp2,  double? ei, @JsonKey(name: 'fed_tax')  double? fedTax, @JsonKey(name: 'total_deductions')  double? totalDeductions, @JsonKey(name: 'net_pay')  double? netPay, @JsonKey(name: 'ytd_gross')  double? ytdGross, @JsonKey(name: 'ytd_cpp')  double? ytdCpp, @JsonKey(name: 'ytd_cpp2')  double? ytdCpp2, @JsonKey(name: 'ytd_ei')  double? ytdEi, @JsonKey(name: 'ytd_vacation')  double? ytdVacation, @JsonKey(name: 'direct_deposit_status')  String? directDepositStatus, @JsonKey(name: 'direct_deposit_sent_at')  String? directDepositSentAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _PayStub() when $default != null:
return $default(_that.id,_that.payRunId,_that.createdAt,_that.regularHours,_that.overtimeHours,_that.totalHours,_that.regularPay,_that.overtimePay,_that.grossPay,_that.vacationPay,_that.cpp,_that.cpp2,_that.ei,_that.fedTax,_that.totalDeductions,_that.netPay,_that.ytdGross,_that.ytdCpp,_that.ytdCpp2,_that.ytdEi,_that.ytdVacation,_that.directDepositStatus,_that.directDepositSentAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id, @JsonKey(name: 'pay_run_id')  String? payRunId, @JsonKey(name: 'created_at')  String? createdAt, @JsonKey(name: 'regular_hours')  double? regularHours, @JsonKey(name: 'overtime_hours')  double? overtimeHours, @JsonKey(name: 'total_hours')  double? totalHours, @JsonKey(name: 'regular_pay')  double? regularPay, @JsonKey(name: 'overtime_pay')  double? overtimePay, @JsonKey(name: 'gross_pay')  double? grossPay, @JsonKey(name: 'vacation_pay')  double? vacationPay,  double? cpp, @JsonKey(name: 'cpp2')  double? cpp2,  double? ei, @JsonKey(name: 'fed_tax')  double? fedTax, @JsonKey(name: 'total_deductions')  double? totalDeductions, @JsonKey(name: 'net_pay')  double? netPay, @JsonKey(name: 'ytd_gross')  double? ytdGross, @JsonKey(name: 'ytd_cpp')  double? ytdCpp, @JsonKey(name: 'ytd_cpp2')  double? ytdCpp2, @JsonKey(name: 'ytd_ei')  double? ytdEi, @JsonKey(name: 'ytd_vacation')  double? ytdVacation, @JsonKey(name: 'direct_deposit_status')  String? directDepositStatus, @JsonKey(name: 'direct_deposit_sent_at')  String? directDepositSentAt)  $default,) {final _that = this;
switch (_that) {
case _PayStub():
return $default(_that.id,_that.payRunId,_that.createdAt,_that.regularHours,_that.overtimeHours,_that.totalHours,_that.regularPay,_that.overtimePay,_that.grossPay,_that.vacationPay,_that.cpp,_that.cpp2,_that.ei,_that.fedTax,_that.totalDeductions,_that.netPay,_that.ytdGross,_that.ytdCpp,_that.ytdCpp2,_that.ytdEi,_that.ytdVacation,_that.directDepositStatus,_that.directDepositSentAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id, @JsonKey(name: 'pay_run_id')  String? payRunId, @JsonKey(name: 'created_at')  String? createdAt, @JsonKey(name: 'regular_hours')  double? regularHours, @JsonKey(name: 'overtime_hours')  double? overtimeHours, @JsonKey(name: 'total_hours')  double? totalHours, @JsonKey(name: 'regular_pay')  double? regularPay, @JsonKey(name: 'overtime_pay')  double? overtimePay, @JsonKey(name: 'gross_pay')  double? grossPay, @JsonKey(name: 'vacation_pay')  double? vacationPay,  double? cpp, @JsonKey(name: 'cpp2')  double? cpp2,  double? ei, @JsonKey(name: 'fed_tax')  double? fedTax, @JsonKey(name: 'total_deductions')  double? totalDeductions, @JsonKey(name: 'net_pay')  double? netPay, @JsonKey(name: 'ytd_gross')  double? ytdGross, @JsonKey(name: 'ytd_cpp')  double? ytdCpp, @JsonKey(name: 'ytd_cpp2')  double? ytdCpp2, @JsonKey(name: 'ytd_ei')  double? ytdEi, @JsonKey(name: 'ytd_vacation')  double? ytdVacation, @JsonKey(name: 'direct_deposit_status')  String? directDepositStatus, @JsonKey(name: 'direct_deposit_sent_at')  String? directDepositSentAt)?  $default,) {final _that = this;
switch (_that) {
case _PayStub() when $default != null:
return $default(_that.id,_that.payRunId,_that.createdAt,_that.regularHours,_that.overtimeHours,_that.totalHours,_that.regularPay,_that.overtimePay,_that.grossPay,_that.vacationPay,_that.cpp,_that.cpp2,_that.ei,_that.fedTax,_that.totalDeductions,_that.netPay,_that.ytdGross,_that.ytdCpp,_that.ytdCpp2,_that.ytdEi,_that.ytdVacation,_that.directDepositStatus,_that.directDepositSentAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _PayStub implements PayStub {
  const _PayStub({required this.id, @JsonKey(name: 'pay_run_id') this.payRunId, @JsonKey(name: 'created_at') this.createdAt, @JsonKey(name: 'regular_hours') this.regularHours, @JsonKey(name: 'overtime_hours') this.overtimeHours, @JsonKey(name: 'total_hours') this.totalHours, @JsonKey(name: 'regular_pay') this.regularPay, @JsonKey(name: 'overtime_pay') this.overtimePay, @JsonKey(name: 'gross_pay') this.grossPay, @JsonKey(name: 'vacation_pay') this.vacationPay, this.cpp, @JsonKey(name: 'cpp2') this.cpp2, this.ei, @JsonKey(name: 'fed_tax') this.fedTax, @JsonKey(name: 'total_deductions') this.totalDeductions, @JsonKey(name: 'net_pay') this.netPay, @JsonKey(name: 'ytd_gross') this.ytdGross, @JsonKey(name: 'ytd_cpp') this.ytdCpp, @JsonKey(name: 'ytd_cpp2') this.ytdCpp2, @JsonKey(name: 'ytd_ei') this.ytdEi, @JsonKey(name: 'ytd_vacation') this.ytdVacation, @JsonKey(name: 'direct_deposit_status') this.directDepositStatus, @JsonKey(name: 'direct_deposit_sent_at') this.directDepositSentAt});
  factory _PayStub.fromJson(Map<String, dynamic> json) => _$PayStubFromJson(json);

@override final  String id;
@override@JsonKey(name: 'pay_run_id') final  String? payRunId;
@override@JsonKey(name: 'created_at') final  String? createdAt;
@override@JsonKey(name: 'regular_hours') final  double? regularHours;
@override@JsonKey(name: 'overtime_hours') final  double? overtimeHours;
@override@JsonKey(name: 'total_hours') final  double? totalHours;
@override@JsonKey(name: 'regular_pay') final  double? regularPay;
@override@JsonKey(name: 'overtime_pay') final  double? overtimePay;
@override@JsonKey(name: 'gross_pay') final  double? grossPay;
@override@JsonKey(name: 'vacation_pay') final  double? vacationPay;
@override final  double? cpp;
@override@JsonKey(name: 'cpp2') final  double? cpp2;
@override final  double? ei;
@override@JsonKey(name: 'fed_tax') final  double? fedTax;
@override@JsonKey(name: 'total_deductions') final  double? totalDeductions;
@override@JsonKey(name: 'net_pay') final  double? netPay;
@override@JsonKey(name: 'ytd_gross') final  double? ytdGross;
@override@JsonKey(name: 'ytd_cpp') final  double? ytdCpp;
@override@JsonKey(name: 'ytd_cpp2') final  double? ytdCpp2;
@override@JsonKey(name: 'ytd_ei') final  double? ytdEi;
@override@JsonKey(name: 'ytd_vacation') final  double? ytdVacation;
@override@JsonKey(name: 'direct_deposit_status') final  String? directDepositStatus;
@override@JsonKey(name: 'direct_deposit_sent_at') final  String? directDepositSentAt;

/// Create a copy of PayStub
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$PayStubCopyWith<_PayStub> get copyWith => __$PayStubCopyWithImpl<_PayStub>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$PayStubToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _PayStub&&(identical(other.id, id) || other.id == id)&&(identical(other.payRunId, payRunId) || other.payRunId == payRunId)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.regularHours, regularHours) || other.regularHours == regularHours)&&(identical(other.overtimeHours, overtimeHours) || other.overtimeHours == overtimeHours)&&(identical(other.totalHours, totalHours) || other.totalHours == totalHours)&&(identical(other.regularPay, regularPay) || other.regularPay == regularPay)&&(identical(other.overtimePay, overtimePay) || other.overtimePay == overtimePay)&&(identical(other.grossPay, grossPay) || other.grossPay == grossPay)&&(identical(other.vacationPay, vacationPay) || other.vacationPay == vacationPay)&&(identical(other.cpp, cpp) || other.cpp == cpp)&&(identical(other.cpp2, cpp2) || other.cpp2 == cpp2)&&(identical(other.ei, ei) || other.ei == ei)&&(identical(other.fedTax, fedTax) || other.fedTax == fedTax)&&(identical(other.totalDeductions, totalDeductions) || other.totalDeductions == totalDeductions)&&(identical(other.netPay, netPay) || other.netPay == netPay)&&(identical(other.ytdGross, ytdGross) || other.ytdGross == ytdGross)&&(identical(other.ytdCpp, ytdCpp) || other.ytdCpp == ytdCpp)&&(identical(other.ytdCpp2, ytdCpp2) || other.ytdCpp2 == ytdCpp2)&&(identical(other.ytdEi, ytdEi) || other.ytdEi == ytdEi)&&(identical(other.ytdVacation, ytdVacation) || other.ytdVacation == ytdVacation)&&(identical(other.directDepositStatus, directDepositStatus) || other.directDepositStatus == directDepositStatus)&&(identical(other.directDepositSentAt, directDepositSentAt) || other.directDepositSentAt == directDepositSentAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hashAll([runtimeType,id,payRunId,createdAt,regularHours,overtimeHours,totalHours,regularPay,overtimePay,grossPay,vacationPay,cpp,cpp2,ei,fedTax,totalDeductions,netPay,ytdGross,ytdCpp,ytdCpp2,ytdEi,ytdVacation,directDepositStatus,directDepositSentAt]);

@override
String toString() {
  return 'PayStub(id: $id, payRunId: $payRunId, createdAt: $createdAt, regularHours: $regularHours, overtimeHours: $overtimeHours, totalHours: $totalHours, regularPay: $regularPay, overtimePay: $overtimePay, grossPay: $grossPay, vacationPay: $vacationPay, cpp: $cpp, cpp2: $cpp2, ei: $ei, fedTax: $fedTax, totalDeductions: $totalDeductions, netPay: $netPay, ytdGross: $ytdGross, ytdCpp: $ytdCpp, ytdCpp2: $ytdCpp2, ytdEi: $ytdEi, ytdVacation: $ytdVacation, directDepositStatus: $directDepositStatus, directDepositSentAt: $directDepositSentAt)';
}


}

/// @nodoc
abstract mixin class _$PayStubCopyWith<$Res> implements $PayStubCopyWith<$Res> {
  factory _$PayStubCopyWith(_PayStub value, $Res Function(_PayStub) _then) = __$PayStubCopyWithImpl;
@override @useResult
$Res call({
 String id,@JsonKey(name: 'pay_run_id') String? payRunId,@JsonKey(name: 'created_at') String? createdAt,@JsonKey(name: 'regular_hours') double? regularHours,@JsonKey(name: 'overtime_hours') double? overtimeHours,@JsonKey(name: 'total_hours') double? totalHours,@JsonKey(name: 'regular_pay') double? regularPay,@JsonKey(name: 'overtime_pay') double? overtimePay,@JsonKey(name: 'gross_pay') double? grossPay,@JsonKey(name: 'vacation_pay') double? vacationPay, double? cpp,@JsonKey(name: 'cpp2') double? cpp2, double? ei,@JsonKey(name: 'fed_tax') double? fedTax,@JsonKey(name: 'total_deductions') double? totalDeductions,@JsonKey(name: 'net_pay') double? netPay,@JsonKey(name: 'ytd_gross') double? ytdGross,@JsonKey(name: 'ytd_cpp') double? ytdCpp,@JsonKey(name: 'ytd_cpp2') double? ytdCpp2,@JsonKey(name: 'ytd_ei') double? ytdEi,@JsonKey(name: 'ytd_vacation') double? ytdVacation,@JsonKey(name: 'direct_deposit_status') String? directDepositStatus,@JsonKey(name: 'direct_deposit_sent_at') String? directDepositSentAt
});




}
/// @nodoc
class __$PayStubCopyWithImpl<$Res>
    implements _$PayStubCopyWith<$Res> {
  __$PayStubCopyWithImpl(this._self, this._then);

  final _PayStub _self;
  final $Res Function(_PayStub) _then;

/// Create a copy of PayStub
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? payRunId = freezed,Object? createdAt = freezed,Object? regularHours = freezed,Object? overtimeHours = freezed,Object? totalHours = freezed,Object? regularPay = freezed,Object? overtimePay = freezed,Object? grossPay = freezed,Object? vacationPay = freezed,Object? cpp = freezed,Object? cpp2 = freezed,Object? ei = freezed,Object? fedTax = freezed,Object? totalDeductions = freezed,Object? netPay = freezed,Object? ytdGross = freezed,Object? ytdCpp = freezed,Object? ytdCpp2 = freezed,Object? ytdEi = freezed,Object? ytdVacation = freezed,Object? directDepositStatus = freezed,Object? directDepositSentAt = freezed,}) {
  return _then(_PayStub(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,payRunId: freezed == payRunId ? _self.payRunId : payRunId // ignore: cast_nullable_to_non_nullable
as String?,createdAt: freezed == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as String?,regularHours: freezed == regularHours ? _self.regularHours : regularHours // ignore: cast_nullable_to_non_nullable
as double?,overtimeHours: freezed == overtimeHours ? _self.overtimeHours : overtimeHours // ignore: cast_nullable_to_non_nullable
as double?,totalHours: freezed == totalHours ? _self.totalHours : totalHours // ignore: cast_nullable_to_non_nullable
as double?,regularPay: freezed == regularPay ? _self.regularPay : regularPay // ignore: cast_nullable_to_non_nullable
as double?,overtimePay: freezed == overtimePay ? _self.overtimePay : overtimePay // ignore: cast_nullable_to_non_nullable
as double?,grossPay: freezed == grossPay ? _self.grossPay : grossPay // ignore: cast_nullable_to_non_nullable
as double?,vacationPay: freezed == vacationPay ? _self.vacationPay : vacationPay // ignore: cast_nullable_to_non_nullable
as double?,cpp: freezed == cpp ? _self.cpp : cpp // ignore: cast_nullable_to_non_nullable
as double?,cpp2: freezed == cpp2 ? _self.cpp2 : cpp2 // ignore: cast_nullable_to_non_nullable
as double?,ei: freezed == ei ? _self.ei : ei // ignore: cast_nullable_to_non_nullable
as double?,fedTax: freezed == fedTax ? _self.fedTax : fedTax // ignore: cast_nullable_to_non_nullable
as double?,totalDeductions: freezed == totalDeductions ? _self.totalDeductions : totalDeductions // ignore: cast_nullable_to_non_nullable
as double?,netPay: freezed == netPay ? _self.netPay : netPay // ignore: cast_nullable_to_non_nullable
as double?,ytdGross: freezed == ytdGross ? _self.ytdGross : ytdGross // ignore: cast_nullable_to_non_nullable
as double?,ytdCpp: freezed == ytdCpp ? _self.ytdCpp : ytdCpp // ignore: cast_nullable_to_non_nullable
as double?,ytdCpp2: freezed == ytdCpp2 ? _self.ytdCpp2 : ytdCpp2 // ignore: cast_nullable_to_non_nullable
as double?,ytdEi: freezed == ytdEi ? _self.ytdEi : ytdEi // ignore: cast_nullable_to_non_nullable
as double?,ytdVacation: freezed == ytdVacation ? _self.ytdVacation : ytdVacation // ignore: cast_nullable_to_non_nullable
as double?,directDepositStatus: freezed == directDepositStatus ? _self.directDepositStatus : directDepositStatus // ignore: cast_nullable_to_non_nullable
as String?,directDepositSentAt: freezed == directDepositSentAt ? _self.directDepositSentAt : directDepositSentAt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$PayStubsResponse {

@JsonKey(name: 'pay_stubs') List<PayStub> get payStubs;
/// Create a copy of PayStubsResponse
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$PayStubsResponseCopyWith<PayStubsResponse> get copyWith => _$PayStubsResponseCopyWithImpl<PayStubsResponse>(this as PayStubsResponse, _$identity);

  /// Serializes this PayStubsResponse to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is PayStubsResponse&&const DeepCollectionEquality().equals(other.payStubs, payStubs));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,const DeepCollectionEquality().hash(payStubs));

@override
String toString() {
  return 'PayStubsResponse(payStubs: $payStubs)';
}


}

/// @nodoc
abstract mixin class $PayStubsResponseCopyWith<$Res>  {
  factory $PayStubsResponseCopyWith(PayStubsResponse value, $Res Function(PayStubsResponse) _then) = _$PayStubsResponseCopyWithImpl;
@useResult
$Res call({
@JsonKey(name: 'pay_stubs') List<PayStub> payStubs
});




}
/// @nodoc
class _$PayStubsResponseCopyWithImpl<$Res>
    implements $PayStubsResponseCopyWith<$Res> {
  _$PayStubsResponseCopyWithImpl(this._self, this._then);

  final PayStubsResponse _self;
  final $Res Function(PayStubsResponse) _then;

/// Create a copy of PayStubsResponse
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? payStubs = null,}) {
  return _then(_self.copyWith(
payStubs: null == payStubs ? _self.payStubs : payStubs // ignore: cast_nullable_to_non_nullable
as List<PayStub>,
  ));
}

}


/// Adds pattern-matching-related methods to [PayStubsResponse].
extension PayStubsResponsePatterns on PayStubsResponse {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _PayStubsResponse value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _PayStubsResponse() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _PayStubsResponse value)  $default,){
final _that = this;
switch (_that) {
case _PayStubsResponse():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _PayStubsResponse value)?  $default,){
final _that = this;
switch (_that) {
case _PayStubsResponse() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(name: 'pay_stubs')  List<PayStub> payStubs)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _PayStubsResponse() when $default != null:
return $default(_that.payStubs);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(name: 'pay_stubs')  List<PayStub> payStubs)  $default,) {final _that = this;
switch (_that) {
case _PayStubsResponse():
return $default(_that.payStubs);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(name: 'pay_stubs')  List<PayStub> payStubs)?  $default,) {final _that = this;
switch (_that) {
case _PayStubsResponse() when $default != null:
return $default(_that.payStubs);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _PayStubsResponse implements PayStubsResponse {
  const _PayStubsResponse({@JsonKey(name: 'pay_stubs') final  List<PayStub> payStubs = const <PayStub>[]}): _payStubs = payStubs;
  factory _PayStubsResponse.fromJson(Map<String, dynamic> json) => _$PayStubsResponseFromJson(json);

 final  List<PayStub> _payStubs;
@override@JsonKey(name: 'pay_stubs') List<PayStub> get payStubs {
  if (_payStubs is EqualUnmodifiableListView) return _payStubs;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_payStubs);
}


/// Create a copy of PayStubsResponse
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$PayStubsResponseCopyWith<_PayStubsResponse> get copyWith => __$PayStubsResponseCopyWithImpl<_PayStubsResponse>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$PayStubsResponseToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _PayStubsResponse&&const DeepCollectionEquality().equals(other._payStubs, _payStubs));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,const DeepCollectionEquality().hash(_payStubs));

@override
String toString() {
  return 'PayStubsResponse(payStubs: $payStubs)';
}


}

/// @nodoc
abstract mixin class _$PayStubsResponseCopyWith<$Res> implements $PayStubsResponseCopyWith<$Res> {
  factory _$PayStubsResponseCopyWith(_PayStubsResponse value, $Res Function(_PayStubsResponse) _then) = __$PayStubsResponseCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(name: 'pay_stubs') List<PayStub> payStubs
});




}
/// @nodoc
class __$PayStubsResponseCopyWithImpl<$Res>
    implements _$PayStubsResponseCopyWith<$Res> {
  __$PayStubsResponseCopyWithImpl(this._self, this._then);

  final _PayStubsResponse _self;
  final $Res Function(_PayStubsResponse) _then;

/// Create a copy of PayStubsResponse
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? payStubs = null,}) {
  return _then(_PayStubsResponse(
payStubs: null == payStubs ? _self._payStubs : payStubs // ignore: cast_nullable_to_non_nullable
as List<PayStub>,
  ));
}


}

// dart format on
