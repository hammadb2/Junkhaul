import 'package:freezed_annotation/freezed_annotation.dart';

part 'storage_facility.freezed.dart';
part 'storage_facility.g.dart';

/// Storage facility returned by GET /api/employee/storage-drop.
@freezed
abstract class StorageFacility with _$StorageFacility {
  const factory StorageFacility({
    required String id,
    String? name,
    String? address,
    double? lat,
    double? lng,
    @JsonKey(name: 'access_code') String? accessCode,
    @JsonKey(name: 'capacity_sqft') double? capacitySqft,
    @JsonKey(name: 'current_usage_pct') double? currentUsagePct,
  }) = _StorageFacility;

  factory StorageFacility.fromJson(Map<String, dynamic> json) =>
      _$StorageFacilityFromJson(json);
}

/// GET /api/employee/storage-drop response.
@freezed
abstract class StorageFacilitiesResponse with _$StorageFacilitiesResponse {
  const factory StorageFacilitiesResponse({
    @Default(<StorageFacility>[]) List<StorageFacility> facilities,
  }) = _StorageFacilitiesResponse;

  factory StorageFacilitiesResponse.fromJson(Map<String, dynamic> json) =>
      _$StorageFacilitiesResponseFromJson(json);
}
