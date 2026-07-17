import 'booking.dart';
import 'job.dart';
import 'customer.dart';
import 'payment.dart';

/// Maps the existing Freezed [Booking] model to the thin [Job] model
/// used by the redesigned UI widgets.
extension BookingToJob on Booking {
  Job toJob() => Job(
        id: id,
        customer: Customer(
          id: id,
          name: name ?? 'Unknown',
          address: address ?? 'No address',
          phone: phone,
        ),
        scheduledTime: _parseJobDateTime(jobDate, windowStart),
        status: _mapStatus(status),
        loadSize: _mapLoadSize(loadSize),
        quotedAmount: totalPrice ?? 0,
        items: itemizedItems
            .map((e) => JobItem(
                  id: e.name ?? e.description ?? '',
                  name: e.name ?? e.description ?? 'Item',
                  quantity: e.quantity ?? 1,
                ))
            .toList(),
        notes: notes,
        adjustedAmount: balanceDue != null && balanceDue! < (totalPrice ?? 0)
            ? balanceDue
            : null,
      );

  static DateTime _parseJobDateTime(String? jobDate, String? windowStart) {
    if (jobDate == null) return DateTime.now();
    final dateStr = windowStart != null ? '$jobDate $windowStart' : jobDate;
    return DateTime.tryParse(dateStr) ?? DateTime.now();
  }

  static JobStatus _mapStatus(String status) {
    switch (status) {
      case 'completed':
        return JobStatus.complete;
      case 'in_progress':
      case 'arrived':
      case 'en_route':
        return JobStatus.inProgress;
      case 'scheduled':
        return JobStatus.scheduled;
      default:
        return JobStatus.confirmed;
    }
  }

  static LoadSize _mapLoadSize(String? loadSize) {
    switch (loadSize?.toLowerCase()) {
      case 'quarter':
        return LoadSize.quarter;
      case 'half':
        return LoadSize.half;
      case 'three_quarter':
      case 'three-quarter':
      case '3/4':
        return LoadSize.threeQuarter;
      case 'full':
        return LoadSize.full;
      default:
        return LoadSize.full;
    }
  }
}

/// Maps a [PaymentResult] to the API payload for the payment endpoint.
Map<String, dynamic> paymentResultToApiPayload(PaymentResult result, String bookingId) {
  return {
    'booking_id': bookingId,
    'method': result.method.name,
    'amount': result.amount,
    if (result.cashReceived != null) 'cash_received': result.cashReceived,
  };
}
