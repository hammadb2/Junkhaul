import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/app_theme.dart';
import '../../../data/offline/connectivity_provider.dart';
import '../../../data/repositories/auth_repository.dart';
import '../../../domain/models/booking.dart';
import '../../../domain/models/job.dart';
import '../../../domain/models/job_mappers.dart';
import '../../../domain/providers/schedule_provider.dart';
import '../../shared/jh_sync_banner.dart';
import 'schedule_map.dart';
import 'schedule_bottom_sheet.dart';

/// The crew's home base — today's job list over the live map, pull-to-
/// refresh, and the global sync indicator. Wired to [todayScheduleProvider].
class ScheduleScreen extends ConsumerWidget {
  const ScheduleScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authRepositoryProvider);
    final scheduleAsync = ref.watch(todayScheduleProvider);
    final connectivityAsync = ref.watch(isOnlineProvider);

    final crewFirstName = _extractFirstName(auth.employee?.name);
    final isLoading = scheduleAsync.isLoading;
    final bookings = scheduleAsync.maybeWhen(
      data: (schedule) => schedule.bookings,
      orElse: () => <Booking>[],
    );
    final jobs = bookings.map((b) => b.toJob()).toList();

    final isOnline = connectivityAsync.maybeWhen(
      data: (online) => online,
      orElse: () => true,
    );
    final syncState = isLoading
        ? SyncState.syncing
        : isOnline
            ? SyncState.online
            : SyncState.offline;

    return _ScheduleBody(
      crewFirstName: crewFirstName,
      jobs: jobs,
      bookings: bookings,
      isLoading: isLoading,
      syncState: syncState,
      onRefresh: () async {
        ref.invalidate(todayScheduleProvider);
        await ref.read(todayScheduleProvider.future);
      },
      onSelectJob: (job) => context.push('/job/${job.id}'),
      onSignOut: () async {
        await ref.read(authRepositoryProvider.notifier).logout();
      },
    );
  }

  String _extractFirstName(String? fullName) {
    if (fullName == null || fullName.isEmpty) return 'Crew';
    return fullName.trim().split(' ').first;
  }
}

class _ScheduleBody extends StatefulWidget {
  const _ScheduleBody({
    required this.crewFirstName,
    required this.jobs,
    required this.bookings,
    required this.isLoading,
    required this.syncState,
    required this.onRefresh,
    required this.onSelectJob,
    required this.onSignOut,
  });

  final String crewFirstName;
  final List<Job> jobs;
  final List<Booking> bookings;
  final bool isLoading;
  final SyncState syncState;
  final Future<void> Function() onRefresh;
  final ValueChanged<Job> onSelectJob;
  final VoidCallback onSignOut;

  @override
  State<_ScheduleBody> createState() => _ScheduleBodyState();
}

class _ScheduleBodyState extends State<_ScheduleBody> {
  final _sheetController = DraggableScrollableController();
  String? _selectedBookingId;

  @override
  void dispose() {
    _sheetController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgBase,
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            JhSyncBanner(state: widget.syncState),
            Expanded(
              child: Stack(
                children: [
                  Positioned.fill(
                    child: ScheduleMap(
                      bookings: widget.bookings,
                      selectedBookingId: _selectedBookingId,
                      onJobTap: (booking) {
                        setState(() => _selectedBookingId = booking.id);
                        final job = booking.toJob();
                        widget.onSelectJob(job);
                      },
                    ),
                  ),
                  Positioned(
                    left: 16,
                    top: 16,
                    child: Row(
                      children: [
                        _RoundIconButton(
                          icon: Icons.privacy_tip_outlined,
                          onTap: () async {
                            final uri = Uri.parse('https://www.junkhaul.ca/crew-privacy');
                            if (await canLaunchUrl(uri)) {
                              await launchUrl(uri, mode: LaunchMode.externalApplication);
                            }
                          },
                        ),
                        const SizedBox(width: 8),
                        _RoundIconButton(icon: Icons.logout_rounded, onTap: widget.onSignOut),
                      ],
                    ),
                  ),
                  DraggableScrollableSheet(
                    controller: _sheetController,
                    initialChildSize: 0.62,
                    minChildSize: 0.62,
                    maxChildSize: 0.92,
                    builder: (context, scrollController) {
                      return RefreshIndicator(
                        onRefresh: widget.onRefresh,
                        color: AppColors.accent,
                        child: ScheduleBottomSheet(
                          crewFirstName: widget.crewFirstName,
                          jobs: widget.jobs,
                          isLoading: widget.isLoading,
                          onSelectJob: widget.onSelectJob,
                          scrollController: scrollController,
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RoundIconButton extends StatelessWidget {
  const _RoundIconButton({required this.icon, required this.onTap});
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      shape: const CircleBorder(),
      elevation: 2,
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: Icon(icon, size: 20, color: AppColors.textPrimary),
        ),
      ),
    );
  }
}
