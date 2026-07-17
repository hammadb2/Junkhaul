import 'package:freezed_annotation/freezed_annotation.dart';

part 'shift.freezed.dart';
part 'shift.g.dart';

/// Shift row from GET /api/employee/shifts.
@freezed
abstract class Shift with _$Shift {
  const factory Shift({
    required String id,
    @JsonKey(name: 'employee_id') String? employeeId,
    @JsonKey(name: 'clock_in_at') String? clockInAt,
    @JsonKey(name: 'clock_out_at') String? clockOutAt,
    @JsonKey(name: 'clock_in_lat') double? clockInLat,
    @JsonKey(name: 'clock_in_lng') double? clockInLng,
    @JsonKey(name: 'regular_hours') double? regularHours,
    @JsonKey(name: 'overtime_hours') double? overtimeHours,
    @JsonKey(name: 'total_hours') double? totalHours,
    @JsonKey(name: 'gross_pay') double? grossPay,
  }) = _Shift;

  factory Shift.fromJson(Map<String, dynamic> json) => _$ShiftFromJson(json);
}

/// Period totals returned by /api/employee/shifts.
@freezed
abstract class ShiftPeriod with _$ShiftPeriod {
  const factory ShiftPeriod({
    @JsonKey(name: 'regular_hours') double? regularHours,
    @JsonKey(name: 'overtime_hours') double? overtimeHours,
    @JsonKey(name: 'total_hours') double? totalHours,
    double? gross,
  }) = _ShiftPeriod;

  factory ShiftPeriod.fromJson(Map<String, dynamic> json) =>
      _$ShiftPeriodFromJson(json);
}

/// GET /api/employee/shifts response.
@freezed
abstract class ShiftsResponse with _$ShiftsResponse {
  const factory ShiftsResponse({
    @JsonKey(name: 'open_shift') Shift? openShift,
    @Default(<Shift>[]) List<Shift> recent,
    ShiftPeriod? period,
  }) = _ShiftsResponse;

  factory ShiftsResponse.fromJson(Map<String, dynamic> json) =>
      _$ShiftsResponseFromJson(json);
}
