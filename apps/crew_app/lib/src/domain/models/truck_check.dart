import 'package:freezed_annotation/freezed_annotation.dart';

part 'truck_check.freezed.dart';
part 'truck_check.g.dart';

/// Truck check row from GET /api/employee/truck-check.
@freezed
abstract class TruckCheck with _$TruckCheck {
  const factory TruckCheck({
    required String id,
    @JsonKey(name: 'assignment_id') String? assignmentId,
    @JsonKey(name: 'check_type') String? checkType,
    @JsonKey(name: 'dashboard_photo_url') String? dashboardPhotoUrl,
    @JsonKey(name: 'odometer_km') double? odometerKm,
    @JsonKey(name: 'fuel_level') String? fuelLevel,
    @JsonKey(name: 'fuel_percent') double? fuelPercent,
    @JsonKey(name: 'truck_photos') @Default(<String>[]) List<String> truckPhotos,
    @JsonKey(name: 'damage_notes') String? damageNotes,
    @JsonKey(name: 'gas_receipt_url') String? gasReceiptUrl,
    @JsonKey(name: 'gas_amount_cad') double? gasAmountCad,
    @JsonKey(name: 'gas_station') String? gasStation,
    @JsonKey(name: 'created_at') String? createdAt,
  }) = _TruckCheck;

  factory TruckCheck.fromJson(Map<String, dynamic> json) => _$TruckCheckFromJson(json);
}

/// GET /api/employee/truck-check response.
@freezed
abstract class TruckChecksResponse with _$TruckChecksResponse {
  const factory TruckChecksResponse({
    @Default(<TruckCheck>[]) List<TruckCheck> checks,
  }) = _TruckChecksResponse;

  factory TruckChecksResponse.fromJson(Map<String, dynamic> json) => _$TruckChecksResponseFromJson(json);
}
