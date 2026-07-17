import 'package:flutter/material.dart';
import '../../../../core/app_theme.dart';
import '../../../../domain/models/job.dart';
import '../../../../domain/models/payment.dart';
import '../../../shared/jh_card.dart';
import '../../../shared/jh_primary_button.dart';
import '../../../shared/jh_text_field.dart';

/// Step 4/9 — "How will the customer pay?" Card-on-file, cash, or an SMS
/// payment link.
///
/// TODO(dev): wire [onConfirm] to your payments integration (Stripe charge
/// for card-on-file, cash reconciliation entry, or SMS link dispatch).
class PaymentStep extends StatefulWidget {
  const PaymentStep({super.key, required this.job, required this.cardLast4, required this.onConfirm});

  final Job job;
  final String cardLast4;
  final void Function(PaymentResult result) onConfirm;

  @override
  State<PaymentStep> createState() => _PaymentStepState();
}

class _PaymentStepState extends State<PaymentStep> {
  PaymentMethod _method = PaymentMethod.cardOnFile;
  final _cashController = TextEditingController();

  @override
  void dispose() {
    _cashController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
            children: [
              Text('How will ${widget.job.customer.name.split(' ').first} pay?',
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
              const SizedBox(height: 6),
              const Text('Balance due', style: TextStyle(fontSize: 14, color: AppColors.textSecondary)),
              Text('\$${widget.job.totalAmount.toStringAsFixed(2)}',
                  style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
              const SizedBox(height: 20),
              JhCard(
                selected: _method == PaymentMethod.cardOnFile,
                onTap: () => setState(() => _method = PaymentMethod.cardOnFile),
                child: _row(Icons.credit_card_outlined, 'Card on file', 'Visa •••• ${widget.cardLast4} — charge on confirm', _method == PaymentMethod.cardOnFile),
              ),
              const SizedBox(height: 10),
              JhCard(
                selected: _method == PaymentMethod.cash,
                onTap: () => setState(() => _method = PaymentMethod.cash),
                child: _row(Icons.payments_outlined, 'Cash', 'Count and confirm on the spot', _method == PaymentMethod.cash),
              ),
              const SizedBox(height: 10),
              JhCard(
                selected: _method == PaymentMethod.smsLink,
                onTap: () => setState(() => _method = PaymentMethod.smsLink),
                child: _row(Icons.sms_outlined, 'Text a payment link', "Customer pays on their own phone", _method == PaymentMethod.smsLink),
              ),
              if (_method == PaymentMethod.cash) ...[
                const SizedBox(height: 14),
                JhTextField(label: 'Cash received', hint: '\$${widget.job.totalAmount.toStringAsFixed(2)}', controller: _cashController, keyboardType: const TextInputType.numberWithOptions(decimal: true)),
              ],
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 26),
          child: JhPrimaryButton(
            label: 'Confirm Payment Method',
            onPressed: () => widget.onConfirm(PaymentResult(
              method: _method,
              amount: widget.job.totalAmount,
              cashReceived: _method == PaymentMethod.cash ? double.tryParse(_cashController.text) : null,
            )),
          ),
        ),
      ],
    );
  }

  Widget _row(IconData icon, String title, String subtitle, bool selected) {
    return Row(
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(color: selected ? const Color(0xFFFFF1E8) : AppColors.bgInput, borderRadius: BorderRadius.circular(10)),
          child: Icon(icon, size: 18, color: selected ? AppColors.accent : AppColors.textSecondary),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
              Text(subtitle, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
            ],
          ),
        ),
        Container(
          width: 20,
          height: 20,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: selected ? AppColors.accent : Colors.transparent,
            border: Border.all(color: selected ? AppColors.accent : AppColors.borderSubtle, width: 2),
          ),
        ),
      ],
    );
  }
}
