import 'package:flutter/material.dart';
import '../../../../core/app_theme.dart';
import '../../../../domain/models/job.dart';
import '../../../shared/jh_primary_button.dart';

/// Step 1/9 — driving to the job; crew can jot arrival notes and launch
/// in-app navigation.
///
/// TODO(dev): source ETA/distance from your routing/dispatch service
/// (e.g. the same Mapbox Directions result powering [ScheduleMap]).
class EnRouteStep extends StatefulWidget {
  const EnRouteStep({
    super.key,
    required this.job,
    required this.etaMinutes,
    required this.distanceKm,
    required this.onStartNavigation,
    this.onNotesChanged,
  });

  final Job job;
  final int etaMinutes;
  final double distanceKm;
  final VoidCallback onStartNavigation;
  final ValueChanged<String>? onNotesChanged;

  @override
  State<EnRouteStep> createState() => _EnRouteStepState();
}

class _EnRouteStepState extends State<EnRouteStep> {
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
            children: [
              Text('Heading to ${widget.job.customer.name}',
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
              const SizedBox(height: 4),
              Text('${widget.job.customer.address}', style: const TextStyle(fontSize: 14, color: AppColors.textSecondary)),
              const SizedBox(height: 18),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: AppColors.bgCard, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.borderSubtle)),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _stat('ETA', '${widget.etaMinutes} min'),
                    _stat('Distance', '${widget.distanceKm.toStringAsFixed(1)} km'),
                  ],
                ),
              ),
              const SizedBox(height: 18),
              const Text('Notes for this job', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
              const SizedBox(height: 6),
              TextField(
                maxLines: 4,
                onChanged: widget.onNotesChanged,
                decoration: const InputDecoration(hintText: 'Gate code, parking notes, anything the crew should know…'),
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 26),
          child: JhPrimaryButton(label: 'Start Navigation', icon: Icons.navigation_rounded, onPressed: widget.onStartNavigation),
        ),
      ],
    );
  }

  Widget _stat(String label, String value) {
    return Column(
      children: [
        Text(label, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
        const SizedBox(height: 2),
        Text(value, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
      ],
    );
  }
}
