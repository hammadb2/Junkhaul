import 'dart:io';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image/image.dart' as img;

import '../api/employee_api.dart';
import 'camera_service.dart';

/// Photo categories supported by the backend.
class PhotoCategory {
  PhotoCategory._();

  static const before = 'before';
  static const after = 'after';
  static const item = 'item';
  static const damage = 'damage';
  static const accessPath = 'access_path';
  static const truckBed = 'truck_bed';
  static const donationEvidence = 'donation_evidence';
  static const disposalEvidence = 'disposal_evidence';
  static const receipt = 'receipt';
  static const arrival = 'arrival';
  static const completion = 'completion';
}

/// Result of a photo upload attempt.
class PhotoUploadResult {
  const PhotoUploadResult({
    required this.success,
    this.url,
    this.error,
    this.localPath,
  });

  final bool success;
  final String? url;
  final String? error;
  final String? localPath;
}

/// Handles photo compression and upload to the backend.
///
/// Compresses photos to JPEG quality 85 with max dimension 1920px before
/// uploading via multipart form data to /api/crew/upload-photo.
class PhotoUploadService {
  PhotoUploadService(this._api);
  final EmployeeApi _api;

  /// Compress and upload a single photo.
  ///
  /// [bookingId] — the booking this photo belongs to.
  /// [category] — one of the PhotoCategory constants.
  /// [file] — the original File from CameraService.
  /// [lat], [lng] — optional GPS coordinates.
  ///
  /// Returns a [PhotoUploadResult] with the signed URL on success.
  Future<PhotoUploadResult> uploadPhoto({
    required String bookingId,
    required String category,
    required File file,
    double? lat,
    double? lng,
  }) async {
    try {
      // Compress the photo to a temp file.
      final compressed = await _compressImage(file);
      final uploadPath = compressed?.path ?? file.path;

      final url = await _api.uploadPhoto(
        bookingId: bookingId,
        photoCategory: category,
        filePath: uploadPath,
        lat: lat,
        lng: lng,
        takenAt: DateTime.now().toIso8601String(),
      );

      // Clean up the temp compressed file if it's different from the original.
      if (compressed != null && compressed.path != file.path) {
        try {
          await compressed.delete();
        } catch (_) {}
      }

      return PhotoUploadResult(success: true, url: url, localPath: file.path);
    } catch (e) {
      return PhotoUploadResult(
        success: false,
        error: e.toString(),
        localPath: file.path,
      );
    }
  }

  /// Compress an image to JPEG quality 85, max dimension 1920px.
  /// Returns a temp File, or null if compression fails (caller uses original).
  Future<File?> _compressImage(File original) async {
    try {
      final bytes = await original.readAsBytes();
      final decoded = img.decodeImage(bytes);
      if (decoded == null) return null;

      // Resize if larger than 1920px on any side.
      img.Image resized;
      if (decoded.width > 1920 || decoded.height > 1920) {
        if (decoded.width >= decoded.height) {
          resized = img.copyResize(decoded, width: 1920);
        } else {
          resized = img.copyResize(decoded, height: 1920);
        }
      } else {
        resized = decoded;
      }

      final compressedBytes = img.encodeJpg(resized, quality: 85);
      final tempDir = Directory.systemTemp;
      final tempFile = File(
        '${tempDir.path}/jh_photo_${DateTime.now().millisecondsSinceEpoch}.jpg',
      );
      await tempFile.writeAsBytes(compressedBytes);
      return tempFile;
    } catch (_) {
      return null;
    }
  }
}

final photoUploadServiceProvider = Provider<PhotoUploadService?>((ref) {
  final apiAsync = ref.watch(employeeApiProvider);
  return apiAsync.maybeWhen(
    data: (api) => PhotoUploadService(api),
    orElse: () => null,
  );
});
