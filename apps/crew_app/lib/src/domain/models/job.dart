import 'customer.dart';

enum JobStatus { confirmed, inProgress, scheduled, complete }

enum LoadSize { quarter, half, threeQuarter, full }

/// A single line item being loaded/logged for a job (e.g. "Sectional couch").
class JobItem {
  const JobItem({
    required this.id,
    required this.name,
    this.quantity = 1,
    this.condition,
    this.photoUrl,
  });

  final String id;
  final String name;
  final int quantity;
  final ItemCondition? condition;
  final String? photoUrl;

  JobItem copyWith({
    int? quantity,
    ItemCondition? condition,
    String? photoUrl,
  }) {
    return JobItem(
      id: id,
      name: name,
      quantity: quantity ?? this.quantity,
      condition: condition ?? this.condition,
      photoUrl: photoUrl ?? this.photoUrl,
    );
  }
}

enum ItemCondition { good, minorDamage, majorDamage }

/// A scheduled job for the day.
///
/// TODO(dev): wire this up to your existing job/dispatch model & repository.
/// Nothing in the UI layer should construct a [Job] with hardcoded content —
/// screens receive one via constructor/provider from real data.
class Job {
  const Job({
    required this.id,
    required this.customer,
    required this.scheduledTime,
    required this.status,
    required this.loadSize,
    required this.quotedAmount,
    this.items = const [],
    this.notes,
    this.adjustedAmount,
  });

  final String id;
  final Customer customer;
  final DateTime scheduledTime;
  final JobStatus status;
  final LoadSize loadSize;
  final double quotedAmount;
  final List<JobItem> items;
  final String? notes;
  final double? adjustedAmount;

  double get totalAmount => adjustedAmount ?? quotedAmount;

  Job copyWithItems(List<JobItem> items) => Job(
    id: id,
    customer: customer,
    scheduledTime: scheduledTime,
    status: status,
    loadSize: loadSize,
    quotedAmount: quotedAmount,
    items: items,
    notes: notes,
    adjustedAmount: adjustedAmount,
  );

  Job copyWithAmount(double? adjusted) => Job(
    id: id,
    customer: customer,
    scheduledTime: scheduledTime,
    status: status,
    loadSize: loadSize,
    quotedAmount: quotedAmount,
    items: items,
    notes: notes,
    adjustedAmount: adjusted,
  );
}
