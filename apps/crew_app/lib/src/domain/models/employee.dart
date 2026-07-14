import 'package:freezed_annotation/freezed_annotation.dart';

part 'employee.freezed.dart';
part 'employee.g.dart';

/// Employee profile returned by GET /api/employee/me and POST /api/employee/login.
@freezed
abstract class Employee with _$Employee {
  const factory Employee({
    required String id,
    required String email,
    required String name,
    @JsonKey(name: 'onboarding_complete') @Default(false) bool onboardingComplete,
    @JsonKey(name: 'pending_verification') @Default(false) bool pendingVerification,
    @JsonKey(name: 'onboarded') @Default(false) bool onboarded,
    String? phone,
    String? address,
    String? status,
    String? hireDate,
    @JsonKey(name: 'pay_rate') double? payRate,
    @JsonKey(name: 'onboarding_completed_at') String? onboardingCompletedAt,
    @JsonKey(name: 'onboarding_step') @Default(0) int onboardingStep,
    @JsonKey(name: 'has_password') @Default(false) bool hasPassword,
    @JsonKey(name: 'selfie_url') String? selfieUrl,
    @JsonKey(name: 'td1_federal_done') @Default(false) bool td1FederalDone,
    @JsonKey(name: 'td1_ab_done') @Default(false) bool td1AbDone,
    @JsonKey(name: 'contract_signed') @Default(false) bool contractSigned,
    @JsonKey(name: 'acknowledgments_done') @Default(false) bool acknowledgmentsDone,
    @JsonKey(name: 'has_banking') @Default(false) bool hasBanking,
    @JsonKey(name: 'has_sin') @Default(false) bool hasSin,
    @JsonKey(name: 'td1_federal_claim') int? td1FederalClaim,
    @JsonKey(name: 'td1_ab_claim') int? td1AbClaim,
  }) = _Employee;

  factory Employee.fromJson(Map<String, dynamic> json) => _$EmployeeFromJson(json);
}

/// Document row returned alongside [Employee] in /api/employee/me.
@freezed
abstract class EmployeeDocument with _$EmployeeDocument {
  const factory EmployeeDocument({
    @JsonKey(name: 'doc_type') required String docType,
    required String status,
    @JsonKey(name: 'uploaded_at') String? uploadedAt,
    @JsonKey(name: 'verified_at') String? verifiedAt,
  }) = _EmployeeDocument;

  factory EmployeeDocument.fromJson(Map<String, dynamic> json) => _$EmployeeDocumentFromJson(json);
}

/// Onboarding summary returned in /api/employee/me.
@freezed
abstract class OnboardingSummary with _$OnboardingSummary {
  const factory OnboardingSummary({
    @Default(false) bool complete,
    @JsonKey(name: 'required') @Default(<String>[]) List<String> required,
    @Default(<String>[]) List<String> uploaded,
    @Default(<String>[]) List<String> missing,
  }) = _OnboardingSummary;

  factory OnboardingSummary.fromJson(Map<String, dynamic> json) => _$OnboardingSummaryFromJson(json);
}

/// Full /api/employee/me response.
@freezed
abstract class MeResponse with _$MeResponse {
  const factory MeResponse({
    required Employee employee,
    @Default(<EmployeeDocument>[]) List<EmployeeDocument> documents,
    required OnboardingSummary onboarding,
    @JsonKey(name: 'drive_configured') @Default(false) bool driveConfigured,
  }) = _MeResponse;

  factory MeResponse.fromJson(Map<String, dynamic> json) => _$MeResponseFromJson(json);
}

/// Login response body (without Set-Cookie header, handled by dio).
@freezed
abstract class LoginResponse with _$LoginResponse {
  const factory LoginResponse({
    required Employee employee,
  }) = _LoginResponse;

  factory LoginResponse.fromJson(Map<String, dynamic> json) => _$LoginResponseFromJson(json);
}
