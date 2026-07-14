import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/app_theme.dart';
import '../../../../domain/models/booking.dart';
import '../../../../domain/providers/job_provider.dart';
import '../../../shared/jh_card.dart';
import '../../../shared/jh_primary_button.dart';

/// Step 3: Before/After photos of customer space (Section 6.6).
/// "Before" is captured here; "After" is captured at the end before Signature.
class BeforeAfterStep extends ConsumerStatefulWidget {
  const BeforeAfterStep({super.key, required this.booking, required this.stepController});
  final Booking booking;
  final JobStepController stepController;

  @override
  ConsumerState<BeforeAfterStep> createState() => _BeforeAfterStepState();
}

class _BeforeAfterStepState extends ConsumerState<BeforeAfterStep> {
  String? _beforePhotoPath;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Before Photo', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 4),
        Text(
          'Capture the space where junk currently sits before removal.',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.textSecondary),
        ),
        const SizedBox(height: 16),
        _PhotoCaptureSlot(
          label: 'Before',
          photoPath: _beforePhotoPath,
          onTap: () => _capturePhoto(),
        ),
        const SizedBox(height: 24),
        JhPrimaryButton(
          label: 'Continue to Payment',
          onPressed: _beforePhotoPath == null
              ? null
              : () => widget.stepController.advance(),
        ),
        const SizedBox(height: 12),
        Text(
          'The "After" photo will be captured right before signature.',
          style: Theme.of(context).textTheme.labelSmall,
          textAlign: TextAlign.center,
        ),
      ],
    );
  }

  Future<void> _capturePhoto() async {
    // In production, use the camera plugin to capture a photo.
    // For now, simulate by setting a placeholder path.
    setState(() => _beforePhotoPath = 'placeholder://before_${DateTime.now().millisecondsSinceEpoch}');
  }
}

class _PhotoCaptureSlot extends StatelessWidget {
  const _PhotoCaptureSlot({
    required this.label,
    this.photoPath,
    required this.onTap,
  });

  final String label;
  final String? photoPath;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: JhCard(
        child: Container(
          height: 200,
          alignment: Alignment.center,
          child: photoPath == null
              ? Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.camera_alt_rounded, size: 40, color: AppColors.textSecondary),
                    const SizedBox(height: 8),
                    Text('Tap to capture $label photo', style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.textSecondary)),
                  ],
                )
              : Stack(
                  fit: StackFit.expand,
                  children: [
                    Container(
                      color: AppColors.bgInput,
                      child: const Icon(Icons.check_circle_rounded, size: 40, color: AppColors.statusGreen),
                    ),
                    Positioned(
                      top: 8,
                      left: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.textPrimary.withValues(alpha: 0.7),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(label, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
                      ),
                    ),
                  ],
                ),
        ),
      ),
    );
  }
}
