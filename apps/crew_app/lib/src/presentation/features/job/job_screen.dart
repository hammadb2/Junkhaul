import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/app_theme.dart';
import '../../../domain/models/booking.dart';
import '../../../domain/providers/job_provider.dart';
import '../../shared/jh_card.dart';
import '../../shared/jh_error_banner.dart';
import '../../shared/jh_skeleton.dart';
import 'steps/arrived_step.dart';
import 'steps/before_after_step.dart';
import 'steps/drop_flow_step.dart';
import 'steps/en_route_step.dart';
import 'steps/load_truck_step.dart';
import 'steps/payment_step.dart';
import 'steps/route_decision_step.dart';
import 'steps/signature_step.dart';
import 'steps/truck_fullness_step.dart';

/// Full job execution screen. Parameterized by [bookingId].
/// Shows the current step widget based on [jobStepProvider].
class JobScreen extends ConsumerWidget {
  const JobScreen({
    super.key,
    required this.bookingId,
  });

  final String bookingId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final stepController = ref.watch(jobStepProvider(bookingId));
    final bookingAsync = ref.watch(bookingByIdProvider(bookingId));

    return Scaffold(
      appBar: AppBar(
        title: ValueListenableBuilder<JobStep>(
          valueListenable: stepController,
          builder: (context, step, _) => Text(step.label),
        ),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => context.go('/schedule'),
        ),
      ),
      backgroundColor: AppColors.bgBase,
      body: bookingAsync.when(
        data: (booking) {
          if (booking == null) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: JhErrorBanner(message: 'Job not found. It may have been removed.'),
              ),
            );
          }
          return ValueListenableBuilder<JobStep>(
            valueListenable: stepController,
            builder: (context, step, _) {
              return Column(
                children: [
                  _JobStepIndicator(currentStep: step),
                  Expanded(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                      child: _stepWidget(step, booking, stepController),
                    ),
                  ),
                ],
              );
            },
          );
        },
        loading: () => const _JobSkeleton(),
        error: (error, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: JhErrorBanner(
              message: error.toString(),
              onRetry: () => ref.invalidate(bookingByIdProvider(bookingId)),
            ),
          ),
        ),
      ),
    );
  }

  Widget _stepWidget(JobStep step, Booking booking, JobStepController controller) {
    switch (step) {
      case JobStep.enRoute:
        return EnRouteStep(booking: booking, stepController: controller);
      case JobStep.arrived:
        return ArrivedStep(booking: booking, stepController: controller);
      case JobStep.beforeAfter:
        return BeforeAfterStep(booking: booking, stepController: controller);
      case JobStep.payment:
        return PaymentStep(booking: booking, stepController: controller);
      case JobStep.loadTruck:
        return LoadTruckStep(booking: booking, stepController: controller);
      case JobStep.truckFullness:
        return TruckFullnessStep(booking: booking, stepController: controller);
      case JobStep.routeDecision:
        return RouteDecisionStep(booking: booking, stepController: controller);
      case JobStep.dropFlow:
        return DropFlowStep(booking: booking, stepController: controller);
      case JobStep.signature:
        return SignatureStep(booking: booking, stepController: controller);
      case JobStep.done:
        return _JobCompleteCard(booking: booking);
    }
  }
}

/// Horizontal step indicator showing progress through the job flow.
class _JobStepIndicator extends StatelessWidget {
  const _JobStepIndicator({required this.currentStep});
  final JobStep currentStep;

  static const _steps = [
    JobStep.enRoute,
    JobStep.arrived,
    JobStep.beforeAfter,
    JobStep.payment,
    JobStep.loadTruck,
    JobStep.truckFullness,
    JobStep.routeDecision,
    JobStep.dropFlow,
    JobStep.signature,
  ];

  @override
  Widget build(BuildContext context) {
    final currentIndex = _steps.indexOf(currentStep);
    return Container(
      height: 56,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: _steps.length,
        separatorBuilder: (_, _) => const SizedBox(width: 4),
        itemBuilder: (context, i) {
          final isDone = i < currentIndex;
          final isCurrent = i == currentIndex;
          final color = isDone
              ? AppColors.statusGreen
              : isCurrent
                  ? AppColors.accent
                  : AppColors.borderSubtle;

          return Container(
            width: 28,
            height: 4,
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(2),
            ),
          );
        },
      ),
    );
  }
}

class _JobSkeleton extends StatelessWidget {
  const _JobSkeleton();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const JhSkeleton(width: double.infinity, height: 56),
        const SizedBox(height: 16),
        const JhSkeleton(width: double.infinity, height: 120),
        const SizedBox(height: 16),
        const JhSkeleton(width: double.infinity, height: 200),
      ],
    );
  }
}

class _JobCompleteCard extends StatelessWidget {
  const _JobCompleteCard({required this.booking});
  final Booking booking;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: JhCard(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.check_circle_rounded, size: 56, color: AppColors.statusGreen),
              const SizedBox(height: 16),
              Text('Job Complete!', style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: 8),
              Text(
                booking.name ?? 'Booking',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.textSecondary),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
