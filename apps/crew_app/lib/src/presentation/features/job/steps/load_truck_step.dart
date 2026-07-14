import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/app_theme.dart';
import '../../../../domain/models/booking.dart';
import '../../../../domain/providers/job_provider.dart';
import '../../../shared/jh_card.dart';
import '../../../shared/jh_primary_button.dart';

/// Step 5: Load Truck. Checklist of itemized items.
/// Mirrors app/portal/job/page.js:637-679.
class LoadTruckStep extends ConsumerStatefulWidget {
  const LoadTruckStep({super.key, required this.booking, required this.stepController});
  final Booking booking;
  final JobStepController stepController;

  @override
  ConsumerState<LoadTruckStep> createState() => _LoadTruckStepState();
}

class _LoadTruckStepState extends ConsumerState<LoadTruckStep> {
  final _loaded = <int, bool>{};

  @override
  Widget build(BuildContext context) {
    final items = widget.booking.itemizedItems;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Load Checklist', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 4),
        Text(
          'Check each item as it\'s loaded onto the truck.',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.textSecondary),
        ),
        const SizedBox(height: 16),
        if (items.isEmpty)
          JhCard(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                'No itemized items to load.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.textSecondary),
              ),
            ),
          )
        else
          ...items.asMap().entries.map((entry) {
            final i = entry.key;
            final item = entry.value;
            final isLoaded = _loaded[i] ?? false;
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: JhCard(
                child: CheckboxListTile(
                  value: isLoaded,
                  onChanged: (v) => setState(() => _loaded[i] = v ?? false),
                  title: Text(item.name ?? item.description ?? 'Item ${i + 1}'),
                  subtitle: item.quantity != null ? Text('Qty: ${item.quantity}') : null,
                  activeColor: AppColors.accent,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12),
                ),
              ),
            );
          }),
        const SizedBox(height: 24),
        JhPrimaryButton(
          label: 'Load Confirmed',
          onPressed: () => widget.stepController.advance(),
        ),
      ],
    );
  }
}
