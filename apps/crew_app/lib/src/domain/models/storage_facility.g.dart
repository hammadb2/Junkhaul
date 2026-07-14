// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'storage_facility.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_StorageFacility _$StorageFacilityFromJson(Map<String, dynamic> json) =>
    _StorageFacility(
      id: json['id'] as String,
      name: json['name'] as String?,
      address: json['address'] as String?,
      lat: (json['lat'] as num?)?.toDouble(),
      lng: (json['lng'] as num?)?.toDouble(),
      accessCode: json['access_code'] as String?,
      capacitySqft: (json['capacity_sqft'] as num?)?.toDouble(),
      currentUsagePct: (json['current_usage_pct'] as num?)?.toDouble(),
    );

Map<String, dynamic> _$StorageFacilityToJson(_StorageFacility instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'address': instance.address,
      'lat': instance.lat,
      'lng': instance.lng,
      'access_code': instance.accessCode,
      'capacity_sqft': instance.capacitySqft,
      'current_usage_pct': instance.currentUsagePct,
    };

_StorageFacilitiesResponse _$StorageFacilitiesResponseFromJson(
  Map<String, dynamic> json,
) => _StorageFacilitiesResponse(
  facilities:
      (json['facilities'] as List<dynamic>?)
          ?.map((e) => StorageFacility.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <StorageFacility>[],
);

Map<String, dynamic> _$StorageFacilitiesResponseToJson(
  _StorageFacilitiesResponse instance,
) => <String, dynamic>{'facilities': instance.facilities};
