import 'package:flutter_test/flutter_test.dart';

import 'package:crew_app/src/data/services/photo_upload_service.dart';

void main() {
  group('PhotoCategory', () {
    test('all categories are unique strings', () {
      final categories = [
        PhotoCategory.before,
        PhotoCategory.after,
        PhotoCategory.item,
        PhotoCategory.damage,
        PhotoCategory.accessPath,
        PhotoCategory.truckBed,
        PhotoCategory.donationEvidence,
        PhotoCategory.disposalEvidence,
        PhotoCategory.receipt,
        PhotoCategory.arrival,
        PhotoCategory.completion,
      ];

      final set = categories.toSet();
      expect(
        set.length,
        categories.length,
        reason: 'All categories should be unique',
      );
    });

    test('categories match backend VALID_TYPES', () {
      // These must match the VALID_TYPES array in
      // app/api/crew/upload-photo/route.js
      expect(PhotoCategory.before, 'before');
      expect(PhotoCategory.after, 'after');
      expect(PhotoCategory.item, 'item');
      expect(PhotoCategory.damage, 'damage');
      expect(PhotoCategory.accessPath, 'access_path');
      expect(PhotoCategory.truckBed, 'truck_bed');
      expect(PhotoCategory.donationEvidence, 'donation_evidence');
      expect(PhotoCategory.disposalEvidence, 'disposal_evidence');
      expect(PhotoCategory.receipt, 'receipt');
      expect(PhotoCategory.arrival, 'arrival');
      expect(PhotoCategory.completion, 'completion');
    });
  });

  group('PhotoUploadResult', () {
    test('success result has url and no error', () {
      const result = PhotoUploadResult(
        success: true,
        url: 'https://example.com/photo.jpg',
        localPath: '/tmp/photo.jpg',
      );

      expect(result.success, true);
      expect(result.url, 'https://example.com/photo.jpg');
      expect(result.error, isNull);
      expect(result.localPath, '/tmp/photo.jpg');
    });

    test('failure result has error and no url', () {
      const result = PhotoUploadResult(
        success: false,
        error: 'Network error',
        localPath: '/tmp/photo.jpg',
      );

      expect(result.success, false);
      expect(result.url, isNull);
      expect(result.error, 'Network error');
      expect(result.localPath, '/tmp/photo.jpg');
    });
  });
}
