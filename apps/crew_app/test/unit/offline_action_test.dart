import 'package:flutter_test/flutter_test.dart';

import 'package:crew_app/src/data/offline/offline_action.dart';

void main() {
  group('OfflineAction', () {
    test('toJson serializes all fields', () {
      final action = OfflineAction(
        id: 'test-1',
        type: 'signature',
        payload: {'booking_id': '123', 'amount': 150.0},
        filePaths: ['/tmp/photo.jpg'],
      );

      final json = action.toJson();

      expect(json['id'], 'test-1');
      expect(json['type'], 'signature');
      expect(json['payload'], {'booking_id': '123', 'amount': 150.0});
      expect(json['file_paths'], ['/tmp/photo.jpg']);
      expect(json['attempts'], 0);
      expect(json['created_at'], isA<String>());
    });

    test('fromJson deserializes all fields', () {
      final json = {
        'id': 'test-2',
        'type': 'clock_in',
        'payload': {'lat': 51.04, 'lng': -114.07},
        'file_paths': null,
        'created_at': '2025-01-15T10:30:00.000',
        'attempts': 3,
      };

      final action = OfflineAction.fromJson(json);

      expect(action.id, 'test-2');
      expect(action.type, 'clock_in');
      expect(action.payload, {'lat': 51.04, 'lng': -114.07});
      expect(action.filePaths, isNull);
      expect(action.attempts, 3);
      expect(action.createdAt, DateTime.parse('2025-01-15T10:30:00.000'));
    });

    test('round-trip toJson -> fromJson preserves data', () {
      final original = OfflineAction(
        id: 'round-trip',
        type: 'collect_payment',
        payload: {'booking_id': 'abc', 'method': 'cash_crew', 'amount': 200.0},
        filePaths: ['/tmp/receipt.jpg', '/tmp/photo.jpg'],
      );

      final json = original.toJson();
      final restored = OfflineAction.fromJson(Map<String, dynamic>.from(json));

      expect(restored.id, original.id);
      expect(restored.type, original.type);
      expect(restored.payload, original.payload);
      expect(restored.filePaths, original.filePaths);
      expect(restored.attempts, original.attempts);
    });

    test('fromJson handles missing attempts field', () {
      final json = {
        'id': 'test-3',
        'type': 'location',
        'payload': {},
        'file_paths': null,
        'created_at': '2025-01-15T10:30:00.000',
      };

      final action = OfflineAction.fromJson(json);

      expect(action.attempts, 0);
    });

    test('fromJson handles missing file_paths field', () {
      final json = {
        'id': 'test-4',
        'type': 'signature',
        'payload': {},
        'created_at': '2025-01-15T10:30:00.000',
        'attempts': 0,
      };

      final action = OfflineAction.fromJson(json);

      expect(action.filePaths, isNull);
    });

    test('attempts is mutable', () {
      final action = OfflineAction(
        id: 'test-5',
        type: 'signature',
        payload: {},
      );

      expect(action.attempts, 0);
      action.attempts += 1;
      expect(action.attempts, 1);
    });
  });
}
