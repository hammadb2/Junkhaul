import 'package:flutter/material.dart';
import '../../../../core/app_theme.dart';
import '../../../../domain/models/job.dart';
import '../../../shared/jh_error_banner.dart';
import '../../../shared/jh_primary_button.dart';
import '../../../shared/jh_secondary_button.dart';
import '../../../shared/jh_status_pill.dart';

/// Step 2/9 — "Item Conditions": log what's actually there on arrival, or
/// handle the customer-not-home branch.
///
/// TODO(dev): persist per-item condition + notes on [onConfirm]; wire the
/// not-home actions (call, leave notice, wait) to real telephony/notice
/// flows.
class ArrivedStep extends StatefulWidget {
  const ArrivedStep({
    super.key,
    required this.job,
    required this.onConfirm,
    required this.onCallCustomer,
    required this.onLeaveNotice,
    required this.onWait,
  });

  final Job job;
  final VoidCallback onConfirm;
  final VoidCallback onCallCustomer;
  final VoidCallback onLeaveNotice;
  final VoidCallback onWait;

  @override
  State<ArrivedStep> createState() => _ArrivedStepState();
}

class _ArrivedStepState extends State<ArrivedStep> {
  bool _customerHome = true;

  (String, JhPillTone) _conditionLabel(ItemCondition? c) {
    switch (c) {
      case ItemCondition.good:
      case null:
        return ('Good', JhPillTone.green);
      case ItemCondition.minorDamage:
        return ('Minor damage', JhPillTone.amber);
      case ItemCondition.majorDamage:
        return ('Major damage', JhPillTone.red);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
            children: [
              Row(
                children: [
                  Expanded(
                    child: ChoiceChip(
                      label: const Text('Customer home'),
                      selected: _customerHome,
                      onSelected: (_) => setState(() => _customerHome = true),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: ChoiceChip(
                      label: const Text('Not home'),
                      selected: !_customerHome,
                      onSelected: (_) => setState(() => _customerHome = false),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              if (_customerHome) ...[
                const Text(
                  'Log what\'s here',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Note condition before you touch anything.',
                  style: TextStyle(
                    fontSize: 14,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 18),
                for (final item in widget.job.items) ...[
                  _ItemRow(item: item, label: _conditionLabel(item.condition)),
                  const SizedBox(height: 10),
                ],
                const SizedBox(height: 8),
                const Text(
                  'Notes',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 6),
                const TextField(
                  maxLines: 3,
                  decoration: InputDecoration(
                    hintText: 'Anything worth flagging?',
                  ),
                ),
              ] else
                JhErrorBanner(
                  tone: JhBannerTone.warning,
                  title: 'No answer at the door',
                  message:
                      "${widget.job.customer.name} isn't answering. Try one of these before you leave.",
                ),
              if (!_customerHome) ...[
                const SizedBox(height: 16),
                JhSecondaryButton(
                  label: 'Call ${widget.job.customer.name}',
                  onPressed: widget.onCallCustomer,
                ),
                const SizedBox(height: 10),
                JhSecondaryButton(
                  label: 'Leave Notice & Photo',
                  onPressed: widget.onLeaveNotice,
                ),
                const SizedBox(height: 10),
                JhSecondaryButton(
                  label: 'Wait 5 More Minutes',
                  onPressed: widget.onWait,
                ),
              ],
            ],
          ),
        ),
        if (_customerHome)
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 14, 20, 26),
            child: JhPrimaryButton(
              label: 'Confirm',
              onPressed: widget.onConfirm,
            ),
          ),
      ],
    );
  }
}

class _ItemRow extends StatelessWidget {
  const _ItemRow({required this.item, required this.label});
  final JobItem item;
  final (String, JhPillTone) label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.bgCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.borderSubtle),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            item.name,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
          JhStatusPill(label: label.$1, tone: label.$2),
        ],
      ),
    );
  }
}
