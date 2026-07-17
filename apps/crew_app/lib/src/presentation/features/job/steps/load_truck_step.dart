import 'package:flutter/material.dart';
import '../../../../core/app_theme.dart';
import '../../../../domain/models/job.dart';
import '../../../shared/jh_primary_button.dart';

/// Step 5/9 — checklist of items being loaded; the load-bigger-than-booked
/// branch prompts a price update to the customer.
///
/// TODO(dev): persist checked/added items on [onDone]; wire
/// [onSendPriceUpdate] to your pricing/notification service (e.g. an SMS
/// with the new total for the customer to accept).
class LoadTruckStep extends StatefulWidget {
  const LoadTruckStep({
    super.key,
    required this.items,
    required this.onAddFoundItem,
    required this.onDone,
    this.adjustedTotal,
    this.onSendPriceUpdate,
  });

  final List<JobItem> items;
  final VoidCallback onAddFoundItem;
  final VoidCallback onDone;
  final double? adjustedTotal;
  final VoidCallback? onSendPriceUpdate;

  @override
  State<LoadTruckStep> createState() => _LoadTruckStepState();
}

class _LoadTruckStepState extends State<LoadTruckStep> {
  final Set<String> _checked = {};

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
            children: [
              const Text("What's going on the truck", style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
              const SizedBox(height: 4),
              const Text("Check off each item as it's loaded.", style: TextStyle(fontSize: 14, color: AppColors.textSecondary)),
              const SizedBox(height: 16),
              for (final item in widget.items) ...[
                _ItemCheckRow(
                  item: item,
                  checked: _checked.contains(item.id),
                  onChanged: (v) => setState(() => v ? _checked.add(item.id) : _checked.remove(item.id)),
                ),
                const SizedBox(height: 10),
              ],
              OutlinedButton(
                onPressed: widget.onAddFoundItem,
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(double.infinity, 48),
                  side: const BorderSide(color: AppColors.borderSubtle, width: 1.5, style: BorderStyle.solid),
                  foregroundColor: AppColors.accent,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                child: const Text('+ Add item found onsite', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
              ),
              if (widget.adjustedTotal != null) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(color: const Color(0xFFFFF1E8), borderRadius: BorderRadius.circular(16), border: Border.all(color: const Color(0xFFFBD5B5))),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('This load is bigger than quoted', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
                      const SizedBox(height: 4),
                      Text.rich(
                        TextSpan(
                          style: const TextStyle(fontSize: 13, color: AppColors.textSecondary, height: 1.4),
                          children: [
                            const TextSpan(text: 'Suggested new total: '),
                            TextSpan(text: '\$${widget.adjustedTotal!.toStringAsFixed(0)}', style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w700)),
                            const TextSpan(text: '. Send the update to the customer before you finish loading.'),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: widget.onSendPriceUpdate,
                          style: ElevatedButton.styleFrom(backgroundColor: AppColors.accent, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                          child: const Text('Send Price Update to Customer', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 26),
          child: JhPrimaryButton(label: "Truck's Loaded", onPressed: widget.onDone),
        ),
      ],
    );
  }
}

class _ItemCheckRow extends StatelessWidget {
  const _ItemCheckRow({required this.item, required this.checked, required this.onChanged});
  final JobItem item;
  final bool checked;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
      decoration: BoxDecoration(color: AppColors.bgCard, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppColors.borderSubtle)),
      child: Row(
        children: [
          Checkbox(value: checked, onChanged: (v) => onChanged(v ?? false), activeColor: AppColors.accent),
          Expanded(child: Text(item.name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary))),
          Text('×${item.quantity}', style: const TextStyle(fontSize: 13, color: AppColors.textSecondary)),
        ],
      ),
    );
  }
}
