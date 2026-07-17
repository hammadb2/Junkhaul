import 'dart:io';
import 'package:flutter/material.dart';
import '../../core/app_theme.dart';

/// Tap-to-capture tile used on every photo step (before/after, item
/// conditions, truck bed, drop-off). Shows an empty camera prompt until
/// [imageFile] is set, then the photo with a retake affordance.
///
/// TODO(dev): wire [onCapture] to your camera flow (e.g. image_picker) and
/// pass the captured file back in as [imageFile].
class JhPhotoThumbnail extends StatelessWidget {
  const JhPhotoThumbnail({
    super.key,
    required this.onCapture,
    this.imageFile,
    this.label = 'Tap to capture',
    this.height = 180,
  });

  final VoidCallback onCapture;
  final File? imageFile;
  final String label;
  final double height;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onCapture,
      child: Container(
        width: double.infinity,
        height: height,
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          color: AppColors.bgInput,
          borderRadius: BorderRadius.circular(16),
          border: imageFile == null
              ? Border.all(color: AppColors.borderSubtle, width: 1.5)
              : null,
        ),
        child: imageFile != null
            ? Stack(
                fit: StackFit.expand,
                children: [
                  Image.file(imageFile!, fit: BoxFit.cover),
                  Positioned(
                    right: 8,
                    bottom: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.6),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: const Text(
                        'Retake',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                ],
              )
            : Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.camera_alt_outlined,
                    size: 28,
                    color: AppColors.textSecondary,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    label,
                    style: const TextStyle(
                      fontSize: 13,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}
