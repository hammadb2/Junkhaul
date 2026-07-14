// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'incident.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_Incident _$IncidentFromJson(Map<String, dynamic> json) => _Incident(
  id: json['id'] as String,
  bookingId: json['booking_id'] as String?,
  incidentType: json['incident_type'] as String?,
  severity: json['severity'] as String?,
  description: json['description'] as String?,
  location: json['location'] as String?,
  photoUrls:
      (json['photo_urls'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList() ??
      const <String>[],
  reportedTo: json['reported_to'] as String?,
  createdAt: json['created_at'] as String?,
);

Map<String, dynamic> _$IncidentToJson(_Incident instance) => <String, dynamic>{
  'id': instance.id,
  'booking_id': instance.bookingId,
  'incident_type': instance.incidentType,
  'severity': instance.severity,
  'description': instance.description,
  'location': instance.location,
  'photo_urls': instance.photoUrls,
  'reported_to': instance.reportedTo,
  'created_at': instance.createdAt,
};

_IncidentsResponse _$IncidentsResponseFromJson(Map<String, dynamic> json) =>
    _IncidentsResponse(
      incidents:
          (json['incidents'] as List<dynamic>?)
              ?.map((e) => Incident.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <Incident>[],
    );

Map<String, dynamic> _$IncidentsResponseToJson(_IncidentsResponse instance) =>
    <String, dynamic>{'incidents': instance.incidents};
