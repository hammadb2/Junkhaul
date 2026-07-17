import 'package:freezed_annotation/freezed_annotation.dart';

part 'crew_location.freezed.dart';
part 'crew_location.g.dart';

/// Live crew location, written by POST /api/employee/location and read by
/// GET /api/employee/location?booking_id=... (public customer tracking).
@freezed
abstract class CrewLocation with _$CrewLocation {
  const factory CrewLocation({
    required double lat,
    required double lng,
    double? heading,
    double? speed,
    @JsonKey(name: 'updated_at') String? updatedAt,
    @JsonKey(name: 'crew_first_names') String? crewFirstNames,
    @Default(false) bool enRoute,
  }) = _CrewLocation;

  factory CrewLocation.fromJson(Map<String, dynamic> json) =>
      _$CrewLocationFromJson(json);
}
