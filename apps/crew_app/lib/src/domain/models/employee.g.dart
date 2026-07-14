// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'employee.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_Employee _$EmployeeFromJson(Map<String, dynamic> json) => _Employee(
  id: json['id'] as String,
  email: json['email'] as String,
  name: json['name'] as String,
  onboardingComplete: json['onboarding_complete'] as bool? ?? false,
  pendingVerification: json['pending_verification'] as bool? ?? false,
  onboarded: json['onboarded'] as bool? ?? false,
  phone: json['phone'] as String?,
  address: json['address'] as String?,
  status: json['status'] as String?,
  hireDate: json['hireDate'] as String?,
  payRate: (json['pay_rate'] as num?)?.toDouble(),
  onboardingCompletedAt: json['onboarding_completed_at'] as String?,
  onboardingStep: (json['onboarding_step'] as num?)?.toInt() ?? 0,
  hasPassword: json['has_password'] as bool? ?? false,
  selfieUrl: json['selfie_url'] as String?,
  td1FederalDone: json['td1_federal_done'] as bool? ?? false,
  td1AbDone: json['td1_ab_done'] as bool? ?? false,
  contractSigned: json['contract_signed'] as bool? ?? false,
  acknowledgmentsDone: json['acknowledgments_done'] as bool? ?? false,
  hasBanking: json['has_banking'] as bool? ?? false,
  hasSin: json['has_sin'] as bool? ?? false,
  td1FederalClaim: (json['td1_federal_claim'] as num?)?.toInt(),
  td1AbClaim: (json['td1_ab_claim'] as num?)?.toInt(),
);

Map<String, dynamic> _$EmployeeToJson(_Employee instance) => <String, dynamic>{
  'id': instance.id,
  'email': instance.email,
  'name': instance.name,
  'onboarding_complete': instance.onboardingComplete,
  'pending_verification': instance.pendingVerification,
  'onboarded': instance.onboarded,
  'phone': instance.phone,
  'address': instance.address,
  'status': instance.status,
  'hireDate': instance.hireDate,
  'pay_rate': instance.payRate,
  'onboarding_completed_at': instance.onboardingCompletedAt,
  'onboarding_step': instance.onboardingStep,
  'has_password': instance.hasPassword,
  'selfie_url': instance.selfieUrl,
  'td1_federal_done': instance.td1FederalDone,
  'td1_ab_done': instance.td1AbDone,
  'contract_signed': instance.contractSigned,
  'acknowledgments_done': instance.acknowledgmentsDone,
  'has_banking': instance.hasBanking,
  'has_sin': instance.hasSin,
  'td1_federal_claim': instance.td1FederalClaim,
  'td1_ab_claim': instance.td1AbClaim,
};

_EmployeeDocument _$EmployeeDocumentFromJson(Map<String, dynamic> json) =>
    _EmployeeDocument(
      docType: json['doc_type'] as String,
      status: json['status'] as String,
      uploadedAt: json['uploaded_at'] as String?,
      verifiedAt: json['verified_at'] as String?,
    );

Map<String, dynamic> _$EmployeeDocumentToJson(_EmployeeDocument instance) =>
    <String, dynamic>{
      'doc_type': instance.docType,
      'status': instance.status,
      'uploaded_at': instance.uploadedAt,
      'verified_at': instance.verifiedAt,
    };

_OnboardingSummary _$OnboardingSummaryFromJson(
  Map<String, dynamic> json,
) => _OnboardingSummary(
  complete: json['complete'] as bool? ?? false,
  required:
      (json['required'] as List<dynamic>?)?.map((e) => e as String).toList() ??
      const <String>[],
  uploaded:
      (json['uploaded'] as List<dynamic>?)?.map((e) => e as String).toList() ??
      const <String>[],
  missing:
      (json['missing'] as List<dynamic>?)?.map((e) => e as String).toList() ??
      const <String>[],
);

Map<String, dynamic> _$OnboardingSummaryToJson(_OnboardingSummary instance) =>
    <String, dynamic>{
      'complete': instance.complete,
      'required': instance.required,
      'uploaded': instance.uploaded,
      'missing': instance.missing,
    };

_MeResponse _$MeResponseFromJson(Map<String, dynamic> json) => _MeResponse(
  employee: Employee.fromJson(json['employee'] as Map<String, dynamic>),
  documents:
      (json['documents'] as List<dynamic>?)
          ?.map((e) => EmployeeDocument.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <EmployeeDocument>[],
  onboarding: OnboardingSummary.fromJson(
    json['onboarding'] as Map<String, dynamic>,
  ),
  driveConfigured: json['drive_configured'] as bool? ?? false,
);

Map<String, dynamic> _$MeResponseToJson(_MeResponse instance) =>
    <String, dynamic>{
      'employee': instance.employee,
      'documents': instance.documents,
      'onboarding': instance.onboarding,
      'drive_configured': instance.driveConfigured,
    };

_LoginResponse _$LoginResponseFromJson(Map<String, dynamic> json) =>
    _LoginResponse(
      employee: Employee.fromJson(json['employee'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$LoginResponseToJson(_LoginResponse instance) =>
    <String, dynamic>{'employee': instance.employee};
