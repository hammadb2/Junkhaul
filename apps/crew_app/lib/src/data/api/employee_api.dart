import 'package:dio/dio.dart';
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
    final q = {'weekly': 'true', 'date': ?date};
    final body = await _dio.getJson('/api/employee/schedule', query: q);
    return WeeklyScheduleResponse.fromJson(body);
  }

  // ---- Shifts / Clock ----

  Future<ShiftsResponse> fetchShifts() async {
    final body = await _dio.getJson('/api/employee/shifts');
    return ShiftsResponse.fromJson(body);
  }

  Future<Map<String, dynamic>> clockIn({double? lat, double? lng}) async {
    return _dio.postJson(
      '/api/employee/clock-in',
      body: {'lat': ?lat, 'lng': ?lng},
    );
  }

  Future<Map<String, dynamic>> clockOut({double? lat, double? lng}) async {
    return _dio.postJson(
      '/api/employee/clock-out',
      body: {'lat': ?lat, 'lng': ?lng},
    );
  }

  Future<Map<String, dynamic>> jobClock({
    required String bookingId,
    required String assignmentId,
    required String action, // 'in' or 'out'
    required String routeId,
    required int routeVersion,
  }) async {
    return _dio.postJson(
      '/api/employee/job-clock',
      body: {
        'booking_id': bookingId,
        'route_id': routeId,
        'route_version': routeVersion,
        'assignment_id': assignmentId,
        'action': action,
      },
    );
  }

  // ---- Notifications ----

  Future<NotificationsResponse> fetchNotifications() async {
    final body = await _dio.getJson('/api/employee/notifications');
    return NotificationsResponse.fromJson(body);
  }

  Future<void> markNotificationRead({String? id, bool markAll = false}) async {
    await _dio.postJson(
      '/api/employee/notifications',
      body: {'id': ?id, if (markAll) 'markAll': true},
    );
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
    return _dio.postJson(
      '/api/employee/incidents',
      body: {
        'booking_id': ?bookingId,
        'incident_type': incidentType,
        'severity': ?severity,
        'description': description,
        'location': ?location,
        'photo_urls': ?photoUrls,
        'reported_to': ?reportedTo,
      },
    );
  }

  // ---- Landfill ----

  Future<LandfillResponse> fetchLandfill({double? lat, double? lng}) async {
    final q = {
      if (lat != null) 'lat': lat.toString(),
      if (lng != null) 'lng': lng.toString(),
    };
    final body = await _dio.getJson(
      '/api/employee/landfill',
      query: q.isEmpty ? null : q,
    );
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
    required String routeId,
    required int routeVersion,
    String? bookingId,
    List<String>? itemPhotos,
    String? capacityPhotoUrl,
    double? capacityEstimatePct,
  }) async {
    return _dio.postJson(
      '/api/employee/storage-drop',
      body: {
        'assignment_id': assignmentId,
        'facility_id': facilityId,
        'route_id': routeId,
        'route_version': routeVersion,
        'booking_id': ?bookingId,
        'item_photos': ?itemPhotos,
        'capacity_photo_url': ?capacityPhotoUrl,
        'capacity_estimate_pct': ?capacityEstimatePct,
      },
    );
  }

  // ---- Receipts ----

  Future<ReceiptsResponse> fetchReceipts({
    String? assignmentId,
    String? date,
  }) async {
    final q = {'assignment_id': ?assignmentId, 'date': ?date};
    final body = await _dio.getJson(
      '/api/employee/receipts',
      query: q.isEmpty ? null : q,
    );
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
    return _dio.postJson(
      '/api/employee/receipts',
      body: {
        'assignment_id': assignmentId,
        'receipt_type': receiptType,
        'vendor': ?vendor,
        'amount_cad': amountCad,
        'receipt_photo_url': ?receiptPhotoUrl,
        'notes': ?notes,
      },
    );
  }

  // ---- Truck Check ----

  Future<TruckChecksResponse> fetchTruckChecks({
    required String assignmentId,
  }) async {
    final body = await _dio.getJson(
      '/api/employee/truck-check',
      query: {'assignment_id': assignmentId},
    );
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
    return _dio.postJson(
      '/api/employee/truck-check',
      body: {
        'assignment_id': assignmentId,
        'check_type': checkType,
        'dashboard_photo_url': ?dashboardPhotoUrl,
        'odometer_km': ?odometerKm,
        'fuel_level': ?fuelLevel,
        'fuel_percent': ?fuelPercent,
        'truck_photos': ?truckPhotos,
        'damage_notes': ?damageNotes,
        'gas_receipt_url': ?gasReceiptUrl,
        'gas_amount_cad': ?gasAmountCad,
        'gas_station': ?gasStation,
      },
    );
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
    required String routeId,
    required int routeVersion,
  }) async {
    return _dio.postJson(
      '/api/employee/signature',
      body: {
        'booking_id': bookingId,
        'customer_name_typed': customerNameTyped,
        'customer_signature_url': ?customerSignatureUrl,
        'amount_confirmed': amountConfirmed,
        'payment_method': paymentMethod,
        'route_id': routeId,
        'route_version': routeVersion,
      },
    );
  }

  // ---- Location ----

  Future<void> updateLocation({
    required double lat,
    required double lng,
    double? heading,
    double? speed,
  }) async {
    await _dio.postJson(
      '/api/employee/location',
      body: {'lat': lat, 'lng': lng, 'heading': ?heading, 'speed': ?speed},
    );
  }

  // ---- Issues ----

  Future<Map<String, dynamic>> reportIssue({
    required String bookingId,
    required String issueType,
    String? severity,
    String? description,
    String? photoUrl,
  }) async {
    return _dio.postJson(
      '/api/employee/issues',
      body: {
        'booking_id': bookingId,
        'issue_type': issueType,
        'severity': ?severity,
        'description': ?description,
        'photo_url': ?photoUrl,
      },
    );
  }

  // ---- Crew endpoints (used by live PWA for item-conditions and payment link) ----

  Future<Map<String, dynamic>> submitItemConditions({
    required String bookingId,
    required Map<String, String> conditions,
    required String routeId,
    required int routeVersion,
  }) async {
    return _dio.postJson(
      '/api/crew/item-conditions',
      body: {
        'booking_id': bookingId,
        'conditions': conditions,
        'route_id': routeId,
        'route_version': routeVersion,
      },
    );
  }

  Future<Map<String, dynamic>> resendPaymentLink({
    required String bookingId,
    required String routeId,
    required int routeVersion,
  }) async {
    return _dio.postJson(
      '/api/crew/resend-payment-link',
      body: {
        'booking_id': bookingId,
        'route_id': routeId,
        'route_version': routeVersion,
      },
    );
  }

  /// Record a cash payment collected by the crew.
  /// Only for method='cash_crew'. Digital payments go through /pay/[booking_id].
  Future<Map<String, dynamic>> collectCashPayment({
    required String bookingId,
    required double amount,
    required String routeId,
    required int routeVersion,
  }) async {
    return _dio.postJson(
      '/api/crew/collect-payment',
      body: {
        'booking_id': bookingId,
        'method': 'cash_crew',
        'amount': amount,
        'route_id': routeId,
        'route_version': routeVersion,
      },
    );
  }

  // ---- Onboarding / Profile ----

  /// PUT /api/employee/me — update profile fields.
  /// Accepted fields: phone, address, td1_federal_claim, td1_ab_claim,
  /// onboarding_step, bank_institution, bank_transit, bank_account.
  Future<Map<String, dynamic>> updateProfile(
    Map<String, dynamic> updates,
  ) async {
    return _dio.putJson('/api/employee/me', body: updates);
  }

  // ---- Photo Upload ----  /// Upload a crew photo to Supabase storage via multipart form data.
  ///
  /// [bookingId] — the booking this photo belongs to.
  /// [photoCategory] — one of: before, after, item, damage, access_path,
  ///   truck_bed, donation_evidence, disposal_evidence, receipt, arrival,
  ///   completion.
  /// [filePath] — local path to the JPEG file to upload.
  /// [lat], [lng] — optional GPS coordinates where the photo was taken.
  /// [takenAt] — optional ISO timestamp of when the photo was taken.
  ///
  /// Returns the signed URL of the uploaded photo.
  Future<String> uploadPhoto({
    required String bookingId,
    required String photoCategory,
    required String filePath,
    double? lat,
    double? lng,
    String? takenAt,
    required String routeId,
    required int routeVersion,
  }) async {
    final formData = FormData.fromMap({
      'booking_id': bookingId,
      'type': photoCategory,
      if (lat != null) 'lat': lat.toString(),
      if (lng != null) 'lng': lng.toString(),
      'taken_at': ?takenAt,
      'photo': await MultipartFile.fromFile(
        filePath,
        filename:
            '${photoCategory}_${DateTime.now().millisecondsSinceEpoch}.jpg',
        contentType: DioMediaType.parse('image/jpeg'),
      ),
    });
    formData.fields.add(MapEntry('route_id', routeId));
    formData.fields.add(MapEntry('route_version', routeVersion.toString()));
    final body = await _dio.postMultipart(
      '/api/crew/upload-photo',
      formData: formData,
    );
    return body['url'] as String;
  }

  /// Fetch existing crew photos for a booking.
  Future<List<Map<String, dynamic>>> fetchPhotos({
    required String bookingId,
  }) async {
    final body = await _dio.getJson('/api/crew/photos/$bookingId');
    final photos = body['photos'];
    if (photos is List) {
      return photos.cast<Map<String, dynamic>>();
    }
    return [];
  }

  // ---- Route Plan ----

  /// Fetch the current canonical route plan.
  Future<Map<String, dynamic>> getRoutePlan() async {
    return _dio.getJson('/api/employee/route-plan');
  }

  /// Acknowledge receipt of a route plan version.
  /// Includes idempotency_key and created_at for offline queue replay
  /// and audit trail. The backend uses a unique DB index for idempotency;
  /// these fields are sent for completeness and offline replay safety.
  Future<Map<String, dynamic>> acknowledgeRoute({
    required String routeId,
    required int routeVersion,
    String? deviceId,
    String? idempotencyKey,
    String? createdAt,
  }) async {
    return _dio.postJson(
      '/api/employee/route-plan',
      body: {
        'route_id': routeId,
        'route_version': routeVersion,
        'device_id': ?deviceId,
        'idempotency_key': ?idempotencyKey,
        'created_at': ?createdAt,
      },
    );
  }

  /// Open an SSE connection to /api/employee/route-stream.
  ///
  /// Returns a stream of bytes from the server. The caller parses SSE
  /// events (event: ... / data: ...). The connection carries the
  /// jh_employee_session cookie via DioClient's cookie jar.
  ///
  /// The server resolves the employee's crew assignment — the client
  /// never provides an assignment ID as authorization.
  Future<Response<dynamic>> openRouteStream() async {
    return _dio.raw.get(
      '/api/employee/route-stream',
      options: Options(
        responseType: ResponseType.stream,
        headers: {'Accept': 'text/event-stream'},
        receiveTimeout: const Duration(minutes: 60),
      ),
    );
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
    return ApiResult.failure(
      message: e.message,
      error: e.error,
      statusCode: e.statusCode,
    );
  } on ServerException catch (e) {
    return ApiResult.failure(
      message: e.message,
      error: ApiError.server,
      statusCode: e.statusCode,
    );
  } catch (e) {
    return ApiResult.failure(message: e.toString(), error: ApiError.unknown);
  }
}
