// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'booking.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_Booking _$BookingFromJson(Map<String, dynamic> json) => _Booking(
  id: json['id'] as String,
  name: json['name'] as String?,
  phone: json['phone'] as String?,
  address: json['address'] as String?,
  addressData: json['address_data'] == null
      ? null
      : AddressData.fromJson(json['address_data'] as Map<String, dynamic>),
  jobDate: json['job_date'] as String?,
  timeSlot: json['time_slot'] as String?,
  windowLabel: json['window_label'] as String?,
  windowStart: json['window_start'] as String?,
  windowEnd: json['window_end'] as String?,
  totalPrice: (json['total_price'] as num?)?.toDouble(),
  status: json['status'] as String? ?? 'confirmed',
  loadSize: json['load_size'] as String?,
  notes: json['notes'] as String?,
  itemizedItems:
      (json['itemized_items'] as List<dynamic>?)
          ?.map((e) => ItemizedItem.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <ItemizedItem>[],
  quadrant: json['quadrant'] as String?,
  paymentMethod: json['payment_method'] as String?,
  paymentStatus: json['payment_status'] as String?,
  crewStatus: json['crew_status'] as String?,
  crewAssignmentId: json['crew_assignment_id'] as String?,
  balanceDue: (json['balance_due'] as num?)?.toDouble(),
  truckFullness: json['truck_fullness'] as String?,
);

Map<String, dynamic> _$BookingToJson(_Booking instance) => <String, dynamic>{
  'id': instance.id,
  'name': instance.name,
  'phone': instance.phone,
  'address': instance.address,
  'address_data': instance.addressData,
  'job_date': instance.jobDate,
  'time_slot': instance.timeSlot,
  'window_label': instance.windowLabel,
  'window_start': instance.windowStart,
  'window_end': instance.windowEnd,
  'total_price': instance.totalPrice,
  'status': instance.status,
  'load_size': instance.loadSize,
  'notes': instance.notes,
  'itemized_items': instance.itemizedItems,
  'quadrant': instance.quadrant,
  'payment_method': instance.paymentMethod,
  'payment_status': instance.paymentStatus,
  'crew_status': instance.crewStatus,
  'crew_assignment_id': instance.crewAssignmentId,
  'balance_due': instance.balanceDue,
  'truck_fullness': instance.truckFullness,
};

_AddressData _$AddressDataFromJson(Map<String, dynamic> json) => _AddressData(
  lat: (json['lat'] as num?)?.toDouble(),
  lng: (json['lng'] as num?)?.toDouble(),
  placeName: json['placeName'] as String?,
  fullAddress: json['fullAddress'] as String?,
);

Map<String, dynamic> _$AddressDataToJson(_AddressData instance) =>
    <String, dynamic>{
      'lat': instance.lat,
      'lng': instance.lng,
      'placeName': instance.placeName,
      'fullAddress': instance.fullAddress,
    };

_ItemizedItem _$ItemizedItemFromJson(Map<String, dynamic> json) =>
    _ItemizedItem(
      name: json['name'] as String?,
      description: json['description'] as String?,
      quantity: (json['quantity'] as num?)?.toInt(),
      price: (json['price'] as num?)?.toDouble(),
      condition: json['condition'] as String?,
      conditionNote: json['condition_note'] as String?,
    );

Map<String, dynamic> _$ItemizedItemToJson(_ItemizedItem instance) =>
    <String, dynamic>{
      'name': instance.name,
      'description': instance.description,
      'quantity': instance.quantity,
      'price': instance.price,
      'condition': instance.condition,
      'condition_note': instance.conditionNote,
    };
