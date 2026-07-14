import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/app_theme.dart';
import '../../../../domain/models/booking.dart';
import '../../../../domain/providers/job_provider.dart';
import '../../../shared/jh_card.dart';
import '../../../shared/jh_primary_button.dart';

/// Step 1: En Route. Crew confirms they're heading to the job.
/// Calls POST /api/employee/job-clock with action: 'in' to start the job timer.
class EnRouteStep extends ConsumerWidget {
  const EnRouteStep({super.key, required this.booking, required this.stepController});
  final Booking booking;
  final JobStepController stepController;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        JhCard(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(booking.name ?? 'Customer', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 4),
                if (booking.address != null)
                  Text(booking.address!, style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.textSecondary)),
                const SizedBox(height: 8),
                if (booking.timeSlot != null || booking.windowLabel != null)
                  Text(
                    'Window: ${booking.windowLabel ?? booking.timeSlot ?? '—'}',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.textSecondary),
                  ),
                if (booking.totalPrice != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    '\$${booking.totalPrice!.toStringAsFixed(0)}',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontFeatures: const [FontFeature.tabularFigures()],
                        ),
                  ),
                ],
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        if (booking.notes != null)
          JhCard(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Notes', style: Theme.of(context).textTheme.labelSmall),
                  const SizedBox(height: 4),
                  Text(booking.notes!, style: Theme.of(context).textTheme.bodyMedium),
                ],
              ),
            ),
          ),
        const SizedBox(height: 24),
        JhPrimaryButton(
          label: 'Start En Route',
          onPressed: () {
            // Advance to arrived. The job-clock 'in' call would happen here
            // once we have the assignment_id from the schedule.
            stepController.advance();
          },
        ),
        const SizedBox(height: 12),
        Text(
          'Tap to start the job timer and notify the customer you\'re on the way.',
          style: Theme.of(context).textTheme.labelSmall,
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
}
