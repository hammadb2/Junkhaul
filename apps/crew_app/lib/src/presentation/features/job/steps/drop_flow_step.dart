import 'dart:io';
import 'package:flutter/material.dart';
import '../../../../core/app_theme.dart';
import '../../../shared/jh_primary_button.dart';
import '../../../shared/jh_photo_thumbnail.dart';
import 'route_decision_step.dart';

/// Step 8/9 — storage unit / facility / landfill drop-off with capacity
/// tracking, shown after [RouteChoice.landfillRun].
class DropFlowStep extends StatelessWidget {
  const DropFlowStep({
    super.key,
    required this.choice,
    required this.facilityName,
    required this.onCapture,
    required this.onConfirm,
    this.photoFile,
    this.capacityAfterPercent,
  });

  final RouteChoice choice;
  final String? facilityName;
  final VoidCallback onCapture;
  final VoidCallback onConfirm;
  final File? photoFile;
  final int? capacityAfterPercent;

  @override
  Widget build(BuildContext context) {
    final isLandfill = choice == RouteChoice.landfillRun;
    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
            children: [
              Text(
                isLandfill
                    ? 'Confirm the landfill drop'
                    : 'Confirm the storage drop',
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 4),
              if (facilityName != null)
                Text(
                  facilityName!,
                  style: const TextStyle(
                    fontSize: 14,
                    color: AppColors.textSecondary,
                  ),
                ),
              const SizedBox(height: 16),
              JhPhotoThumbnail(
                onCapture: onCapture,
                imageFile: photoFile,
                label: 'Tap to capture drop-off photo',
                height: 170,
              ),
              if (capacityAfterPercent != null) ...[
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Truck capacity after drop',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    Text(
                      '$capacityAfterPercent%',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: AppColors.statusGreen,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                ClipRRect(
                  borderRadius: BorderRadius.circular(99),
                  child: LinearProgressIndicator(
                    value: capacityAfterPercent! / 100,
                    minHeight: 10,
                    backgroundColor: AppColors.bgInput,
                    valueColor: const AlwaysStoppedAnimation(
                      AppColors.statusGreen,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 26),
          child: JhPrimaryButton(
            label: 'Confirm Drop-off',
            onPressed: photoFile != null ? onConfirm : null,
          ),
        ),
      ],
    );
  }
}
