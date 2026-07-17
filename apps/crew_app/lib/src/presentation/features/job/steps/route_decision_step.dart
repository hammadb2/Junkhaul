import 'package:flutter/material.dart';
import '../../../../core/app_theme.dart';
import '../../../shared/jh_primary_button.dart';

enum RouteChoice { landfillRun, nextJob }

/// Step 7/9 — "Landfill run" vs "Continue to next job" branch point.
///
/// TODO(dev): source [nextJobSummary] from the actual next stop on the
/// crew's route.
class RouteDecisionStep extends StatefulWidget {
  const RouteDecisionStep({super.key, required this.onConfirm, this.nextJobSummary});

  final void Function(RouteChoice choice) onConfirm;
  final String? nextJobSummary;

  @override
  State<RouteDecisionStep> createState() => _RouteDecisionStepState();
}

class _RouteDecisionStepState extends State<RouteDecisionStep> {
  RouteChoice _choice = RouteChoice.landfillRun;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
            children: [
              const Text("What's next?", style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
              const SizedBox(height: 4),
              const Text("Your call.", style: TextStyle(fontSize: 14, color: AppColors.textSecondary)),
              const SizedBox(height: 18),
              _OptionCard(
                icon: Icons.delete_outline_rounded,
                title: 'Landfill run',
                subtitle: "Drop what you've got, then come back empty",
                selected: _choice == RouteChoice.landfillRun,
                onTap: () => setState(() => _choice = RouteChoice.landfillRun),
              ),
              const SizedBox(height: 12),
              _OptionCard(
                icon: Icons.arrow_forward_rounded,
                title: 'Continue to next job',
                subtitle: widget.nextJobSummary ?? 'Still room on the truck',
                selected: _choice == RouteChoice.nextJob,
                onTap: () => setState(() => _choice = RouteChoice.nextJob),
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 26),
          child: JhPrimaryButton(label: 'Confirm', onPressed: () => widget.onConfirm(_choice)),
        ),
      ],
    );
  }
}

class _OptionCard extends StatelessWidget {
  const _OptionCard({required this.icon, required this.title, required this.subtitle, required this.selected, required this.onTap});
  final IconData icon;
  final String title;
  final String subtitle;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: AppColors.bgCard,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: selected ? AppColors.accent : AppColors.borderSubtle, width: selected ? 1.5 : 1),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(color: selected ? const Color(0xFFFFF1E8) : AppColors.bgInput, borderRadius: BorderRadius.circular(12)),
              child: Icon(icon, color: selected ? AppColors.accent : AppColors.textSecondary, size: 22),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
                  Text(subtitle, style: const TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
