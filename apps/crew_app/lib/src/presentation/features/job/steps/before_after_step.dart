import 'dart:io';
import 'package:flutter/material.dart';
import '../../../../core/app_theme.dart';
import '../../../shared/jh_error_banner.dart';
import '../../../shared/jh_primary_button.dart';
import '../../../shared/jh_photo_thumbnail.dart';

/// Step 3/9 — "Before Photo": tap-to-capture, then an AI hazmat check
/// against the captured photo.
///
/// TODO(dev): wire [onCapture] to your camera flow, and [hazmatFlag] to
/// the real photo-analysis result (e.g. the same Groq/vision pipeline used
/// elsewhere in the product) rather than a manual toggle.
class BeforeAfterStep extends StatelessWidget {
  const BeforeAfterStep({
    super.key,
    required this.onCapture,
    required this.onNext,
    this.photoFile,
    this.hazmatFlag = false,
    this.onCallDispatch,
    this.onDismissHazmatFlag,
  });

  final VoidCallback onCapture;
  final VoidCallback onNext;
  final File? photoFile;
  final bool hazmatFlag;
  final VoidCallback? onCallDispatch;
  final VoidCallback? onDismissHazmatFlag;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
            children: [
              const Text('Snap a before photo', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
              const SizedBox(height: 4),
              const Text('Get everything in frame before you load.', style: TextStyle(fontSize: 14, color: AppColors.textSecondary)),
              const SizedBox(height: 16),
              JhPhotoThumbnail(onCapture: onCapture, imageFile: photoFile, label: 'Tap to capture before photo', height: 220),
              if (hazmatFlag) ...[
                const SizedBox(height: 14),
                JhErrorBanner(
                  tone: JhBannerTone.error,
                  title: 'Possible hazardous item',
                  message: 'Our scan flagged what looks like a propane tank in this photo. Confirm with dispatch before loading it.',
                  actions: [
                    ElevatedButton(
                      onPressed: onCallDispatch,
                      style: ElevatedButton.styleFrom(backgroundColor: AppColors.textPrimary, foregroundColor: Colors.white),
                      child: const Text('Call Dispatch', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                    ),
                    OutlinedButton(
                      onPressed: onDismissHazmatFlag,
                      child: const Text('Not Hazardous', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 26),
          child: JhPrimaryButton(label: 'Looks Good', onPressed: photoFile != null ? onNext : null),
        ),
      ],
    );
  }
}
