import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/app_theme.dart';
import '../../../../data/services/camera_service.dart';
import '../../../shared/jh_primary_button.dart';
import '../../../shared/jh_photo_thumbnail.dart';

/// Step 2 — document capture (license, SIN, void cheque).
/// Wired to [CameraService] for photo capture.
class DocumentsStep extends ConsumerStatefulWidget {
  const DocumentsStep({super.key, required this.onNext});

  final VoidCallback onNext;

  @override
  ConsumerState<DocumentsStep> createState() => _DocumentsStepState();
}

class _DocumentsStepState extends ConsumerState<DocumentsStep> {
  File? _licensePhoto;
  File? _sinPhoto;
  File? _chequePhoto;

  Future<void> _capture(String type) async {
    final camera = ref.read(cameraServiceProvider);
    final file = await camera.capturePhoto();
    if (file != null) {
      setState(() {
        switch (type) {
          case 'license':
            _licensePhoto = file;
            break;
          case 'sin':
            _sinPhoto = file;
            break;
          case 'cheque':
            _chequePhoto = file;
            break;
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
            children: [
              const Text(
                'Documents',
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                "Snap a clear photo of each. We'll confirm within 24 hours.",
                style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
              ),
              const SizedBox(height: 20),
              _label("Driver's license (front)", required: true),
              const SizedBox(height: 8),
              JhPhotoThumbnail(
                onCapture: () => _capture('license'),
                imageFile: _licensePhoto,
                label: 'Tap to capture license',
                height: 110,
              ),
              const SizedBox(height: 16),
              _label('SIN document', required: true),
              const SizedBox(height: 8),
              JhPhotoThumbnail(
                onCapture: () => _capture('sin'),
                imageFile: _sinPhoto,
                label: 'Tap to capture SIN letter or card',
                height: 110,
              ),
              const SizedBox(height: 16),
              _label('Void cheque or direct deposit form', required: false),
              const SizedBox(height: 8),
              JhPhotoThumbnail(
                onCapture: () => _capture('cheque'),
                imageFile: _chequePhoto,
                label: 'Tap to capture void cheque',
                height: 110,
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 26),
          child: JhPrimaryButton(
            label: 'Continue',
            onPressed: (_licensePhoto != null && _sinPhoto != null)
                ? widget.onNext
                : null,
          ),
        ),
      ],
    );
  }

  Widget _label(String text, {required bool required}) {
    return RichText(
      text: TextSpan(
        style: const TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w600,
          color: AppColors.textPrimary,
        ),
        children: [
          TextSpan(text: text),
          if (required)
            const TextSpan(
              text: '  ·  required',
              style: TextStyle(
                color: AppColors.statusRed,
                fontWeight: FontWeight.w500,
              ),
            ),
        ],
      ),
    );
  }
}
