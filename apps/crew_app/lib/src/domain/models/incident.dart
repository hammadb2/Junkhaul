import 'package:freezed_annotation/freezed_annotation.dart';

part 'incident.freezed.dart';
part 'incident.g.dart';

/// Incident row from GET /api/employee/incidents.
@freezed
abstract class Incident with _$Incident {
  const factory Incident({
    required String id,
    @JsonKey(name: 'booking_id') String? bookingId,
    @JsonKey(name: 'incident_type') String? incidentType,
    String? severity,
    String? description,
    String? location,
    @JsonKey(name: 'photo_urls') @Default(<String>[]) List<String> photoUrls,
    @JsonKey(name: 'reported_to') String? reportedTo,
    @JsonKey(name: 'created_at') String? createdAt,
  }) = _Incident;

  factory Incident.fromJson(Map<String, dynamic> json) =>
      _$IncidentFromJson(json);
}

/// GET /api/employee/incidents response.
@freezed
abstract class IncidentsResponse with _$IncidentsResponse {
  const factory IncidentsResponse({
    @Default(<Incident>[]) List<Incident> incidents,
  }) = _IncidentsResponse;

  factory IncidentsResponse.fromJson(Map<String, dynamic> json) =>
      _$IncidentsResponseFromJson(json);
}
