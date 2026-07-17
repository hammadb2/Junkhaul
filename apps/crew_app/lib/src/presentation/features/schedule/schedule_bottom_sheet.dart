import 'package:flutter/material.dart';
import '../../../core/app_theme.dart';
import '../../../domain/models/job.dart';
import '../../shared/jh_bottom_sheet_handle.dart';
import '../../shared/jh_skeleton.dart';
import '../../shared/jh_status_pill.dart';

/// Draggable sheet over the map: greeting, job count, each job as a card,
/// and the empty-day state.
///
/// TODO(dev): drive [jobs] from your schedule repository/provider; this
/// widget renders whatever list it's given (including empty) and never
/// invents sample data itself.
class ScheduleBottomSheet extends StatelessWidget {
  const ScheduleBottomSheet({
    super.key,
    required this.crewFirstName,
    required this.jobs,
    required this.isLoading,
    required this.onSelectJob,
    required this.scrollController,
  });

  final String crewFirstName;
  final List<Job> jobs;
  final bool isLoading;
  final ValueChanged<Job> onSelectJob;
  final ScrollController scrollController;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.bgCard,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        boxShadow: [
          BoxShadow(
            color: Color(0x14000000),
            blurRadius: 16,
            offset: Offset(0, -4),
          ),
        ],
      ),
      child: Column(
        children: [
          const JhBottomSheetHandle(),
          Expanded(
            child: ListView(
              controller: scrollController,
              padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
              children: [
                if (isLoading) ...[
                  const JhSkeleton(width: 160, height: 18),
                  const SizedBox(height: 14),
                  const JhSkeletonCard(),
                  const SizedBox(height: 12),
                  const JhSkeletonCard(),
                ] else if (jobs.isEmpty)
                  const _EmptyState()
                else ...[
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Welcome, $crewFirstName',
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            Text(
                              '${jobs.length} job${jobs.length == 1 ? '' : 's'} today',
                              style: const TextStyle(
                                fontSize: 13,
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  for (final job in jobs) ...[
                    _JobCard(job: job, onTap: () => onSelectJob(job)),
                    const SizedBox(height: 12),
                  ],
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 40),
      child: Column(
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: const BoxDecoration(
              color: AppColors.bgInput,
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.checklist_rtl_rounded,
              color: AppColors.statusGray,
              size: 28,
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'No jobs scheduled today',
            style: TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            'Enjoy the day off — dispatch will text you if anything opens up. Check back tomorrow morning.',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 14,
              color: AppColors.textSecondary,
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }
}

class _JobCard extends StatelessWidget {
  const _JobCard({required this.job, required this.onTap});

  final Job job;
  final VoidCallback onTap;

  (String, JhPillTone) get _statusLabel {
    switch (job.status) {
      case JobStatus.confirmed:
        return ('Confirmed', JhPillTone.amber);
      case JobStatus.inProgress:
        return ('In Progress', JhPillTone.green);
      case JobStatus.scheduled:
        return ('Scheduled', JhPillTone.gray);
      case JobStatus.complete:
        return ('Complete', JhPillTone.green);
    }
  }

  String get _loadLabel {
    switch (job.loadSize) {
      case LoadSize.quarter:
        return 'Quarter load';
      case LoadSize.half:
        return 'Half load';
      case LoadSize.threeQuarter:
        return 'Three-quarter load';
      case LoadSize.full:
        return 'Full load';
    }
  }

  @override
  Widget build(BuildContext context) {
    final (label, tone) = _statusLabel;
    final time = TimeOfDay.fromDateTime(job.scheduledTime).format(context);
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.bgCard,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: job.status == JobStatus.confirmed
                ? AppColors.accent
                : AppColors.borderSubtle,
            width: job.status == JobStatus.confirmed ? 1.5 : 1,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    '$time · ${job.customer.name}',
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
                JhStatusPill(label: label, tone: tone),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              job.customer.address,
              style: const TextStyle(
                fontSize: 13,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              '$_loadLabel · \$${job.quotedAmount.toStringAsFixed(0)}',
              style: const TextStyle(
                fontSize: 13,
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
