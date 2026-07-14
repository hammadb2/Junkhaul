import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

import '../core/animations.dart';
import '../data/repositories/auth_repository.dart';
import '../presentation/features/job/job_screen.dart';
import '../presentation/features/login/login_screen.dart';
import '../presentation/features/onboard/onboard_screen.dart';
import '../presentation/features/permissions/permission_gate_screen.dart';
import '../presentation/features/schedule/schedule_screen.dart';
import '../presentation/features/splash/splash_screen.dart';
import '../presentation/features/theme_preview/theme_preview_screen.dart';
import '../presentation/features/verification/verification_pending_screen.dart';

/// A [Listenable] that mirrors the [AuthRepository] state so [GoRouter] can
/// re-run its redirect whenever auth changes.
class AuthRefreshListenable extends ChangeNotifier {
  AuthRefreshListenable(this._ref) {
    _ref.listen<AuthState>(authRepositoryProvider, (_, _) {
      notifyListeners();
    });
  }

  final Ref _ref;
}

final routerProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authRepositoryProvider);
  final refreshListenable = AuthRefreshListenable(ref);
  ref.onDispose(refreshListenable.dispose);

  return GoRouter(
    initialLocation: '/splash',
    refreshListenable: refreshListenable,
    observers: [SentryNavigatorObserver()],
    redirect: (context, state) {
      final status = auth.status;
      final location = state.uri.path;

      // Allow splash and theme-preview during bootstrap.
      if (location == '/splash' || location == '/theme-preview') {
        if (status == AuthStatus.unknown) return null;
        return _destinationForStatus(status, location);
      }

      // If still unknown, send to splash.
      if (status == AuthStatus.unknown) return '/splash';

      // Authenticated routes require auth.
      final isAuthedRoute = location.startsWith('/schedule') ||
          location.startsWith('/job') ||
          location.startsWith('/clock') ||
          location.startsWith('/documents') ||
          location.startsWith('/paystubs') ||
          location.startsWith('/notifications') ||
          location.startsWith('/incidents');

      if (isAuthedRoute && status != AuthStatus.authenticated) {
        return _destinationForStatus(status, location);
      }

      // Login/onboard/verification should redirect away if already authed.
      if ((location == '/login' || location.startsWith('/onboard') || location == '/verification') &&
          status == AuthStatus.authenticated) {
        return '/schedule';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/splash',
        pageBuilder: (context, state) => pageFadeTransition(context, state, const SplashScreen()),
      ),
      GoRoute(
        path: '/login',
        pageBuilder: (context, state) => pageSharedAxisTransition(context, state, const LoginScreen()),
      ),
      GoRoute(
        path: '/onboard',
        pageBuilder: (context, state) => pageSharedAxisTransition(context, state, const OnboardScreen()),
      ),
      GoRoute(
        path: '/verification',
        pageBuilder: (context, state) => pageFadeTransition(context, state, const VerificationPendingScreen()),
      ),
      GoRoute(
        path: '/schedule',
        pageBuilder: (context, state) => pageFadeTransition(context, state, const ScheduleScreen()),
      ),
      GoRoute(
        path: '/job/:bookingId',
        pageBuilder: (context, state) => pageSharedAxisTransition(
          context,
          state,
          JobScreen(bookingId: state.pathParameters['bookingId']!),
        ),
      ),
      GoRoute(
        path: '/permissions-gate',
        pageBuilder: (context, state) => pageFadeTransition(
          context,
          state,
          PermissionGateScreen(
            type: _parsePermissionType(state.uri.queryParameters['type']),
          ),
        ),
      ),
      GoRoute(
        path: '/theme-preview',
        pageBuilder: (context, state) => pageSharedAxisTransition(context, state, const ThemePreviewScreen()),
      ),
    ],
  );
});

String _destinationForStatus(AuthStatus status, String currentLocation) {
  switch (status) {
    case AuthStatus.unknown:
      return '/splash';
    case AuthStatus.unauthenticated:
      return '/login';
    case AuthStatus.needsOnboarding:
      return '/onboard';
    case AuthStatus.needsVerification:
      return '/verification';
    case AuthStatus.authenticated:
      return currentLocation == '/splash' ? '/schedule' : currentLocation;
  }
}

@visibleForTesting
String destinationForStatus(AuthStatus status, String currentLocation) =>
    _destinationForStatus(status, currentLocation);

PermissionType _parsePermissionType(String? value) {
  switch (value) {
    case 'camera':
      return PermissionType.camera;
    case 'notification':
      return PermissionType.notification;
    default:
      return PermissionType.location;
  }
}
