import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/app_theme.dart';
import '../../../../domain/models/booking.dart';
import '../../../../domain/providers/job_provider.dart';
import '../../../shared/jh_card.dart';
import '../../../shared/jh_primary_button.dart';

/// Step 2: Arrived. Crew marks arrival and records item conditions.
/// Mirrors app/portal/job/page.js:537-578.
class ArrivedStep extends ConsumerStatefulWidget {
  const ArrivedStep({super.key, required this.booking, required this.stepController});
  final Booking booking;
  final JobStepController stepController;

  @override
  ConsumerState<ArrivedStep> createState() => _ArrivedStepState();
}

class _ArrivedStepState extends ConsumerState<ArrivedStep> {
  final _conditions = <int, String>{};
  final _notes = <int, String>{};
  bool _isSubmitting = false;

  @override
  Widget build(BuildContext context) {
    final items = widget.booking.itemizedItems;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Item Conditions', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 4),
        Text(
          'Mark each item as Good, Damaged, or Missing before loading.',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.textSecondary),
        ),
        const SizedBox(height: 16),
        if (items.isEmpty)
          JhCard(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                'No itemized items on this booking.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.textSecondary),
              ),
            ),
          )
        else
          ...items.asMap().entries.map((entry) {
            final i = entry.key;
            final item = entry.value;
            final condition = _conditions[i];
            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _ItemConditionCard(
                name: item.name ?? item.description ?? 'Item ${i + 1}',
                condition: condition,
                note: _notes[i],
                onConditionChanged: (c) => setState(() {
                  if (c == null) {
                    _conditions.remove(i);
                  } else {
                    _conditions[i] = c;
                  }
                }),
                onNoteChanged: (n) => setState(() => _notes[i] = n),
              ),
            );
          }),
        const SizedBox(height: 24),
        JhPrimaryButton(
          label: 'Confirm & Continue',
          isLoading: _isSubmitting,
          onPressed: _handleConfirm,
        ),
      ],
    );
  }

  Future<void> _handleConfirm() async {
    setState(() => _isSubmitting = true);
    try {
      // Build the conditions map for /api/crew/item-conditions.
      // Format: { "0": "good", "1": "damaged", "1_note": "...", ... }
      final conditions = <String, String>{};
      _conditions.forEach((i, c) {
        conditions['$i'] = c;
        if (_notes[i] != null && _notes[i]!.isNotEmpty) {
          conditions['${i}_note'] = _notes[i]!;
        }
      });

      // In production, call: ref.read(employeeApiProvider).submitItemConditions(
      //   bookingId: widget.booking.id, conditions: conditions,
      // );
      // For now, advance to the next step.
      if (mounted) {
        widget.stepController.advance();
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }
}

class _ItemConditionCard extends StatelessWidget {
  const _ItemConditionCard({
    required this.name,
    this.condition,
    this.note,
    required this.onConditionChanged,
    required this.onNoteChanged,
  });

  final String name;
  final String? condition;
  final String? note;
  final ValueChanged<String?> onConditionChanged;
  final ValueChanged<String> onNoteChanged;

  @override
  Widget build(BuildContext context) {
    return JhCard(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(name, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            Row(
              children: [
                _ConditionChip(
                  label: 'Good',
                  selected: condition == 'good',
                  color: AppColors.statusGreen,
                  onTap: () => onConditionChanged(condition == 'good' ? null : 'good'),
                ),
                const SizedBox(width: 8),
                _ConditionChip(
                  label: 'Damaged',
                  selected: condition == 'damaged',
                  color: AppColors.statusAmber,
                  onTap: () => onConditionChanged(condition == 'damaged' ? null : 'damaged'),
                ),
                const SizedBox(width: 8),
                _ConditionChip(
                  label: 'Missing',
                  selected: condition == 'missing',
                  color: AppColors.statusRed,
                  onTap: () => onConditionChanged(condition == 'missing' ? null : 'missing'),
                ),
              ],
            ),
            if (condition == 'damaged') ...[
              const SizedBox(height: 12),
              TextField(
                decoration: const InputDecoration(
                  labelText: 'Damage note (optional)',
                  isDense: true,
                ),
                maxLines: 2,
                onChanged: onNoteChanged,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _ConditionChip extends StatelessWidget {
  const _ConditionChip({
    required this.label,
    required this.selected,
    required this.color,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? color.withValues(alpha: 0.12) : Colors.transparent,
          border: Border.all(color: selected ? color : AppColors.borderSubtle, width: 1.5),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? color : AppColors.textSecondary,
            fontSize: 13,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }
}
