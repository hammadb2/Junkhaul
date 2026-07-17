import 'package:flutter/material.dart';
import '../../../../core/app_theme.dart';
import '../../../shared/jh_card.dart';
import '../../../shared/jh_primary_button.dart';

/// Step 3 — federal TD1 tax credits (simplified to the fields most crew
/// actually touch; basic personal amount is informational, pulled from CRA).
///
/// TODO(dev): source [basicPersonalAmount] from your CRA tax-year config
/// and persist selected credits + the certification checkbox.
class Td1FederalStep extends StatefulWidget {
  const Td1FederalStep({
    super.key,
    required this.onNext,
    this.basicPersonalAmount = 16129,
  });

  final VoidCallback onNext;
  final double basicPersonalAmount;

  @override
  State<Td1FederalStep> createState() => _Td1FederalStepState();
}

class _Td1FederalStepState extends State<Td1FederalStep> {
  bool _caregiver = false;
  bool _disability = false;
  bool _certify = false;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
            children: [
              const Text(
                'TD1 — Federal',
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                'Your federal personal tax credits. Most crew just take the basic amount.',
                style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
              ),
              const SizedBox(height: 20),
              JhCard(
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Basic personal amount',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        Text(
                          'Set by CRA for 2026',
                          style: TextStyle(
                            fontSize: 12,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                    Text(
                      '\$${widget.basicPersonalAmount.toStringAsFixed(0)}',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 10),
              _CheckRow(
                title: 'Canada caregiver amount',
                subtitle: 'I support a spouse or dependant with a disability',
                value: _caregiver,
                onChanged: (v) => setState(() => _caregiver = v),
              ),
              const SizedBox(height: 10),
              _CheckRow(
                title: 'Disability amount',
                subtitle: 'I have an approved DTC certificate',
                value: _disability,
                onChanged: (v) => setState(() => _disability = v),
              ),
              const SizedBox(height: 16),
              CheckboxListTile(
                value: _certify,
                onChanged: (v) => setState(() => _certify = v ?? false),
                controlAffinity: ListTileControlAffinity.leading,
                contentPadding: EdgeInsets.zero,
                activeColor: AppColors.accent,
                title: const Text(
                  'I certify the information on this TD1 is correct and complete.',
                  style: TextStyle(
                    fontSize: 13,
                    color: AppColors.textSecondary,
                    height: 1.4,
                  ),
                ),
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 26),
          child: JhPrimaryButton(
            label: 'Continue',
            onPressed: _certify ? widget.onNext : null,
          ),
        ),
      ],
    );
  }
}

class _CheckRow extends StatelessWidget {
  const _CheckRow({
    required this.title,
    required this.subtitle,
    required this.value,
    required this.onChanged,
  });
  final String title;
  final String subtitle;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return JhCard(
      onTap: () => onChanged(!value),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      child: Row(
        children: [
          Checkbox(
            value: value,
            onChanged: (v) => onChanged(v ?? false),
            activeColor: AppColors.accent,
          ),
          const SizedBox(width: 4),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
                Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
