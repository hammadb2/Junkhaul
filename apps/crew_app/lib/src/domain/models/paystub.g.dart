// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'paystub.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_PayStub _$PayStubFromJson(Map<String, dynamic> json) => _PayStub(
  id: json['id'] as String,
  payRunId: json['pay_run_id'] as String?,
  createdAt: json['created_at'] as String?,
  regularHours: (json['regular_hours'] as num?)?.toDouble(),
  overtimeHours: (json['overtime_hours'] as num?)?.toDouble(),
  totalHours: (json['total_hours'] as num?)?.toDouble(),
  regularPay: (json['regular_pay'] as num?)?.toDouble(),
  overtimePay: (json['overtime_pay'] as num?)?.toDouble(),
  grossPay: (json['gross_pay'] as num?)?.toDouble(),
  vacationPay: (json['vacation_pay'] as num?)?.toDouble(),
  cpp: (json['cpp'] as num?)?.toDouble(),
  cpp2: (json['cpp2'] as num?)?.toDouble(),
  ei: (json['ei'] as num?)?.toDouble(),
  fedTax: (json['fed_tax'] as num?)?.toDouble(),
  totalDeductions: (json['total_deductions'] as num?)?.toDouble(),
  netPay: (json['net_pay'] as num?)?.toDouble(),
  ytdGross: (json['ytd_gross'] as num?)?.toDouble(),
  ytdCpp: (json['ytd_cpp'] as num?)?.toDouble(),
  ytdCpp2: (json['ytd_cpp2'] as num?)?.toDouble(),
  ytdEi: (json['ytd_ei'] as num?)?.toDouble(),
  ytdVacation: (json['ytd_vacation'] as num?)?.toDouble(),
  directDepositStatus: json['direct_deposit_status'] as String?,
  directDepositSentAt: json['direct_deposit_sent_at'] as String?,
);

Map<String, dynamic> _$PayStubToJson(_PayStub instance) => <String, dynamic>{
  'id': instance.id,
  'pay_run_id': instance.payRunId,
  'created_at': instance.createdAt,
  'regular_hours': instance.regularHours,
  'overtime_hours': instance.overtimeHours,
  'total_hours': instance.totalHours,
  'regular_pay': instance.regularPay,
  'overtime_pay': instance.overtimePay,
  'gross_pay': instance.grossPay,
  'vacation_pay': instance.vacationPay,
  'cpp': instance.cpp,
  'cpp2': instance.cpp2,
  'ei': instance.ei,
  'fed_tax': instance.fedTax,
  'total_deductions': instance.totalDeductions,
  'net_pay': instance.netPay,
  'ytd_gross': instance.ytdGross,
  'ytd_cpp': instance.ytdCpp,
  'ytd_cpp2': instance.ytdCpp2,
  'ytd_ei': instance.ytdEi,
  'ytd_vacation': instance.ytdVacation,
  'direct_deposit_status': instance.directDepositStatus,
  'direct_deposit_sent_at': instance.directDepositSentAt,
};

_PayStubsResponse _$PayStubsResponseFromJson(Map<String, dynamic> json) =>
    _PayStubsResponse(
      payStubs:
          (json['pay_stubs'] as List<dynamic>?)
              ?.map((e) => PayStub.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <PayStub>[],
    );

Map<String, dynamic> _$PayStubsResponseToJson(_PayStubsResponse instance) =>
    <String, dynamic>{'pay_stubs': instance.payStubs};
