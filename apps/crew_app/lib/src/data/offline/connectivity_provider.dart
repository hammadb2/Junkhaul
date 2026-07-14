import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'offline_queue_service.dart';

/// True when the device has any network connection (wifi/mobile/ethernet).
final isOnlineProvider = StreamProvider<bool>((ref) async* {
  final connectivity = Connectivity();
  await for (final result in connectivity.onConnectivityChanged) {
    final online = result.any((c) => c != ConnectivityResult.none);
    yield online;
    if (online) {
      // Trigger a queue flush on reconnect. Best-effort; ignore errors.
      final queueAsync = ref.read(offlineQueueProvider);
      queueAsync.maybeWhen(
        data: (queue) => queue.flush().catchError((_) {}),
        orElse: () {},
      );
    }
  }
});
