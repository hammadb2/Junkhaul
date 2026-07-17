import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../domain/providers/core_providers.dart';

/// Wraps Supabase Realtime channel subscriptions so screens can listen to
/// table changes without managing channels directly.
class SupabaseRealtimeService {
  SupabaseRealtimeService(this._client);

  final SupabaseClient _client;
  final Map<String, RealtimeChannel> _channels = {};

  /// Subscribe to INSERT/UPDATE/DELETE on [table] filtered by an optional
  /// column eq filter (e.g. column='employee_id', value='abc').
  Stream<RealtimePayload> watchTable({
    required String table,
    String? filterColumn,
    dynamic filterValue,
    String schema = 'public',
  }) {
    final key = '$schema:$table:${filterColumn ?? '*'}:${filterValue ?? '*'}';
    final controller = StreamController<RealtimePayload>.broadcast();

    final channel = _client.channel(key);
    channel.onPostgresChanges(
      event: PostgresChangeEvent.all,
      schema: schema,
      table: table,
      filter: filterColumn != null
          ? PostgresChangeFilter(
              type: PostgresChangeFilterType.eq,
              column: filterColumn,
              value: filterValue,
            )
          : null,
      callback: (payload) {
        controller.add(RealtimePayload.fromPostgres(payload));
      },
    );
    channel.subscribe();
    _channels[key] = channel;

    controller.onCancel = () {
      _channels.remove(key);
      _client.removeChannel(channel);
    };

    return controller.stream;
  }

  /// Subscribe to broadcast notifications on a crew channel.
  Stream<Map<String, dynamic>> watchCrewNotifications({
    required String employeeId,
  }) {
    final controller = StreamController<Map<String, dynamic>>.broadcast();
    final channel = _client.channel('crew-notifications:$employeeId');
    channel.onBroadcast(
      event: 'notification',
      callback: (payload) {
        controller.add(payload);
      },
    );
    channel.subscribe();
    _channels['crew-notifications:$employeeId'] = channel;

    controller.onCancel = () {
      _channels.remove('crew-notifications:$employeeId');
      _client.removeChannel(channel);
    };
    return controller.stream;
  }

  void dispose() {
    for (final c in _channels.values) {
      _client.removeChannel(c);
    }
    _channels.clear();
  }
}

/// Parsed realtime payload.
class RealtimePayload {
  const RealtimePayload({required this.eventType, this.newRow, this.oldRow});
  final String eventType; // INSERT, UPDATE, DELETE
  final Map<String, dynamic>? newRow;
  final Map<String, dynamic>? oldRow;

  factory RealtimePayload.fromPostgres(PostgresChangePayload p) {
    return RealtimePayload(
      eventType: p.eventType.name.toUpperCase(),
      newRow: p.newRecord,
      oldRow: p.oldRecord,
    );
  }
}

/// Provider that lazily builds the Supabase client from --dart-define env
/// vars and exposes the realtime service.
final supabaseClientProvider = Provider<SupabaseClient>((ref) {
  const url = String.fromEnvironment('SUPABASE_URL', defaultValue: '');
  const anonKey = String.fromEnvironment('SUPABASE_ANON_KEY', defaultValue: '');
  if (url.isEmpty || anonKey.isEmpty) {
    throw StateError(
      'SUPABASE_URL and SUPABASE_ANON_KEY must be provided via --dart-define',
    );
  }
  return SupabaseClient(url, anonKey);
});

final supabaseRealtimeProvider = Provider<SupabaseRealtimeService>((ref) {
  final client = ref.watch(supabaseClientProvider);
  final service = SupabaseRealtimeService(client);
  ref.onDispose(service.dispose);
  return service;
});

/// Convenience: read the base URL so callers can build absolute photo URLs.
final baseUrlStringProvider = Provider<String>(
  (ref) => ref.watch(baseUrlProvider),
);
