import 'dart:io';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

/// Service for capturing photos via the device camera.
/// Uses [image_picker] which is already a dependency.
class CameraService {
  final _picker = ImagePicker();

  /// Opens the camera and returns the captured image file, or null
  /// if the user cancelled.
  Future<File?> capturePhoto({ImageSource source = ImageSource.camera}) async {
    final xfile = await _picker.pickImage(
      source: source,
      maxWidth: 1920,
      maxHeight: 1920,
      imageQuality: 85,
    );
    if (xfile == null) return null;
    return File(xfile.path);
  }

  /// Opens the gallery for selecting an existing photo.
  Future<File?> pickFromGallery() async {
    return capturePhoto(source: ImageSource.gallery);
  }
}

final cameraServiceProvider = Provider<CameraService>((ref) => CameraService());
