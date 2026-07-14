// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'employee.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$Employee {

 String get id; String get email; String get name;@JsonKey(name: 'onboarding_complete') bool get onboardingComplete;@JsonKey(name: 'pending_verification') bool get pendingVerification;@JsonKey(name: 'onboarded') bool get onboarded; String? get phone; String? get address; String? get status; String? get hireDate;@JsonKey(name: 'pay_rate') double? get payRate;@JsonKey(name: 'onboarding_completed_at') String? get onboardingCompletedAt;@JsonKey(name: 'onboarding_step') int get onboardingStep;@JsonKey(name: 'has_password') bool get hasPassword;@JsonKey(name: 'selfie_url') String? get selfieUrl;@JsonKey(name: 'td1_federal_done') bool get td1FederalDone;@JsonKey(name: 'td1_ab_done') bool get td1AbDone;@JsonKey(name: 'contract_signed') bool get contractSigned;@JsonKey(name: 'acknowledgments_done') bool get acknowledgmentsDone;@JsonKey(name: 'has_banking') bool get hasBanking;@JsonKey(name: 'has_sin') bool get hasSin;@JsonKey(name: 'td1_federal_claim') int? get td1FederalClaim;@JsonKey(name: 'td1_ab_claim') int? get td1AbClaim;
/// Create a copy of Employee
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$EmployeeCopyWith<Employee> get copyWith => _$EmployeeCopyWithImpl<Employee>(this as Employee, _$identity);

  /// Serializes this Employee to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Employee&&(identical(other.id, id) || other.id == id)&&(identical(other.email, email) || other.email == email)&&(identical(other.name, name) || other.name == name)&&(identical(other.onboardingComplete, onboardingComplete) || other.onboardingComplete == onboardingComplete)&&(identical(other.pendingVerification, pendingVerification) || other.pendingVerification == pendingVerification)&&(identical(other.onboarded, onboarded) || other.onboarded == onboarded)&&(identical(other.phone, phone) || other.phone == phone)&&(identical(other.address, address) || other.address == address)&&(identical(other.status, status) || other.status == status)&&(identical(other.hireDate, hireDate) || other.hireDate == hireDate)&&(identical(other.payRate, payRate) || other.payRate == payRate)&&(identical(other.onboardingCompletedAt, onboardingCompletedAt) || other.onboardingCompletedAt == onboardingCompletedAt)&&(identical(other.onboardingStep, onboardingStep) || other.onboardingStep == onboardingStep)&&(identical(other.hasPassword, hasPassword) || other.hasPassword == hasPassword)&&(identical(other.selfieUrl, selfieUrl) || other.selfieUrl == selfieUrl)&&(identical(other.td1FederalDone, td1FederalDone) || other.td1FederalDone == td1FederalDone)&&(identical(other.td1AbDone, td1AbDone) || other.td1AbDone == td1AbDone)&&(identical(other.contractSigned, contractSigned) || other.contractSigned == contractSigned)&&(identical(other.acknowledgmentsDone, acknowledgmentsDone) || other.acknowledgmentsDone == acknowledgmentsDone)&&(identical(other.hasBanking, hasBanking) || other.hasBanking == hasBanking)&&(identical(other.hasSin, hasSin) || other.hasSin == hasSin)&&(identical(other.td1FederalClaim, td1FederalClaim) || other.td1FederalClaim == td1FederalClaim)&&(identical(other.td1AbClaim, td1AbClaim) || other.td1AbClaim == td1AbClaim));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hashAll([runtimeType,id,email,name,onboardingComplete,pendingVerification,onboarded,phone,address,status,hireDate,payRate,onboardingCompletedAt,onboardingStep,hasPassword,selfieUrl,td1FederalDone,td1AbDone,contractSigned,acknowledgmentsDone,hasBanking,hasSin,td1FederalClaim,td1AbClaim]);

@override
String toString() {
  return 'Employee(id: $id, email: $email, name: $name, onboardingComplete: $onboardingComplete, pendingVerification: $pendingVerification, onboarded: $onboarded, phone: $phone, address: $address, status: $status, hireDate: $hireDate, payRate: $payRate, onboardingCompletedAt: $onboardingCompletedAt, onboardingStep: $onboardingStep, hasPassword: $hasPassword, selfieUrl: $selfieUrl, td1FederalDone: $td1FederalDone, td1AbDone: $td1AbDone, contractSigned: $contractSigned, acknowledgmentsDone: $acknowledgmentsDone, hasBanking: $hasBanking, hasSin: $hasSin, td1FederalClaim: $td1FederalClaim, td1AbClaim: $td1AbClaim)';
}


}

/// @nodoc
abstract mixin class $EmployeeCopyWith<$Res>  {
  factory $EmployeeCopyWith(Employee value, $Res Function(Employee) _then) = _$EmployeeCopyWithImpl;
@useResult
$Res call({
 String id, String email, String name,@JsonKey(name: 'onboarding_complete') bool onboardingComplete,@JsonKey(name: 'pending_verification') bool pendingVerification,@JsonKey(name: 'onboarded') bool onboarded, String? phone, String? address, String? status, String? hireDate,@JsonKey(name: 'pay_rate') double? payRate,@JsonKey(name: 'onboarding_completed_at') String? onboardingCompletedAt,@JsonKey(name: 'onboarding_step') int onboardingStep,@JsonKey(name: 'has_password') bool hasPassword,@JsonKey(name: 'selfie_url') String? selfieUrl,@JsonKey(name: 'td1_federal_done') bool td1FederalDone,@JsonKey(name: 'td1_ab_done') bool td1AbDone,@JsonKey(name: 'contract_signed') bool contractSigned,@JsonKey(name: 'acknowledgments_done') bool acknowledgmentsDone,@JsonKey(name: 'has_banking') bool hasBanking,@JsonKey(name: 'has_sin') bool hasSin,@JsonKey(name: 'td1_federal_claim') int? td1FederalClaim,@JsonKey(name: 'td1_ab_claim') int? td1AbClaim
});




}
/// @nodoc
class _$EmployeeCopyWithImpl<$Res>
    implements $EmployeeCopyWith<$Res> {
  _$EmployeeCopyWithImpl(this._self, this._then);

  final Employee _self;
  final $Res Function(Employee) _then;

/// Create a copy of Employee
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? email = null,Object? name = null,Object? onboardingComplete = null,Object? pendingVerification = null,Object? onboarded = null,Object? phone = freezed,Object? address = freezed,Object? status = freezed,Object? hireDate = freezed,Object? payRate = freezed,Object? onboardingCompletedAt = freezed,Object? onboardingStep = null,Object? hasPassword = null,Object? selfieUrl = freezed,Object? td1FederalDone = null,Object? td1AbDone = null,Object? contractSigned = null,Object? acknowledgmentsDone = null,Object? hasBanking = null,Object? hasSin = null,Object? td1FederalClaim = freezed,Object? td1AbClaim = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,email: null == email ? _self.email : email // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,onboardingComplete: null == onboardingComplete ? _self.onboardingComplete : onboardingComplete // ignore: cast_nullable_to_non_nullable
as bool,pendingVerification: null == pendingVerification ? _self.pendingVerification : pendingVerification // ignore: cast_nullable_to_non_nullable
as bool,onboarded: null == onboarded ? _self.onboarded : onboarded // ignore: cast_nullable_to_non_nullable
as bool,phone: freezed == phone ? _self.phone : phone // ignore: cast_nullable_to_non_nullable
as String?,address: freezed == address ? _self.address : address // ignore: cast_nullable_to_non_nullable
as String?,status: freezed == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String?,hireDate: freezed == hireDate ? _self.hireDate : hireDate // ignore: cast_nullable_to_non_nullable
as String?,payRate: freezed == payRate ? _self.payRate : payRate // ignore: cast_nullable_to_non_nullable
as double?,onboardingCompletedAt: freezed == onboardingCompletedAt ? _self.onboardingCompletedAt : onboardingCompletedAt // ignore: cast_nullable_to_non_nullable
as String?,onboardingStep: null == onboardingStep ? _self.onboardingStep : onboardingStep // ignore: cast_nullable_to_non_nullable
as int,hasPassword: null == hasPassword ? _self.hasPassword : hasPassword // ignore: cast_nullable_to_non_nullable
as bool,selfieUrl: freezed == selfieUrl ? _self.selfieUrl : selfieUrl // ignore: cast_nullable_to_non_nullable
as String?,td1FederalDone: null == td1FederalDone ? _self.td1FederalDone : td1FederalDone // ignore: cast_nullable_to_non_nullable
as bool,td1AbDone: null == td1AbDone ? _self.td1AbDone : td1AbDone // ignore: cast_nullable_to_non_nullable
as bool,contractSigned: null == contractSigned ? _self.contractSigned : contractSigned // ignore: cast_nullable_to_non_nullable
as bool,acknowledgmentsDone: null == acknowledgmentsDone ? _self.acknowledgmentsDone : acknowledgmentsDone // ignore: cast_nullable_to_non_nullable
as bool,hasBanking: null == hasBanking ? _self.hasBanking : hasBanking // ignore: cast_nullable_to_non_nullable
as bool,hasSin: null == hasSin ? _self.hasSin : hasSin // ignore: cast_nullable_to_non_nullable
as bool,td1FederalClaim: freezed == td1FederalClaim ? _self.td1FederalClaim : td1FederalClaim // ignore: cast_nullable_to_non_nullable
as int?,td1AbClaim: freezed == td1AbClaim ? _self.td1AbClaim : td1AbClaim // ignore: cast_nullable_to_non_nullable
as int?,
  ));
}

}


/// Adds pattern-matching-related methods to [Employee].
extension EmployeePatterns on Employee {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _Employee value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _Employee() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _Employee value)  $default,){
final _that = this;
switch (_that) {
case _Employee():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _Employee value)?  $default,){
final _that = this;
switch (_that) {
case _Employee() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String email,  String name, @JsonKey(name: 'onboarding_complete')  bool onboardingComplete, @JsonKey(name: 'pending_verification')  bool pendingVerification, @JsonKey(name: 'onboarded')  bool onboarded,  String? phone,  String? address,  String? status,  String? hireDate, @JsonKey(name: 'pay_rate')  double? payRate, @JsonKey(name: 'onboarding_completed_at')  String? onboardingCompletedAt, @JsonKey(name: 'onboarding_step')  int onboardingStep, @JsonKey(name: 'has_password')  bool hasPassword, @JsonKey(name: 'selfie_url')  String? selfieUrl, @JsonKey(name: 'td1_federal_done')  bool td1FederalDone, @JsonKey(name: 'td1_ab_done')  bool td1AbDone, @JsonKey(name: 'contract_signed')  bool contractSigned, @JsonKey(name: 'acknowledgments_done')  bool acknowledgmentsDone, @JsonKey(name: 'has_banking')  bool hasBanking, @JsonKey(name: 'has_sin')  bool hasSin, @JsonKey(name: 'td1_federal_claim')  int? td1FederalClaim, @JsonKey(name: 'td1_ab_claim')  int? td1AbClaim)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Employee() when $default != null:
return $default(_that.id,_that.email,_that.name,_that.onboardingComplete,_that.pendingVerification,_that.onboarded,_that.phone,_that.address,_that.status,_that.hireDate,_that.payRate,_that.onboardingCompletedAt,_that.onboardingStep,_that.hasPassword,_that.selfieUrl,_that.td1FederalDone,_that.td1AbDone,_that.contractSigned,_that.acknowledgmentsDone,_that.hasBanking,_that.hasSin,_that.td1FederalClaim,_that.td1AbClaim);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String email,  String name, @JsonKey(name: 'onboarding_complete')  bool onboardingComplete, @JsonKey(name: 'pending_verification')  bool pendingVerification, @JsonKey(name: 'onboarded')  bool onboarded,  String? phone,  String? address,  String? status,  String? hireDate, @JsonKey(name: 'pay_rate')  double? payRate, @JsonKey(name: 'onboarding_completed_at')  String? onboardingCompletedAt, @JsonKey(name: 'onboarding_step')  int onboardingStep, @JsonKey(name: 'has_password')  bool hasPassword, @JsonKey(name: 'selfie_url')  String? selfieUrl, @JsonKey(name: 'td1_federal_done')  bool td1FederalDone, @JsonKey(name: 'td1_ab_done')  bool td1AbDone, @JsonKey(name: 'contract_signed')  bool contractSigned, @JsonKey(name: 'acknowledgments_done')  bool acknowledgmentsDone, @JsonKey(name: 'has_banking')  bool hasBanking, @JsonKey(name: 'has_sin')  bool hasSin, @JsonKey(name: 'td1_federal_claim')  int? td1FederalClaim, @JsonKey(name: 'td1_ab_claim')  int? td1AbClaim)  $default,) {final _that = this;
switch (_that) {
case _Employee():
return $default(_that.id,_that.email,_that.name,_that.onboardingComplete,_that.pendingVerification,_that.onboarded,_that.phone,_that.address,_that.status,_that.hireDate,_that.payRate,_that.onboardingCompletedAt,_that.onboardingStep,_that.hasPassword,_that.selfieUrl,_that.td1FederalDone,_that.td1AbDone,_that.contractSigned,_that.acknowledgmentsDone,_that.hasBanking,_that.hasSin,_that.td1FederalClaim,_that.td1AbClaim);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String email,  String name, @JsonKey(name: 'onboarding_complete')  bool onboardingComplete, @JsonKey(name: 'pending_verification')  bool pendingVerification, @JsonKey(name: 'onboarded')  bool onboarded,  String? phone,  String? address,  String? status,  String? hireDate, @JsonKey(name: 'pay_rate')  double? payRate, @JsonKey(name: 'onboarding_completed_at')  String? onboardingCompletedAt, @JsonKey(name: 'onboarding_step')  int onboardingStep, @JsonKey(name: 'has_password')  bool hasPassword, @JsonKey(name: 'selfie_url')  String? selfieUrl, @JsonKey(name: 'td1_federal_done')  bool td1FederalDone, @JsonKey(name: 'td1_ab_done')  bool td1AbDone, @JsonKey(name: 'contract_signed')  bool contractSigned, @JsonKey(name: 'acknowledgments_done')  bool acknowledgmentsDone, @JsonKey(name: 'has_banking')  bool hasBanking, @JsonKey(name: 'has_sin')  bool hasSin, @JsonKey(name: 'td1_federal_claim')  int? td1FederalClaim, @JsonKey(name: 'td1_ab_claim')  int? td1AbClaim)?  $default,) {final _that = this;
switch (_that) {
case _Employee() when $default != null:
return $default(_that.id,_that.email,_that.name,_that.onboardingComplete,_that.pendingVerification,_that.onboarded,_that.phone,_that.address,_that.status,_that.hireDate,_that.payRate,_that.onboardingCompletedAt,_that.onboardingStep,_that.hasPassword,_that.selfieUrl,_that.td1FederalDone,_that.td1AbDone,_that.contractSigned,_that.acknowledgmentsDone,_that.hasBanking,_that.hasSin,_that.td1FederalClaim,_that.td1AbClaim);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Employee implements Employee {
  const _Employee({required this.id, required this.email, required this.name, @JsonKey(name: 'onboarding_complete') this.onboardingComplete = false, @JsonKey(name: 'pending_verification') this.pendingVerification = false, @JsonKey(name: 'onboarded') this.onboarded = false, this.phone, this.address, this.status, this.hireDate, @JsonKey(name: 'pay_rate') this.payRate, @JsonKey(name: 'onboarding_completed_at') this.onboardingCompletedAt, @JsonKey(name: 'onboarding_step') this.onboardingStep = 0, @JsonKey(name: 'has_password') this.hasPassword = false, @JsonKey(name: 'selfie_url') this.selfieUrl, @JsonKey(name: 'td1_federal_done') this.td1FederalDone = false, @JsonKey(name: 'td1_ab_done') this.td1AbDone = false, @JsonKey(name: 'contract_signed') this.contractSigned = false, @JsonKey(name: 'acknowledgments_done') this.acknowledgmentsDone = false, @JsonKey(name: 'has_banking') this.hasBanking = false, @JsonKey(name: 'has_sin') this.hasSin = false, @JsonKey(name: 'td1_federal_claim') this.td1FederalClaim, @JsonKey(name: 'td1_ab_claim') this.td1AbClaim});
  factory _Employee.fromJson(Map<String, dynamic> json) => _$EmployeeFromJson(json);

@override final  String id;
@override final  String email;
@override final  String name;
@override@JsonKey(name: 'onboarding_complete') final  bool onboardingComplete;
@override@JsonKey(name: 'pending_verification') final  bool pendingVerification;
@override@JsonKey(name: 'onboarded') final  bool onboarded;
@override final  String? phone;
@override final  String? address;
@override final  String? status;
@override final  String? hireDate;
@override@JsonKey(name: 'pay_rate') final  double? payRate;
@override@JsonKey(name: 'onboarding_completed_at') final  String? onboardingCompletedAt;
@override@JsonKey(name: 'onboarding_step') final  int onboardingStep;
@override@JsonKey(name: 'has_password') final  bool hasPassword;
@override@JsonKey(name: 'selfie_url') final  String? selfieUrl;
@override@JsonKey(name: 'td1_federal_done') final  bool td1FederalDone;
@override@JsonKey(name: 'td1_ab_done') final  bool td1AbDone;
@override@JsonKey(name: 'contract_signed') final  bool contractSigned;
@override@JsonKey(name: 'acknowledgments_done') final  bool acknowledgmentsDone;
@override@JsonKey(name: 'has_banking') final  bool hasBanking;
@override@JsonKey(name: 'has_sin') final  bool hasSin;
@override@JsonKey(name: 'td1_federal_claim') final  int? td1FederalClaim;
@override@JsonKey(name: 'td1_ab_claim') final  int? td1AbClaim;

/// Create a copy of Employee
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$EmployeeCopyWith<_Employee> get copyWith => __$EmployeeCopyWithImpl<_Employee>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$EmployeeToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _Employee&&(identical(other.id, id) || other.id == id)&&(identical(other.email, email) || other.email == email)&&(identical(other.name, name) || other.name == name)&&(identical(other.onboardingComplete, onboardingComplete) || other.onboardingComplete == onboardingComplete)&&(identical(other.pendingVerification, pendingVerification) || other.pendingVerification == pendingVerification)&&(identical(other.onboarded, onboarded) || other.onboarded == onboarded)&&(identical(other.phone, phone) || other.phone == phone)&&(identical(other.address, address) || other.address == address)&&(identical(other.status, status) || other.status == status)&&(identical(other.hireDate, hireDate) || other.hireDate == hireDate)&&(identical(other.payRate, payRate) || other.payRate == payRate)&&(identical(other.onboardingCompletedAt, onboardingCompletedAt) || other.onboardingCompletedAt == onboardingCompletedAt)&&(identical(other.onboardingStep, onboardingStep) || other.onboardingStep == onboardingStep)&&(identical(other.hasPassword, hasPassword) || other.hasPassword == hasPassword)&&(identical(other.selfieUrl, selfieUrl) || other.selfieUrl == selfieUrl)&&(identical(other.td1FederalDone, td1FederalDone) || other.td1FederalDone == td1FederalDone)&&(identical(other.td1AbDone, td1AbDone) || other.td1AbDone == td1AbDone)&&(identical(other.contractSigned, contractSigned) || other.contractSigned == contractSigned)&&(identical(other.acknowledgmentsDone, acknowledgmentsDone) || other.acknowledgmentsDone == acknowledgmentsDone)&&(identical(other.hasBanking, hasBanking) || other.hasBanking == hasBanking)&&(identical(other.hasSin, hasSin) || other.hasSin == hasSin)&&(identical(other.td1FederalClaim, td1FederalClaim) || other.td1FederalClaim == td1FederalClaim)&&(identical(other.td1AbClaim, td1AbClaim) || other.td1AbClaim == td1AbClaim));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hashAll([runtimeType,id,email,name,onboardingComplete,pendingVerification,onboarded,phone,address,status,hireDate,payRate,onboardingCompletedAt,onboardingStep,hasPassword,selfieUrl,td1FederalDone,td1AbDone,contractSigned,acknowledgmentsDone,hasBanking,hasSin,td1FederalClaim,td1AbClaim]);

@override
String toString() {
  return 'Employee(id: $id, email: $email, name: $name, onboardingComplete: $onboardingComplete, pendingVerification: $pendingVerification, onboarded: $onboarded, phone: $phone, address: $address, status: $status, hireDate: $hireDate, payRate: $payRate, onboardingCompletedAt: $onboardingCompletedAt, onboardingStep: $onboardingStep, hasPassword: $hasPassword, selfieUrl: $selfieUrl, td1FederalDone: $td1FederalDone, td1AbDone: $td1AbDone, contractSigned: $contractSigned, acknowledgmentsDone: $acknowledgmentsDone, hasBanking: $hasBanking, hasSin: $hasSin, td1FederalClaim: $td1FederalClaim, td1AbClaim: $td1AbClaim)';
}


}

/// @nodoc
abstract mixin class _$EmployeeCopyWith<$Res> implements $EmployeeCopyWith<$Res> {
  factory _$EmployeeCopyWith(_Employee value, $Res Function(_Employee) _then) = __$EmployeeCopyWithImpl;
@override @useResult
$Res call({
 String id, String email, String name,@JsonKey(name: 'onboarding_complete') bool onboardingComplete,@JsonKey(name: 'pending_verification') bool pendingVerification,@JsonKey(name: 'onboarded') bool onboarded, String? phone, String? address, String? status, String? hireDate,@JsonKey(name: 'pay_rate') double? payRate,@JsonKey(name: 'onboarding_completed_at') String? onboardingCompletedAt,@JsonKey(name: 'onboarding_step') int onboardingStep,@JsonKey(name: 'has_password') bool hasPassword,@JsonKey(name: 'selfie_url') String? selfieUrl,@JsonKey(name: 'td1_federal_done') bool td1FederalDone,@JsonKey(name: 'td1_ab_done') bool td1AbDone,@JsonKey(name: 'contract_signed') bool contractSigned,@JsonKey(name: 'acknowledgments_done') bool acknowledgmentsDone,@JsonKey(name: 'has_banking') bool hasBanking,@JsonKey(name: 'has_sin') bool hasSin,@JsonKey(name: 'td1_federal_claim') int? td1FederalClaim,@JsonKey(name: 'td1_ab_claim') int? td1AbClaim
});




}
/// @nodoc
class __$EmployeeCopyWithImpl<$Res>
    implements _$EmployeeCopyWith<$Res> {
  __$EmployeeCopyWithImpl(this._self, this._then);

  final _Employee _self;
  final $Res Function(_Employee) _then;

/// Create a copy of Employee
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? email = null,Object? name = null,Object? onboardingComplete = null,Object? pendingVerification = null,Object? onboarded = null,Object? phone = freezed,Object? address = freezed,Object? status = freezed,Object? hireDate = freezed,Object? payRate = freezed,Object? onboardingCompletedAt = freezed,Object? onboardingStep = null,Object? hasPassword = null,Object? selfieUrl = freezed,Object? td1FederalDone = null,Object? td1AbDone = null,Object? contractSigned = null,Object? acknowledgmentsDone = null,Object? hasBanking = null,Object? hasSin = null,Object? td1FederalClaim = freezed,Object? td1AbClaim = freezed,}) {
  return _then(_Employee(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,email: null == email ? _self.email : email // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,onboardingComplete: null == onboardingComplete ? _self.onboardingComplete : onboardingComplete // ignore: cast_nullable_to_non_nullable
as bool,pendingVerification: null == pendingVerification ? _self.pendingVerification : pendingVerification // ignore: cast_nullable_to_non_nullable
as bool,onboarded: null == onboarded ? _self.onboarded : onboarded // ignore: cast_nullable_to_non_nullable
as bool,phone: freezed == phone ? _self.phone : phone // ignore: cast_nullable_to_non_nullable
as String?,address: freezed == address ? _self.address : address // ignore: cast_nullable_to_non_nullable
as String?,status: freezed == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String?,hireDate: freezed == hireDate ? _self.hireDate : hireDate // ignore: cast_nullable_to_non_nullable
as String?,payRate: freezed == payRate ? _self.payRate : payRate // ignore: cast_nullable_to_non_nullable
as double?,onboardingCompletedAt: freezed == onboardingCompletedAt ? _self.onboardingCompletedAt : onboardingCompletedAt // ignore: cast_nullable_to_non_nullable
as String?,onboardingStep: null == onboardingStep ? _self.onboardingStep : onboardingStep // ignore: cast_nullable_to_non_nullable
as int,hasPassword: null == hasPassword ? _self.hasPassword : hasPassword // ignore: cast_nullable_to_non_nullable
as bool,selfieUrl: freezed == selfieUrl ? _self.selfieUrl : selfieUrl // ignore: cast_nullable_to_non_nullable
as String?,td1FederalDone: null == td1FederalDone ? _self.td1FederalDone : td1FederalDone // ignore: cast_nullable_to_non_nullable
as bool,td1AbDone: null == td1AbDone ? _self.td1AbDone : td1AbDone // ignore: cast_nullable_to_non_nullable
as bool,contractSigned: null == contractSigned ? _self.contractSigned : contractSigned // ignore: cast_nullable_to_non_nullable
as bool,acknowledgmentsDone: null == acknowledgmentsDone ? _self.acknowledgmentsDone : acknowledgmentsDone // ignore: cast_nullable_to_non_nullable
as bool,hasBanking: null == hasBanking ? _self.hasBanking : hasBanking // ignore: cast_nullable_to_non_nullable
as bool,hasSin: null == hasSin ? _self.hasSin : hasSin // ignore: cast_nullable_to_non_nullable
as bool,td1FederalClaim: freezed == td1FederalClaim ? _self.td1FederalClaim : td1FederalClaim // ignore: cast_nullable_to_non_nullable
as int?,td1AbClaim: freezed == td1AbClaim ? _self.td1AbClaim : td1AbClaim // ignore: cast_nullable_to_non_nullable
as int?,
  ));
}


}


/// @nodoc
mixin _$EmployeeDocument {

@JsonKey(name: 'doc_type') String get docType; String get status;@JsonKey(name: 'uploaded_at') String? get uploadedAt;@JsonKey(name: 'verified_at') String? get verifiedAt;
/// Create a copy of EmployeeDocument
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$EmployeeDocumentCopyWith<EmployeeDocument> get copyWith => _$EmployeeDocumentCopyWithImpl<EmployeeDocument>(this as EmployeeDocument, _$identity);

  /// Serializes this EmployeeDocument to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is EmployeeDocument&&(identical(other.docType, docType) || other.docType == docType)&&(identical(other.status, status) || other.status == status)&&(identical(other.uploadedAt, uploadedAt) || other.uploadedAt == uploadedAt)&&(identical(other.verifiedAt, verifiedAt) || other.verifiedAt == verifiedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,docType,status,uploadedAt,verifiedAt);

@override
String toString() {
  return 'EmployeeDocument(docType: $docType, status: $status, uploadedAt: $uploadedAt, verifiedAt: $verifiedAt)';
}


}

/// @nodoc
abstract mixin class $EmployeeDocumentCopyWith<$Res>  {
  factory $EmployeeDocumentCopyWith(EmployeeDocument value, $Res Function(EmployeeDocument) _then) = _$EmployeeDocumentCopyWithImpl;
@useResult
$Res call({
@JsonKey(name: 'doc_type') String docType, String status,@JsonKey(name: 'uploaded_at') String? uploadedAt,@JsonKey(name: 'verified_at') String? verifiedAt
});




}
/// @nodoc
class _$EmployeeDocumentCopyWithImpl<$Res>
    implements $EmployeeDocumentCopyWith<$Res> {
  _$EmployeeDocumentCopyWithImpl(this._self, this._then);

  final EmployeeDocument _self;
  final $Res Function(EmployeeDocument) _then;

/// Create a copy of EmployeeDocument
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? docType = null,Object? status = null,Object? uploadedAt = freezed,Object? verifiedAt = freezed,}) {
  return _then(_self.copyWith(
docType: null == docType ? _self.docType : docType // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,uploadedAt: freezed == uploadedAt ? _self.uploadedAt : uploadedAt // ignore: cast_nullable_to_non_nullable
as String?,verifiedAt: freezed == verifiedAt ? _self.verifiedAt : verifiedAt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [EmployeeDocument].
extension EmployeeDocumentPatterns on EmployeeDocument {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _EmployeeDocument value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _EmployeeDocument() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _EmployeeDocument value)  $default,){
final _that = this;
switch (_that) {
case _EmployeeDocument():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _EmployeeDocument value)?  $default,){
final _that = this;
switch (_that) {
case _EmployeeDocument() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(name: 'doc_type')  String docType,  String status, @JsonKey(name: 'uploaded_at')  String? uploadedAt, @JsonKey(name: 'verified_at')  String? verifiedAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _EmployeeDocument() when $default != null:
return $default(_that.docType,_that.status,_that.uploadedAt,_that.verifiedAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(name: 'doc_type')  String docType,  String status, @JsonKey(name: 'uploaded_at')  String? uploadedAt, @JsonKey(name: 'verified_at')  String? verifiedAt)  $default,) {final _that = this;
switch (_that) {
case _EmployeeDocument():
return $default(_that.docType,_that.status,_that.uploadedAt,_that.verifiedAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(name: 'doc_type')  String docType,  String status, @JsonKey(name: 'uploaded_at')  String? uploadedAt, @JsonKey(name: 'verified_at')  String? verifiedAt)?  $default,) {final _that = this;
switch (_that) {
case _EmployeeDocument() when $default != null:
return $default(_that.docType,_that.status,_that.uploadedAt,_that.verifiedAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _EmployeeDocument implements EmployeeDocument {
  const _EmployeeDocument({@JsonKey(name: 'doc_type') required this.docType, required this.status, @JsonKey(name: 'uploaded_at') this.uploadedAt, @JsonKey(name: 'verified_at') this.verifiedAt});
  factory _EmployeeDocument.fromJson(Map<String, dynamic> json) => _$EmployeeDocumentFromJson(json);

@override@JsonKey(name: 'doc_type') final  String docType;
@override final  String status;
@override@JsonKey(name: 'uploaded_at') final  String? uploadedAt;
@override@JsonKey(name: 'verified_at') final  String? verifiedAt;

/// Create a copy of EmployeeDocument
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$EmployeeDocumentCopyWith<_EmployeeDocument> get copyWith => __$EmployeeDocumentCopyWithImpl<_EmployeeDocument>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$EmployeeDocumentToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _EmployeeDocument&&(identical(other.docType, docType) || other.docType == docType)&&(identical(other.status, status) || other.status == status)&&(identical(other.uploadedAt, uploadedAt) || other.uploadedAt == uploadedAt)&&(identical(other.verifiedAt, verifiedAt) || other.verifiedAt == verifiedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,docType,status,uploadedAt,verifiedAt);

@override
String toString() {
  return 'EmployeeDocument(docType: $docType, status: $status, uploadedAt: $uploadedAt, verifiedAt: $verifiedAt)';
}


}

/// @nodoc
abstract mixin class _$EmployeeDocumentCopyWith<$Res> implements $EmployeeDocumentCopyWith<$Res> {
  factory _$EmployeeDocumentCopyWith(_EmployeeDocument value, $Res Function(_EmployeeDocument) _then) = __$EmployeeDocumentCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(name: 'doc_type') String docType, String status,@JsonKey(name: 'uploaded_at') String? uploadedAt,@JsonKey(name: 'verified_at') String? verifiedAt
});




}
/// @nodoc
class __$EmployeeDocumentCopyWithImpl<$Res>
    implements _$EmployeeDocumentCopyWith<$Res> {
  __$EmployeeDocumentCopyWithImpl(this._self, this._then);

  final _EmployeeDocument _self;
  final $Res Function(_EmployeeDocument) _then;

/// Create a copy of EmployeeDocument
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? docType = null,Object? status = null,Object? uploadedAt = freezed,Object? verifiedAt = freezed,}) {
  return _then(_EmployeeDocument(
docType: null == docType ? _self.docType : docType // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,uploadedAt: freezed == uploadedAt ? _self.uploadedAt : uploadedAt // ignore: cast_nullable_to_non_nullable
as String?,verifiedAt: freezed == verifiedAt ? _self.verifiedAt : verifiedAt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$OnboardingSummary {

 bool get complete;@JsonKey(name: 'required') List<String> get required; List<String> get uploaded; List<String> get missing;
/// Create a copy of OnboardingSummary
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$OnboardingSummaryCopyWith<OnboardingSummary> get copyWith => _$OnboardingSummaryCopyWithImpl<OnboardingSummary>(this as OnboardingSummary, _$identity);

  /// Serializes this OnboardingSummary to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is OnboardingSummary&&(identical(other.complete, complete) || other.complete == complete)&&const DeepCollectionEquality().equals(other.required, required)&&const DeepCollectionEquality().equals(other.uploaded, uploaded)&&const DeepCollectionEquality().equals(other.missing, missing));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,complete,const DeepCollectionEquality().hash(required),const DeepCollectionEquality().hash(uploaded),const DeepCollectionEquality().hash(missing));

@override
String toString() {
  return 'OnboardingSummary(complete: $complete, required: $required, uploaded: $uploaded, missing: $missing)';
}


}

/// @nodoc
abstract mixin class $OnboardingSummaryCopyWith<$Res>  {
  factory $OnboardingSummaryCopyWith(OnboardingSummary value, $Res Function(OnboardingSummary) _then) = _$OnboardingSummaryCopyWithImpl;
@useResult
$Res call({
 bool complete,@JsonKey(name: 'required') List<String> required, List<String> uploaded, List<String> missing
});




}
/// @nodoc
class _$OnboardingSummaryCopyWithImpl<$Res>
    implements $OnboardingSummaryCopyWith<$Res> {
  _$OnboardingSummaryCopyWithImpl(this._self, this._then);

  final OnboardingSummary _self;
  final $Res Function(OnboardingSummary) _then;

/// Create a copy of OnboardingSummary
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? complete = null,Object? required = null,Object? uploaded = null,Object? missing = null,}) {
  return _then(_self.copyWith(
complete: null == complete ? _self.complete : complete // ignore: cast_nullable_to_non_nullable
as bool,required: null == required ? _self.required : required // ignore: cast_nullable_to_non_nullable
as List<String>,uploaded: null == uploaded ? _self.uploaded : uploaded // ignore: cast_nullable_to_non_nullable
as List<String>,missing: null == missing ? _self.missing : missing // ignore: cast_nullable_to_non_nullable
as List<String>,
  ));
}

}


/// Adds pattern-matching-related methods to [OnboardingSummary].
extension OnboardingSummaryPatterns on OnboardingSummary {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _OnboardingSummary value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _OnboardingSummary() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _OnboardingSummary value)  $default,){
final _that = this;
switch (_that) {
case _OnboardingSummary():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _OnboardingSummary value)?  $default,){
final _that = this;
switch (_that) {
case _OnboardingSummary() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( bool complete, @JsonKey(name: 'required')  List<String> required,  List<String> uploaded,  List<String> missing)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _OnboardingSummary() when $default != null:
return $default(_that.complete,_that.required,_that.uploaded,_that.missing);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( bool complete, @JsonKey(name: 'required')  List<String> required,  List<String> uploaded,  List<String> missing)  $default,) {final _that = this;
switch (_that) {
case _OnboardingSummary():
return $default(_that.complete,_that.required,_that.uploaded,_that.missing);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( bool complete, @JsonKey(name: 'required')  List<String> required,  List<String> uploaded,  List<String> missing)?  $default,) {final _that = this;
switch (_that) {
case _OnboardingSummary() when $default != null:
return $default(_that.complete,_that.required,_that.uploaded,_that.missing);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _OnboardingSummary implements OnboardingSummary {
  const _OnboardingSummary({this.complete = false, @JsonKey(name: 'required') final  List<String> required = const <String>[], final  List<String> uploaded = const <String>[], final  List<String> missing = const <String>[]}): _required = required,_uploaded = uploaded,_missing = missing;
  factory _OnboardingSummary.fromJson(Map<String, dynamic> json) => _$OnboardingSummaryFromJson(json);

@override@JsonKey() final  bool complete;
 final  List<String> _required;
@override@JsonKey(name: 'required') List<String> get required {
  if (_required is EqualUnmodifiableListView) return _required;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_required);
}

 final  List<String> _uploaded;
@override@JsonKey() List<String> get uploaded {
  if (_uploaded is EqualUnmodifiableListView) return _uploaded;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_uploaded);
}

 final  List<String> _missing;
@override@JsonKey() List<String> get missing {
  if (_missing is EqualUnmodifiableListView) return _missing;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_missing);
}


/// Create a copy of OnboardingSummary
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$OnboardingSummaryCopyWith<_OnboardingSummary> get copyWith => __$OnboardingSummaryCopyWithImpl<_OnboardingSummary>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$OnboardingSummaryToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _OnboardingSummary&&(identical(other.complete, complete) || other.complete == complete)&&const DeepCollectionEquality().equals(other._required, _required)&&const DeepCollectionEquality().equals(other._uploaded, _uploaded)&&const DeepCollectionEquality().equals(other._missing, _missing));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,complete,const DeepCollectionEquality().hash(_required),const DeepCollectionEquality().hash(_uploaded),const DeepCollectionEquality().hash(_missing));

@override
String toString() {
  return 'OnboardingSummary(complete: $complete, required: $required, uploaded: $uploaded, missing: $missing)';
}


}

/// @nodoc
abstract mixin class _$OnboardingSummaryCopyWith<$Res> implements $OnboardingSummaryCopyWith<$Res> {
  factory _$OnboardingSummaryCopyWith(_OnboardingSummary value, $Res Function(_OnboardingSummary) _then) = __$OnboardingSummaryCopyWithImpl;
@override @useResult
$Res call({
 bool complete,@JsonKey(name: 'required') List<String> required, List<String> uploaded, List<String> missing
});




}
/// @nodoc
class __$OnboardingSummaryCopyWithImpl<$Res>
    implements _$OnboardingSummaryCopyWith<$Res> {
  __$OnboardingSummaryCopyWithImpl(this._self, this._then);

  final _OnboardingSummary _self;
  final $Res Function(_OnboardingSummary) _then;

/// Create a copy of OnboardingSummary
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? complete = null,Object? required = null,Object? uploaded = null,Object? missing = null,}) {
  return _then(_OnboardingSummary(
complete: null == complete ? _self.complete : complete // ignore: cast_nullable_to_non_nullable
as bool,required: null == required ? _self._required : required // ignore: cast_nullable_to_non_nullable
as List<String>,uploaded: null == uploaded ? _self._uploaded : uploaded // ignore: cast_nullable_to_non_nullable
as List<String>,missing: null == missing ? _self._missing : missing // ignore: cast_nullable_to_non_nullable
as List<String>,
  ));
}


}


/// @nodoc
mixin _$MeResponse {

 Employee get employee; List<EmployeeDocument> get documents; OnboardingSummary get onboarding;@JsonKey(name: 'drive_configured') bool get driveConfigured;
/// Create a copy of MeResponse
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$MeResponseCopyWith<MeResponse> get copyWith => _$MeResponseCopyWithImpl<MeResponse>(this as MeResponse, _$identity);

  /// Serializes this MeResponse to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is MeResponse&&(identical(other.employee, employee) || other.employee == employee)&&const DeepCollectionEquality().equals(other.documents, documents)&&(identical(other.onboarding, onboarding) || other.onboarding == onboarding)&&(identical(other.driveConfigured, driveConfigured) || other.driveConfigured == driveConfigured));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,employee,const DeepCollectionEquality().hash(documents),onboarding,driveConfigured);

@override
String toString() {
  return 'MeResponse(employee: $employee, documents: $documents, onboarding: $onboarding, driveConfigured: $driveConfigured)';
}


}

/// @nodoc
abstract mixin class $MeResponseCopyWith<$Res>  {
  factory $MeResponseCopyWith(MeResponse value, $Res Function(MeResponse) _then) = _$MeResponseCopyWithImpl;
@useResult
$Res call({
 Employee employee, List<EmployeeDocument> documents, OnboardingSummary onboarding,@JsonKey(name: 'drive_configured') bool driveConfigured
});


$EmployeeCopyWith<$Res> get employee;$OnboardingSummaryCopyWith<$Res> get onboarding;

}
/// @nodoc
class _$MeResponseCopyWithImpl<$Res>
    implements $MeResponseCopyWith<$Res> {
  _$MeResponseCopyWithImpl(this._self, this._then);

  final MeResponse _self;
  final $Res Function(MeResponse) _then;

/// Create a copy of MeResponse
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? employee = null,Object? documents = null,Object? onboarding = null,Object? driveConfigured = null,}) {
  return _then(_self.copyWith(
employee: null == employee ? _self.employee : employee // ignore: cast_nullable_to_non_nullable
as Employee,documents: null == documents ? _self.documents : documents // ignore: cast_nullable_to_non_nullable
as List<EmployeeDocument>,onboarding: null == onboarding ? _self.onboarding : onboarding // ignore: cast_nullable_to_non_nullable
as OnboardingSummary,driveConfigured: null == driveConfigured ? _self.driveConfigured : driveConfigured // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}
/// Create a copy of MeResponse
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$EmployeeCopyWith<$Res> get employee {
  
  return $EmployeeCopyWith<$Res>(_self.employee, (value) {
    return _then(_self.copyWith(employee: value));
  });
}/// Create a copy of MeResponse
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$OnboardingSummaryCopyWith<$Res> get onboarding {
  
  return $OnboardingSummaryCopyWith<$Res>(_self.onboarding, (value) {
    return _then(_self.copyWith(onboarding: value));
  });
}
}


/// Adds pattern-matching-related methods to [MeResponse].
extension MeResponsePatterns on MeResponse {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _MeResponse value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _MeResponse() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _MeResponse value)  $default,){
final _that = this;
switch (_that) {
case _MeResponse():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _MeResponse value)?  $default,){
final _that = this;
switch (_that) {
case _MeResponse() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( Employee employee,  List<EmployeeDocument> documents,  OnboardingSummary onboarding, @JsonKey(name: 'drive_configured')  bool driveConfigured)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _MeResponse() when $default != null:
return $default(_that.employee,_that.documents,_that.onboarding,_that.driveConfigured);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( Employee employee,  List<EmployeeDocument> documents,  OnboardingSummary onboarding, @JsonKey(name: 'drive_configured')  bool driveConfigured)  $default,) {final _that = this;
switch (_that) {
case _MeResponse():
return $default(_that.employee,_that.documents,_that.onboarding,_that.driveConfigured);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( Employee employee,  List<EmployeeDocument> documents,  OnboardingSummary onboarding, @JsonKey(name: 'drive_configured')  bool driveConfigured)?  $default,) {final _that = this;
switch (_that) {
case _MeResponse() when $default != null:
return $default(_that.employee,_that.documents,_that.onboarding,_that.driveConfigured);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _MeResponse implements MeResponse {
  const _MeResponse({required this.employee, final  List<EmployeeDocument> documents = const <EmployeeDocument>[], required this.onboarding, @JsonKey(name: 'drive_configured') this.driveConfigured = false}): _documents = documents;
  factory _MeResponse.fromJson(Map<String, dynamic> json) => _$MeResponseFromJson(json);

@override final  Employee employee;
 final  List<EmployeeDocument> _documents;
@override@JsonKey() List<EmployeeDocument> get documents {
  if (_documents is EqualUnmodifiableListView) return _documents;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_documents);
}

@override final  OnboardingSummary onboarding;
@override@JsonKey(name: 'drive_configured') final  bool driveConfigured;

/// Create a copy of MeResponse
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$MeResponseCopyWith<_MeResponse> get copyWith => __$MeResponseCopyWithImpl<_MeResponse>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$MeResponseToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _MeResponse&&(identical(other.employee, employee) || other.employee == employee)&&const DeepCollectionEquality().equals(other._documents, _documents)&&(identical(other.onboarding, onboarding) || other.onboarding == onboarding)&&(identical(other.driveConfigured, driveConfigured) || other.driveConfigured == driveConfigured));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,employee,const DeepCollectionEquality().hash(_documents),onboarding,driveConfigured);

@override
String toString() {
  return 'MeResponse(employee: $employee, documents: $documents, onboarding: $onboarding, driveConfigured: $driveConfigured)';
}


}

/// @nodoc
abstract mixin class _$MeResponseCopyWith<$Res> implements $MeResponseCopyWith<$Res> {
  factory _$MeResponseCopyWith(_MeResponse value, $Res Function(_MeResponse) _then) = __$MeResponseCopyWithImpl;
@override @useResult
$Res call({
 Employee employee, List<EmployeeDocument> documents, OnboardingSummary onboarding,@JsonKey(name: 'drive_configured') bool driveConfigured
});


@override $EmployeeCopyWith<$Res> get employee;@override $OnboardingSummaryCopyWith<$Res> get onboarding;

}
/// @nodoc
class __$MeResponseCopyWithImpl<$Res>
    implements _$MeResponseCopyWith<$Res> {
  __$MeResponseCopyWithImpl(this._self, this._then);

  final _MeResponse _self;
  final $Res Function(_MeResponse) _then;

/// Create a copy of MeResponse
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? employee = null,Object? documents = null,Object? onboarding = null,Object? driveConfigured = null,}) {
  return _then(_MeResponse(
employee: null == employee ? _self.employee : employee // ignore: cast_nullable_to_non_nullable
as Employee,documents: null == documents ? _self._documents : documents // ignore: cast_nullable_to_non_nullable
as List<EmployeeDocument>,onboarding: null == onboarding ? _self.onboarding : onboarding // ignore: cast_nullable_to_non_nullable
as OnboardingSummary,driveConfigured: null == driveConfigured ? _self.driveConfigured : driveConfigured // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

/// Create a copy of MeResponse
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$EmployeeCopyWith<$Res> get employee {
  
  return $EmployeeCopyWith<$Res>(_self.employee, (value) {
    return _then(_self.copyWith(employee: value));
  });
}/// Create a copy of MeResponse
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$OnboardingSummaryCopyWith<$Res> get onboarding {
  
  return $OnboardingSummaryCopyWith<$Res>(_self.onboarding, (value) {
    return _then(_self.copyWith(onboarding: value));
  });
}
}


/// @nodoc
mixin _$LoginResponse {

 Employee get employee;
/// Create a copy of LoginResponse
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$LoginResponseCopyWith<LoginResponse> get copyWith => _$LoginResponseCopyWithImpl<LoginResponse>(this as LoginResponse, _$identity);

  /// Serializes this LoginResponse to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is LoginResponse&&(identical(other.employee, employee) || other.employee == employee));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,employee);

@override
String toString() {
  return 'LoginResponse(employee: $employee)';
}


}

/// @nodoc
abstract mixin class $LoginResponseCopyWith<$Res>  {
  factory $LoginResponseCopyWith(LoginResponse value, $Res Function(LoginResponse) _then) = _$LoginResponseCopyWithImpl;
@useResult
$Res call({
 Employee employee
});


$EmployeeCopyWith<$Res> get employee;

}
/// @nodoc
class _$LoginResponseCopyWithImpl<$Res>
    implements $LoginResponseCopyWith<$Res> {
  _$LoginResponseCopyWithImpl(this._self, this._then);

  final LoginResponse _self;
  final $Res Function(LoginResponse) _then;

/// Create a copy of LoginResponse
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? employee = null,}) {
  return _then(_self.copyWith(
employee: null == employee ? _self.employee : employee // ignore: cast_nullable_to_non_nullable
as Employee,
  ));
}
/// Create a copy of LoginResponse
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$EmployeeCopyWith<$Res> get employee {
  
  return $EmployeeCopyWith<$Res>(_self.employee, (value) {
    return _then(_self.copyWith(employee: value));
  });
}
}


/// Adds pattern-matching-related methods to [LoginResponse].
extension LoginResponsePatterns on LoginResponse {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _LoginResponse value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _LoginResponse() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _LoginResponse value)  $default,){
final _that = this;
switch (_that) {
case _LoginResponse():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _LoginResponse value)?  $default,){
final _that = this;
switch (_that) {
case _LoginResponse() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( Employee employee)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _LoginResponse() when $default != null:
return $default(_that.employee);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( Employee employee)  $default,) {final _that = this;
switch (_that) {
case _LoginResponse():
return $default(_that.employee);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( Employee employee)?  $default,) {final _that = this;
switch (_that) {
case _LoginResponse() when $default != null:
return $default(_that.employee);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _LoginResponse implements LoginResponse {
  const _LoginResponse({required this.employee});
  factory _LoginResponse.fromJson(Map<String, dynamic> json) => _$LoginResponseFromJson(json);

@override final  Employee employee;

/// Create a copy of LoginResponse
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$LoginResponseCopyWith<_LoginResponse> get copyWith => __$LoginResponseCopyWithImpl<_LoginResponse>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$LoginResponseToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _LoginResponse&&(identical(other.employee, employee) || other.employee == employee));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,employee);

@override
String toString() {
  return 'LoginResponse(employee: $employee)';
}


}

/// @nodoc
abstract mixin class _$LoginResponseCopyWith<$Res> implements $LoginResponseCopyWith<$Res> {
  factory _$LoginResponseCopyWith(_LoginResponse value, $Res Function(_LoginResponse) _then) = __$LoginResponseCopyWithImpl;
@override @useResult
$Res call({
 Employee employee
});


@override $EmployeeCopyWith<$Res> get employee;

}
/// @nodoc
class __$LoginResponseCopyWithImpl<$Res>
    implements _$LoginResponseCopyWith<$Res> {
  __$LoginResponseCopyWithImpl(this._self, this._then);

  final _LoginResponse _self;
  final $Res Function(_LoginResponse) _then;

/// Create a copy of LoginResponse
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? employee = null,}) {
  return _then(_LoginResponse(
employee: null == employee ? _self.employee : employee // ignore: cast_nullable_to_non_nullable
as Employee,
  ));
}

/// Create a copy of LoginResponse
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$EmployeeCopyWith<$Res> get employee {
  
  return $EmployeeCopyWith<$Res>(_self.employee, (value) {
    return _then(_self.copyWith(employee: value));
  });
}
}

// dart format on
