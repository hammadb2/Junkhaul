import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive/hive.dart';

import '../../domain/providers/core_providers.dart';
import '../api/dio_client.dart';
import 'offline_action.dart';

/// Manages a Hive-backed queue of [OfflineAction]s that are replayed when
/// the network is available. Used by repositories to enqueue writes that
/// would otherwise fail mid-flight.
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
    List<String>? filePaths,
  }) {
    final id = '${DateTime.now().microsecondsSinceEpoch}';
    final action = OfflineAction(
      id: id,
      type: type,
      payload: payload,
      filePaths: filePaths,
    );
    _box.put(id, action.toJson());
    _pendingController.add(_box.length);
    return id;
  }

  /// Process the queue in insertion order. Each action is removed only on
  /// success. Failed actions stay in the queue and are retried on the next
  /// flush.
  Future<void> flush() async {
    if (_box.isEmpty) return;
    final keys = _box.keys.toList();
    for (final key in keys) {
      final raw = _box.get(key);
      if (raw == null) continue;
      final action = OfflineAction.fromJson(
        Map<String, dynamic>.from(raw as Map),
      );
      action.attempts += 1;
      _box.put(key, action.toJson());
      try {
        await _processAction(action);
        await _box.delete(key);
      } catch (_) {
        // Leave in queue for next flush.
      }
    }
    _pendingController.add(_box.length);
  }

  Future<void> _processAction(OfflineAction action) async {
    final path = _routeForType(action.type);
    if (path == null) return;
    if (action.filePaths != null && action.filePaths!.isNotEmpty) {
      // Multipart upload is handled by the calling repository because it
      // needs to construct a FormData with the right field names.
      // For now, send the JSON payload; repositories that need multipart
      // should handle their own retries.
      await _dio.postJson(path, body: action.payload);
    } else {
      await _dio.postJson(path, body: action.payload);
    }
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
        return '/api/employee/job-clock';
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
