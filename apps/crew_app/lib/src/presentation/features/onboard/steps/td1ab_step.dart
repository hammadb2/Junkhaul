import 'package:flutter/material.dart';
import '../../../../core/app_theme.dart';
import '../../../shared/jh_card.dart';
import '../../../shared/jh_primary_button.dart';

/// Step 4 — Alberta provincial TD1AB, same idea as the federal step.
///
/// TODO(dev): source [basicPersonalAmount] from your Alberta tax-year
/// config and persist selections.
class Td1AbStep extends StatefulWidget {
  const Td1AbStep({super.key, required this.onNext, this.basicPersonalAmount = 21885});

  final VoidCallback onNext;
  final double basicPersonalAmount;

  @override
  State<Td1AbStep> createState() => _Td1AbStepState();
}

class _Td1AbStepState extends State<Td1AbStep> {
  bool _spousal = false;
  bool _certify = false;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
            children: [
              const Text('TD1AB — Alberta', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
              const SizedBox(height: 6),
              const Text('Same idea, provincial version.', style: TextStyle(fontSize: 14, color: AppColors.textSecondary)),
              const SizedBox(height: 20),
              JhCard(
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Basic personal amount', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                        Text('Set by Alberta for 2026', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                      ],
                    ),
                    Text('\$${widget.basicPersonalAmount.toStringAsFixed(0)}',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
                  ],
                ),
              ),
              const SizedBox(height: 10),
              JhCard(
                onTap: () => setState(() => _spousal = !_spousal),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                child: Row(
                  children: [
                    Checkbox(value: _spousal, onChanged: (v) => setState(() => _spousal = v ?? false), activeColor: AppColors.accent),
                    const SizedBox(width: 4),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Spousal or dependant amount', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                          Text('I support a spouse or common-law partner', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              CheckboxListTile(
                value: _certify,
                onChanged: (v) => setState(() => _certify = v ?? false),
                controlAffinity: ListTileControlAffinity.leading,
                contentPadding: EdgeInsets.zero,
                activeColor: AppColors.accent,
                title: const Text('I certify the information on this TD1AB is correct and complete.',
                    style: TextStyle(fontSize: 13, color: AppColors.textSecondary, height: 1.4)),
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 26),
          child: JhPrimaryButton(label: 'Continue', onPressed: _certify ? widget.onNext : null),
        ),
      ],
    );
  }
}
