import 'package:flutter/material.dart';

import '../../../core/app_theme.dart';
import '../../../domain/models/booking.dart';
import '../../../domain/models/schedule.dart';
import '../../shared/jh_card.dart';
import '../../shared/jh_status_pill.dart';

/// Draggable bottom sheet that overlays the map showing the job list.
/// Has three snap sizes: collapsed (just header), half (header + stats + few jobs),
/// and expanded (full job list).
class ScheduleBottomSheet extends StatefulWidget {
  const ScheduleBottomSheet({
    super.key,
    required this.schedule,
    this.employeeName,
    required this.onJobTap,
  });

  final DailyScheduleResponse schedule;
  final String? employeeName;
  final ValueChanged<Booking> onJobTap;

  @override
  State<ScheduleBottomSheet> createState() => _ScheduleBottomSheetState();
}

class _ScheduleBottomSheetState extends State<ScheduleBottomSheet> {
  final _dragController = DraggableScrollableController();
  static const _minSnap = 0.12;
  static const _halfSnap = 0.5;
  static const _maxSnap = 0.92;

  @override
  void dispose() {
    _dragController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bookings = widget.schedule.bookings;
    final completed = bookings.where((b) => b.status == 'completed').length;
    final remaining = bookings.where((b) => b.status != 'completed').length;

    return NotificationListener<DraggableScrollableNotification>(
      onNotification: (_) => true,
      child: DraggableScrollableSheet(
        controller: _dragController,
        initialChildSize: _halfSnap,
        snap: true,
        snapSizes: const [_minSnap, _maxSnap],
        minChildSize: _minSnap,
        maxChildSize: _maxSnap,
        builder: (context, scrollController) {
          return Container(
            decoration: const BoxDecoration(
              color: AppColors.bgBase,
              borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
            ),
            child: CustomScrollView(
              controller: scrollController,
              slivers: [
                // Drag handle
                SliverToBoxAdapter(
                  child: Center(
                    child: Container(
                      margin: const EdgeInsets.symmetric(vertical: 8),
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: AppColors.borderSubtle,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                ),
                // Header: assignment + stats
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                    child: _SheetHeader(
                      schedule: widget.schedule,
                      employeeName: widget.employeeName,
                      total: bookings.length,
                      completed: completed,
                      remaining: remaining,
                    ),
                  ),
                ),
                // Job list
                if (bookings.isEmpty)
                  const SliverToBoxAdapter(
                    child: Padding(
                      padding: EdgeInsets.all(32),
                      child: Center(
                        child: Text('No jobs scheduled for today'),
                      ),
                    ),
                  )
                else
                  SliverPadding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    sliver: SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (context, index) {
                          final b = bookings[index];
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: _SheetJobItem(
                              booking: b,
                              onTap: () => widget.onJobTap(b),
                            ),
                          );
                        },
                        childCount: bookings.length,
                      ),
                    ),
                  ),
                const SliverPadding(padding: EdgeInsets.only(bottom: 32)),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _SheetHeader extends StatelessWidget {
  const _SheetHeader({
    required this.schedule,
    this.employeeName,
    required this.total,
    required this.completed,
    required this.remaining,
  });

  final DailyScheduleResponse schedule;
  final String? employeeName;
  final int total;
  final int completed;
  final int remaining;

  @override
  Widget build(BuildContext context) {
    final assignment = schedule.assignment;
    final driverName = assignment?.driver?.firstName ?? assignment?.driver?.name ?? 'Unknown';
    final partnerName = schedule.partner?.firstName ?? schedule.partner?.name ?? 'Solo';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (employeeName != null)
          Text('Welcome, $employeeName', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 8),
        Row(
          children: [
            const Icon(Icons.local_shipping_rounded, color: AppColors.accent, size: 20),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'Driver: $driverName · Partner: $partnerName',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            _MiniStat(label: 'Total', value: '$total', color: AppColors.textPrimary),
            const SizedBox(width: 8),
            _MiniStat(label: 'Done', value: '$completed', color: AppColors.statusGreen),
            const SizedBox(width: 8),
            _MiniStat(label: 'Left', value: '$remaining', color: AppColors.statusAmber),
          ],
        ),
        const SizedBox(height: 8),
        Text('Jobs', style: Theme.of(context).textTheme.titleMedium),
      ],
    );
  }
}

class _MiniStat extends StatelessWidget {
  const _MiniStat({required this.label, required this.value, required this.color});
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
        decoration: BoxDecoration(
          color: AppColors.bgCard,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            Text(value, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color)),
            const SizedBox(height: 2),
            Text(label, style: Theme.of(context).textTheme.labelSmall),
          ],
        ),
      ),
    );
  }
}

class _SheetJobItem extends StatelessWidget {
  const _SheetJobItem({required this.booking, required this.onTap});
  final Booking booking;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final statusColor = _statusColor(booking.status);
    final timeStr = booking.timeSlot ?? booking.windowLabel ?? '—';
    final priceStr = booking.totalPrice != null ? '\$${booking.totalPrice!.toStringAsFixed(0)}' : '';

    return GestureDetector(
      onTap: onTap,
      child: JhCard(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(color: AppColors.accent, borderRadius: BorderRadius.circular(10)),
                alignment: Alignment.center,
                child: Text(
                  timeStr.length > 5 ? timeStr.substring(0, 5) : timeStr,
                  style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(booking.name ?? 'Unknown customer', style: Theme.of(context).textTheme.titleMedium),
                    if (booking.address != null)
                      Text(
                        booking.address!,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.textSecondary),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
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
                    Text(
                      priceStr,
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            fontFeatures: const [FontFeature.tabularFigures()],
                          ),
                    ),
                  ],
                ],
              ),
            ],
          ),
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
      default:
        return AppColors.statusGray;
    }
  }
}
