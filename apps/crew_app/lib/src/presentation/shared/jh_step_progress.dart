import 'package:flutter/material.dart';
import '../../core/app_theme.dart';

/// Segmented progress bar shown at the top of every job step
/// ("Step 3 of 9"). Also reused (with [totalSteps]=8) for onboarding.
class JhStepProgress extends StatelessWidget {
  const JhStepProgress({
    super.key,
    required this.currentStep,
    required this.totalSteps,
    required this.stepLabel,
  });

  final int currentStep;
  final int totalSteps;
  final String stepLabel;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: List.generate(totalSteps, (i) {
            final filled = i < currentStep;
            return Expanded(
              child: Container(
                margin: EdgeInsets.only(right: i == totalSteps - 1 ? 0 : 4),
                height: 4,
                decoration: BoxDecoration(
                  color: filled ? AppColors.accent : AppColors.borderSubtle,
                  borderRadius: BorderRadius.circular(99),
                ),
              ),
            );
          }),
        ),
        const SizedBox(height: 8),
        Text(
          'STEP $currentStep OF $totalSteps · ${stepLabel.toUpperCase()}',
          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.accent),
        ),
      ],
    );
  }
}
