import 'package:flutter_test/flutter_test.dart';

import 'package:crew_app/src/data/repositories/auth_repository.dart';
import 'package:crew_app/src/router/router.dart';

void main() {
  group('destinationForStatus', () {
    test('unknown redirects to splash', () {
      expect(destinationForStatus(AuthStatus.unknown, '/schedule'), '/splash');
    });

    test('unauthenticated redirects to login', () {
      expect(destinationForStatus(AuthStatus.unauthenticated, '/schedule'), '/login');
    });

    test('needsOnboarding redirects to onboard', () {
      expect(destinationForStatus(AuthStatus.needsOnboarding, '/schedule'), '/onboard');
    });

    test('needsVerification redirects to verification', () {
      expect(destinationForStatus(AuthStatus.needsVerification, '/schedule'), '/verification');
    });

    test('authenticated from splash redirects to schedule', () {
      expect(destinationForStatus(AuthStatus.authenticated, '/splash'), '/schedule');
    });

    test('authenticated from other routes stays on current route', () {
      expect(destinationForStatus(AuthStatus.authenticated, '/schedule'), '/schedule');
      expect(destinationForStatus(AuthStatus.authenticated, '/job/123'), '/job/123');
      expect(destinationForStatus(AuthStatus.authenticated, '/closeout'), '/closeout');
    });
  });
}
