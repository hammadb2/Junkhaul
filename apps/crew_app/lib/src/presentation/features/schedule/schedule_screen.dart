import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/app_theme.dart';
import '../../../data/repositories/auth_repository.dart';
import '../../../domain/models/booking.dart';
import '../../../domain/models/schedule.dart';
import '../../../domain/providers/schedule_provider.dart';
import '../../shared/jh_error_banner.dart';
import '../../shared/jh_primary_button.dart';
import '../../shared/jh_skeleton.dart';
import 'schedule_bottom_sheet.dart';
import 'schedule_map.dart';

/// Main schedule screen. Shows a Mapbox map with job markers overlaid by a
/// draggable bottom sheet containing the crew assignment, day stats, and job list.
class ScheduleScreen extends ConsumerWidget {
  const ScheduleScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authRepositoryProvider);
    final emp = auth.employee;
    final scheduleAsync = ref.watch(todayScheduleProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Today\'s Route'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh',
            onPressed: () => ref.invalidate(todayScheduleProvider),
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Sign Out',
            onPressed: () => ref.read(authRepositoryProvider.notifier).logout(),
          ),
        ],
      ),
      backgroundColor: AppColors.bgBase,
      body: RefreshIndicator(
        color: AppColors.accent,
        onRefresh: () => ref.refresh(todayScheduleProvider.future),
        child: scheduleAsync.when(
          data: (schedule) => _ScheduleMapBody(
            schedule: schedule,
            employeeName: emp?.name,
            onJobTap: (booking) => context.go('/job/${booking.id}'),
            onRefresh: () => ref.invalidate(todayScheduleProvider),
          ),
          loading: () => const _ScheduleSkeleton(),
          error: (error, _) => _ScheduleError(
            message: error.toString(),
            onRetry: () => ref.invalidate(todayScheduleProvider),
          ),
        ),
      ),
    );
  }
}

/// Stack of map + draggable bottom sheet.
class _ScheduleMapBody extends StatelessWidget {
  const _ScheduleMapBody({
    required this.schedule,
    this.employeeName,
    required this.onJobTap,
    required this.onRefresh,
  });

  final DailyScheduleResponse schedule;
  final String? employeeName;
  final ValueChanged<Booking> onJobTap;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) {
    // If no assignment, show the no-assignment view (no map needed).
    if (schedule.assignment == null) {
      return _NoAssignmentView(employeeName: employeeName, onRefresh: onRefresh);
    }

    return Stack(
      children: [
        // Map fills the screen
        Positioned.fill(
          child: ScheduleMap(
            bookings: schedule.bookings,
            truckPosition: null, // In production, feed from location provider
          ),
        ),
        // Draggable bottom sheet overlays the map
        Positioned.fill(
          child: ScheduleBottomSheet(
            schedule: schedule,
            employeeName: employeeName,
            onJobTap: onJobTap,
          ),
        ),
      ],
    );
  }
}

class _NoAssignmentView extends StatelessWidget {
  const _NoAssignmentView({this.employeeName, required this.onRefresh});
  final String? employeeName;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        const SizedBox(height: 48),
        const Icon(Icons.calendar_today_outlined, size: 56, color: AppColors.textSecondary),
        const SizedBox(height: 16),
        Text(
          employeeName != null ? 'Hi $employeeName' : 'Hi',
          style: Theme.of(context).textTheme.headlineSmall,
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 8),
        Text(
          'You have no crew assignment for today.\nCheck back later or contact your manager.',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.textSecondary),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 24),
        JhPrimaryButton(
          label: 'Refresh',
          onPressed: onRefresh,
        ),
      ],
    );
  }
}

class _ScheduleSkeleton extends StatelessWidget {
  const _ScheduleSkeleton();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      children: [
        const JhSkeleton(width: double.infinity, height: 80),
        const SizedBox(height: 16),
        Row(
          children: const [
            Expanded(child: JhSkeleton(width: double.infinity, height: 60)),
            SizedBox(width: 8),
            Expanded(child: JhSkeleton(width: double.infinity, height: 60)),
            SizedBox(width: 8),
            Expanded(child: JhSkeleton(width: double.infinity, height: 60)),
          ],
        ),
        const SizedBox(height: 16),
        ...List.generate(4, (_) => const Padding(
              padding: EdgeInsets.only(bottom: 8),
              child: JhSkeleton(width: double.infinity, height: 72),
            )),
      ],
    );
  }
}

class _ScheduleError extends StatelessWidget {
  const _ScheduleError({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        const SizedBox(height: 48),
        JhErrorBanner(message: message, onRetry: onRetry),
      ],
    );
  }
}
