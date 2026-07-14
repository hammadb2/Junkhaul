import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/app_theme.dart';
import '../../../../domain/models/booking.dart';
import '../../../../domain/providers/job_provider.dart';
import '../../../shared/jh_card.dart';
import '../../../shared/jh_primary_button.dart';

/// Step 6: Truck Fullness Check (Section 6.4).
/// Capture a photo of the truck bed and select fullness level.
/// If >= 75%, the next Route Decision step defaults to landfill.
class TruckFullnessStep extends ConsumerStatefulWidget {
  const TruckFullnessStep({super.key, required this.booking, required this.stepController});
  final Booking booking;
  final JobStepController stepController;

  @override
  ConsumerState<TruckFullnessStep> createState() => _TruckFullnessStepState();
}

class _TruckFullnessStepState extends ConsumerState<TruckFullnessStep> {
  int _fullnessIndex = -1; // 0=Empty, 1=1/4, 2=1/2, 3=3/4, 4=Full
  String? _photoPath;

  static const _labels = ['Empty', '¼', '½', '¾', 'Full'];
  static const _threshold = 3; // 3/4 = 75%

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Truck Fullness', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 4),
        Text(
          'Take a photo of the truck bed and select how full it is.',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.textSecondary),
        ),
        const SizedBox(height: 16),
        // Photo capture slot
        GestureDetector(
          onTap: () => setState(() => _photoPath = 'placeholder://truck_${DateTime.now().millisecondsSinceEpoch}'),
          child: JhCard(
            child: Container(
              height: 160,
              alignment: Alignment.center,
              child: _photoPath == null
                  ? Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.camera_alt_rounded, size: 36, color: AppColors.textSecondary),
                        const SizedBox(height: 8),
                        Text('Tap to capture truck bed photo', style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.textSecondary)),
                      ],
                    )
                  : const Icon(Icons.check_circle_rounded, size: 36, color: AppColors.statusGreen),
            ),
          ),
        ),
        const SizedBox(height: 16),
        // Fullness selector
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: List.generate(_labels.length, (i) {
            final selected = i == _fullnessIndex;
            final color = i >= _threshold ? AppColors.statusAmber : AppColors.accent;
            return GestureDetector(
              onTap: () => setState(() => _fullnessIndex = i),
              child: Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: selected ? color.withValues(alpha: 0.12) : AppColors.bgCard,
                  border: Border.all(color: selected ? color : AppColors.borderSubtle, width: 1.5),
                  borderRadius: BorderRadius.circular(12),
                ),
                alignment: Alignment.center,
                child: Text(
                  _labels[i],
                  style: TextStyle(
                    color: selected ? color : AppColors.textSecondary,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            );
          }),
        ),
        if (_fullnessIndex >= _threshold) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.statusAmber.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                const Icon(Icons.info_outline, color: AppColors.statusAmber, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Truck is over 75% full. Landfill run recommended.',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.statusAmber),
                  ),
                ),
              ],
            ),
          ),
        ],
        const SizedBox(height: 24),
        JhPrimaryButton(
          label: 'Continue',
          onPressed: _fullnessIndex >= 0 && _photoPath != null
              ? () => widget.stepController.advance()
              : null,
        ),
      ],
    );
  }
}
