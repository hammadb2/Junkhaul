import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/app_theme.dart';
import '../../../data/api/employee_api.dart';
import '../../../data/offline/connectivity_provider.dart';
import '../../../data/offline/offline_queue_service.dart';
import '../../../domain/models/booking.dart';
import '../../../domain/models/schedule.dart';
import '../../../domain/providers/schedule_provider.dart';
import '../../shared/jh_primary_button.dart';
import '../../shared/jh_sync_banner.dart';

/// Daily closeout screen — shown at the end of the shift to summarize the
/// day's work and clock out.
///
/// Shows:
/// - Jobs completed today (count + total revenue)
/// - Cash collected on-site
/// - Hours worked (from shift clock in/out)
/// - Pending items (offline queue depth)
/// - Clock out button
class CloseoutScreen extends ConsumerStatefulWidget {
  const CloseoutScreen({super.key});

  @override
  ConsumerState<CloseoutScreen> createState() => _CloseoutScreenState();
}

class _CloseoutScreenState extends ConsumerState<CloseoutScreen> {
  bool _clockingOut = false;

  @override
  Widget build(BuildContext context) {
    final scheduleAsync = ref.watch(todayScheduleProvider);
    final connectivityAsync = ref.watch(isOnlineProvider);
    final queueAsync = ref.watch(offlineQueueProvider);

    final isOnline = connectivityAsync.maybeWhen(data: (o) => o, orElse: () => true);
    final queuedCount = queueAsync.maybeWhen(data: (q) => q.pending, orElse: () => 0);
    final syncState = isOnline ? SyncState.online : SyncState.offline;

    return Scaffold(
      backgroundColor: AppColors.bgBase,
      body: SafeArea(
        child: Column(
          children: [
            JhSyncBanner(state: syncState, queuedActionCount: queuedCount),
            Expanded(
              child: scheduleAsync.when(
                loading: () => const Center(child: CircularProgressIndicator(color: AppColors.accent)),
                error: (_, __) => _buildError(context),
                data: (schedule) => _buildContent(context, schedule, queuedCount),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildError(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text('Could not load today\'s summary'),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () => ref.invalidate(todayScheduleProvider),
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  Widget _buildContent(BuildContext context, DailyScheduleResponse schedule, int queuedCount) {
    final completedJobs = schedule.bookings.where((b) => b.status == 'completed').toList();
    final inProgressJobs = schedule.bookings.where((b) => b.status == 'in_progress').toList();
    final totalRevenue = completedJobs.fold<double>(0, (sum, b) => sum + (b.totalPrice ?? 0));
    final completedSessions = schedule.completedSessions;
    final totalJobMinutes = completedSessions.fold<int>(0, (sum, s) => sum + (s.durationMinutes ?? 0));
    final openShift = schedule.openShift;

    // Calculate shift hours from clock-in time (if still open).
    double? shiftHours;
    if (openShift != null) {
      final clockIn = openShift.clockInAt;
      if (clockIn != null) {
        shiftHours = DateTime.now().difference(clockIn).inMinutes / 60.0;
      }
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 32),
      children: [
        // Header.
        const Text(
          'Daily Closeout',
          style: TextStyle(fontSize: 26, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
        ),
        const SizedBox(height: 4),
        Text(
          _formatDate(DateTime.now()),
          style: const TextStyle(fontSize: 14, color: AppColors.textSecondary),
        ),
        const SizedBox(height: 24),

        // Summary cards.
        _SummaryCard(
          icon: Icons.check_circle_outline,
          label: 'Jobs Completed',
          value: '${completedJobs.length}',
          subtitle: inProgressJobs.isNotEmpty ? '${inProgressJobs.length} in progress' : null,
          color: AppColors.statusGreen,
        ),
        const SizedBox(height: 12),
        _SummaryCard(
          icon: Icons.payments_outlined,
          label: 'Total Revenue',
          value: '\$${totalRevenue.toStringAsFixed(2)}',
          subtitle: 'From ${completedJobs.length} completed job${completedJobs.length == 1 ? '' : 's'}',
          color: AppColors.accent,
        ),
        const SizedBox(height: 12),
        _SummaryCard(
          icon: Icons.schedule_outlined,
          label: 'Hours Worked',
          value: shiftHours != null ? '${shiftHours.toStringAsFixed(1)}h' : '—',
          subtitle: openShift != null ? 'Shift still open' : 'No active shift',
          color: AppColors.textPrimary,
        ),
        const SizedBox(height: 12),
        _SummaryCard(
          icon: Icons.work_history_outlined,
          label: 'Job Time Logged',
          value: '${(totalJobMinutes / 60).toStringAsFixed(1)}h',
          subtitle: '${completedSessions.length} session${completedSessions.length == 1 ? '' : 's'}',
          color: AppColors.textPrimary,
        ),

        // Pending items.
        if (queuedCount > 0) ...[
          const SizedBox(height: 24),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFFFEF6E7),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.statusAmber),
            ),
            child: Row(
              children: [
                const Icon(Icons.cloud_off_rounded, color: AppColors.statusAmber, size: 20),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    '$queuedCount action${queuedCount == 1 ? '' : 's'} pending sync',
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.statusAmber),
                  ),
                ),
              ],
            ),
          ),
        ],

        // Completed jobs list.
        if (completedJobs.isNotEmpty) ...[
          const SizedBox(height: 24),
          const Text(
            'Completed Jobs',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
          ),
          const SizedBox(height: 12),
          ...completedJobs.map((b) => _JobRow(booking: b)),
        ],

        const SizedBox(height: 32),

        // Clock out button.
        if (openShift != null)
          JhPrimaryButton(
            label: _clockingOut ? 'Clocking out…' : 'Clock Out & Finish',
            icon: Icons.logout_rounded,
            onPressed: _clockingOut ? null : () => _clockOut(context),
          )
        else
          JhPrimaryButton(
            label: 'Back to Schedule',
            icon: Icons.arrow_back_rounded,
            onPressed: () => context.go('/schedule'),
          ),
      ],
    );
  }

  Future<void> _clockOut(BuildContext context) async {
    setState(() => _clockingOut = true);
    try {
      final api = await ref.read(employeeApiProvider.future);
      await api.clockOut();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Clocked out. Have a great evening!'), duration: Duration(seconds: 3)),
        );
        context.go('/schedule');
      }
    } catch (e) {
      if (mounted) {
        setState(() => _clockingOut = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to clock out: $e'),
            backgroundColor: AppColors.statusRed,
          ),
        );
      }
    }
  }

  String _formatDate(DateTime d) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return '${days[d.weekday - 1]}, ${months[d.month - 1]} ${d.day}';
  }
}

/// A summary card with an icon, label, value, and optional subtitle.
class _SummaryCard extends StatelessWidget {
  const _SummaryCard({
    required this.icon,
    required this.label,
    required this.value,
    this.subtitle,
    required this.color,
  });

  final IconData icon;
  final String label;
  final String value;
  final String? subtitle;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.bgCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.borderSubtle),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 20, color: color),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: const TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
                if (subtitle != null)
                  Text(subtitle!, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// A row showing a completed job.
class _JobRow extends StatelessWidget {
  const _JobRow({required this.booking});
  final Booking booking;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.bgCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderSubtle),
      ),
      child: Row(
        children: [
          const Icon(Icons.check_circle, size: 18, color: AppColors.statusGreen),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  booking.name ?? 'Customer',
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                ),
                if (booking.address != null)
                  Text(
                    booking.address!,
                    style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
              ],
            ),
          ),
          if (booking.totalPrice != null)
            Text(
              '\$${booking.totalPrice!.toStringAsFixed(0)}',
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
            ),
        ],
      ),
    );
  }
}
