import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/models/incident.dart';
import '../../domain/models/landfill.dart';
import '../../domain/models/notification.dart';
import '../../domain/models/paystub.dart';
import '../../domain/models/receipt.dart';
import '../../domain/models/schedule.dart';
import '../../domain/models/shift.dart';
import '../../domain/models/api_result.dart';
import '../../domain/models/storage_facility.dart';
import '../../domain/models/truck_check.dart';
import '../../domain/providers/core_providers.dart';
import 'api_result.dart';
import 'dio_client.dart';

/// Typed wrapper around [DioClient] for all /api/employee/* endpoints.
class EmployeeApi {
  EmployeeApi(this._dio);
  final DioClient _dio;

  // ---- Schedule ----

  Future<DailyScheduleResponse> fetchDailySchedule({String? date}) async {
    final q = date == null ? null : {'date': date};
    final body = await _dio.getJson('/api/employee/schedule', query: q);
    return DailyScheduleResponse.fromJson(body);
  }

  Future<WeeklyScheduleResponse> fetchWeeklySchedule({String? date}) async {
    final q = {'weekly': 'true', if (date != null) 'date': date};
    final body = await _dio.getJson('/api/employee/schedule', query: q);
    return WeeklyScheduleResponse.fromJson(body);
  }

  // ---- Shifts / Clock ----

  Future<ShiftsResponse> fetchShifts() async {
    final body = await _dio.getJson('/api/employee/shifts');
    return ShiftsResponse.fromJson(body);
  }

  Future<Map<String, dynamic>> clockIn({double? lat, double? lng}) async {
    return _dio.postJson('/api/employee/clock-in', body: {
      if (lat != null) 'lat': lat,
      if (lng != null) 'lng': lng,
    });
  }

  Future<Map<String, dynamic>> clockOut({double? lat, double? lng}) async {
    return _dio.postJson('/api/employee/clock-out', body: {
      if (lat != null) 'lat': lat,
      if (lng != null) 'lng': lng,
    });
  }

  Future<Map<String, dynamic>> jobClock({
    required String bookingId,
    required String assignmentId,
    required String action, // 'in' or 'out'
  }) async {
    return _dio.postJson('/api/employee/job-clock', body: {
      'booking_id': bookingId,
      'assignment_id': assignmentId,
      'action': action,
    });
  }

  // ---- Notifications ----

  Future<NotificationsResponse> fetchNotifications() async {
    final body = await _dio.getJson('/api/employee/notifications');
    return NotificationsResponse.fromJson(body);
  }

  Future<void> markNotificationRead({String? id, bool markAll = false}) async {
    await _dio.postJson('/api/employee/notifications', body: {
      if (id != null) 'id': id,
      if (markAll) 'markAll': true,
    });
  }

  // ---- Incidents ----

  Future<IncidentsResponse> fetchIncidents() async {
    final body = await _dio.getJson('/api/employee/incidents');
    return IncidentsResponse.fromJson(body);
  }

  Future<Map<String, dynamic>> reportIncident({
    String? bookingId,
    required String incidentType,
    String? severity,
    required String description,
    String? location,
    List<String>? photoUrls,
    String? reportedTo,
  }) async {
    return _dio.postJson('/api/employee/incidents', body: {
      if (bookingId != null) 'booking_id': bookingId,
      'incident_type': incidentType,
      if (severity != null) 'severity': severity,
      'description': description,
      if (location != null) 'location': location,
      if (photoUrls != null) 'photo_urls': photoUrls,
      if (reportedTo != null) 'reported_to': reportedTo,
    });
  }

  // ---- Landfill ----

  Future<LandfillResponse> fetchLandfill({double? lat, double? lng}) async {
    final q = {
      if (lat != null) 'lat': lat.toString(),
      if (lng != null) 'lng': lng.toString(),
    };
    final body = await _dio.getJson('/api/employee/landfill', query: q.isEmpty ? null : q);
    return LandfillResponse.fromJson(body);
  }

  // ---- Storage ----

  Future<StorageFacilitiesResponse> fetchStorageFacilities() async {
    final body = await _dio.getJson('/api/employee/storage-drop');
    return StorageFacilitiesResponse.fromJson(body);
  }

  Future<Map<String, dynamic>> storageDrop({
    required String assignmentId,
    required String facilityId,
    String? bookingId,
    List<String>? itemPhotos,
    String? capacityPhotoUrl,
    double? capacityEstimatePct,
  }) async {
    return _dio.postJson('/api/employee/storage-drop', body: {
      'assignment_id': assignmentId,
      'facility_id': facilityId,
      if (bookingId != null) 'booking_id': bookingId,
      if (itemPhotos != null) 'item_photos': itemPhotos,
      if (capacityPhotoUrl != null) 'capacity_photo_url': capacityPhotoUrl,
      if (capacityEstimatePct != null) 'capacity_estimate_pct': capacityEstimatePct,
    });
  }

  // ---- Receipts ----

  Future<ReceiptsResponse> fetchReceipts({String? assignmentId, String? date}) async {
    final q = {
      if (assignmentId != null) 'assignment_id': assignmentId,
      if (date != null) 'date': date,
    };
    final body = await _dio.getJson('/api/employee/receipts', query: q.isEmpty ? null : q);
    return ReceiptsResponse.fromJson(body);
  }

  Future<Map<String, dynamic>> submitReceipt({
    required String assignmentId,
    required String receiptType,
    String? vendor,
    required double amountCad,
    String? receiptPhotoUrl,
    String? notes,
  }) async {
    return _dio.postJson('/api/employee/receipts', body: {
      'assignment_id': assignmentId,
      'receipt_type': receiptType,
      if (vendor != null) 'vendor': vendor,
      'amount_cad': amountCad,
      if (receiptPhotoUrl != null) 'receipt_photo_url': receiptPhotoUrl,
      if (notes != null) 'notes': notes,
    });
  }

  // ---- Truck Check ----

  Future<TruckChecksResponse> fetchTruckChecks({required String assignmentId}) async {
    final body = await _dio.getJson('/api/employee/truck-check', query: {'assignment_id': assignmentId});
    return TruckChecksResponse.fromJson(body);
  }

  Future<Map<String, dynamic>> submitTruckCheck({
    required String assignmentId,
    required String checkType, // 'pickup' or 'return'
    String? dashboardPhotoUrl,
    double? odometerKm,
    String? fuelLevel,
    double? fuelPercent,
    List<String>? truckPhotos,
    String? damageNotes,
    String? gasReceiptUrl,
    double? gasAmountCad,
    String? gasStation,
  }) async {
    return _dio.postJson('/api/employee/truck-check', body: {
      'assignment_id': assignmentId,
      'check_type': checkType,
      if (dashboardPhotoUrl != null) 'dashboard_photo_url': dashboardPhotoUrl,
      if (odometerKm != null) 'odometer_km': odometerKm,
      if (fuelLevel != null) 'fuel_level': fuelLevel,
      if (fuelPercent != null) 'fuel_percent': fuelPercent,
      if (truckPhotos != null) 'truck_photos': truckPhotos,
      if (damageNotes != null) 'damage_notes': damageNotes,
      if (gasReceiptUrl != null) 'gas_receipt_url': gasReceiptUrl,
      if (gasAmountCad != null) 'gas_amount_cad': gasAmountCad,
      if (gasStation != null) 'gas_station': gasStation,
    });
  }

  // ---- Pay Stubs ----

  Future<PayStubsResponse> fetchPayStubs() async {
    final body = await _dio.getJson('/api/employee/pay-stubs');
    return PayStubsResponse.fromJson(body);
  }

  // ---- Signature ----

  Future<Map<String, dynamic>> submitSignature({
    required String bookingId,
    required String customerNameTyped,
    String? customerSignatureUrl,
    required double amountConfirmed,
    required String paymentMethod,
  }) async {
    return _dio.postJson('/api/employee/signature', body: {
      'booking_id': bookingId,
      'customer_name_typed': customerNameTyped,
      if (customerSignatureUrl != null) 'customer_signature_url': customerSignatureUrl,
      'amount_confirmed': amountConfirmed,
      'payment_method': paymentMethod,
    });
  }

  // ---- Location ----

  Future<void> updateLocation({
    required double lat,
    required double lng,
    double? heading,
    double? speed,
  }) async {
    await _dio.postJson('/api/employee/location', body: {
      'lat': lat,
      'lng': lng,
      if (heading != null) 'heading': heading,
      if (speed != null) 'speed': speed,
    });
  }

  // ---- Issues ----

  Future<Map<String, dynamic>> reportIssue({
    required String bookingId,
    required String issueType,
    String? severity,
    String? description,
    String? photoUrl,
  }) async {
    return _dio.postJson('/api/employee/issues', body: {
      'booking_id': bookingId,
      'issue_type': issueType,
      if (severity != null) 'severity': severity,
      if (description != null) 'description': description,
      if (photoUrl != null) 'photo_url': photoUrl,
    });
  }

  // ---- Crew endpoints (used by live PWA for item-conditions and payment link) ----

  Future<Map<String, dynamic>> submitItemConditions({
    required String bookingId,
    required Map<String, String> conditions,
  }) async {
    return _dio.postJson('/api/crew/item-conditions', body: {
      'booking_id': bookingId,
      'conditions': conditions,
    });
  }

  Future<Map<String, dynamic>> resendPaymentLink({required String bookingId}) async {
    return _dio.postJson('/api/crew/resend-payment-link', body: {
      'booking_id': bookingId,
    });
  }
}

/// Provider for [EmployeeApi]. Depends on [dioClientProvider].
final employeeApiProvider = FutureProvider<EmployeeApi>((ref) async {
  final dio = await ref.watch(dioClientProvider.future);
  return EmployeeApi(dio);
});

/// Convenience: synchronous access to [EmployeeApi] that throws if the
/// DioClient is not ready yet. Use [employeeApiProvider] (FutureProvider)
/// in widgets that can show a loading state.
final employeeApiSyncProvider = Provider<EmployeeApi?>((ref) {
  final async = ref.watch(employeeApiProvider);
  return async.maybeWhen(data: (api) => api, orElse: () => null);
});

/// Wraps an API call in [ApiResult] to simplify error handling in providers.
Future<ApiResult<T>> guardApi<T>(Future<T> Function() fn) async {
  try {
    final data = await fn();
    return ApiResult.success(data);
  } on AuthException catch (e) {
    return ApiResult.failure(message: e.message, error: ApiError.auth);
  } on NetworkException catch (e) {
    return ApiResult.failure(message: e.message, error: ApiError.network);
  } on ApiException catch (e) {
    return ApiResult.failure(message: e.message, error: e.error, statusCode: e.statusCode);
  } on ServerException catch (e) {
    return ApiResult.failure(message: e.message, error: ApiError.server, statusCode: e.statusCode);
  } catch (e) {
    return ApiResult.failure(message: e.toString(), error: ApiError.unknown);
  }
}
