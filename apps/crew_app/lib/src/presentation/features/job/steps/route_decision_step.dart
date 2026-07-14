import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/app_theme.dart';
import '../../../../domain/models/booking.dart';
import '../../../../domain/providers/job_provider.dart';
import '../../../shared/jh_card.dart';
import '../../../shared/jh_primary_button.dart';
import '../../../shared/jh_secondary_button.dart';

/// Step 7: Route Decision. Continue to next job or go to landfill.
/// If truck fullness >= 75%, landfill is recommended.
class RouteDecisionStep extends ConsumerWidget {
  const RouteDecisionStep({super.key, required this.booking, required this.stepController});
  final Booking booking;
  final JobStepController stepController;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // In production, read the truck fullness from the previous step's state.
    // For now, show both options.

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('What\'s Next?', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 4),
        Text(
          'Continue to the next job or make a landfill run.',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.textSecondary),
        ),
        const SizedBox(height: 16),
        JhCard(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.local_shipping_rounded, color: AppColors.accent, size: 24),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text('Continue to next job', style: Theme.of(context).textTheme.titleMedium),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  'Proceed to the next scheduled stop.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        JhCard(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.delete_outline, color: AppColors.statusAmber, size: 24),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text('Landfill run', style: Theme.of(context).textTheme.titleMedium),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  'Find the nearest open landfill and dump the load before continuing.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 24),
        JhPrimaryButton(
          label: 'Continue to Next Job',
          onPressed: () => stepController.advance(),
        ),
        const SizedBox(height: 12),
        JhSecondaryButton(
          label: 'Find Nearest Landfill',
          onPressed: () {
            // In production: ref.read(employeeApiProvider).fetchLandfill(lat:, lng:)
            // then open directions via url_launcher.
            stepController.advance();
          },
        ),
      ],
    );
  }
}
