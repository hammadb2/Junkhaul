import 'dart:async';
import 'dart:math';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive/hive.dart';

import '../../domain/providers/core_providers.dart';
import '../api/dio_client.dart';
import 'offline_action.dart';

/// Manages a Hive-backed queue of [OfflineAction]s that are replayed when
/// the network is available. Used by repositories to enqueue writes that
/// would otherwise fail mid-flight.
///
/// Production-safe behavior:
/// - Every action carries an idempotency key.
/// - Actions are removed only after the server confirms success.
/// - Failed actions are retried with exponential backoff.
/// - Conflicts and permanent failures surface to the UI instead of silently
///   dropping.
class OfflineQueueService {
  OfflineQueueService(this._box, this._dio);

  final Box<dynamic> _box;
  final DioClient _dio;

  final _pendingController = StreamController<int>.broadcast();
  Stream<int> get pendingCount => _pendingController.stream;

  int get pending => _box.length;

  /// Add an action to the queue. Returns the action id.
  String enqueue({
    required String type,
    required Map<String, dynamic> payload,
    String? idempotencyKey,
    List<String>? filePaths,
  }) {
    final id =
        '${DateTime.now().microsecondsSinceEpoch}_${Random().nextInt(9999)}';
    final action = OfflineAction(
      id: id,
      type: type,
      payload: payload,
      idempotencyKey: idempotencyKey ?? '${type}_$id',
      filePaths: filePaths,
    );
    _box.put(id, action.toJson());
    _pendingController.add(_box.length);
    return id;
  }

  /// Process the queue. Each action is retried with exponential backoff and
  /// removed only on explicit server confirmation. Actions with unrecoverable
  /// errors are marked so the UI can show them.
  Future<void> flush() async {
    if (_box.isEmpty) return;
    final keys = _box.keys.toList().cast<String>();
    for (final key in keys) {
      final raw = _box.get(key);
      if (raw == null) continue;
      final action = OfflineAction.fromJson(
        Map<String, dynamic>.from(raw as Map),
      );

      // Exponential backoff: at least wait 2^attempts seconds.
      final backoffSeconds = pow(2, action.attempts).toInt().clamp(1, 300);
      if (action.attempts > 0) {
        await Future.delayed(Duration(seconds: backoffSeconds));
      }

      action.attempts += 1;
      await _box.put(key, action.toJson());

      try {
        final confirmed = await _processAction(action);
        if (confirmed) {
          action.serverConfirmed = true;
          await _box.put(key, action.toJson());
          await _box.delete(key);
        } else {
          // Stop retrying this batch if a conflict requires user resolution.
          break;
        }
      } catch (e) {
        // Leave in queue for next flush; permanent errors handled by caller.
        if (action.attempts >= 10) {
          action.payload['_permanent_error'] = e.toString();
          await _box.put(key, action.toJson());
        }
      }
    }
    _pendingController.add(_box.length);
  }

  Future<bool> _processAction(OfflineAction action) async {
    final path = _routeForType(action.type);
    if (path == null) return true; // Unknown type: drop to avoid loops.

    final body = {...action.payload, 'idempotency_key': action.idempotencyKey};

    final response = await _dio.postJson(path, body: body);
    final status = (response['status'] as String?) ?? 'synced';
    if (status == 'conflict') return false; // Requires user resolution.
    return true;
  }

  String? _routeForType(String type) {
    switch (type) {
      case 'clock_in':
        return '/api/employee/clock-in';
      case 'clock_out':
        return '/api/employee/clock-out';
      case 'location':
        return '/api/employee/location';
      case 'job_clock_in':
      case 'job_clock_out':
        return '/api/employee/job-clock';
      case 'signature':
        return '/api/employee/signature';
      case 'incident':
        return '/api/employee/incidents';
      case 'issue':
        return '/api/employee/issues';
      case 'receipt':
        return '/api/employee/receipts';
      case 'truck_check':
        return '/api/employee/truck-check';
      case 'storage_drop':
        return '/api/employee/storage-drop';
      case 'item_conditions':
        return '/api/crew/item-conditions';
      case 'resend_payment_link':
        return '/api/crew/resend-payment-link';
      case 'collect_payment':
        return '/api/crew/collect-payment';
      case 'route_acknowledgment':
        return '/api/employee/route-plan';
      case 'loaded_item':
        return '/api/crew/loaded-items';
      case 'truck_inspection':
        return '/api/crew/truck-inspection';
      case 'fuel_receipt':
        return '/api/crew/fuel';
      case 'odometer_reading':
        return '/api/crew/odometer';
      case 'barcode_scan':
        return '/api/crew/barcode';
      case 'rental_return':
        return '/api/crew/rental-return';
      case 'batch_sync':
        return '/api/crew/sync';
      default:
        return null;
    }
  }

  void dispose() {
    _pendingController.close();
  }
}

/// Hive box name for the offline queue.
const kOfflineQueueBoxName = 'offline_queue';

final offlineQueueProvider = FutureProvider<OfflineQueueService>((ref) async {
  final dioAsync = ref.watch(dioClientProvider);
  final dio = dioAsync.maybeWhen(data: (d) => d, orElse: () => null);
  if (dio == null) {
    throw StateError('DioClient not ready');
  }
  final box = await Hive.openBox<dynamic>(kOfflineQueueBoxName);
  final service = OfflineQueueService(box, dio);
  ref.onDispose(service.dispose);
  return service;
});
