import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/app_theme.dart';
import '../../../../domain/models/booking.dart';
import '../../../../domain/providers/job_provider.dart';
import '../../../shared/jh_card.dart';
import '../../../shared/jh_primary_button.dart';

/// Step 8: Drop Flow. Select a storage facility and log items dropped.
/// Mirrors app/portal/job/page.js:726-762.
class DropFlowStep extends ConsumerStatefulWidget {
  const DropFlowStep({super.key, required this.booking, required this.stepController});
  final Booking booking;
  final JobStepController stepController;

  @override
  ConsumerState<DropFlowStep> createState() => _DropFlowStepState();
}

class _DropFlowStepState extends ConsumerState<DropFlowStep> {
  String? _selectedFacilityId;
  final _capacityEstimate = <String, double>{};

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Storage Drop', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 4),
        Text(
          'Select a storage facility and log items being dropped off.',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.textSecondary),
        ),
        const SizedBox(height: 16),
        // Facility selection (in production, fetched from /api/employee/storage-drop)
        JhCard(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Facility', style: Theme.of(context).textTheme.labelSmall),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  value: _selectedFacilityId,
                  decoration: const InputDecoration(
                    hintText: 'Select a storage facility',
                    isDense: true,
                  ),
                  items: const [
                    DropdownMenuItem(value: 'facility_1', child: Text('Storage Unit A')),
                    DropdownMenuItem(value: 'facility_2', child: Text('Storage Unit B')),
                  ],
                  onChanged: (v) => setState(() => _selectedFacilityId = v),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        // Capacity estimate
        JhCard(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Capacity Used', style: Theme.of(context).textTheme.labelSmall),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: Slider(
                        value: _capacityEstimate['pct'] ?? 0,
                        min: 0,
                        max: 100,
                        divisions: 10,
                        label: '${(_capacityEstimate['pct'] ?? 0).round()}%',
                        activeColor: AppColors.accent,
                        onChanged: (v) => setState(() => _capacityEstimate['pct'] = v),
                      ),
                    ),
                    Text(
                      '${(_capacityEstimate['pct'] ?? 0).round()}%',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontFeatures: const [FontFeature.tabularFigures()],
                          ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 24),
        JhPrimaryButton(
          label: 'Confirm Drop',
          onPressed: _selectedFacilityId == null
              ? null
              : () => widget.stepController.advance(),
        ),
      ],
    );
  }
}
