import 'package:flutter/material.dart';
import '../../core/app_theme.dart';

enum SyncState { online, offline, syncing }

/// Global connectivity indicator. Per the design direction, offline state
/// must be visually obvious everywhere — mount this once above the content
/// of every authenticated screen (or once in the shell) driven by your
/// connectivity/sync-queue provider.
///
/// TODO(dev): drive [state] and [queuedActionCount] from your existing
/// offline-queue/connectivity service.
class JhSyncBanner extends StatelessWidget {
  const JhSyncBanner({
    super.key,
    required this.state,
    this.queuedActionCount = 0,
  });

  final SyncState state;
  final int queuedActionCount;

  @override
  Widget build(BuildContext context) {
    if (state == SyncState.online) return const SizedBox.shrink();
    final isSyncing = state == SyncState.syncing;
    return Container(
      width: double.infinity,
      color: isSyncing ? AppColors.statusAmber : AppColors.textPrimary,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            isSyncing ? Icons.sync_rounded : Icons.wifi_off_rounded,
            size: 14,
            color: Colors.white,
          ),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              isSyncing
                  ? 'Syncing…'
                  : queuedActionCount > 0
                  ? 'Offline — $queuedActionCount action${queuedActionCount == 1 ? '' : 's'} queued, will sync automatically'
                  : 'Offline — changes will sync automatically',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}

/// Small "Saved ✓" / "Saved locally — will sync" confirmation chip for
/// save-sensitive steps (signature, photos) so nothing feels like it
/// silently vanished when offline.
class JhSavedChip extends StatelessWidget {
  const JhSavedChip({super.key, required this.synced});

  final bool synced;

  @override
  Widget build(BuildContext context) {
    final color = synced ? AppColors.statusGreen : AppColors.statusAmber;
    final bg = synced ? const Color(0xFFE8FBF0) : const Color(0xFFFEF6E7);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.check_circle, size: 14, color: color),
          const SizedBox(width: 6),
          Text(
            synced ? 'Saved & Synced' : 'Saved locally — will sync',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}
