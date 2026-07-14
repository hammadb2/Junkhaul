// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'truck_check.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_TruckCheck _$TruckCheckFromJson(Map<String, dynamic> json) => _TruckCheck(
  id: json['id'] as String,
  assignmentId: json['assignment_id'] as String?,
  checkType: json['check_type'] as String?,
  dashboardPhotoUrl: json['dashboard_photo_url'] as String?,
  odometerKm: (json['odometer_km'] as num?)?.toDouble(),
  fuelLevel: json['fuel_level'] as String?,
  fuelPercent: (json['fuel_percent'] as num?)?.toDouble(),
  truckPhotos:
      (json['truck_photos'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList() ??
      const <String>[],
  damageNotes: json['damage_notes'] as String?,
  gasReceiptUrl: json['gas_receipt_url'] as String?,
  gasAmountCad: (json['gas_amount_cad'] as num?)?.toDouble(),
  gasStation: json['gas_station'] as String?,
  createdAt: json['created_at'] as String?,
);

Map<String, dynamic> _$TruckCheckToJson(_TruckCheck instance) =>
    <String, dynamic>{
      'id': instance.id,
      'assignment_id': instance.assignmentId,
      'check_type': instance.checkType,
      'dashboard_photo_url': instance.dashboardPhotoUrl,
      'odometer_km': instance.odometerKm,
      'fuel_level': instance.fuelLevel,
      'fuel_percent': instance.fuelPercent,
      'truck_photos': instance.truckPhotos,
      'damage_notes': instance.damageNotes,
      'gas_receipt_url': instance.gasReceiptUrl,
      'gas_amount_cad': instance.gasAmountCad,
      'gas_station': instance.gasStation,
      'created_at': instance.createdAt,
    };

_TruckChecksResponse _$TruckChecksResponseFromJson(Map<String, dynamic> json) =>
    _TruckChecksResponse(
      checks:
          (json['checks'] as List<dynamic>?)
              ?.map((e) => TruckCheck.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <TruckCheck>[],
    );

Map<String, dynamic> _$TruckChecksResponseToJson(
  _TruckChecksResponse instance,
) => <String, dynamic>{'checks': instance.checks};
