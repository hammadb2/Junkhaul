import 'dart:io';
import 'package:flutter/material.dart';
import '../../../../core/app_theme.dart';
import '../../../shared/jh_primary_button.dart';
import '../../../shared/jh_photo_thumbnail.dart';

/// Step 6/9 — truck bed photo to assess remaining capacity for the next
/// stop.
///
/// TODO(dev): source [capacityUsedPercent] and [nextJobSummary] from your
/// AI photo-analysis / route-planning service.
class TruckFullnessStep extends StatelessWidget {
  const TruckFullnessStep({
    super.key,
    required this.onCapture,
    required this.onNext,
    this.photoFile,
    this.capacityUsedPercent,
    this.nextJobSummary,
  });

  final VoidCallback onCapture;
  final VoidCallback onNext;
  final File? photoFile;
  final int? capacityUsedPercent;
  final String? nextJobSummary;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
            children: [
              const Text(
                'How full is the truck?',
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 4),
              const Text(
                'Snap the bed so we can plan the next stop.',
                style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
              ),
              const SizedBox(height: 16),
              JhPhotoThumbnail(
                onCapture: onCapture,
                imageFile: photoFile,
                label: 'Tap to capture truck bed',
                height: 190,
              ),
              if (capacityUsedPercent != null) ...[
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Estimated capacity used',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    Text(
                      '$capacityUsedPercent%',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: AppColors.accent,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                ClipRRect(
                  borderRadius: BorderRadius.circular(99),
                  child: LinearProgressIndicator(
                    value: capacityUsedPercent! / 100,
                    minHeight: 10,
                    backgroundColor: AppColors.bgInput,
                    valueColor: const AlwaysStoppedAnimation(AppColors.accent),
                  ),
                ),
                if (nextJobSummary != null) ...[
                  const SizedBox(height: 14),
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.bgCard,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColors.borderSubtle),
                    ),
                    child: Text(
                      nextJobSummary!,
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppColors.textSecondary,
                        height: 1.4,
                      ),
                    ),
                  ),
                ],
              ],
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 26),
          child: JhPrimaryButton(
            label: 'Continue',
            onPressed: photoFile != null ? onNext : null,
          ),
        ),
      ],
    );
  }
}
