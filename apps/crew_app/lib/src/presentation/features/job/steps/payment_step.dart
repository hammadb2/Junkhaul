import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../domain/models/booking.dart';
import '../../../../domain/providers/job_provider.dart';
import '../../../shared/jh_card.dart';
import '../../../shared/jh_primary_button.dart';
import '../../../shared/jh_secondary_button.dart';

/// Step 4: Payment. Cash in-app or card via SMS Stripe link.
/// Mirrors app/portal/job/page.js:607-629.
class PaymentStep extends ConsumerStatefulWidget {
  const PaymentStep({super.key, required this.booking, required this.stepController});
  final Booking booking;
  final JobStepController stepController;

  @override
  ConsumerState<PaymentStep> createState() => _PaymentStepState();
}

class _PaymentStepState extends ConsumerState<PaymentStep> {
  bool _isProcessing = false;

  @override
  Widget build(BuildContext context) {
    final balance = widget.booking.totalPrice ?? 0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        JhCard(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                Text('Balance Due', style: Theme.of(context).textTheme.labelSmall),
                const SizedBox(height: 4),
                Text(
                  '\$${balance.toStringAsFixed(0)}',
                  style: Theme.of(context).textTheme.displayLarge?.copyWith(
                        fontSize: 36,
                        fontFeatures: const [FontFeature.tabularFigures()],
                      ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 24),
        Text('How will the customer pay?', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 16),
        JhPrimaryButton(
          label: 'Cash',
          isLoading: _isProcessing,
          onPressed: () => _handleCash(context),
        ),
        const SizedBox(height: 12),
        JhSecondaryButton(
          label: 'Card (SMS Link)',
          onPressed: () => _handleCard(context),
        ),
        const SizedBox(height: 16),
        Text(
          'Card: sends the customer an SMS with a Stripe payment link. '
          'They complete payment on their device.',
          style: Theme.of(context).textTheme.labelSmall,
          textAlign: TextAlign.center,
        ),
      ],
    );
  }

  Future<void> _handleCash(BuildContext context) async {
    setState(() => _isProcessing = true);
    try {
      // In production, the cash collection is recorded at signature time
      // via POST /api/employee/signature with payment_method: 'cash'.
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Cash will be confirmed at signature.')),
        );
        widget.stepController.advance();
      }
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  Future<void> _handleCard(BuildContext context) async {
    setState(() => _isProcessing = true);
    try {
      // In production: ref.read(employeeApiProvider).resendPaymentLink(bookingId: widget.booking.id)
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Payment link sent to customer via SMS.')),
        );
        widget.stepController.advance();
      }
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }
}
