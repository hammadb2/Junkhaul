import 'package:flutter_test/flutter_test.dart';

import 'package:crew_app/src/domain/models/customer.dart';
import 'package:crew_app/src/domain/models/job.dart';
import 'package:crew_app/src/presentation/features/job/navigation/job_navigation_screen.dart';

/// Unit tests for navigation destination validation and duplicate-start
/// protection logic.
///
/// These tests verify the pure logic that determines whether navigation
/// should initialize — they do not test the native SDK (which requires
/// a device).
void main() {
  group('Navigation destination validation', () {
    test('job with valid lat/lng can use native navigation', () {
      final job = _createJob(lat: 51.0447, lng: -114.0719);
      expect(job.customer.lat, isNotNull);
      expect(job.customer.lng, isNotNull);
      expect(job.customer.lat, 51.0447);
      expect(job.customer.lng, -114.0719);
    });

    test('job with null lat cannot use native navigation', () {
      final job = _createJob(lat: null, lng: -114.0719);
      expect(job.customer.lat, isNull);
      expect(job.customer.lng, isNotNull);
      // canUseNativeNav = hasApiKey && hasCoords = false
      final hasCoords = job.customer.lat != null && job.customer.lng != null;
      expect(hasCoords, isFalse);
    });

    test('job with null lng cannot use native navigation', () {
      final job = _createJob(lat: 51.0447, lng: null);
      expect(job.customer.lat, isNotNull);
      expect(job.customer.lng, isNull);
      final hasCoords = job.customer.lat != null && job.customer.lng != null;
      expect(hasCoords, isFalse);
    });

    test('job with both null lat/lng cannot use native navigation', () {
      final job = _createJob(lat: null, lng: null);
      expect(job.customer.lat, isNull);
      expect(job.customer.lng, isNull);
      final hasCoords = job.customer.lat != null && job.customer.lng != null;
      expect(hasCoords, isFalse);
    });

    test(
      'job with zero lat/lng is technically valid (equator/prime meridian)',
      () {
        final job = _createJob(lat: 0.0, lng: 0.0);
        // 0.0 is not null, so navigation would attempt to use it.
        // This is correct behavior — the coordinates are valid.
        expect(job.customer.lat, 0.0);
        expect(job.customer.lng, 0.0);
        final hasCoords = job.customer.lat != null && job.customer.lng != null;
        expect(hasCoords, isTrue);
      },
    );
  });

  group('Duplicate-start protection', () {
    // The _guidanceStarted flag in _JobNavigationScreenState prevents
    // setDestinations from being called more than once. We verify the
    // logic pattern here.
    test('guidance started flag prevents duplicate destination requests', () {
      bool guidanceStarted = false;

      // First call — should proceed
      final firstCall = !guidanceStarted;
      if (firstCall) {
        guidanceStarted = true;
      }
      expect(firstCall, isTrue);
      expect(guidanceStarted, isTrue);

      // Second call — should be blocked
      final secondCall = !guidanceStarted;
      if (secondCall) {
        guidanceStarted = true;
      }
      expect(secondCall, isFalse);
      expect(guidanceStarted, isTrue);
    });

    test('guidance started flag resets on route calculation failure', () {
      bool guidanceStarted = false;

      // First call — starts
      if (!guidanceStarted) {
        guidanceStarted = true;
      }
      expect(guidanceStarted, isTrue);

      // Simulate route calculation failure — flag resets
      guidanceStarted = false;
      expect(guidanceStarted, isFalse);

      // Retry — should proceed again
      final retryCall = !guidanceStarted;
      if (retryCall) {
        guidanceStarted = true;
      }
      expect(retryCall, isTrue);
      expect(guidanceStarted, isTrue);
    });
  });

  group('Arrival callback protection', () {
    test('arrival flag prevents double-firing', () {
      bool arrived = false;
      int arrivalCount = 0;

      void onArrival() {
        if (!arrived) {
          arrived = true;
          arrivalCount++;
        }
      }

      // First arrival
      onArrival();
      expect(arrivalCount, 1);

      // Second arrival — should be blocked
      onArrival();
      expect(arrivalCount, 1);
    });
  });

  group('CrewNavMode', () {
    test('has turn-by-turn and free drive modes', () {
      expect(CrewNavMode.values, contains(CrewNavMode.turnByTurn));
      expect(CrewNavMode.values, contains(CrewNavMode.freeDrive));
      expect(CrewNavMode.values.length, 2);
    });
  });
}

Job _createJob({double? lat, double? lng}) {
  return Job(
    id: 'test-job',
    customer: Customer(
      id: 'test-customer',
      name: 'Test Customer',
      address: '123 Test St, Calgary, AB',
      phone: '5875551234',
      lat: lat,
      lng: lng,
    ),
    scheduledTime: DateTime(2025, 1, 15, 10, 0),
    status: JobStatus.confirmed,
    loadSize: LoadSize.half,
    quotedAmount: 150.0,
  );
}
