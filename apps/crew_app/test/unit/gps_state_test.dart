import 'package:flutter_test/flutter_test.dart';

import 'package:crew_app/src/domain/providers/location_provider.dart';
import 'package:crew_app/src/data/services/dispatch_location_service.dart';

void main() {
  group('GpsState', () {
    test('has all expected states', () {
      expect(GpsState.values, contains(GpsState.initial));
      expect(GpsState.values, contains(GpsState.loading));
      expect(GpsState.values, contains(GpsState.ready));
      expect(GpsState.values, contains(GpsState.denied));
      expect(GpsState.values, contains(GpsState.disabled));
      expect(GpsState.values, contains(GpsState.unavailable));
    });
  });

  group('GpsStatus', () {
    test('initial status has initial state and null position', () {
      const status = GpsStatus.initial;

      expect(status.state, GpsState.initial);
      expect(status.position, isNull);
      expect(status.error, isNull);
    });

    test('copyWith updates only specified fields', () {
      const original = GpsStatus(state: GpsState.loading);
      final updated = original.copyWith(state: GpsState.ready);

      expect(updated.state, GpsState.ready);
      expect(updated.position, isNull);
      expect(updated.error, isNull);
    });

    test('copyWith can set error and clear it', () {
      const original = GpsStatus(state: GpsState.ready);
      final withError = original.copyWith(
        state: GpsState.denied,
        error: 'Permission denied',
      );

      expect(withError.state, GpsState.denied);
      expect(withError.error, 'Permission denied');
    });
  });

  group('DispatchTrackingState', () {
    test('has all expected states', () {
      expect(DispatchTrackingState.values, contains(DispatchTrackingState.idle));
      expect(DispatchTrackingState.values, contains(DispatchTrackingState.tracking));
      expect(DispatchTrackingState.values, contains(DispatchTrackingState.paused));
      expect(DispatchTrackingState.values, contains(DispatchTrackingState.error));
    });
  });
}
