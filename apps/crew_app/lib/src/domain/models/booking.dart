import 'package:freezed_annotation/freezed_annotation.dart';

part 'booking.freezed.dart';
part 'booking.g.dart';

/// Booking row as returned by /api/employee/schedule and /api/crew/jobs.
@freezed
abstract class Booking with _$Booking {
  const factory Booking({
    required String id,
    String? name,
    String? phone,
    String? address,
    @JsonKey(name: 'address_data') AddressData? addressData,
    @JsonKey(name: 'job_date') String? jobDate,
    @JsonKey(name: 'time_slot') String? timeSlot,
    @JsonKey(name: 'window_label') String? windowLabel,
    @JsonKey(name: 'window_start') String? windowStart,
    @JsonKey(name: 'window_end') String? windowEnd,
    @JsonKey(name: 'total_price') double? totalPrice,
    @Default('confirmed') String status,
    @JsonKey(name: 'load_size') String? loadSize,
    String? notes,
    @JsonKey(name: 'itemized_items')
    @Default(<ItemizedItem>[])
    List<ItemizedItem> itemizedItems,
    String? quadrant,
    @JsonKey(name: 'payment_method') String? paymentMethod,
    @JsonKey(name: 'payment_status') String? paymentStatus,
    @JsonKey(name: 'crew_status') String? crewStatus,
    @JsonKey(name: 'crew_assignment_id') String? crewAssignmentId,
    @JsonKey(name: 'balance_due') double? balanceDue,
    @JsonKey(name: 'truck_fullness') String? truckFullness,
  }) = _Booking;

  factory Booking.fromJson(Map<String, dynamic> json) =>
      _$BookingFromJson(json);
}

/// Geocoded address payload from Mapbox stored on bookings.
@freezed
abstract class AddressData with _$AddressData {
  const factory AddressData({
    double? lat,
    double? lng,
    String? placeName,
    String? fullAddress,
  }) = _AddressData;

  factory AddressData.fromJson(Map<String, dynamic> json) =>
      _$AddressDataFromJson(json);
}

/// Single line item on a booking.
@freezed
abstract class ItemizedItem with _$ItemizedItem {
  const factory ItemizedItem({
    String? name,
    String? description,
    int? quantity,
    double? price,
    String? condition,
    @JsonKey(name: 'condition_note') String? conditionNote,
  }) = _ItemizedItem;

  factory ItemizedItem.fromJson(Map<String, dynamic> json) =>
      _$ItemizedItemFromJson(json);
}
