import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:permission_handler/permission_handler.dart';
import '../../../core/app_theme.dart';
import '../../shared/jh_primary_button.dart';

enum AppPermission { location, camera, notifications }

/// Requests location/camera/notification access, each framed around the
/// specific job-flow need it serves rather than a generic system prompt.
/// Wired to permission_handler for real OS permission requests.
class PermissionGateScreen extends ConsumerStatefulWidget {
  const PermissionGateScreen({super.key});

  @override
  ConsumerState<PermissionGateScreen> createState() => _PermissionGateScreenState();
}

class _PermissionGateScreenState extends ConsumerState<PermissionGateScreen> {
  static const _copy = {
    AppPermission.location: (
      'Location',
      "So dispatch can route you and customers know you're on the way.",
      Icons.location_on_outlined,
    ),
    AppPermission.camera: (
      'Camera',
      'For before/after photos and item condition logs on every job.',
      Icons.camera_alt_outlined,
    ),
    AppPermission.notifications: (
      'Notifications',
      "So you don't miss a new job or a same-day schedule change.",
      Icons.notifications_none_rounded,
    ),
  };

  Map<AppPermission, bool> _granted = {
    AppPermission.location: false,
    AppPermission.camera: false,
    AppPermission.notifications: false,
  };

  @override
  void initState() {
    super.initState();
    _checkPermissions();
  }

  Future<void> _checkPermissions() async {
    final location = await Permission.location.status;
    final camera = await Permission.camera.status;
    final notifications = await Permission.notification.status;
    if (mounted) {
      setState(() {
        _granted = {
          AppPermission.location: location.isGranted,
          AppPermission.camera: camera.isGranted,
          AppPermission.notifications: notifications.isGranted,
        };
      });
    }
  }

  Future<void> _requestPermission(AppPermission permission) async {
    Permission perm;
    switch (permission) {
      case AppPermission.location:
        perm = Permission.location;
        break;
      case AppPermission.camera:
        perm = Permission.camera;
        break;
      case AppPermission.notifications:
        perm = Permission.notification;
        break;
    }
    await perm.request();
    await _checkPermissions();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgBase,
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
                children: [
                  const Text('Before we start', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
                  const SizedBox(height: 6),
                  const Text('Three things the job needs from your phone.', style: TextStyle(fontSize: 14, color: AppColors.textSecondary)),
                  const SizedBox(height: 22),
                  for (final permission in AppPermission.values) ...[
                    _PermissionRow(
                      permission: permission,
                      isGranted: _granted[permission] ?? false,
                      onRequest: () => _requestPermission(permission),
                    ),
                    const SizedBox(height: 12),
                  ],
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.fromLTRB(20, 14, 20, 26),
              decoration: const BoxDecoration(border: Border(top: BorderSide(color: AppColors.borderSubtle))),
              child: JhPrimaryButton(
                label: 'Continue',
                onPressed: () => context.go('/schedule'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PermissionRow extends StatelessWidget {
  const _PermissionRow({required this.permission, required this.isGranted, required this.onRequest});

  final AppPermission permission;
  final bool isGranted;
  final VoidCallback onRequest;

  @override
  Widget build(BuildContext context) {
    final (title, reason, icon) = _PermissionGateScreenState._copy[permission]!;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: AppColors.bgCard, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.borderSubtle)),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(color: const Color(0xFFFFF1E8), borderRadius: BorderRadius.circular(10)),
            child: Icon(icon, color: AppColors.accent, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                const SizedBox(height: 2),
                Text(reason, style: const TextStyle(fontSize: 13, color: AppColors.textSecondary, height: 1.4)),
              ],
            ),
          ),
          const SizedBox(width: 8),
          TextButton(
            onPressed: isGranted ? null : onRequest,
            style: TextButton.styleFrom(
              backgroundColor: isGranted ? const Color(0xFFE8FBF0) : AppColors.bgInput,
              foregroundColor: isGranted ? AppColors.statusGreen : AppColors.textSecondary,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
            ),
            child: Text(isGranted ? 'Enabled' : 'Allow', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }
}
