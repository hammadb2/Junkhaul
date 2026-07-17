import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/app_theme.dart';
import '../../../data/offline/connectivity_provider.dart';
import '../../../data/offline/offline_queue_service.dart';
import '../../../data/repositories/auth_repository.dart';
import '../../../data/services/dispatch_location_service.dart';
import '../../../domain/models/booking.dart';
import '../../../domain/models/job.dart';
import '../../../domain/models/job_mappers.dart';
import '../../../domain/models/route_plan.dart';
import '../../../domain/providers/route_provider.dart';
import '../../../domain/providers/schedule_provider.dart';
import '../../shared/jh_sync_banner.dart';
import 'schedule_map.dart';
import 'schedule_bottom_sheet.dart';
import 'route_update_sheet.dart';

/// The crew's home base — today's job list over the live map, pull-to-
/// refresh, and the global sync indicator. Wired to [todayScheduleProvider].
class ScheduleScreen extends ConsumerWidget {
  const ScheduleScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authRepositoryProvider);
    final scheduleAsync = ref.watch(todayScheduleProvider);
    final connectivityAsync = ref.watch(isOnlineProvider);
    final queueAsync = ref.watch(offlineQueueProvider);
    final routeState = ref.watch(routeProvider);

    final crewFirstName = _extractFirstName(auth.employee?.name);
    final isLoading = scheduleAsync.isLoading;
    final bookings = scheduleAsync.maybeWhen(
      data: (schedule) => schedule.bookings,
      orElse: () => <Booking>[],
    );
    var jobs = bookings.map((b) => b.toJob()).toList();

    // Build ordered job list from route stops if available, falling back
    // to the raw booking order.
    final route = routeState.route;
    if (route != null && route.orderedStops.isNotEmpty) {
      final stopBookingIds = route.orderedStops
          .where((s) => s.bookingId != null)
          .map((s) => s.bookingId!)
          .toList();
      final bookingMap = {for (var b in bookings) b.id: b};
      final ordered = <Job>[];
      for (final stopBookingId in stopBookingIds) {
        final b = bookingMap[stopBookingId];
        if (b != null) ordered.add(b.toJob());
      }
      // Add any bookings not in the route (shouldn't happen, but safe).
      for (final b in bookings) {
        if (!stopBookingIds.contains(b.id)) {
          ordered.add(b.toJob());
        }
      }
      if (ordered.isNotEmpty) jobs = ordered;
    }

    final isOnline = connectivityAsync.maybeWhen(
      data: (online) => online,
      orElse: () => true,
    );
    final queuedCount = queueAsync.maybeWhen(
      data: (queue) => queue.pending,
      orElse: () => 0,
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
      queuedActionCount: queuedCount,
      routeState: routeState,
      onRefresh: () async {
        ref.invalidate(todayScheduleProvider);
        await ref.read(todayScheduleProvider.future);
        // Also refresh the route on pull-to-refresh.
        await ref.read(routeProvider.notifier).fetchRoute();
      },
      onSelectJob: (job) => context.push('/job/${job.id}'),
      onSignOut: () async {
        // Stop realtime route watch before logout.
        ref.read(routeProvider.notifier).stopRealtimeWatch();
        await ref.read(authRepositoryProvider.notifier).logout();
      },
    );
  }

  String _extractFirstName(String? fullName) {
    if (fullName == null || fullName.isEmpty) return 'Crew';
    return fullName.trim().split(' ').first;
  }
}

class _ScheduleBody extends ConsumerStatefulWidget {
  const _ScheduleBody({
    required this.crewFirstName,
    required this.jobs,
    required this.bookings,
    required this.isLoading,
    required this.syncState,
    required this.onRefresh,
    required this.onSelectJob,
    required this.onSignOut,
    this.queuedActionCount = 0,
    this.routeState,
  });

  final String crewFirstName;
  final List<Job> jobs;
  final List<Booking> bookings;
  final bool isLoading;
  final SyncState syncState;
  final Future<void> Function() onRefresh;
  final ValueChanged<Job> onSelectJob;
  final VoidCallback onSignOut;
  final int queuedActionCount;
  final RouteState? routeState;

  @override
  ConsumerState<_ScheduleBody> createState() => _ScheduleBodyState();
}

class _ScheduleBodyState extends ConsumerState<_ScheduleBody>
    with WidgetsBindingObserver {
  final _sheetController = DraggableScrollableController();
  String? _selectedBookingId;
  String? _lastWatchedAssignmentId;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    // Start dispatch telemetry when the crew is on the schedule screen
    // (i.e., on shift). This sends sampled GPS to the backend for dispatch.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        ref.read(dispatchLocationProvider.notifier).start();
        // Fetch the current route and start realtime watch.
        _fetchRouteAndWatch();
      }
    });
  }

  void _fetchRouteAndWatch() {
    final scheduleAsync = ref.read(todayScheduleProvider);
    scheduleAsync.maybeWhen(
      data: (schedule) {
        final assignmentId = schedule.assignment?.id;
        if (assignmentId != null && assignmentId != _lastWatchedAssignmentId) {
          // Assignment changed — restart subscription.
          ref.read(routeProvider.notifier).stopRealtimeWatch();
          ref.read(routeProvider.notifier).fetchRoute();
          ref.read(routeProvider.notifier).startRealtimeWatch(assignmentId);
          _lastWatchedAssignmentId = assignmentId;
        } else if (assignmentId == null && _lastWatchedAssignmentId != null) {
          // No assignment — stop watching.
          ref.read(routeProvider.notifier).stopRealtimeWatch();
          _lastWatchedAssignmentId = null;
        }
      },
      orElse: () {},
    );
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Refresh route on foreground/resume. Also serves as fallback
    // when realtime is unavailable.
    if (state == AppLifecycleState.resumed) {
      ref.read(routeProvider.notifier).fetchRoute();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    // Stop dispatch telemetry and route realtime watch when leaving.
    if (mounted) {
      ref.read(dispatchLocationProvider.notifier).stop();
      ref.read(routeProvider.notifier).stopRealtimeWatch();
    }
    _sheetController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final routeState = widget.routeState;
    final route = routeState?.route;
    final showAckBanner =
        route != null && route.requiresAcknowledgment && !route.acknowledged;
    final showPendingBanner =
        routeState?.pendingUpdate == true &&
        !(route?.requiresAcknowledgment ?? false);
    final hasConflict = routeState?.conflict != null;

    return Scaffold(
      backgroundColor: AppColors.bgBase,
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            JhSyncBanner(
              state: widget.syncState,
              queuedActionCount: widget.queuedActionCount,
            ),
            // Route conflict banner (highest priority).
            if (hasConflict)
              Material(
                color: Colors.red[50],
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 10,
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.error_outline,
                        size: 20,
                        color: Colors.red[700],
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Route conflict: v${routeState!.conflict!.submittedRouteVersion} submitted, v${routeState.conflict!.currentRouteVersion} current. Refresh required.',
                          style: Theme.of(context).textTheme.bodyMedium
                              ?.copyWith(
                                color: Colors.red[900],
                                fontWeight: FontWeight.w600,
                              ),
                        ),
                      ),
                      TextButton(
                        onPressed: () {
                          ref.read(routeProvider.notifier).clearConflict();
                          ref.read(routeProvider.notifier).fetchRoute();
                        },
                        child: const Text('Refresh'),
                      ),
                    ],
                  ),
                ),
              ),
            // Route acknowledgment-required banner.
            if (showAckBanner)
              RouteUpdateBanner(
                route: route,
                onTap: () => _showRouteUpdateSheet(context, route),
              ),
            // Route pending-update banner (no ack required).
            if (showPendingBanner)
              Material(
                color: Colors.blue[50],
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.sync_rounded,
                        size: 18,
                        color: Colors.blue[700],
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Route updated to v${route?.routeVersion}',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Colors.blue[900],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
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
                            final uri = Uri.parse(
                              'https://www.junkhaul.ca/crew-privacy',
                            );
                            if (await canLaunchUrl(uri)) {
                              await launchUrl(
                                uri,
                                mode: LaunchMode.externalApplication,
                              );
                            }
                          },
                        ),
                        const SizedBox(width: 8),
                        _RoundIconButton(
                          icon: Icons.assignment_outlined,
                          onTap: () => context.push('/closeout'),
                        ),
                        const SizedBox(width: 8),
                        _RoundIconButton(
                          icon: Icons.logout_rounded,
                          onTap: widget.onSignOut,
                        ),
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

  void _showRouteUpdateSheet(BuildContext context, CrewRoute route) {
    final routeState = widget.routeState;
    if (routeState == null) return;

    // Compute change summary by comparing the current route with itself
    // (the provider already has the new route; we need the old one).
    // In production, the provider stores the previous route for comparison.
    // For now, we use the route's change reason as the summary.
    final summary = RouteChangeSummary(
      newVersion: route.routeVersion,
      oldVersion: route.routeVersion - 1,
      changes: [
        if (route.routeChangeReason != null)
          RouteChange(
            type: 'route_updated',
            description: route.routeChangeReason!,
          ),
      ],
      destinationChanged: false,
      activeJobRemoved: false,
    );

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (sheetContext) => RouteUpdateSheet(
        summary: summary,
        route: route,
        onAcknowledge: () async {
          Navigator.of(sheetContext).pop();
          await ref.read(routeProvider.notifier).acknowledgeRoute();
        },
        onContactDispatch: () {
          Navigator.of(sheetContext).pop();
          // Launch phone dialer to dispatch.
          final uri = Uri.parse('tel:+15875550100');
          launchUrl(uri);
        },
        onReviewRoute: () {
          Navigator.of(sheetContext).pop();
          // Stay on schedule to review the route stops.
        },
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
