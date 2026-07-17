import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

import '../core/animations.dart';
import '../data/repositories/auth_repository.dart';
import '../domain/models/job.dart';
import '../domain/models/job_mappers.dart';
import '../domain/providers/schedule_provider.dart';
import '../presentation/features/job/job_screen.dart';
import '../presentation/features/login/login_screen.dart';
import '../presentation/features/onboard/onboard_screen.dart';
import '../presentation/features/permissions/permission_gate_screen.dart';
import '../presentation/features/schedule/schedule_screen.dart';
import '../presentation/features/splash/splash_screen.dart';
import '../presentation/features/verification/verification_pending_screen.dart';
import '../presentation/features/closeout/closeout_screen.dart';
import '../presentation/shared/jh_sync_banner.dart';

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

      // Allow splash during bootstrap.
      if (location == '/splash') {
        if (status == AuthStatus.unknown) return null;
        return _destinationForStatus(status, location);
      }

      // If still unknown, send to splash.
      if (status == AuthStatus.unknown) return '/splash';

      // Authenticated routes require auth.
      final isAuthedRoute =
          location.startsWith('/schedule') ||
          location.startsWith('/job') ||
          location.startsWith('/clock') ||
          location.startsWith('/closeout') ||
          location.startsWith('/documents') ||
          location.startsWith('/paystubs') ||
          location.startsWith('/notifications') ||
          location.startsWith('/incidents');

      if (isAuthedRoute && status != AuthStatus.authenticated) {
        return _destinationForStatus(status, location);
      }

      // Login/onboard/verification should redirect away if already authed.
      if ((location == '/login' ||
              location.startsWith('/onboard') ||
              location == '/verification') &&
          status == AuthStatus.authenticated) {
        return '/schedule';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/splash',
        pageBuilder: (context, state) =>
            pageFadeTransition(context, state, const SplashScreen()),
      ),
      GoRoute(
        path: '/login',
        pageBuilder: (context, state) =>
            pageSharedAxisTransition(context, state, const LoginScreen()),
      ),
      GoRoute(
        path: '/onboard',
        pageBuilder: (context, state) =>
            pageSharedAxisTransition(context, state, const OnboardScreen()),
      ),
      GoRoute(
        path: '/verification',
        pageBuilder: (context, state) => pageFadeTransition(
          context,
          state,
          const VerificationPendingScreen(),
        ),
      ),
      GoRoute(
        path: '/schedule',
        pageBuilder: (context, state) =>
            pageFadeTransition(context, state, const ScheduleScreen()),
      ),
      GoRoute(
        path: '/job/:bookingId',
        pageBuilder: (context, state) => pageSharedAxisTransition(
          context,
          state,
          _jobScreenBuilder(state.pathParameters['bookingId']!),
        ),
      ),
      GoRoute(
        path: '/permissions-gate',
        pageBuilder: (context, state) =>
            pageFadeTransition(context, state, const PermissionGateScreen()),
      ),
      GoRoute(
        path: '/closeout',
        pageBuilder: (context, state) =>
            pageSharedAxisTransition(context, state, const CloseoutScreen()),
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

/// Builds a [JobScreen] for the given booking ID by fetching the booking
/// from the schedule and converting it to a [Job].
Widget _jobScreenBuilder(String bookingId) {
  return Consumer(
    builder: (context, ref, _) {
      final scheduleAsync = ref.watch(todayScheduleProvider);
      return scheduleAsync.when(
        loading: () =>
            const Scaffold(body: Center(child: CircularProgressIndicator())),
        error: (_, __) => Scaffold(
          body: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('Could not load job'),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () => ref.invalidate(todayScheduleProvider),
                  child: const Text('Retry'),
                ),
              ],
            ),
          ),
        ),
        data: (schedule) {
          try {
            final booking = schedule.bookings.firstWhere(
              (b) => b.id == bookingId,
            );
            final job = booking.toJob();
            return JobScreen(
              job: job,
              bookingId: booking.id,
              syncState: SyncState.online,
              onJobComplete: () => context.go('/schedule'),
            );
          } catch (_) {
            return Scaffold(
              body: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text('Job not found'),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: () => context.go('/schedule'),
                      child: const Text('Back to Schedule'),
                    ),
                  ],
                ),
              ),
            );
          }
        },
      );
    },
  );
}
