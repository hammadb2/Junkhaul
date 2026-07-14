// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'shift.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_Shift _$ShiftFromJson(Map<String, dynamic> json) => _Shift(
  id: json['id'] as String,
  employeeId: json['employee_id'] as String?,
  clockInAt: json['clock_in_at'] as String?,
  clockOutAt: json['clock_out_at'] as String?,
  clockInLat: (json['clock_in_lat'] as num?)?.toDouble(),
  clockInLng: (json['clock_in_lng'] as num?)?.toDouble(),
  regularHours: (json['regular_hours'] as num?)?.toDouble(),
  overtimeHours: (json['overtime_hours'] as num?)?.toDouble(),
  totalHours: (json['total_hours'] as num?)?.toDouble(),
  grossPay: (json['gross_pay'] as num?)?.toDouble(),
);

Map<String, dynamic> _$ShiftToJson(_Shift instance) => <String, dynamic>{
  'id': instance.id,
  'employee_id': instance.employeeId,
  'clock_in_at': instance.clockInAt,
  'clock_out_at': instance.clockOutAt,
  'clock_in_lat': instance.clockInLat,
  'clock_in_lng': instance.clockInLng,
  'regular_hours': instance.regularHours,
  'overtime_hours': instance.overtimeHours,
  'total_hours': instance.totalHours,
  'gross_pay': instance.grossPay,
};

_ShiftPeriod _$ShiftPeriodFromJson(Map<String, dynamic> json) => _ShiftPeriod(
  regularHours: (json['regular_hours'] as num?)?.toDouble(),
  overtimeHours: (json['overtime_hours'] as num?)?.toDouble(),
  totalHours: (json['total_hours'] as num?)?.toDouble(),
  gross: (json['gross'] as num?)?.toDouble(),
);

Map<String, dynamic> _$ShiftPeriodToJson(_ShiftPeriod instance) =>
    <String, dynamic>{
      'regular_hours': instance.regularHours,
      'overtime_hours': instance.overtimeHours,
      'total_hours': instance.totalHours,
      'gross': instance.gross,
    };

_ShiftsResponse _$ShiftsResponseFromJson(Map<String, dynamic> json) =>
    _ShiftsResponse(
      openShift: json['open_shift'] == null
          ? null
          : Shift.fromJson(json['open_shift'] as Map<String, dynamic>),
      recent:
          (json['recent'] as List<dynamic>?)
              ?.map((e) => Shift.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <Shift>[],
      period: json['period'] == null
          ? null
          : ShiftPeriod.fromJson(json['period'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$ShiftsResponseToJson(_ShiftsResponse instance) =>
    <String, dynamic>{
      'open_shift': instance.openShift,
      'recent': instance.recent,
      'period': instance.period,
    };
