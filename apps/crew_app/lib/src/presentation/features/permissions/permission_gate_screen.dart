import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/app_theme.dart';
import '../../../domain/providers/permission_provider.dart';
import '../../shared/jh_primary_button.dart';
import '../../shared/jh_secondary_button.dart';

/// Full-screen blocking UI shown when a required permission is denied.
/// Parameterized by [PermissionType] to show the right explanation.
class PermissionGateScreen extends ConsumerWidget {
  const PermissionGateScreen({
    super.key,
    required this.type,
    this.onGranted,
  });

  final PermissionType type;
  final VoidCallback? onGranted;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final service = ref.watch(permissionServiceProvider);

    return Scaffold(
      backgroundColor: AppColors.bgBase,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(_icon(type), size: 56, color: AppColors.accent),
                const SizedBox(height: 16),
                Text(_title(type), style: Theme.of(context).textTheme.headlineSmall, textAlign: TextAlign.center),
                const SizedBox(height: 12),
                Text(
                  _explanation(type),
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.textSecondary),
                ),
                const SizedBox(height: 32),
                JhPrimaryButton(
                  label: 'Try Again',
                  onPressed: () async {
                    final status = await _requestAgain(service, type);
                    if (status == PermissionStatus.granted && onGranted != null) {
                      onGranted!();
                    }
                  },
                ),
                const SizedBox(height: 12),
                JhSecondaryButton(
                  label: 'Open Settings',
                  onPressed: () => service.openSettings(),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<PermissionStatus> _requestAgain(PermissionService service, PermissionType type) async {
    switch (type) {
      case PermissionType.location:
        return service.checkAndRequestLocation();
      case PermissionType.camera:
        return service.checkAndRequestCamera();
      case PermissionType.notification:
        return service.checkAndRequestNotifications();
    }
  }

  IconData _icon(PermissionType t) {
    switch (t) {
      case PermissionType.location:
        return Icons.location_on_rounded;
      case PermissionType.camera:
        return Icons.camera_alt_rounded;
      case PermissionType.notification:
        return Icons.notifications_rounded;
    }
  }

  String _title(PermissionType t) {
    switch (t) {
      case PermissionType.location:
        return 'Location Access Required';
      case PermissionType.camera:
        return 'Camera Access Required';
      case PermissionType.notification:
        return 'Notifications Disabled';
    }
  }

  String _explanation(PermissionType t) {
    switch (t) {
      case PermissionType.location:
        return 'Junkhaul Crew needs your location to show your truck on the '
            'customer tracking map, navigate to jobs, and log arrival times. '
            'Please grant location access in Settings.';
      case PermissionType.camera:
        return 'The camera is needed to capture job photos, before/after '
            'photos, truck checks, and document scans. Please grant camera '
            'access in Settings.';
      case PermissionType.notification:
        return 'Notifications keep you updated on new jobs, route changes, '
            'and manager messages. You can still use the app without them, '
            'but we recommend enabling notifications.';
    }
  }
}

enum PermissionType { location, camera, notification }
