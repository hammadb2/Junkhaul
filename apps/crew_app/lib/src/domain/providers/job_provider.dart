import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/api/employee_api.dart';
import '../models/booking.dart';

/// The verified step order from the live PWA (app/portal/job/page.js:12-20):
/// En Route → Arrived → Payment → Load Truck → Route → Drop Flow → Signature
///
/// Before/After photos (Section 6.6) are inserted between Arrived and Payment
/// for the "Before" capture, and the "After" capture happens right before
/// Signature.
enum JobStep {
  enRoute,
  arrived,
  beforeAfter,
  payment,
  loadTruck,
  truckFullness,
  routeDecision,
  dropFlow,
  signature,
  done,
}

/// Extension to convert [JobStep] to/from string for query params and persistence.
extension JobStepX on JobStep {
  String get label {
    switch (this) {
      case JobStep.enRoute:
        return 'En Route';
      case JobStep.arrived:
        return 'Arrived';
      case JobStep.beforeAfter:
        return 'Before / After';
      case JobStep.payment:
        return 'Payment';
      case JobStep.loadTruck:
        return 'Load Truck';
      case JobStep.truckFullness:
        return 'Truck Fullness';
      case JobStep.routeDecision:
        return 'Route Decision';
      case JobStep.dropFlow:
        return 'Drop Flow';
      case JobStep.signature:
        return 'Signature';
      case JobStep.done:
        return 'Complete';
    }
  }

  String get name {
    switch (this) {
      case JobStep.enRoute:
        return 'en_route';
      case JobStep.arrived:
        return 'arrived';
      case JobStep.beforeAfter:
        return 'before_after';
      case JobStep.payment:
        return 'payment';
      case JobStep.loadTruck:
        return 'load_truck';
      case JobStep.truckFullness:
        return 'truck_fullness';
      case JobStep.routeDecision:
        return 'route_decision';
      case JobStep.dropFlow:
        return 'drop_flow';
      case JobStep.signature:
        return 'signature';
      case JobStep.done:
        return 'done';
    }
  }

  static JobStep fromName(String? name) {
    switch (name) {
      case 'en_route':
        return JobStep.enRoute;
      case 'arrived':
        return JobStep.arrived;
      case 'before_after':
        return JobStep.beforeAfter;
      case 'payment':
        return JobStep.payment;
      case 'load_truck':
        return JobStep.loadTruck;
      case 'truck_fullness':
        return JobStep.truckFullness;
      case 'route_decision':
        return JobStep.routeDecision;
      case 'drop_flow':
        return JobStep.dropFlow;
      case 'signature':
        return JobStep.signature;
      case 'done':
        return JobStep.done;
      default:
        return JobStep.enRoute;
    }
  }

  /// The next step in the flow.
  JobStep get next {
    switch (this) {
      case JobStep.enRoute:
        return JobStep.arrived;
      case JobStep.arrived:
        return JobStep.beforeAfter;
      case JobStep.beforeAfter:
        return JobStep.payment;
      case JobStep.payment:
        return JobStep.loadTruck;
      case JobStep.loadTruck:
        return JobStep.truckFullness;
      case JobStep.truckFullness:
        return JobStep.routeDecision;
      case JobStep.routeDecision:
        return JobStep.dropFlow;
      case JobStep.dropFlow:
        return JobStep.signature;
      case JobStep.signature:
        return JobStep.done;
      case JobStep.done:
        return JobStep.done;
    }
  }
}

/// Fetches a single booking by ID. The /api/employee/schedule endpoint returns
/// all bookings for the day, so we filter client-side.
final bookingByIdProvider = FutureProvider.family<Booking?, String>((
  ref,
  bookingId,
) async {
  final api = await ref.watch(employeeApiProvider.future);
  final schedule = await api.fetchDailySchedule();
  try {
    return schedule.bookings.firstWhere((b) => b.id == bookingId);
  } catch (_) {
    return null;
  }
});

/// Tracks the current step for a given booking. Uses a simple Provider.family
/// with a [JobStepController] that exposes [value] and mutation methods.
final jobStepProvider = Provider.family<JobStepController, String>((
  ref,
  bookingId,
) {
  final controller = JobStepController(JobStep.enRoute);
  ref.onDispose(controller.dispose);
  return controller;
});

/// Lightweight state holder for the current job step. Uses [ValueNotifier]
/// so widgets can watch it with [ValueListenableBuilder].
class JobStepController extends ValueNotifier<JobStep> {
  JobStepController(JobStep initial) : super(initial);

  void goTo(JobStep step) {
    value = step;
  }

  void advance() {
    value = value.next;
  }
}
