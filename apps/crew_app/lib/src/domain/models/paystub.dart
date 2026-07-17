import 'package:freezed_annotation/freezed_annotation.dart';

part 'paystub.freezed.dart';
part 'paystub.g.dart';

/// Pay stub row from GET /api/employee/pay-stubs.
@freezed
abstract class PayStub with _$PayStub {
  const factory PayStub({
    required String id,
    @JsonKey(name: 'pay_run_id') String? payRunId,
    @JsonKey(name: 'created_at') String? createdAt,
    @JsonKey(name: 'regular_hours') double? regularHours,
    @JsonKey(name: 'overtime_hours') double? overtimeHours,
    @JsonKey(name: 'total_hours') double? totalHours,
    @JsonKey(name: 'regular_pay') double? regularPay,
    @JsonKey(name: 'overtime_pay') double? overtimePay,
    @JsonKey(name: 'gross_pay') double? grossPay,
    @JsonKey(name: 'vacation_pay') double? vacationPay,
    double? cpp,
    @JsonKey(name: 'cpp2') double? cpp2,
    double? ei,
    @JsonKey(name: 'fed_tax') double? fedTax,
    @JsonKey(name: 'total_deductions') double? totalDeductions,
    @JsonKey(name: 'net_pay') double? netPay,
    @JsonKey(name: 'ytd_gross') double? ytdGross,
    @JsonKey(name: 'ytd_cpp') double? ytdCpp,
    @JsonKey(name: 'ytd_cpp2') double? ytdCpp2,
    @JsonKey(name: 'ytd_ei') double? ytdEi,
    @JsonKey(name: 'ytd_vacation') double? ytdVacation,
    @JsonKey(name: 'direct_deposit_status') String? directDepositStatus,
    @JsonKey(name: 'direct_deposit_sent_at') String? directDepositSentAt,
  }) = _PayStub;

  factory PayStub.fromJson(Map<String, dynamic> json) =>
      _$PayStubFromJson(json);
}

/// GET /api/employee/pay-stubs response.
@freezed
abstract class PayStubsResponse with _$PayStubsResponse {
  const factory PayStubsResponse({
    @JsonKey(name: 'pay_stubs') @Default(<PayStub>[]) List<PayStub> payStubs,
  }) = _PayStubsResponse;

  factory PayStubsResponse.fromJson(Map<String, dynamic> json) =>
      _$PayStubsResponseFromJson(json);
}
