import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/app_theme.dart';
import '../../../data/repositories/auth_repository.dart';
import '../../../domain/models/booking.dart';
import '../../../domain/models/schedule.dart';
import '../../../domain/providers/schedule_provider.dart';
import '../../shared/jh_card.dart';
import '../../shared/jh_error_banner.dart';
import '../../shared/jh_primary_button.dart';
import '../../shared/jh_skeleton.dart';
import '../../shared/jh_status_pill.dart';

/// Main schedule screen. Shows today's crew assignment and job list.
/// The Mapbox map + bottom sheet will be layered on top in Phase 8.
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
          data: (schedule) => _ScheduleBody(schedule: schedule, employeeName: emp?.name),
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

class _ScheduleBody extends StatelessWidget {
  const _ScheduleBody({required this.schedule, this.employeeName});
  final DailyScheduleResponse schedule;
  final String? employeeName;

  @override
  Widget build(BuildContext context) {
    if (schedule.assignment == null) {
      return _NoAssignmentView(employeeName: employeeName);
    }

    final bookings = schedule.bookings;
    final completed = bookings.where((b) => b.status == 'completed').length;
    final remaining = bookings.where((b) => b.status != 'completed').length;

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      children: [
        if (employeeName != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Text('Welcome, $employeeName', style: Theme.of(context).textTheme.headlineSmall),
          ),
        _AssignmentCard(assignment: schedule.assignment!, partner: schedule.partner),
        const SizedBox(height: 16),
        _DayStatsRow(total: bookings.length, completed: completed, remaining: remaining),
        const SizedBox(height: 16),
        Text('Jobs', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        if (bookings.isEmpty)
          const _EmptyJobsCard()
        else
          ...bookings.map((b) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: _JobListItem(booking: b),
              )),
        const SizedBox(height: 80),
      ],
    );
  }
}

class _AssignmentCard extends StatelessWidget {
  const _AssignmentCard({required this.assignment, this.partner});
  final CrewAssignment assignment;
  final CrewMember? partner;

  @override
  Widget build(BuildContext context) {
    final driverName = assignment.driver?.firstName ?? assignment.driver?.name ?? 'Unknown';
    final partnerName = partner?.firstName ?? partner?.name ?? 'Solo';

    return JhCard(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.local_shipping_rounded, color: AppColors.accent, size: 28),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Driver: $driverName', style: Theme.of(context).textTheme.titleMedium),
                      if (partner != null)
                        Text('Partner: $partnerName', style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.textSecondary)),
                    ],
                  ),
                ),
              ],
            ),
            if (assignment.uhaulLocation != null) ...[
              const SizedBox(height: 8),
              Text('Depot: ${assignment.uhaulLocation}', style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.textSecondary)),
            ],
          ],
        ),
      ),
    );
  }
}

class _DayStatsRow extends StatelessWidget {
  const _DayStatsRow({required this.total, required this.completed, required this.remaining});
  final int total;
  final int completed;
  final int remaining;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(child: _StatCard(label: 'Total', value: '$total', color: AppColors.textPrimary)),
        const SizedBox(width: 8),
        Expanded(child: _StatCard(label: 'Done', value: '$completed', color: AppColors.statusGreen)),
        const SizedBox(width: 8),
        Expanded(child: _StatCard(label: 'Left', value: '$remaining', color: AppColors.statusAmber)),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({required this.label, required this.value, required this.color});
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return JhCard(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        child: Column(
          children: [
            Text(value, style: Theme.of(context).textTheme.displayLarge?.copyWith(fontSize: 24, color: color)),
            const SizedBox(height: 4),
            Text(label, style: Theme.of(context).textTheme.labelSmall),
          ],
        ),
      ),
    );
  }
}

class _JobListItem extends StatelessWidget {
  const _JobListItem({required this.booking});
  final Booking booking;

  @override
  Widget build(BuildContext context) {
    final statusColor = _statusColor(booking.status);
    final timeStr = booking.timeSlot ?? booking.windowLabel ?? '—';
    final priceStr = booking.totalPrice != null ? '\$${booking.totalPrice!.toStringAsFixed(0)}' : '';

    return JhCard(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(color: AppColors.accent, borderRadius: BorderRadius.circular(12)),
              alignment: Alignment.center,
              child: Text(
                timeStr.substring(0, timeStr.length > 5 ? 5 : timeStr.length),
                style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(booking.name ?? 'Unknown customer', style: Theme.of(context).textTheme.titleMedium),
                  if (booking.address != null)
                    Text(booking.address!, style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.textSecondary), maxLines: 2, overflow: TextOverflow.ellipsis),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                JhStatusPill(label: _statusLabel(booking.status), color: statusColor),
                if (priceStr.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(priceStr, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontFeatures: const [FontFeature.tabularFigures()])),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _statusLabel(String status) {
    switch (status) {
      case 'confirmed':
        return 'Confirmed';
      case 'scheduled':
        return 'Scheduled';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Done';
      default:
        return status[0].toUpperCase() + status.substring(1);
    }
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'completed':
        return AppColors.statusGreen;
      case 'in_progress':
        return AppColors.statusAmber;
      case 'confirmed':
      case 'scheduled':
        return AppColors.statusGray;
      default:
        return AppColors.statusGray;
    }
  }
}

class _EmptyJobsCard extends StatelessWidget {
  const _EmptyJobsCard();

  @override
  Widget build(BuildContext context) {
    return JhCard(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            const Icon(Icons.event_available, size: 32, color: AppColors.textSecondary),
            const SizedBox(height: 8),
            Text('No jobs scheduled for today', style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.textSecondary)),
          ],
        ),
      ),
    );
  }
}

class _NoAssignmentView extends StatelessWidget {
  const _NoAssignmentView({this.employeeName});
  final String? employeeName;

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
          onPressed: () {},
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
