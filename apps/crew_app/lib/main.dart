import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:mapbox_maps_flutter/mapbox_maps_flutter.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

import 'src/app.dart';
import 'src/core/app_error_widget.dart';
import 'src/core/secrets.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  Animate.defaultDuration = const Duration(milliseconds: 150);
  Animate.defaultCurve = Curves.easeOutCubic;

  // Replace the red error screen with a branded one.
  configureErrorWidget();

  // Set Mapbox access token before any map widget is constructed.
  // Token is loaded from secrets.dart (gitignored) or --dart-define.
  final mapboxToken = AppSecrets.mapboxAccessToken;
  if (mapboxToken.isNotEmpty) {
    MapboxOptions.setAccessToken(mapboxToken);
  }

  await Hive.initFlutter();

  // Sentry DSN is provided via --dart-define. If empty, Sentry is a no-op.
  const sentryDsn = String.fromEnvironment('SENTRY_DSN', defaultValue: '');

  if (sentryDsn.isNotEmpty) {
    await SentryFlutter.init((options) {
      options
        ..dsn = sentryDsn
        ..environment = const String.fromEnvironment(
          'FLAVOR',
          defaultValue: 'production',
        )
        ..tracesSampleRate = 0.2
        ..reportSilentFlutterErrors = true
        ..captureFailedRequests = true;
    }, appRunner: () => runApp(const ProviderScope(child: CrewApp())));
  } else {
    runApp(const ProviderScope(child: CrewApp()));
  }
}
