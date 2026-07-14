// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'landfill.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_Landfill _$LandfillFromJson(Map<String, dynamic> json) => _Landfill(
  id: json['id'] as String,
  name: json['name'] as String?,
  address: json['address'] as String?,
  lat: (json['lat'] as num?)?.toDouble(),
  lng: (json['lng'] as num?)?.toDouble(),
  openTime: json['open_time'] as String?,
  closeTime: json['close_time'] as String?,
  summerOnlySunday: json['summer_only_sunday'] as bool?,
);

Map<String, dynamic> _$LandfillToJson(_Landfill instance) => <String, dynamic>{
  'id': instance.id,
  'name': instance.name,
  'address': instance.address,
  'lat': instance.lat,
  'lng': instance.lng,
  'open_time': instance.openTime,
  'close_time': instance.closeTime,
  'summer_only_sunday': instance.summerOnlySunday,
};

_LandfillResponse _$LandfillResponseFromJson(Map<String, dynamic> json) =>
    _LandfillResponse(
      recommended: json['recommended'] == null
          ? null
          : Landfill.fromJson(json['recommended'] as Map<String, dynamic>),
      all:
          (json['all'] as List<dynamic>?)
              ?.map((e) => Landfill.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <Landfill>[],
      warnings:
          (json['warnings'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const <String>[],
      dayOfWeek: json['day_of_week'] as String?,
      isSunday: json['is_sunday'] as bool? ?? false,
    );

Map<String, dynamic> _$LandfillResponseToJson(_LandfillResponse instance) =>
    <String, dynamic>{
      'recommended': instance.recommended,
      'all': instance.all,
      'warnings': instance.warnings,
      'day_of_week': instance.dayOfWeek,
      'is_sunday': instance.isSunday,
    };
