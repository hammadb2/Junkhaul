import 'package:flutter/material.dart';

import '../../../domain/models/route_plan.dart';

/// A bottom sheet showing a detailed route-update summary with
/// acknowledgment and contact-dispatch actions.
///
/// Does not silently apply a route that requires acknowledgment.
class RouteUpdateSheet extends StatelessWidget {
  const RouteUpdateSheet({
    super.key,
    required this.summary,
    required this.route,
    required this.onAcknowledge,
    required this.onContactDispatch,
    required this.onReviewRoute,
  });

  final RouteChangeSummary summary;
  final CrewRoute route;
  final VoidCallback onAcknowledge;
  final VoidCallback onContactDispatch;
  final VoidCallback onReviewRoute;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final requiresAck = route.requiresAcknowledgment && !route.acknowledged;

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Header
            Row(
              children: [
                Icon(
                  Icons.alt_route_rounded,
                  size: 28,
                  color: theme.colorScheme.primary,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Route Updated',
                        style: theme.textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        'Version ${summary.oldVersion} → ${summary.newVersion}',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                ),
                if (requiresAck)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.orange[100],
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      'ACK REQUIRED',
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: Colors.orange[800],
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
              ],
            ),
            const Divider(height: 24),

            // Change list
            if (summary.changes.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 16),
                child: Text(
                  'Route refreshed. No structural changes detected.',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: Colors.grey[600],
                  ),
                ),
              )
            else
              Flexible(
                child: ListView.separated(
                  shrinkWrap: true,
                  itemCount: summary.changes.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    final change = summary.changes[index];
                    return _ChangeTile(change: change);
                  },
                ),
              ),

            // Active job removal warning
            if (summary.activeJobRemoved) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red[50],
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.red[200]!),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.warning_amber_rounded,
                      color: Colors.red[700],
                      size: 24,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Your active job was removed or reassigned. Contact dispatch before continuing.',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: Colors.red[900],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 20),

            // Actions
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: onContactDispatch,
                    icon: const Icon(Icons.phone_outlined, size: 18),
                    label: const Text('Contact Dispatch'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: onReviewRoute,
                    icon: const Icon(Icons.map_outlined, size: 18),
                    label: const Text('Review Route'),
                  ),
                ),
              ],
            ),
            if (requiresAck) ...[
              const SizedBox(height: 8),
              FilledButton.icon(
                onPressed: onAcknowledge,
                icon: const Icon(Icons.check_circle_outline, size: 18),
                label: const Text('Acknowledge & Update'),
                style: FilledButton.styleFrom(
                  minimumSize: const Size.fromHeight(48),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _ChangeTile extends StatelessWidget {
  const _ChangeTile({required this.change});
  final RouteChange change;

  @override
  Widget build(BuildContext context) {
    final (icon, color) = _iconForType(change.type);
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 20, color: color),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            change.description ?? change.type,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ),
      ],
    );
  }

  (IconData, Color) _iconForType(String type) {
    switch (type) {
      case 'job_added':
        return (Icons.add_location_alt_outlined, Colors.green);
      case 'job_removed':
        return (Icons.remove_circle_outline, Colors.red);
      case 'job_moved':
        return (Icons.swap_vert_rounded, Colors.orange);
      case 'window_changed':
        return (Icons.schedule_outlined, Colors.blue);
      case 'destination_changed':
        return (Icons.navigation_outlined, Colors.purple);
      case 'truck_changed':
        return (Icons.local_shipping_outlined, Colors.brown);
      case 'donation_inserted':
        return (Icons.volunteer_activism_outlined, Colors.teal);
      case 'initial_load':
        return (Icons.download_done_outlined, Colors.grey);
      default:
        return (Icons.info_outline, Colors.grey);
    }
  }
}

/// A compact banner shown at the top of the schedule when a route
/// update is pending acknowledgment.
class RouteUpdateBanner extends StatelessWidget {
  const RouteUpdateBanner({
    super.key,
    required this.route,
    required this.onTap,
  });

  final CrewRoute route;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    if (!route.requiresAcknowledgment || route.acknowledged) {
      return const SizedBox.shrink();
    }

    return Material(
      color: Colors.orange[50],
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          child: Row(
            children: [
              Icon(
                Icons.alt_route_rounded,
                size: 20,
                color: Colors.orange[700],
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Route v${route.routeVersion} requires acknowledgment',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Colors.orange[900],
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              Icon(Icons.chevron_right, color: Colors.orange[700], size: 20),
            ],
          ),
        ),
      ),
    );
  }
}

/// A blocking dispatch-resolution screen shown when the active job
/// is removed or reassigned. Prevents navigation to another customer.
class ActiveJobRemovedScreen extends StatelessWidget {
  const ActiveJobRemovedScreen({
    super.key,
    required this.removedJobName,
    required this.onContactDispatch,
  });

  final String? removedJobName;
  final VoidCallback onContactDispatch;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.red[50],
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.block_rounded, size: 64, color: Colors.red[400]),
                const SizedBox(height: 16),
                Text(
                  'Active Job Changed',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: Colors.red[900],
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  removedJobName != null
                      ? 'Your active job "$removedJobName" was removed or reassigned by dispatch.'
                      : 'Your active job was removed or reassigned by dispatch.',
                  textAlign: TextAlign.center,
                  style: Theme.of(
                    context,
                  ).textTheme.bodyLarge?.copyWith(color: Colors.red[800]),
                ),
                const SizedBox(height: 8),
                Text(
                  'Do not navigate to another customer. Contact dispatch to resolve.',
                  textAlign: TextAlign.center,
                  style: Theme.of(
                    context,
                  ).textTheme.bodyMedium?.copyWith(color: Colors.red[700]),
                ),
                const SizedBox(height: 24),
                Text(
                  'Your photos, signatures, and queued actions are preserved.',
                  textAlign: TextAlign.center,
                  style: Theme.of(
                    context,
                  ).textTheme.bodySmall?.copyWith(color: Colors.grey[700]),
                ),
                const SizedBox(height: 32),
                FilledButton.icon(
                  onPressed: onContactDispatch,
                  icon: const Icon(Icons.phone_outlined),
                  label: const Text('Contact Dispatch'),
                  style: FilledButton.styleFrom(
                    backgroundColor: Colors.red[700],
                    minimumSize: const Size.fromHeight(48),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
