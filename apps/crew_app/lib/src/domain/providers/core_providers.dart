import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../data/api/dio_client.dart';

/// Base URL of the Next.js backend. Override with --dart-define=BASE_URL=...
/// for staging. Defaults to the production origin.
final baseUrlProvider = Provider<String>((ref) {
  const defined = String.fromEnvironment('BASE_URL', defaultValue: 'https://www.junkhaul.ca');
  return defined;
});

/// Singleton secure storage used for the session cookie.
final secureStorageProvider = Provider<FlutterSecureStorage>((ref) {
  return const FlutterSecureStorage(
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );
});

/// DioClient singleton. Built lazily so the cookie jar can be initialized
/// from the documents directory.
final dioClientProvider = FutureProvider<DioClient>((ref) async {
  final baseUrl = ref.watch(baseUrlProvider);
  final storage = ref.watch(secureStorageProvider);
  return DioClient.create(baseUrl: baseUrl, secureStorage: storage);
});
