// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'crew_location.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_CrewLocation _$CrewLocationFromJson(Map<String, dynamic> json) =>
    _CrewLocation(
      lat: (json['lat'] as num).toDouble(),
      lng: (json['lng'] as num).toDouble(),
      heading: (json['heading'] as num?)?.toDouble(),
      speed: (json['speed'] as num?)?.toDouble(),
      updatedAt: json['updated_at'] as String?,
      crewFirstNames: json['crew_first_names'] as String?,
      enRoute: json['enRoute'] as bool? ?? false,
    );

Map<String, dynamic> _$CrewLocationToJson(_CrewLocation instance) =>
    <String, dynamic>{
      'lat': instance.lat,
      'lng': instance.lng,
      'heading': instance.heading,
      'speed': instance.speed,
      'updated_at': instance.updatedAt,
      'crew_first_names': instance.crewFirstNames,
      'enRoute': instance.enRoute,
    };
