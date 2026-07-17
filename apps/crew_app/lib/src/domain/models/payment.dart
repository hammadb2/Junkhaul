enum PaymentMethod { cardOnFile, cash, smsLink }

/// Result of confirming payment on [PaymentStep].
///
/// TODO(dev): wire to your payments/Stripe (or similar) integration —
/// this is the shape the UI hands back, not a payment implementation.
class PaymentResult {
  const PaymentResult({
    required this.method,
    required this.amount,
    this.cashReceived,
  });

  final PaymentMethod method;
  final double amount;
  final double? cashReceived;
}
